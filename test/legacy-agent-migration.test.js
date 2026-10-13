import assert from "node:assert/strict";
import { access, lstat, mkdir, mkdtemp, readFile, rm, symlink, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { installAgents, SUPERLOOPY_AGENT_NAMES } from "../src/agents.js";
import { RETIRED_AGENT_NAMES } from "../src/agent-names.js";
import { resolveModelResolutionStatePath } from "../src/model-resolution.js";
import { expectedRemoveCommand, LEGACY_AGENT_NAMES, writeLegacyFleet } from "./helpers/legacy-fleet.js";

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

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

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "superloopy-legacy-migration-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const codexHome = join(root, "codex-home");
  const targetDir = join(codexHome, "agents");
  const statePath = resolveModelResolutionStatePath({ CODEX_HOME: codexHome }, join(root, "home"));
  await mkdir(targetDir, { recursive: true });
  await writeLegacyFleet(targetDir);
  return {
    root,
    targetDir,
    statePath,
    options: {
      env: { CODEX_HOME: codexHome },
      homeDir: join(root, "home"),
      policyRoot: REPO_ROOT,
      statePath,
      clock: () => new Date("2026-07-10T12:00:00.000Z"),
      queryModelCatalog: async () => ({ ok: true, source: "model_list", models: fullCatalog() })
    }
  };
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function retiredStatuses(result) {
  return Object.fromEntries(result.retired.map(({ name, status }) => [name, status]));
}

async function assertCurrentFleetInstalled(setup, result) {
  assert.equal(result.ok, true);
  assert.deepEqual(result.agents.map(({ status }) => status), SUPERLOOPY_AGENT_NAMES.map(() => "installed"));
  for (const name of SUPERLOOPY_AGENT_NAMES) {
    assert.match(await readFile(join(setup.targetDir, `${name}.toml`), "utf8"), /^# superloopy-managed-agent v1$/mu);
  }
}

test("first managed install retires an exact pre-managed fleet and installs the renamed lanes without force", async (t) => {
  const setup = await fixture(t);
  const result = await installAgents(setup.root, ["--target", setup.targetDir], setup.options);

  await assertCurrentFleetInstalled(setup, result);
  assert.equal(result.restartRequired, true);
  assert.deepEqual(new Set(result.agents.map(({ resolvedModel }) => resolvedModel)), new Set([
    "gpt-6.1-sol",
    "gpt-6-luna"
  ]));
  assert.deepEqual(result.retired.map(({ name, replacement, status }) => [name, replacement, status]),
    Object.entries(RETIRED_AGENT_NAMES).map(([name, replacement]) => [name, replacement, "retired"]));
  for (const name of LEGACY_AGENT_NAMES) assert.equal(await exists(join(setup.targetDir, `${name}.toml`)), false);
  assert.equal(JSON.parse(await readFile(setup.statePath, "utf8")).selectionReason, "catalog_resolved");
});

test("legacy ownership accepts the same release files with CRLF checkout endings", async (t) => {
  const setup = await fixture(t);
  for (const name of LEGACY_AGENT_NAMES) {
    const path = join(setup.targetDir, `${name}.toml`);
    const content = await readFile(path, "utf8");
    await writeFile(path, content.replace(/\r?\n/gu, "\r\n"), "utf8");
  }

  const result = await installAgents(setup.root, ["--target", setup.targetDir], setup.options);

  await assertCurrentFleetInstalled(setup, result);
  assert.ok(result.retired.every(({ status }) => status === "retired"));
});

test("an edited pre-managed file is kept and reported with its removal command while proven files retire", async (t) => {
  const setup = await fixture(t);
  const editedPath = join(setup.targetDir, "zoro.toml");
  const edited = `${await readFile(editedPath, "utf8")}# user edit\n`;
  await writeFile(editedPath, edited, "utf8");

  const result = await installAgents(setup.root, ["--target", setup.targetDir], setup.options);

  await assertCurrentFleetInstalled(setup, result);
  assert.equal(retiredStatuses(result).zoro, "retired-kept");
  assert.equal(result.retired.find(({ name }) => name === "zoro").removeCommand, expectedRemoveCommand(editedPath));
  assert.match(result.next, /kept 1 pre-rename agent file/u);
  assert.equal(await readFile(editedPath, "utf8"), edited);
  for (const name of LEGACY_AGENT_NAMES.filter((name) => name !== "zoro")) {
    assert.equal(await exists(join(setup.targetDir, `${name}.toml`)), false);
  }
});

test("retirement preserves unrelated personal agents outside the retired names", async (t) => {
  const setup = await fixture(t);
  const personalPath = join(setup.targetDir, "personal.toml");
  const personal = "name = \"personal\"\nmodel = \"custom\"\n";
  await writeFile(personalPath, personal, "utf8");

  const result = await installAgents(setup.root, ["--target", setup.targetDir], setup.options);

  await assertCurrentFleetInstalled(setup, result);
  assert.ok(result.retired.every(({ status }) => status === "retired"));
  assert.equal(await readFile(personalPath, "utf8"), personal);
});

test("partial and symlinked legacy fleets retire only the provably owned files", async (t) => {
  await t.test("partial fleet", async (t) => {
    const setup = await fixture(t);
    await unlink(join(setup.targetDir, "nami.toml"));

    const result = await installAgents(setup.root, ["--target", setup.targetDir], setup.options);

    await assertCurrentFleetInstalled(setup, result);
    assert.deepEqual(result.retired.map(({ name }) => name), LEGACY_AGENT_NAMES.filter((name) => name !== "nami"));
    assert.ok(result.retired.every(({ status }) => status === "retired"));
  });

  await t.test("symlinked fleet", async (t) => {
    const setup = await fixture(t);
    const linkedPath = join(setup.targetDir, "usopp.toml");
    const linkedTarget = join(setup.root, "outside-usopp.toml");
    await writeFile(linkedTarget, await readFile(linkedPath, "utf8"), "utf8");
    await unlink(linkedPath);
    await symlink(linkedTarget, linkedPath);

    const result = await installAgents(setup.root, ["--target", setup.targetDir], setup.options);

    await assertCurrentFleetInstalled(setup, result);
    assert.equal(retiredStatuses(result).usopp, "retired-kept");
    assert.equal((await lstat(linkedPath)).isSymbolicLink(), true);
    assert.equal(await exists(linkedTarget), true);
    assert.equal(await exists(join(setup.targetDir, "franky.toml")), false);
  });
});

test("a personal file under a current lane name still blocks install and every retirement", async (t) => {
  const setup = await fixture(t);
  const personalPath = join(setup.targetDir, "forge.toml");
  await writeFile(personalPath, "name = \"forge\"\n", "utf8");

  const result = await installAgents(setup.root, ["--target", setup.targetDir], setup.options);

  assert.equal(result.ok, false);
  assert.equal(result.agents.find(({ name }) => name === "forge").status, "conflict");
  assert.ok(result.retired.every(({ status }) => status === "blocked"));
  for (const name of LEGACY_AGENT_NAMES) assert.equal(await exists(join(setup.targetDir, `${name}.toml`)), true);
  assert.equal(await exists(setup.statePath), false);
});
