import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyInstalledPluginTruth,
  queryInstalledPluginTruth
} from "../src/installed-plugin-truth.js";

function exact(version, overrides = {}) {
  return {
    pluginId: "superloopy@beefiker",
    name: "superloopy",
    marketplaceName: "beefiker",
    version,
    installed: true,
    enabled: true,
    ...overrides
  };
}

test("classifier reports matching and mismatching exact installed versions", () => {
  const current = classifyInstalledPluginTruth("0.12.4", { installed: [exact("0.12.4")] });
  assert.deepEqual(
    { ok: current.ok, state: current.state, executingVersion: current.executingVersion, installedVersion: current.installedVersion },
    { ok: true, state: "current", executingVersion: "0.12.4", installedVersion: "0.12.4" }
  );

  const mismatch = classifyInstalledPluginTruth("0.12.4", { installed: [exact("0.12.3")] });
  assert.deepEqual(
    { ok: mismatch.ok, state: mismatch.state, executingVersion: mismatch.executingVersion, installedVersion: mismatch.installedVersion },
    { ok: false, state: "version_mismatch", executingVersion: "0.12.4", installedVersion: "0.12.3" }
  );
  assert.equal(mismatch.next, "Run `codex plugin add superloopy@beefiker --json`, then start a new Codex session.");
});

test("classifier ignores unrelated entries and distinguishes absent from duplicate authority", () => {
  const unrelated = exact("9.9.9", {
    pluginId: "other@beefiker",
    name: "other"
  });
  assert.equal(classifyInstalledPluginTruth("0.12.4", { installed: [unrelated] }).state, "not_registered");
  assert.equal(classifyInstalledPluginTruth("0.12.4", { installed: [exact("0.12.4", { installed: false })] }).state, "not_registered");
  assert.equal(classifyInstalledPluginTruth("0.12.4", { installed: [exact("0.12.4"), exact("0.12.4")] }).state, "authority_unavailable");
});

test("classifier rejects invalid executing versions, top-level shapes, and exact entry schemas", () => {
  for (const [version, payload] of [
    ["not-a-version", { installed: [exact("0.12.4")] }],
    ["0.12.4", []],
    ["0.12.4", { installed: "invalid" }],
    ["0.12.4", { installed: [exact(12)] }],
    ["0.12.4", { installed: [exact("0.12.4", { installed: "yes" })] }],
    ["0.12.4", { installed: [exact("0.12.4", { enabled: "yes" })] }]
  ]) {
    assert.equal(classifyInstalledPluginTruth(version, payload).state, "authority_unavailable");
  }
});

test("classifier rejects unsafe authority versions without returning rejected data", () => {
  const secret = "do-not-leak";
  const invalidCases = [
    [`0.12.4-\u001b[31m${secret}`, "0.12.4"],
    [` 0.12.4+${secret}`, "0.12.4"],
    [`0.12.4+${secret} `, "0.12.4"],
    ["0.12.4", `0.12.3-\u001b[31m${secret}`],
    ["0.12.4", ` 0.12.3+${secret}`],
    ["0.12.4", `0.12.3+${secret} `],
    ["0.12.4", `0.12.3-01.${secret}`],
    ["0.12.4", `0.12.3-${secret}..1`],
    ["0.12.4", `0.12.3+${secret}..1`],
    ["0.12.4", `0.12.3+${"a".repeat(1_024)}.${secret}`]
  ];

  for (const [executingVersion, installedVersion] of invalidCases) {
    const result = classifyInstalledPluginTruth(executingVersion, { installed: [exact(installedVersion)] });
    assert.equal(result.ok, true);
    assert.equal(result.state, "authority_unavailable");
    assert.doesNotMatch(JSON.stringify(result), /do-not-leak|\\u001b/iu);
  }
});

test("classifier supports strict SemVer prerelease and build strings with exact equality", () => {
  for (const version of [
    "0.12.4-alpha.1+build.5",
    "1.0.0-0.3.7",
    "1.0.0-x.7.z.92",
    "1.0.0+21AF26D3----117B344092BD"
  ]) {
    const result = classifyInstalledPluginTruth(version, { installed: [exact(version)] });
    assert.equal(result.state, "current");
    assert.equal(result.executingVersion, version);
    assert.equal(result.installedVersion, version);
  }

  const mismatch = classifyInstalledPluginTruth("0.12.4-alpha+build.1", {
    installed: [exact("0.12.4-alpha+build.2")]
  });
  assert.equal(mismatch.state, "version_mismatch");
});

test("query invokes Codex directly with bounded options", () => {
  let invocation;
  const result = queryInstalledPluginTruth("0.12.4", {
    spawnSyncImpl(command, args, options) {
      invocation = { command, args, options };
      return { status: 0, stdout: JSON.stringify({ installed: [exact("0.12.4")] }), stderr: "" };
    }
  });

  assert.equal(result.state, "current");
  assert.equal(invocation.command, "codex");
  assert.deepEqual(invocation.args, ["plugin", "list", "--json"]);
  assert.equal(invocation.options.shell, false);
  assert.equal(invocation.options.timeout, 5_000);
  assert.equal(invocation.options.maxBuffer, 1_000_000);
  assert.deepEqual(invocation.options.stdio, ["ignore", "pipe", "pipe"]);
});

test("query converts command and payload failures into sanitized unavailable results", () => {
  const secret = "do-not-leak";
  const failures = [
    () => { throw new Error(secret); },
    () => ({ status: null, signal: "SIGTERM", error: Object.assign(new Error(secret), { code: "ETIMEDOUT" }), stdout: "", stderr: secret }),
    () => ({ status: 7, stdout: secret, stderr: secret }),
    () => ({ status: 0, stdout: "{bad", stderr: secret }),
    () => ({ status: 0, stdout: "x".repeat(1_000_001), stderr: secret })
  ];
  for (const spawnSyncImpl of failures) {
    const result = queryInstalledPluginTruth("0.12.4", { spawnSyncImpl });
    assert.equal(result.state, "authority_unavailable");
    assert.doesNotMatch(JSON.stringify(result), /do-not-leak/);
  }
});

test("query sanitizes malformed options before resolving an injected process", () => {
  const throwingGetter = {
    get spawnSyncImpl() {
      throw new Error("do-not-leak");
    }
  };

  for (const options of [null, throwingGetter]) {
    const result = queryInstalledPluginTruth("0.12.4", options);
    assert.equal(result.state, "authority_unavailable");
    assert.doesNotMatch(JSON.stringify(result), /do-not-leak/);
  }
});
