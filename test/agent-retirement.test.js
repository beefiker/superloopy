import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { installAgents, SUPERLOOPY_AGENT_NAMES } from "../src/agents.js";
import { RETIRED_AGENT_NAMES } from "../src/agent-names.js";
import { checkInstalledModelPolicy } from "../src/installed-model-policy.js";
import { commitManagedAgentFiles, MANAGED_AGENT_MARKER, preflightManagedAgentFiles } from "../src/managed-agents.js";
import { resolveModelResolutionStatePath } from "../src/model-resolution.js";
import { expectedRemoveCommand, LEGACY_AGENT_NAMES, legacyAgentContent } from "./helpers/legacy-fleet.js";

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const NOW = new Date("2026-07-10T12:00:00.000Z");
const PERSONAL = "name = \"personal\"\nmodel = \"custom\"\n";

function fullCatalog() {
  return [
    { id: "gpt-6.1-sol", reasoningEfforts: ["high", "xhigh"], serviceTiers: ["priority"] },
    { id: "gpt-6-sol", reasoningEfforts: ["high", "xhigh"], serviceTiers: ["priority"] },
    { id: "gpt-6-luna", reasoningEfforts: ["low"], serviceTiers: ["fast"] },
    { id: "gpt-5.6-terra", reasoningEfforts: ["high"], serviceTiers: ["priority"] },
    { id: "gpt-5.6-sol", reasoningEfforts: ["xhigh"], serviceTiers: ["priority"] },
    { id: "gpt-5.6-luna", reasoningEfforts: ["low"], serviceTiers: ["fast"] }
  ];
}

function sha256(content) {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

// A pre-rename managed install: marker-prefixed files under the retired names plus the
// model-resolution state that recorded their hashes under the same retired names.
async function oldManagedFleet(t) {
  const root = await mkdtemp(join(tmpdir(), "superloopy-agent-retirement-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const codexHome = join(root, "codex-home");
  const homeDir = join(root, "home");
  const targetDir = join(codexHome, "agents");
  const statePath = resolveModelResolutionStatePath({ CODEX_HOME: codexHome }, homeDir);
  await mkdir(targetDir, { recursive: true });
  await mkdir(dirname(statePath), { recursive: true });
  const files = {};
  const contents = {};
  for (const name of LEGACY_AGENT_NAMES) {
    contents[name] = `${MANAGED_AGENT_MARKER}\n${await legacyAgentContent(name)}`;
    files[name] = { sha256: sha256(contents[name]) };
    await writeFile(join(targetDir, `${name}.toml`), contents[name], "utf8");
  }
  const canonicalTarget = await realpath(targetDir);
  await writeFile(statePath, `${JSON.stringify({ schemaVersion: 1, policyVersion: 1, targetDir: canonicalTarget, files }, null, 2)}\n`, "utf8");
  await writeFile(join(targetDir, "personal.toml"), PERSONAL, "utf8");
  return {
    root,
    targetDir,
    canonicalTarget,
    statePath,
    contents,
    options: {
      env: { CODEX_HOME: codexHome },
      homeDir,
      policyRoot: REPO_ROOT,
      statePath,
      clock: () => NOW,
      queryModelCatalog: async () => ({ ok: true, source: "model_list", models: fullCatalog() })
    }
  };
}

function install(setup, argv = []) {
  return installAgents(setup.root, ["--target", setup.targetDir, ...argv], setup.options);
}

test("install retires a managed pre-rename fleet proven by the previous state and installs the six current lanes", async (t) => {
  const setup = await oldManagedFleet(t);

  const result = await install(setup);

  assert.equal(result.ok, true);
  assert.equal(result.restartRequired, true);
  assert.deepEqual(result.agents.map(({ name, status }) => [name, status]), SUPERLOOPY_AGENT_NAMES.map((name) => [name, "installed"]));
  assert.deepEqual(result.retired.map(({ name, replacement, status }) => [name, replacement, status]),
    Object.entries(RETIRED_AGENT_NAMES).map(([name, replacement]) => [name, replacement, "retired"]));
  for (const name of LEGACY_AGENT_NAMES) assert.equal(await exists(join(setup.targetDir, `${name}.toml`)), false);
  for (const name of SUPERLOOPY_AGENT_NAMES) {
    assert.match(await readFile(join(setup.targetDir, `${name}.toml`), "utf8"), /^# superloopy-managed-agent v1$/mu);
  }
  assert.equal(await readFile(join(setup.targetDir, "personal.toml"), "utf8"), PERSONAL);
  assert.deepEqual(Object.keys(JSON.parse(await readFile(setup.statePath, "utf8")).files), SUPERLOOPY_AGENT_NAMES);

  const again = await install(setup);
  assert.deepEqual(again.retired, []);
  assert.equal(again.restartRequired, false);
});

test("an edited managed pre-rename file is kept and reported, and the doctor keeps warning about it", async (t) => {
  const setup = await oldManagedFleet(t);
  const editedPath = join(setup.targetDir, "robin.toml");
  const edited = `${setup.contents.robin}# my tweak\n`;
  await writeFile(editedPath, edited, "utf8");

  const result = await install(setup);

  assert.equal(result.ok, true);
  const robin = result.retired.find(({ name }) => name === "robin");
  assert.deepEqual(robin, { name: "robin", replacement: "assayer", target: editedPath, status: "retired-kept", removeCommand: expectedRemoveCommand(editedPath) });
  assert.ok(result.retired.filter(({ name }) => name !== "robin").every(({ status }) => status === "retired"));
  assert.equal(await readFile(editedPath, "utf8"), edited);
  assert.match(result.next, new RegExp(`kept 1 pre-rename agent file.*${expectedRemoveCommand(editedPath).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}`, "u"));

  const doctor = await checkInstalledModelPolicy(REPO_ROOT, { env: setup.options.env, homeDir: setup.options.homeDir, statePath: setup.statePath, clock: () => NOW });
  assert.equal(doctor.ok, true);
  assert.equal(doctor.warning, true);
  assert.deepEqual(doctor.retiredAgents.map(({ name, replacement, removeCommand }) => [name, replacement, removeCommand]), [
    ["robin", "assayer", expectedRemoveCommand(join(setup.canonicalTarget, "robin.toml"))]
  ]);
  assert.match(doctor.message, /Pre-rename agent files remain .*robin\.toml.*Codex still loads them/u);
});

test("--force retires an edited managed pre-rename file but never an unmarked one", async (t) => {
  const setup = await oldManagedFleet(t);
  await writeFile(join(setup.targetDir, "zoro.toml"), `${setup.contents.zoro}# my tweak\n`, "utf8");
  const unmarkedPath = join(setup.targetDir, "nami.toml");
  const unmarked = "name = \"nami\"\nmodel = \"my-own\"\n";
  await writeFile(unmarkedPath, unmarked, "utf8");

  const result = await install(setup, ["--force"]);

  assert.equal(result.ok, true);
  assert.equal(result.retired.find(({ name }) => name === "zoro").status, "retired");
  assert.equal(result.retired.find(({ name }) => name === "nami").status, "retired-kept");
  assert.equal(await exists(join(setup.targetDir, "zoro.toml")), false);
  assert.equal(await readFile(unmarkedPath, "utf8"), unmarked);
});

test("a pre-rename state with a different target proves nothing about this directory", async (t) => {
  const setup = await oldManagedFleet(t);
  const state = JSON.parse(await readFile(setup.statePath, "utf8"));
  await writeFile(setup.statePath, JSON.stringify({ ...state, targetDir: join(setup.root, "elsewhere") }), "utf8");

  const result = await install(setup);

  assert.equal(result.ok, true);
  assert.ok(result.retired.every(({ status }) => status === "retired-kept"));
  for (const name of LEGACY_AGENT_NAMES) {
    assert.equal(await readFile(join(setup.targetDir, `${name}.toml`), "utf8"), setup.contents[name]);
  }
});

test("a failed commit restores every retired file and leaves no current lane behind", async (t) => {
  const setup = await oldManagedFleet(t);
  const files = SUPERLOOPY_AGENT_NAMES.map((name) => ({
    name,
    source: join(REPO_ROOT, ".codex", "agents", `${name}.toml`),
    target: join(setup.canonicalTarget, `${name}.toml`),
    content: `${MANAGED_AGENT_MARKER}\nname = "${name}"\n`,
    sha256: sha256(`${MANAGED_AGENT_MARKER}\nname = "${name}"\n`)
  }));
  const retiredFileManifest = JSON.parse(await readFile(setup.statePath, "utf8")).files;
  const preflight = await preflightManagedAgentFiles(files, { targetDir: setup.canonicalTarget, retiredFileManifest });
  assert.equal(preflight.ok, true);
  assert.ok(preflight.retired.every(({ status }) => status === "retired"));

  await assert.rejects(commitManagedAgentFiles(preflight.files, setup.statePath, {}, true, {
    retired: preflight.retired,
    writeState: async () => {
      for (const name of LEGACY_AGENT_NAMES) assert.equal(await exists(join(setup.targetDir, `${name}.toml`)), false);
      throw new Error("injected state failure");
    }
  }), /injected state failure/u);

  for (const name of LEGACY_AGENT_NAMES) {
    assert.equal(await readFile(join(setup.targetDir, `${name}.toml`), "utf8"), setup.contents[name]);
  }
  for (const name of SUPERLOOPY_AGENT_NAMES) assert.equal(await exists(join(setup.targetDir, `${name}.toml`)), false);
  assert.equal(await readFile(join(setup.targetDir, "personal.toml"), "utf8"), PERSONAL);
  assert.deepEqual(Object.keys(JSON.parse(await readFile(setup.statePath, "utf8")).files), LEGACY_AGENT_NAMES);
});
