import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { detectHost, isKnownHost, SUPERLOOPY_HOSTS } from "../src/host-detect.js";

async function tempRepo() {
  return mkdtemp(join(tmpdir(), "superloopy-host-"));
}

function runCli(args, options = {}) {
  return spawnSync(process.execPath, [join(process.cwd(), "src/cli.js"), ...args], {
    cwd: options.cwd ?? process.cwd(),
    encoding: "utf8",
    env: options.env ?? process.env,
    input: options.input,
    timeout: 10_000
  });
}

test("detectHost reads host identity from env, not from shipped manifests", async () => {
  const repo = await tempRepo();
  assert.equal(detectHost(repo, { SUPERLOOPY_HOST: "antigravity" }), "antigravity");
  assert.equal(detectHost(repo, { CLAUDE_PLUGIN_ROOT: "/plugins/superloopy" }), "claude");
  assert.equal(detectHost(repo, { GEMINI_PLUGIN_ROOT: "/plugins/superloopy" }), "antigravity");

  // Shipped manifests are NOT a host signal: `gemini-extension.json` and `.gemini-plugin/` are in
  // every npm tarball, so a Codex install carries them too and must still resolve to "codex" --
  // otherwise the Codex-only installedPluginTruth/installedModelPolicy checks go silently exempt.
  const nonCheckout = join(repo, "installed-plugin");
  await mkdir(join(nonCheckout, ".gemini-plugin"), { recursive: true });
  await writeFile(join(nonCheckout, "gemini-extension.json"), "{}", "utf8");
  assert.equal(detectHost(nonCheckout, {}), "codex");
});

test("detectHost reads host identity from a host-owned install directory", async () => {
  const repo = await tempRepo();
  assert.equal(detectHost(join(repo, ".gemini", "config", "plugins", "superloopy"), {}), "antigravity");
  assert.equal(detectHost(join(repo, ".antigravity", "plugins", "superloopy"), {}), "antigravity");
  assert.equal(detectHost(join(repo, ".claude", "plugins", "superloopy"), {}), "claude");
  // ...matched as a whole segment, so a project directory cannot impersonate a host.
  assert.equal(detectHost(join(repo, "antigravity-notes", "superloopy"), {}), "codex");
  assert.equal(detectHost(join(repo, "claude-experiments", "superloopy"), {}), "codex");
  // A non-string root must not throw; it simply carries no signal.
  assert.equal(detectHost(undefined, {}), "codex");
});

test("isKnownHost accepts exactly the three declared hosts", () => {
  assert.deepEqual(SUPERLOOPY_HOSTS, ["codex", "claude", "antigravity"]);
  for (const host of SUPERLOOPY_HOSTS) assert.equal(isKnownHost(host), true);
  for (const value of ["", "Codex", "antigravity-typo", "gemini", undefined, null, 0]) {
    assert.equal(isKnownHost(value), false, JSON.stringify(value));
  }
});

// An unrecognized host used to sail straight through: `canonicalAgentType` returns null for it, so
// the receipt never matched, the hook wrote nothing, and the worker stopped with no evidence -- the
// gate vanished silently. A mis-declared host must fail loudly instead.
test("CLI hook rejects an unrecognized host instead of silently dropping the evidence gate", async () => {
  const repo = await tempRepo();
  const subagentStop = (host) => JSON.stringify({
    hook_event_name: "SubagentStop",
    agent_type: "franky",
    session_id: `s-${host}`,
    agent_id: "a",
    cwd: repo,
    last_assistant_message: "done"
  });

  for (const host of ["bogus", "antigravity-typo", "Codex"]) {
    const rejected = runCli(["hook", "subagent-stop", "--host", host], { cwd: repo, input: subagentStop(host) });
    assert.equal(rejected.status, 2, rejected.stderr);
    assert.equal(rejected.stdout, "");
    assert.match(rejected.stderr, /--host must be one of codex, claude, antigravity/u);
  }

  // Same for the env value the generated bin shim writes.
  const viaEnv = runCli(["hook", "subagent-stop"], {
    cwd: repo,
    input: subagentStop("env"),
    env: { ...process.env, SUPERLOOPY_HOST: "bogus" }
  });
  assert.equal(viaEnv.status, 2, viaEnv.stderr);
  assert.match(viaEnv.stderr, /SUPERLOOPY_HOST must be one of codex, claude, antigravity/u);

  // Every recognized host still gates, each under its own agent-type namespace.
  for (const [host, agentType] of [["codex", "franky"], ["claude", "superloopy:franky"], ["antigravity", "franky"]]) {
    const gated = runCli(["hook", "subagent-stop", "--host", host], {
      cwd: repo,
      input: JSON.stringify({
        hook_event_name: "SubagentStop",
        agent_type: agentType,
        session_id: `gated-${host}`,
        agent_id: "a",
        cwd: repo,
        last_assistant_message: "done"
      })
    });
    assert.equal(gated.status, 0, gated.stderr);
    assert.equal(JSON.parse(gated.stdout).decision, "block");
  }
});
