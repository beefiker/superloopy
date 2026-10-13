import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { SUPERLOOPY_AGENT_NAMES } from "../src/agents.js";
import { runSessionStartHook } from "../src/hooks.js";
import { resolveModelResolutionStatePath } from "../src/model-resolution.js";
import { expectedRemoveCommand, LEGACY_AGENT_NAMES, writeLegacyFleet } from "./helpers/legacy-fleet.js";

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

function fullCatalog() {
  return {
    ok: true,
    source: "model_list",
    models: [
      { id: "gpt-6.1-sol", reasoningEfforts: ["high", "xhigh"], serviceTiers: ["priority"] },
      { id: "gpt-6-sol", reasoningEfforts: ["high", "xhigh"], serviceTiers: ["priority"] },
      { id: "gpt-6-luna", reasoningEfforts: ["low"], serviceTiers: ["fast"] },
      { id: "gpt-5.6-terra", reasoningEfforts: ["high"], serviceTiers: ["priority"] },
      { id: "gpt-5.6-sol", reasoningEfforts: ["xhigh"], serviceTiers: ["priority"] },
      { id: "gpt-5.6-luna", reasoningEfforts: ["low"], serviceTiers: ["fast"] }
    ]
  };
}

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "superloopy-session-migration-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const codexHome = join(root, "codex-home");
  const targetDir = join(codexHome, "agents");
  const binDir = join(root, "bin");
  const homeDir = join(root, "home");
  const statePath = resolveModelResolutionStatePath({ CODEX_HOME: codexHome }, homeDir);
  const wrapperPath = join(binDir, process.platform === "win32" ? "superloopy.cmd" : "superloopy");
  await mkdir(targetDir, { recursive: true });
  await mkdir(binDir, { recursive: true });
  await writeLegacyFleet(targetDir);
  await writeFile(wrapperPath, legacyGeneratedWrapper(), "utf8");
  const env = {
    CODEX_HOME: codexHome,
    SUPERLOOPY_BIN_DIR: binDir,
    SUPERLOOPY_AUTO_UPDATE_DISABLED: "1",
    PATH: `${binDir}${delimiter}${process.env.PATH ?? ""}`
  };
  return { root, env, homeDir, targetDir, statePath, wrapperPath };
}

function legacyGeneratedWrapper() {
  return process.platform === "win32"
    ? "@echo off\r\n@rem superloopy-generated bin shim\r\nnode \"C:\\old\\superloopy\\src\\cli.js\" %*\r\n"
    : "#!/usr/bin/env sh\n# superloopy-generated bin shim\nexec node '/old/superloopy/src/cli.js' \"$@\"\n";
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function migrationCommandPattern() {
  return /superloopy (?:agents )?install|node .*src[\\/]cli\.js.*install|--force/iu;
}

test("SessionStart automatically migrates a legacy fleet and stale generated wrapper once", async (t) => {
  const setup = await fixture(t);
  const personalPath = join(setup.targetDir, "personal.toml");
  const personal = "name = \"personal\"\nmodel = \"custom\"\n";
  await writeFile(personalPath, personal, "utf8");

  const first = await runSessionStartHook(
    { hook_event_name: "SessionStart", cwd: setup.root },
    {
      env: setup.env,
      homeDir: setup.homeDir,
      policyRoot: REPO_ROOT,
      statePath: setup.statePath,
      clock: () => new Date("2026-07-10T12:00:00.000Z"),
      queryModelCatalog: async () => fullCatalog()
    }
  );

  const context = JSON.parse(first).hookSpecificOutput.additionalContext;
  assert.match(context, /Superloopy automatic migration/u);
  assert.match(context, /restart Codex/iu);
  assert.doesNotMatch(context, migrationCommandPattern());
  assert.equal(await readFile(personalPath, "utf8"), personal);
  for (const name of SUPERLOOPY_AGENT_NAMES) {
    assert.match(await readFile(join(setup.targetDir, `${name}.toml`), "utf8"), /^# superloopy-managed-agent v1$/mu);
  }
  for (const name of LEGACY_AGENT_NAMES) assert.equal(await exists(join(setup.targetDir, `${name}.toml`)), false);
  assert.equal(await exists(setup.statePath), true);
  assert.match(await readFile(setup.wrapperPath, "utf8"), new RegExp(escapeRegex(join(REPO_ROOT, "src", "cli.js")), "u"));

  const stateMtime = (await stat(setup.statePath)).mtimeMs;
  let queries = 0;
  const second = await runSessionStartHook(
    { hook_event_name: "SessionStart", cwd: setup.root },
    {
      env: setup.env,
      homeDir: setup.homeDir,
      policyRoot: REPO_ROOT,
      statePath: setup.statePath,
      clock: () => new Date("2026-07-10T12:01:00.000Z"),
      queryModelCatalog: async () => { queries += 1; throw new Error("fresh state must not query"); }
    }
  );

  assert.equal(second, "");
  assert.equal(queries, 0);
  assert.equal((await stat(setup.statePath)).mtimeMs, stateMtime);
});

test("SessionStart keeps an edited pre-rename agent file and reports its exact removal command", async (t) => {
  const setup = await fixture(t);
  const editedPath = join(setup.targetDir, "zoro.toml");
  const edited = `${await readFile(editedPath, "utf8")}# personal edit\n`;
  await writeFile(editedPath, edited, "utf8");

  const output = await runSessionStartHook(
    { hook_event_name: "SessionStart", cwd: setup.root },
    {
      env: setup.env,
      homeDir: setup.homeDir,
      policyRoot: REPO_ROOT,
      statePath: setup.statePath,
      compatibility: true
    }
  );

  const context = JSON.parse(output).hookSpecificOutput.additionalContext;
  assert.match(context, /Superloopy automatic migration/u);
  assert.match(context, /- zoro \(renamed to sentinel\): retired-kept; not provably Superloopy-owned, remove manually: /u);
  assert.ok(context.includes(expectedRemoveCommand(editedPath)));
  assert.doesNotMatch(context, migrationCommandPattern());
  assert.equal(await exists(setup.statePath), true);
  assert.equal(await readFile(editedPath, "utf8"), edited);
  for (const name of LEGACY_AGENT_NAMES.filter((name) => name !== "zoro")) {
    assert.equal(await exists(join(setup.targetDir, `${name}.toml`)), false);
  }
});

test("SessionStart keeps a foreign wrapper separate from a successful fleet migration", async (t) => {
  const setup = await fixture(t);
  const foreignWrapper = process.platform === "win32"
    ? "@echo off\r\necho personal wrapper\r\n"
    : "#!/usr/bin/env sh\necho personal wrapper\n";
  await writeFile(setup.wrapperPath, foreignWrapper, "utf8");

  const output = await runSessionStartHook(
    { hook_event_name: "SessionStart", cwd: setup.root },
    {
      env: setup.env,
      homeDir: setup.homeDir,
      policyRoot: REPO_ROOT,
      statePath: setup.statePath,
      compatibility: true
    }
  );

  const context = JSON.parse(output).hookSpecificOutput.additionalContext;
  assert.match(context, /restart Codex/iu);
  assert.match(context, /preserved.*unrecognized.*wrapper/iu);
  assert.doesNotMatch(context, migrationCommandPattern());
  assert.equal(await readFile(setup.wrapperPath, "utf8"), foreignWrapper);
  assert.equal(await exists(setup.statePath), true);
  for (const name of SUPERLOOPY_AGENT_NAMES) {
    assert.match(await readFile(join(setup.targetDir, `${name}.toml`), "utf8"), /^# superloopy-managed-agent v1$/mu);
  }
});

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
