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
