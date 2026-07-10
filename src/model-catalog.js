import { spawn } from "node:child_process";

const DEFAULT_TIMEOUT_MS = 3_000;
const MAX_TIMEOUT_MS = 4_999;
const MODEL_LIST_LIMIT = 100;
const MAX_BUFFER_LENGTH = 1_000_000;
// This identifies the probe protocol, not the Superloopy release. Bump it only when
// the initialize/model-list handshake contract changes.
const CLIENT_INFO = { name: "superloopy-model-probe", version: "1" };

export async function queryCodexModelCatalog(options = {}) {
  const spawnImpl = options.spawnImpl ?? spawn;
  const timeoutMs = normalizeTimeout(options.timeoutMs ?? options.timeout);
  const clock = options.clock ?? (() => new Date());
  const setTimeoutImpl = options.setTimeoutImpl ?? setTimeout;
  const clearTimeoutImpl = options.clearTimeoutImpl ?? clearTimeout;
  let child;

  try {
    child = spawnImpl("codex", ["app-server", "--stdio"], {
      stdio: ["pipe", "pipe", "pipe"]
    });
  } catch {
    return failure("spawn_error", clock);
  }

  if (!isUsableChild(child)) {
    terminate(child);
    return failure("protocol_error", clock);
  }

  return new Promise((resolve) => {
    let settled = false;
    let phase = "initialize";
    let expectedId = 0;
    let nextRequestId = 1;
    let buffer = "";
    const models = [];
    const seenCursors = new Set();
    const timer = setTimeoutImpl(() => finishFailure("timeout"), timeoutMs);

    function finish(result) {
      if (settled) return;
      settled = true;
      clearTimeoutImpl(timer);
      terminate(child);
      resolve({ ...result, checkedAt: readClock(clock) });
    }

    function finishFailure(reason) {
      finish({ ok: false, source: "model_list", reason });
    }

    function send(message) {
      if (settled) return;
      try {
        child.stdin.write(`${JSON.stringify(message)}\n`);
      } catch {
        finishFailure("process_exit");
      }
    }

    function requestPage(cursor) {
      expectedId = nextRequestId;
      nextRequestId += 1;
      const params = { limit: MODEL_LIST_LIMIT, includeHidden: false };
      if (cursor !== undefined) params.cursor = cursor;
      send({ method: "model/list", id: expectedId, params });
    }

    function handleMessage(message) {
      if (!isRecord(message)) {
        finishFailure("protocol_error");
        return;
      }
      if (!Object.hasOwn(message, "id")) {
        if (typeof message.method === "string") return;
        finishFailure("protocol_error");
        return;
      }
      if (message.id !== expectedId) {
        finishFailure("protocol_error");
        return;
      }

      const hasResult = Object.hasOwn(message, "result");
      const hasError = Object.hasOwn(message, "error");
      if (hasResult === hasError) {
        finishFailure("protocol_error");
        return;
      }
      if (hasError) {
        finishFailure(isRecord(message.error) ? "server_error" : "protocol_error");
        return;
      }

      if (phase === "initialize") {
        if (!isRecord(message.result)) {
          finishFailure("protocol_error");
          return;
        }
        phase = "model_list";
        send({ method: "initialized", params: {} });
        requestPage(undefined);
        return;
      }

      let page;
      try {
        page = normalizePage(message.result);
      } catch {
        finishFailure("protocol_error");
        return;
      }
      models.push(...page.models);
      if (page.nextCursor === null) {
        finish({ ok: true, source: "model_list", models });
        return;
      }
      if (seenCursors.has(page.nextCursor)) {
        finishFailure("protocol_error");
        return;
      }
      seenCursors.add(page.nextCursor);
      requestPage(page.nextCursor);
    }

    function handleLine(line) {
      if (line.trim().length === 0) return;
      let message;
      try {
        message = JSON.parse(line);
      } catch {
        finishFailure("protocol_error");
        return;
      }
      handleMessage(message);
    }

    child.on("error", () => finishFailure("spawn_error"));
    child.on("exit", () => finishFailure("process_exit"));
    child.stdin.on("error", () => finishFailure("process_exit"));
    child.stdout.setEncoding("utf8");
    child.stdout.on("error", () => finishFailure("protocol_error"));
    child.stdout.on("end", () => finishFailure("process_exit"));
    child.stdout.on("data", (chunk) => {
      if (settled) return;
      buffer += chunk;
      if (buffer.length > MAX_BUFFER_LENGTH) {
        finishFailure("protocol_error");
        return;
      }
      while (!settled && buffer.includes("\n")) {
        const newline = buffer.indexOf("\n");
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        handleLine(line);
      }
    });
    if (child.stderr !== null) {
      child.stderr.on("error", () => {});
      child.stderr.resume();
    }

    send({ method: "initialize", id: 0, params: { clientInfo: CLIENT_INFO } });
  });
}

function normalizePage(result) {
  if (!isRecord(result) || !Array.isArray(result.data)) throw new Error("invalid page");
  if (result.nextCursor !== null && typeof result.nextCursor !== "string") throw new Error("invalid cursor");
  if (typeof result.nextCursor === "string" && result.nextCursor.length === 0) throw new Error("invalid cursor");
  return {
    models: result.data.map(normalizeModel),
    nextCursor: result.nextCursor
  };
}

function normalizeModel(item) {
  if (!isRecord(item)) throw new Error("invalid model");
  const id = Object.hasOwn(item, "model") ? item.model : item.id;
  assertNonEmptyString(id);
  if (!Array.isArray(item.supportedReasoningEfforts)) throw new Error("invalid reasoning efforts");
  if (item.serviceTiers !== undefined && !Array.isArray(item.serviceTiers)) {
    throw new Error("invalid service tiers");
  }
  if (item.additionalSpeedTiers !== undefined && !Array.isArray(item.additionalSpeedTiers)) {
    throw new Error("invalid additional speed tiers");
  }

  const reasoningEfforts = item.supportedReasoningEfforts.map((effort) => {
    if (!isRecord(effort)) throw new Error("invalid reasoning effort");
    assertNonEmptyString(effort.reasoningEffort);
    return effort.reasoningEffort;
  });
  const serviceTiers = (item.serviceTiers ?? []).map((tier) => {
    if (!isRecord(tier)) throw new Error("invalid service tier");
    assertNonEmptyString(tier.id);
    return tier.id;
  });
  const additionalSpeedTiers = item.additionalSpeedTiers ?? [];
  for (const tier of additionalSpeedTiers) assertNonEmptyString(tier);

  return {
    id,
    reasoningEfforts,
    serviceTiers: [...new Set([...serviceTiers, ...additionalSpeedTiers])]
  };
}

function isUsableChild(child) {
  return isRecord(child)
    && isRecord(child.stdin)
    && isRecord(child.stdout)
    && typeof child.on === "function"
    && typeof child.stdin.write === "function"
    && typeof child.stdin.on === "function"
    && typeof child.stdout.on === "function"
    && typeof child.stdout.setEncoding === "function";
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertNonEmptyString(value) {
  if (typeof value !== "string" || value.length === 0) throw new Error("expected non-empty string");
}

function normalizeTimeout(value) {
  if (!Number.isFinite(value) || value < 0) return DEFAULT_TIMEOUT_MS;
  return Math.min(value, MAX_TIMEOUT_MS);
}

function terminate(child) {
  if (child === null || typeof child !== "object") return;
  try {
    if (child.stdin !== null && !child.stdin.destroyed && !child.stdin.writableEnded) child.stdin.end();
  } catch {
    // Best-effort shutdown only.
  }
  try {
    if (typeof child.kill === "function" && !child.killed) child.kill();
  } catch {
    // Best-effort shutdown only.
  }
}

function failure(reason, clock) {
  return { ok: false, source: "model_list", checkedAt: readClock(clock), reason };
}

function readClock(clock) {
  try {
    const value = typeof clock === "function" ? clock() : clock.now();
    return (value instanceof Date ? value : new Date(value)).toISOString();
  } catch {
    return new Date().toISOString();
  }
}
