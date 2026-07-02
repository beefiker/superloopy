import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { checkInterop, detectSuperpowers } from "../src/interop.js";
import { runDoctor } from "../src/doctor.js";
import { runUserPromptSubmitHook } from "../src/hooks.js";
import { createLoop } from "../src/loop.js";

async function tempHome() {
  return mkdtemp(join(tmpdir(), "superloopy-interop-"));
}

async function tempRepo() {
  return mkdtemp(join(tmpdir(), "superloopy-interop-repo-"));
}

test("detectSuperpowers honors the SUPERLOOPY_SUPERPOWERS override both ways", () => {
  for (const value of ["on", "1", "true", "yes", "installed"]) {
    assert.deepEqual(detectSuperpowers({ SUPERLOOPY_SUPERPOWERS: value }, "/nonexistent"), {
      installed: true,
      source: "env-override"
    });
  }
  for (const value of ["off", "0", "false", "no", "disabled"]) {
    assert.deepEqual(detectSuperpowers({ SUPERLOOPY_SUPERPOWERS: value }, "/nonexistent"), {
      installed: false,
      source: "env-override"
    });
  }
});

test("detectSuperpowers auto-detects nothing in a clean home", () => {
  const result = detectSuperpowers({ SUPERLOOPY_SUPERPOWERS: "auto" }, join(tmpdir(), "superloopy-does-not-exist-xyz"));
  assert.equal(result.installed, false);
  assert.equal(result.source, "filesystem");
});

test("detectSuperpowers finds a Codex-installed superpowers plugin dir", async () => {
  const home = await tempHome();
  const pluginDir = join(home, ".codex", "plugins", "superpowers");
  await mkdir(pluginDir, { recursive: true });
  await writeFile(join(pluginDir, "plugin.json"), "{}\n");

  const result = detectSuperpowers({}, home);
  assert.equal(result.installed, true);
  assert.equal(result.source, "filesystem");
  assert.equal(result.path, pluginDir);
});

test("detectSuperpowers finds the using-superpowers skill under a Claude marketplace clone", async () => {
  const home = await tempHome();
  const skillDir = join(home, ".claude", "plugins", "marketplaces", "obra", "skills", "using-superpowers");
  await mkdir(skillDir, { recursive: true });
  await writeFile(join(skillDir, "SKILL.md"), "# using superpowers\n");

  const result = detectSuperpowers({}, home);
  assert.equal(result.installed, true);
  assert.equal(result.path, skillDir);
});

test("detectSuperpowers walks up CLAUDE_PLUGIN_ROOT to its plugins ancestor", async () => {
  const home = await tempHome();
  const pluginsRoot = join(home, "custom-config", "plugins");
  const ownRoot = join(pluginsRoot, "marketplaces", "beefiker");
  await mkdir(ownRoot, { recursive: true });
  const sibling = join(pluginsRoot, "marketplaces", "obra", "skills", "using-superpowers");
  await mkdir(sibling, { recursive: true });
  await writeFile(join(sibling, "SKILL.md"), "# using superpowers\n");

  // Home has no ~/.claude or ~/.codex, so detection must come from the CLAUDE_PLUGIN_ROOT ancestor.
  const result = detectSuperpowers({ CLAUDE_PLUGIN_ROOT: ownRoot }, home);
  assert.equal(result.installed, true);
  assert.equal(result.path, sibling);
});

test("detectSuperpowers does not treat a bare superpowers-marketplace clone as installed", async () => {
  const home = await tempHome();
  // A marketplace repo clone whose dir name is not exactly `superpowers` and carries no
  // plugin markers must not be mistaken for an installed plugin.
  const marketplaceDir = join(home, ".claude", "plugins", "marketplaces", "superpowers-marketplace");
  await mkdir(marketplaceDir, { recursive: true });
  await writeFile(join(marketplaceDir, "README.md"), "marketplace only\n");

  const result = detectSuperpowers({}, home);
  assert.equal(result.installed, false);
});

test("doctor reports interop as an informational, non-failing check", async () => {
  const on = await runDoctor(process.cwd(), { env: { SUPERLOOPY_SUPERPOWERS: "on" } });
  assert.equal(on.checks.interop.ok, true);
  assert.equal(on.checks.interop.informational, true);
  assert.equal(on.checks.interop.installed, true);
  assert.match(on.checks.interop.message, /coexistence guidance active/);

  const off = await runDoctor(process.cwd(), { env: { SUPERLOOPY_SUPERPOWERS: "off" } });
  assert.equal(off.checks.interop.ok, true);
  assert.equal(off.checks.interop.installed, false);
  assert.match(off.checks.interop.message, /runs solo/);
});

test("loopy guidance routes to Superpowers only when it is detected", async () => {
  const repo = await tempRepo();
  const previous = process.env.SUPERLOOPY_SUPERPOWERS;
  try {
    process.env.SUPERLOOPY_SUPERPOWERS = "on";
    const withPowers = JSON.parse(
      await runUserPromptSubmitHook({ hook_event_name: "UserPromptSubmit", cwd: repo, prompt: "loopy add proof-backed login" })
    ).hookSpecificOutput.additionalContext;
    assert.match(withPowers, /Superpowers coexistence \(detected\)/);
    assert.match(withPowers, /`brainstorming` and `writing-plans`/);
    // Must not invent slash commands that the installed plugin does not expose.
    assert.doesNotMatch(withPowers, /\/brainstorm|\/write-plan/);
    assert.match(withPowers, /Superloopy owns proof-of-done/);
    assert.match(withPowers, /One orchestrator per task/);

    process.env.SUPERLOOPY_SUPERPOWERS = "off";
    const solo = JSON.parse(
      await runUserPromptSubmitHook({ hook_event_name: "UserPromptSubmit", cwd: repo, prompt: "loopy add proof-backed login" })
    ).hookSpecificOutput.additionalContext;
    assert.doesNotMatch(solo, /Superpowers coexistence/);
  } finally {
    if (previous === undefined) delete process.env.SUPERLOOPY_SUPERPOWERS;
    else process.env.SUPERLOOPY_SUPERPOWERS = previous;
  }
});

test("team mode adds the one-orchestrator crew note when Superpowers is detected", async () => {
  const repo = await tempRepo();
  const previous = process.env.SUPERLOOPY_SUPERPOWERS;
  try {
    process.env.SUPERLOOPY_SUPERPOWERS = "on";
    const context = JSON.parse(
      await runUserPromptSubmitHook({ hook_event_name: "UserPromptSubmit", cwd: repo, prompt: "loopy team migrate the auth module" })
    ).hookSpecificOutput.additionalContext;
    assert.match(context, /Crew fan-out \(team mode\)/);
    assert.match(context, /pick ONE orchestrator/);
    assert.match(context, /Superpowers coexistence \(detected\)/);
  } finally {
    if (previous === undefined) delete process.env.SUPERLOOPY_SUPERPOWERS;
    else process.env.SUPERLOOPY_SUPERPOWERS = previous;
  }
});

test("resume guidance injects the coexistence block on an in-progress loop", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  const previous = process.env.SUPERLOOPY_SUPERPOWERS;
  try {
    process.env.SUPERLOOPY_SUPERPOWERS = "on";
    const context = JSON.parse(
      await runUserPromptSubmitHook({ hook_event_name: "UserPromptSubmit", cwd: repo, prompt: "loopy keep going" })
    ).hookSpecificOutput.additionalContext;
    // Exercises the renderResume path (an active loop), not just renderStart.
    assert.match(context, /A loop is already in progress/);
    assert.match(context, /Superpowers coexistence \(detected\)/);
  } finally {
    if (previous === undefined) delete process.env.SUPERLOOPY_SUPERPOWERS;
    else process.env.SUPERLOOPY_SUPERPOWERS = previous;
  }
});

test("completed-loop guidance still carries the coexistence block", async () => {
  const repo = await tempRepo();
  const cli = (...args) => spawnSync(process.execPath, [join(process.cwd(), "src/cli.js"), ...args], { cwd: repo, encoding: "utf8" });
  cli("loop", "begin", "--brief", "Ship", "--mode", "light");
  // Prove both essential criteria with a trivial command-backed run, then finish -> aggregate complete.
  cli("loop", "prove", "--goal-id", "G001", "--criterion-id", "C001", "--", process.execPath, "-e", "process.exit(0)");
  cli("loop", "prove", "--goal-id", "G001", "--criterion-id", "C002", "--", process.execPath, "-e", "process.exit(0)");
  cli("loop", "finish", "--evidence", "done", "--artifact", ".superloopy/evidence/gate.json", "--notes", "ok");
  const previous = process.env.SUPERLOOPY_SUPERPOWERS;
  try {
    process.env.SUPERLOOPY_SUPERPOWERS = "on";
    const context = JSON.parse(
      await runUserPromptSubmitHook({ hook_event_name: "UserPromptSubmit", cwd: repo, prompt: "loopy add another feature" })
    ).hookSpecificOutput.additionalContext;
    // The complete-state message must still route to Superpowers (was previously dropped here).
    assert.match(context, /aggregate is already complete/);
    assert.match(context, /Superpowers coexistence \(detected\)/);
  } finally {
    if (previous === undefined) delete process.env.SUPERLOOPY_SUPERPOWERS;
    else process.env.SUPERLOOPY_SUPERPOWERS = previous;
  }
});

test("readOverride handles whitespace, case, empty, and unknown values", () => {
  assert.deepEqual(detectSuperpowers({ SUPERLOOPY_SUPERPOWERS: "  ON  " }, "/nope"), { installed: true, source: "env-override" });
  assert.deepEqual(detectSuperpowers({ SUPERLOOPY_SUPERPOWERS: "OfF" }, "/nope"), { installed: false, source: "env-override" });
  // Empty and unknown values fall through to filesystem auto-detection (not env-override).
  assert.equal(detectSuperpowers({ SUPERLOOPY_SUPERPOWERS: "" }, join(tmpdir(), "sl-none-1")).source, "filesystem");
  assert.equal(detectSuperpowers({ SUPERLOOPY_SUPERPOWERS: "maybe" }, join(tmpdir(), "sl-none-2")).source, "filesystem");
});

test("detectSuperpowers ignores a using-superpowers directory with no SKILL.md", async () => {
  const home = await tempHome();
  const skillDir = join(home, ".claude", "plugins", "marketplaces", "obra", "skills", "using-superpowers");
  await mkdir(skillDir, { recursive: true });
  // A bare directory that only shares the signature name must not count as installed.
  assert.equal(detectSuperpowers({}, home).installed, false);
});

test("detectSuperpowers reaches a deeply nested cache layout (depth cap has margin)", async () => {
  const home = await tempHome();
  // Signature nested well below the plugins root, mirroring host cache layouts that
  // add marketplace/plugin/hash segments. Would be missed by a shallower depth cap.
  const deep = join(home, ".codex", "plugins", "a", "b", "c", "d", "e", "f", "g", "using-superpowers");
  await mkdir(deep, { recursive: true });
  await writeFile(join(deep, "SKILL.md"), "# using superpowers\n");
  assert.equal(detectSuperpowers({}, home).installed, true);
});

test("detectSuperpowers never throws on malformed env or home values", () => {
  // Truthy non-string env values must not blow up path.join; the no-throw contract is
  // load-bearing for the hook and for doctor forwarding arbitrary options.
  assert.doesNotThrow(() => detectSuperpowers({ CODEX_HOME: [] }, "/root"));
  assert.doesNotThrow(() => detectSuperpowers({ CLAUDE_CONFIG_DIR: {} }, "/root"));
  assert.doesNotThrow(() => detectSuperpowers({ CLAUDE_PLUGIN_ROOT: 42 }, "/root"));
  assert.doesNotThrow(() => detectSuperpowers({}, 42));
  assert.deepEqual(detectSuperpowers(null, "/root"), { installed: false, source: "filesystem" });
  // checkInterop must also honor the no-throw contract for hostile/null options.
  assert.doesNotThrow(() => checkInterop({ env: null }));
  assert.equal(checkInterop({ env: null }).ok, true);
  assert.doesNotThrow(() => checkInterop(null));
  assert.equal(checkInterop(null).ok, true);
  assert.doesNotThrow(() => checkInterop({ get env() { throw new Error("hostile"); } }));
});
