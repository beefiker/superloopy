import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { installAgents, SUPERLOOPY_AGENT_NAMES } from "../src/agents.js";
import { resolveModelResolutionStatePath } from "../src/model-resolution.js";

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const LEGACY_MODELS = {
  franky: "gpt-5.5",
  zoro: "gpt-5.5",
  usopp: "gpt-5.5",
  jinbe: "gpt-5.5",
  robin: "gpt-5.5",
  nami: "gpt-5.4-mini"
};

function fullCatalog() {
  return [
    { id: "gpt-5.6-terra", reasoningEfforts: ["high"], serviceTiers: ["priority"] },
    { id: "gpt-5.6-sol", reasoningEfforts: ["xhigh"], serviceTiers: ["priority"] },
    { id: "gpt-5.6-luna", reasoningEfforts: ["low"], serviceTiers: ["fast"] },
    { id: "gpt-5.5", reasoningEfforts: ["low", "high", "xhigh"], serviceTiers: ["fast", "priority"] }
  ];
}

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "superloopy-legacy-migration-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const codexHome = join(root, "codex-home");
  const targetDir = join(codexHome, "agents");
  const statePath = resolveModelResolutionStatePath({ CODEX_HOME: codexHome }, join(root, "home"));
  await mkdir(targetDir, { recursive: true });
  for (const name of SUPERLOOPY_AGENT_NAMES) {
    const preferred = await readFile(join(REPO_ROOT, ".codex", "agents", `${name}.toml`), "utf8");
    await writeFile(
      join(targetDir, `${name}.toml`),
      preferred.replace(/^model = ".+"$/mu, `model = "${LEGACY_MODELS[name]}"`),
      "utf8"
    );
  }
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

test("first managed install adopts an exact pre-managed Superloopy fleet without force", async (t) => {
  const setup = await fixture(t);
  const result = await installAgents(setup.root, ["--target", setup.targetDir], setup.options);

  assert.equal(result.ok, true);
  assert.equal(result.restartRequired, true);
  assert.deepEqual(result.agents.map(({ status }) => status), SUPERLOOPY_AGENT_NAMES.map(() => "updated"));
  assert.deepEqual(new Set(result.agents.map(({ resolvedModel }) => resolvedModel)), new Set([
    "gpt-5.6-terra",
    "gpt-5.6-sol",
    "gpt-5.6-luna"
  ]));
  for (const name of SUPERLOOPY_AGENT_NAMES) {
    assert.match(await readFile(join(setup.targetDir, `${name}.toml`), "utf8"), /^# superloopy-managed-agent v1$/mu);
  }
  assert.equal(JSON.parse(await readFile(setup.statePath, "utf8")).selectionReason, "catalog_resolved");
});

test("legacy ownership accepts the same release files with CRLF checkout endings", async (t) => {
  const setup = await fixture(t);
  for (const name of SUPERLOOPY_AGENT_NAMES) {
    const path = join(setup.targetDir, `${name}.toml`);
    const content = await readFile(path, "utf8");
    await writeFile(path, content.replace(/\r?\n/gu, "\r\n"), "utf8");
  }

  const result = await installAgents(setup.root, ["--target", setup.targetDir], setup.options);

  assert.equal(result.ok, true);
  assert.deepEqual(result.agents.map(({ status }) => status), SUPERLOOPY_AGENT_NAMES.map(() => "updated"));
});

test("legacy adoption remains all-or-conflict when one pre-managed file was edited", async (t) => {
  const setup = await fixture(t);
  const editedPath = join(setup.targetDir, "zoro.toml");
  const edited = `${await readFile(editedPath, "utf8")}# user edit\n`;
  await writeFile(editedPath, edited, "utf8");

  const result = await installAgents(setup.root, ["--target", setup.targetDir], setup.options);

  assert.equal(result.ok, false);
  assert.deepEqual(result.agents.map(({ status }) => status), SUPERLOOPY_AGENT_NAMES.map(() => "conflict"));
  assert.equal(await readFile(editedPath, "utf8"), edited);
  assert.equal(await exists(setup.statePath), false);
});

test("legacy adoption preserves unrelated personal agents outside the six owned names", async (t) => {
  const setup = await fixture(t);
  const personalPath = join(setup.targetDir, "personal.toml");
  const personal = "name = \"personal\"\nmodel = \"custom\"\n";
  await writeFile(personalPath, personal, "utf8");

  const result = await installAgents(setup.root, ["--target", setup.targetDir], setup.options);

  assert.equal(result.ok, true);
  assert.deepEqual(result.agents.map(({ status }) => status), SUPERLOOPY_AGENT_NAMES.map(() => "updated"));
  assert.equal(await readFile(personalPath, "utf8"), personal);
});
