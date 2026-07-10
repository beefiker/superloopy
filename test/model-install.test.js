import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, mkdir, mkdtemp, readFile, readdir, rm, stat, unlink, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  bootstrapSuperloopy,
  formatAgentsInstallResult,
  installAgents,
  SUPERLOOPY_AGENT_NAMES
} from "../src/agents.js";
import { commitManagedAgentFiles } from "../src/managed-agents.js";
import { resolveModelResolutionStatePath } from "../src/model-resolution.js";

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const NOW = new Date("2026-07-10T12:00:00.000Z");
const MANAGED_MARKER = "# superloopy-managed-agent v1";

function fullCatalog() {
  return [
    { id: "gpt-5.6-terra", reasoningEfforts: ["high"], serviceTiers: ["priority"] },
    { id: "gpt-5.6-sol", reasoningEfforts: ["xhigh"], serviceTiers: ["priority"] },
    { id: "gpt-5.6-luna", reasoningEfforts: ["low"], serviceTiers: ["fast"] },
    { id: "gpt-5.5", reasoningEfforts: ["low", "high", "xhigh"], serviceTiers: ["fast", "priority"] }
  ];
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "superloopy-model-install-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const sourceDir = join(root, "source-agents");
  const codexHome = join(root, "codex-home");
  const targetDir = join(root, "explicit-target");
  const statePath = resolveModelResolutionStatePath({ CODEX_HOME: codexHome }, join(root, "home"));
  await mkdir(sourceDir, { recursive: true });
  for (const name of SUPERLOOPY_AGENT_NAMES) {
    const content = await readFile(join(REPO_ROOT, ".codex", "agents", `${name}.toml`), "utf8");
    await writeFile(join(sourceDir, `${name}.toml`), content, "utf8");
  }
  return {
    root,
    sourceDir,
    codexHome,
    targetDir,
    statePath,
    env: { CODEX_HOME: codexHome },
    options: {
      env: { CODEX_HOME: codexHome },
      homeDir: join(root, "home"),
      sourceDir,
      policyRoot: REPO_ROOT,
      statePath,
      clock: () => NOW
    }
  };
}

async function installCompatibility(setup, overrides = {}, argv = ["--compat", "--target", setup.targetDir]) {
  return installAgents(setup.root, argv, { ...setup.options, compatibility: true, ...overrides });
}

async function readState(setup) {
  return JSON.parse(await readFile(setup.statePath, "utf8"));
}

test("first unknown install conservatively writes a complete managed compatibility fleet and state", async (t) => {
  const setup = await fixture(t);
  let queries = 0;

  const result = await installAgents(setup.root, ["--target", setup.targetDir], {
    ...setup.options,
    queryModelCatalog: async () => {
      queries += 1;
      return { ok: false, source: "model_list", reason: "timeout", stderr: "secret" };
    }
  });

  assert.equal(result.ok, true);
  assert.equal(queries, 1);
  assert.equal(result.degraded, true);
  assert.equal(result.restartRequired, true);
  assert.equal(result.modelResolution.statePath, setup.statePath);
  assert.equal(result.modelResolution.cacheStatus, "unknown_compatibility");
  assert.equal(result.modelResolution.catalogReason, "timeout");
  assert.doesNotMatch(JSON.stringify(result), /secret/u);
  assert.deepEqual(result.agents.map(({ status }) => status), SUPERLOOPY_AGENT_NAMES.map(() => "installed"));
  for (const agent of result.agents) {
    assert.equal(agent.resolvedModel, "gpt-5.5");
    assert.equal(agent.reason, "compatibility_fallback");
    assert.equal(agent.checkedAt, NOW.toISOString());
    const content = await readFile(agent.target, "utf8");
    assert.equal(content.split("\n")[0], MANAGED_MARKER);
    assert.equal(content.match(/^# superloopy-managed-agent v1$/gmu)?.length, 1);
    assert.match(content, new RegExp(`name = "${agent.name}"`, "u"));
    assert.match(content, /^model = "gpt-5\.5"$/mu);
    assert.match(content, /^developer_instructions = """$/mu);
  }
  const state = await readState(setup);
  assert.equal(state.targetDir, setup.targetDir);
  assert.equal(state.selectionReason, "probe_unknown_compatibility");
  assert.deepEqual(Object.keys(state.files), SUPERLOOPY_AGENT_NAMES);
  for (const name of SUPERLOOPY_AGENT_NAMES) {
    const content = await readFile(join(setup.targetDir, `${name}.toml`), "utf8");
    assert.equal(state.files[name].sha256, createHash("sha256").update(content, "utf8").digest("hex"));
  }
});

test("preferred install uses the package policy root even when cwd is unrelated", async (t) => {
  const setup = await fixture(t);
  const result = await installAgents(setup.root, ["--target", setup.targetDir], {
    ...setup.options,
    policyRoot: undefined,
    queryModelCatalog: async () => ({ ok: true, source: "model_list", models: fullCatalog() })
  });

  assert.equal(result.ok, true);
  assert.equal(result.modelResolution.policyVersion, "2026-07-10");
  assert.equal(result.modelResolution.selectionReason, "catalog_resolved");
  assert.equal(result.degraded, false);
  assert.equal(result.agents.find(({ name }) => name === "zoro").resolvedModel, "gpt-5.6-sol");
  assert.match(await readFile(join(setup.targetDir, "nami.toml"), "utf8"), /^model = "gpt-5\.6-luna"$/mu);
});

test("fresh manifest reuses exact files without querying or rewriting state", async (t) => {
  const setup = await fixture(t);
  await installCompatibility(setup);
  const oldTime = new Date("2000-01-01T00:00:00.000Z");
  await utimes(setup.statePath, oldTime, oldTime);
  let queries = 0;

  const result = await installAgents(setup.root, ["--target", setup.targetDir], {
    ...setup.options,
    queryModelCatalog: async () => {
      queries += 1;
      throw new Error("fresh state must not query");
    }
  });

  assert.equal(result.ok, true);
  assert.equal(queries, 0);
  assert.equal(result.modelResolution.cacheStatus, "fresh");
  assert.equal(result.restartRequired, false);
  assert.deepEqual(result.agents.map(({ status }) => status), SUPERLOOPY_AGENT_NAMES.map(() => "unchanged"));
  assert.equal((await stat(setup.statePath)).mtimeMs, oldTime.getTime());
  assert.doesNotMatch(formatAgentsInstallResult(result), /Restart Codex/u);
});

test("explicit refresh updates a managed preferred fleet to compatibility and persists hashes", async (t) => {
  const setup = await fixture(t);
  await installAgents(setup.root, ["--target", setup.targetDir], {
    ...setup.options,
    queryModelCatalog: async () => ({ ok: true, source: "model_list", models: fullCatalog() })
  });
  let queries = 0;

  const result = await installAgents(setup.root, ["--target", setup.targetDir, "--refresh-models"], {
    ...setup.options,
    queryModelCatalog: async () => {
      queries += 1;
      return { ok: true, source: "model_list", models: fullCatalog().filter(({ id }) => id === "gpt-5.5") };
    }
  });

  assert.equal(result.ok, true);
  assert.equal(queries, 1);
  assert.equal(result.modelResolution.cacheStatus, "refreshed");
  assert.equal(result.degraded, true);
  assert.equal(result.restartRequired, true);
  assert.deepEqual(result.agents.map(({ status }) => status), SUPERLOOPY_AGENT_NAMES.map(() => "updated"));
  assert.deepEqual(new Set(result.agents.map(({ resolvedModel }) => resolvedModel)), new Set(["gpt-5.5"]));
  const state = await readState(setup);
  assert.deepEqual(new Set(Object.values(state.agents).map(({ resolvedModel }) => resolvedModel)), new Set(["gpt-5.5"]));
});

test("explicit compatibility wins over refresh and performs no catalog query", async (t) => {
  const setup = await fixture(t);
  let queries = 0;
  const result = await installAgents(setup.root, ["--target", setup.targetDir, "--compat", "--refresh-models"], {
    ...setup.options,
    queryModelCatalog: async () => {
      queries += 1;
      throw new Error("compatibility must win");
    }
  });

  assert.equal(result.ok, true);
  assert.equal(queries, 0);
  assert.equal(result.modelResolution.selectionReason, "compatibility_override");
});

test("user edits, removed markers, and foreign files conflict without changing state", async (t) => {
  const cases = [
    ["user edit", (content) => `${content}# local edit\n`],
    ["marker removed", (content) => content.replace(`${MANAGED_MARKER}\n`, "")],
    ["foreign", () => "name = \"foreign\"\n"]
  ];
  for (const [label, mutate] of cases) {
    await t.test(label, async (t) => {
      const setup = await fixture(t);
      await installCompatibility(setup);
      const target = join(setup.targetDir, "franky.toml");
      const changed = mutate(await readFile(target, "utf8"));
      await writeFile(target, changed, "utf8");
      const beforeState = await readFile(setup.statePath, "utf8");

      const result = await installCompatibility(setup);

      assert.equal(result.ok, false);
      assert.equal(result.restartRequired, false);
      assert.equal(result.agents.find(({ name }) => name === "franky").status, "conflict");
      assert.deepEqual(result.agents.filter(({ name }) => name !== "franky").map(({ status }) => status),
        SUPERLOOPY_AGENT_NAMES.slice(1).map(() => "unchanged"));
      assert.equal(await readFile(target, "utf8"), changed);
      assert.equal(await readFile(setup.statePath, "utf8"), beforeState);
    });
  }
});

test("one conflict blocks every other would-write file with no partial fleet or state change", async (t) => {
  const setup = await fixture(t);
  await installCompatibility(setup);
  const zoroTarget = join(setup.targetDir, "zoro.toml");
  const oldZoro = await readFile(zoroTarget, "utf8");
  const zoroSource = join(setup.sourceDir, "zoro.toml");
  await writeFile(zoroSource, (await readFile(zoroSource, "utf8")).replace("Independent code reviewer", "Skeptical code reviewer"), "utf8");
  await writeFile(join(setup.targetDir, "franky.toml"), "foreign\n", "utf8");
  await unlink(join(setup.targetDir, "nami.toml"));
  const beforeState = await readFile(setup.statePath, "utf8");

  const result = await installCompatibility(setup);

  assert.equal(result.ok, false);
  assert.equal(result.restartRequired, false);
  assert.equal(result.agents.find(({ name }) => name === "franky").status, "conflict");
  assert.equal(result.agents.find(({ name }) => name === "zoro").status, "blocked");
  assert.equal(result.agents.find(({ name }) => name === "nami").status, "blocked");
  assert.equal(await readFile(zoroTarget, "utf8"), oldZoro);
  assert.equal(await exists(join(setup.targetDir, "nami.toml")), false);
  assert.equal(await readFile(setup.statePath, "utf8"), beforeState);
});

test("failed staging write cleans a partially created temporary agent file", async (t) => {
  const setup = await fixture(t);
  const target = join(setup.targetDir, "franky.toml");
  let partialPath;

  await assert.rejects(commitManagedAgentFiles([
    { name: "franky", target, status: "installed", content: "managed\n" }
  ], setup.statePath, {}, false, {
    writeFile: async (path) => {
      partialPath = path;
      await writeFile(path, "partial\n", "utf8");
      throw new Error("injected staging failure");
    }
  }), /injected staging failure/u);

  assert.equal(await exists(partialPath), false);
  assert.deepEqual(await readdir(setup.targetDir), []);
  assert.equal(await exists(target), false);
  assert.equal(await exists(setup.statePath), false);
});

test("force replaces a foreign file and options.force overrides argv", async (t) => {
  const setup = await fixture(t);
  await mkdir(setup.targetDir, { recursive: true });
  const target = join(setup.targetDir, "franky.toml");
  await writeFile(target, "foreign\n", "utf8");

  const blocked = await installCompatibility(setup, { force: false }, ["--target", setup.targetDir, "--force", "--compat"]);
  assert.equal(blocked.ok, false);
  assert.equal(await readFile(target, "utf8"), "foreign\n");

  const forced = await installCompatibility(setup, { force: true }, ["--target", setup.targetDir, "--compat"]);
  assert.equal(forced.ok, true);
  assert.equal(forced.agents.find(({ name }) => name === "franky").status, "updated");
  assert.match(await readFile(target, "utf8"), /^# superloopy-managed-agent v1$/mu);
});

test("template and resolution failures are structured and perform zero writes", async (t) => {
  await t.test("template failure", async (t) => {
    const setup = await fixture(t);
    const source = join(setup.sourceDir, "nami.toml");
    await writeFile(source, `${await readFile(source, "utf8")}model = "duplicate"\n`, "utf8");

    const result = await installCompatibility(setup);

    assert.equal(result.ok, false);
    assert.equal(result.restartRequired, false);
    assert.match(result.modelResolution.error, /nami.*exactly one.*model/iu);
    assert.equal(await exists(setup.targetDir), false);
    assert.equal(await exists(setup.statePath), false);
  });

  await t.test("existing managed marker is rejected", async (t) => {
    const setup = await fixture(t);
    const source = join(setup.sourceDir, "nami.toml");
    await writeFile(source, `${await readFile(source, "utf8")}${MANAGED_MARKER}\n`, "utf8");

    const result = await installCompatibility(setup);

    assert.equal(result.ok, false);
    assert.match(result.modelResolution.error, /managed marker/iu);
    assert.equal(await exists(setup.targetDir), false);
  });

  await t.test("resolution failure", async (t) => {
    const setup = await fixture(t);
    const result = await installAgents(setup.root, ["--target", setup.targetDir], {
      ...setup.options,
      queryModelCatalog: async () => ({ ok: true, source: "model_list", models: [] })
    });

    assert.equal(result.ok, false);
    assert.equal(result.restartRequired, false);
    assert.match(result.modelResolution.error, /No fully supported model tuple/u);
    assert.equal(await exists(setup.targetDir), false);
    assert.equal(await exists(setup.statePath), false);
  });
});

test("routing fields inside a TOML table are preserved and are not counted as top-level", async (t) => {
  const setup = await fixture(t);
  const source = join(setup.sourceDir, "nami.toml");
  await writeFile(source, `${await readFile(source, "utf8")}\n[metadata]\nmodel = "documentation-only"\n`, "utf8");

  const result = await installCompatibility(setup);

  assert.equal(result.ok, true);
  const installed = await readFile(join(setup.targetDir, "nami.toml"), "utf8");
  assert.match(installed, /^model = "gpt-5\.5"$/mu);
  assert.match(installed, /\[metadata\]\nmodel = "documentation-only"/u);
});

test("bootstrap propagates resolution injections and Claude bootstrap performs no Codex writes", async (t) => {
  await t.test("Codex propagation", async (t) => {
    const setup = await fixture(t);
    const explicitState = join(setup.root, "state", "manifest.json");
    const result = await bootstrapSuperloopy(setup.root, ["--target", setup.targetDir], {
      ...setup.options,
      statePath: explicitState,
      compatibility: true,
      force: true,
      env: { ...setup.env, SUPERLOOPY_BIN_DIR: join(setup.root, "bin"), PATH: join(setup.root, "bin") }
    });

    assert.equal(result.ok, true);
    assert.equal(result.restartRequired, true);
    assert.equal(result.agents.modelResolution.statePath, explicitState);
    assert.equal((await readState({ statePath: explicitState })).checkedAt, NOW.toISOString());
  });

  await t.test("Claude no-op", async (t) => {
    const setup = await fixture(t);
    let queries = 0;
    const result = await bootstrapSuperloopy(setup.root, ["--compat", "--force"], {
      ...setup.options,
      env: { ...setup.env, CLAUDE_PLUGIN_ROOT: REPO_ROOT },
      queryModelCatalog: async () => { queries += 1; throw new Error("must not query"); }
    });

    assert.equal(result.ok, true);
    assert.equal(result.host, "claude");
    assert.equal(result.restartRequired, false);
    assert.equal(queries, 0);
    assert.equal(await exists(setup.codexHome), false);
    assert.equal(await exists(setup.targetDir), false);
  });
});
