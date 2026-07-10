import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import test from "node:test";

import { queryCodexModelCatalog } from "../src/model-catalog.js";

const CHECKED_AT = "2026-07-10T12:34:56.000Z";

test("queryCodexModelCatalog performs the read-only paginated handshake and normalizes models", async () => {
  const fake = createFakeSpawn(({ child, message }) => {
    if (message.method === "initialize") {
      send(child, { method: "account/updated", params: { account: "ignore-me" } });
      send(child, { id: 0, result: { serverInfo: { name: "codex" } } });
      return;
    }
    if (message.method !== "model/list") return;
    if (message.params.cursor === undefined) {
      send(child, {
        id: message.id,
        result: {
          data: [
            {
              id: "display-row-one",
              model: "gpt-one",
              supportedReasoningEfforts: [
                { reasoningEffort: "low" },
                { reasoningEffort: "high" }
              ],
              serviceTiers: [{ id: "priority" }, { id: "fast" }],
              additionalSpeedTiers: ["fast", "legacy-fast"]
            }
          ],
          nextCursor: "page-two"
        }
      });
      return;
    }
    send(child, {
      id: message.id,
      result: {
        data: [
          {
            id: "gpt-two",
            supportedReasoningEfforts: [{ reasoningEffort: "medium" }],
            serviceTiers: [{ id: "standard" }],
            additionalSpeedTiers: []
          }
        ],
        nextCursor: null
      }
    });
  });

  const result = await queryCodexModelCatalog({
    spawnImpl: fake.spawnImpl,
    timeoutMs: 100,
    clock: () => new Date(CHECKED_AT)
  });

  assert.deepEqual(result, {
    ok: true,
    source: "model_list",
    checkedAt: CHECKED_AT,
    models: [
      {
        id: "gpt-one",
        reasoningEfforts: ["low", "high"],
        serviceTiers: ["priority", "fast", "legacy-fast"]
      },
      {
        id: "gpt-two",
        reasoningEfforts: ["medium"],
        serviceTiers: ["standard"]
      }
    ]
  });
  assert.deepEqual(fake.spawnCalls, [
    { command: "codex", args: ["app-server", "--stdio"], options: { stdio: ["pipe", "pipe", "pipe"] } }
  ]);
  assert.deepEqual(fake.messages, [
    {
      method: "initialize",
      id: 0,
      params: { clientInfo: { name: "superloopy-model-probe", version: "1" } }
    },
    { method: "initialized", params: {} },
    { method: "model/list", id: 1, params: { limit: 100, includeHidden: false } },
    { method: "model/list", id: 2, params: { limit: 100, includeHidden: false, cursor: "page-two" } }
  ]);
  assert.equal(fake.child.killCalls, 1);
  assert.equal(fake.child.stdin.writableEnded, true);
  const sent = JSON.stringify(fake.messages);
  assert.doesNotMatch(sent, /thread\/start|turn\/start|prompt/iu);
});

test("queryCodexModelCatalog accepts a legacy-only service tier payload", async () => {
  const fake = createCatalogSpawn([
    {
      id: "gpt-legacy",
      supportedReasoningEfforts: [{ reasoningEffort: "high" }],
      additionalSpeedTiers: ["fast", "fast"]
    }
  ]);

  const result = await queryCodexModelCatalog({
    spawnImpl: fake.spawnImpl,
    timeoutMs: 100,
    clock: () => CHECKED_AT
  });

  assert.deepEqual(result.models, [
    { id: "gpt-legacy", reasoningEfforts: ["high"], serviceTiers: ["fast"] }
  ]);
});

test("queryCodexModelCatalog accepts a current-only service tier payload", async () => {
  const fake = createCatalogSpawn([
    {
      id: "gpt-current",
      supportedReasoningEfforts: [{ reasoningEffort: "low" }],
      serviceTiers: [{ id: "priority" }]
    }
  ]);

  const result = await queryCodexModelCatalog({
    spawnImpl: fake.spawnImpl,
    timeoutMs: 100,
    clock: () => CHECKED_AT
  });

  assert.deepEqual(result.models, [
    { id: "gpt-current", reasoningEfforts: ["low"], serviceTiers: ["priority"] }
  ]);
});

test("queryCodexModelCatalog strictly validates each provided service tier source", async (t) => {
  const cases = [
    ["current tiers", { serviceTiers: "priority" }],
    ["legacy tiers", { additionalSpeedTiers: { id: "fast" } }]
  ];

  for (const [name, tierFields] of cases) {
    await t.test(name, async () => {
      const fake = createCatalogSpawn([
        {
          id: "gpt-malformed",
          supportedReasoningEfforts: [{ reasoningEffort: "high" }],
          ...tierFields
        }
      ]);
      const result = await queryCodexModelCatalog({
        spawnImpl: fake.spawnImpl,
        timeoutMs: 100,
        clock: () => CHECKED_AT
      });

      assert.deepEqual(result, unknown("protocol_error"));
    });
  }
});

test("queryCodexModelCatalog caps every timeout override below five seconds", async (t) => {
  const cases = [
    ["timeoutMs boundary", { timeoutMs: 4_999 }, 4_999],
    ["timeoutMs overflow", { timeoutMs: 5_000 }, 4_999],
    ["timeout alias overflow", { timeout: 50_000 }, 4_999]
  ];

  for (const [name, timeoutOptions, expectedDelay] of cases) {
    await t.test(name, async () => {
      const fake = createCatalogSpawn([]);
      const timerToken = {};
      let scheduledDelay;
      let clearedToken;
      const result = await queryCodexModelCatalog({
        ...timeoutOptions,
        spawnImpl: fake.spawnImpl,
        clock: () => CHECKED_AT,
        setTimeoutImpl(_callback, delay) {
          scheduledDelay = delay;
          return timerToken;
        },
        clearTimeoutImpl(token) {
          clearedToken = token;
        }
      });

      assert.equal(result.ok, true);
      assert.equal(scheduledDelay, expectedDelay);
      assert.equal(clearedToken, timerToken);
    });
  }
});

test("queryCodexModelCatalog rejects malformed requested responses", async (t) => {
  const cases = [
    ["invalid JSON", ({ child }) => child.stdout.write("not-json\n")],
    ["invalid initialize result", ({ child }) => send(child, { id: 0, result: null })],
    ["invalid page result", ({ child, message }) => {
      if (message.method === "initialize") send(child, { id: 0, result: {} });
      if (message.method === "model/list") send(child, { id: message.id, result: { data: {}, nextCursor: null } });
    }],
    ["invalid cursor", ({ child, message }) => {
      if (message.method === "initialize") send(child, { id: 0, result: {} });
      if (message.method === "model/list") send(child, { id: message.id, result: { data: [], nextCursor: 7 } });
    }]
  ];

  for (const [name, onMessage] of cases) {
    await t.test(name, async () => {
      const fake = createFakeSpawn(onMessage);
      const result = await queryCodexModelCatalog({
        spawnImpl: fake.spawnImpl,
        timeoutMs: 100,
        clock: () => CHECKED_AT
      });

      assert.deepEqual(result, unknown("protocol_error"));
      assert.equal(fake.child.killCalls, 1);
    });
  }
});

test("queryCodexModelCatalog rejects malformed catalog entries instead of returning partial availability", async () => {
  const fake = createFakeSpawn(({ child, message }) => {
    if (message.method === "initialize") send(child, { id: 0, result: {} });
    if (message.method === "model/list") {
      send(child, {
        id: message.id,
        result: {
          data: [
            {
              id: "gpt-valid",
              supportedReasoningEfforts: [{ reasoningEffort: "high" }],
              serviceTiers: [{ id: "priority" }],
              additionalSpeedTiers: []
            },
            {
              id: "gpt-malformed",
              supportedReasoningEfforts: [{ reasoningEffort: 42 }],
              serviceTiers: [{ id: "priority" }],
              additionalSpeedTiers: []
            }
          ],
          nextCursor: null
        }
      });
    }
  });

  const result = await queryCodexModelCatalog({
    spawnImpl: fake.spawnImpl,
    timeoutMs: 100,
    clock: () => CHECKED_AT
  });

  assert.deepEqual(result, unknown("protocol_error"));
  assert.equal("models" in result, false);
});

test("queryCodexModelCatalog sanitizes app-server errors", async () => {
  const fake = createFakeSpawn(({ child, message }) => {
    if (message.method === "initialize") send(child, { id: 0, result: {} });
    if (message.method === "model/list") {
      child.stderr.write("Bearer super-secret-auth-token\n");
      send(child, {
        id: message.id,
        error: { code: -32000, message: "account rob@example.com cannot list models" }
      });
    }
  });

  const result = await queryCodexModelCatalog({
    spawnImpl: fake.spawnImpl,
    timeoutMs: 100,
    clock: () => CHECKED_AT
  });

  assert.deepEqual(result, unknown("server_error"));
  assert.doesNotMatch(JSON.stringify(result), /super-secret|rob@example\.com|account/iu);
});

test("queryCodexModelCatalog returns a sanitized timeout and terminates the child", async () => {
  const fake = createFakeSpawn(() => {});

  const result = await queryCodexModelCatalog({
    spawnImpl: fake.spawnImpl,
    timeout: 5,
    clock: () => CHECKED_AT
  });

  assert.deepEqual(result, unknown("timeout"));
  assert.equal(fake.child.killCalls, 1);
  assert.equal(fake.child.stdin.writableEnded, true);
});

test("queryCodexModelCatalog escalates and waits when the child ignores SIGTERM", async () => {
  const fake = createFakeSpawn(() => {});
  const signals = [];
  let exited = false;
  fake.child.kill = (signal = "SIGTERM") => {
    fake.child.killCalls += 1;
    signals.push(signal);
    if (signal === "SIGKILL") {
      queueMicrotask(() => {
        exited = true;
        fake.child.emit("exit", null, signal);
      });
    }
    return true;
  };

  const result = await queryCodexModelCatalog({
    spawnImpl: fake.spawnImpl,
    timeout: 1,
    terminationGraceMs: 1,
    clock: () => CHECKED_AT
  });

  assert.deepEqual(result, unknown("timeout"));
  assert.deepEqual(signals, ["SIGTERM", "SIGKILL"]);
  assert.equal(exited, true);
});

test("queryCodexModelCatalog does not return while a real stubborn child is alive", async () => {
  const child = spawn(process.execPath, ["-e", "process.on('SIGTERM',()=>{});setInterval(()=>{},1000)"], {
    stdio: ["pipe", "pipe", "pipe"]
  });
  const signals = [];
  const kill = child.kill.bind(child);
  child.kill = (signal) => {
    signals.push(signal);
    return kill(signal);
  };

  const result = await queryCodexModelCatalog({
    spawnImpl: () => child,
    timeout: 100,
    terminationGraceMs: 25,
    clock: () => CHECKED_AT
  });

  assert.deepEqual(result, unknown("timeout"));
  assert.equal(child.exitCode !== null || child.signalCode !== null, true);
  assert.equal(signals[0], "SIGTERM");
  if (process.platform !== "win32") assert.equal(signals.at(-1), "SIGKILL");
});

test("queryCodexModelCatalog sanitizes non-zero process exits", async () => {
  const fake = createFakeSpawn(({ child }) => {
    child.stderr.write("workspace=/secret/customer auth=top-secret\n");
    queueMicrotask(() => child.emit("exit", 17, null));
  });

  const result = await queryCodexModelCatalog({
    spawnImpl: fake.spawnImpl,
    timeoutMs: 100,
    clock: () => CHECKED_AT
  });

  assert.deepEqual(result, unknown("process_exit"));
  assert.doesNotMatch(JSON.stringify(result), /secret|workspace|customer|auth/iu);
  assert.equal(fake.child.killCalls, 0);
});

test("queryCodexModelCatalog sanitizes spawn failures", async () => {
  const result = await queryCodexModelCatalog({
    spawnImpl() {
      throw new Error("spawn failed for rob@example.com with token top-secret");
    },
    clock: () => CHECKED_AT
  });

  assert.deepEqual(result, unknown("spawn_error"));
  assert.doesNotMatch(JSON.stringify(result), /rob@example\.com|top-secret/iu);
});

function unknown(reason) {
  return { ok: false, source: "model_list", checkedAt: CHECKED_AT, reason };
}

function createFakeSpawn(onMessage) {
  const child = new EventEmitter();
  child.stdin = new PassThrough();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.killCalls = 0;
  child.kill = (signal = "SIGTERM") => {
    child.killCalls += 1;
    child.killed = true;
    queueMicrotask(() => child.emit("exit", null, signal));
    return true;
  };

  const messages = [];
  let input = "";
  child.stdin.setEncoding("utf8");
  child.stdin.on("data", (chunk) => {
    input += chunk;
    while (input.includes("\n")) {
      const newline = input.indexOf("\n");
      const line = input.slice(0, newline);
      input = input.slice(newline + 1);
      if (line.length === 0) continue;
      const message = JSON.parse(line);
      messages.push(message);
      queueMicrotask(() => onMessage({ child, message }));
    }
  });

  const spawnCalls = [];
  const spawnImpl = (command, args, options) => {
    spawnCalls.push({ command, args, options });
    return child;
  };

  return { child, messages, spawnCalls, spawnImpl };
}

function createCatalogSpawn(data) {
  return createFakeSpawn(({ child, message }) => {
    if (message.method === "initialize") send(child, { id: 0, result: {} });
    if (message.method === "model/list") {
      send(child, { id: message.id, result: { data, nextCursor: null } });
    }
  });
}

function send(child, message) {
  child.stdout.write(`${JSON.stringify(message)}\n`);
}
