import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, stat, symlink, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { installAgents, SUPERLOOPY_AGENT_NAMES } from "../src/agents.js";
import { runDoctor } from "../src/doctor.js";
import { MODEL_RESOLUTION_TTL_MS, resolveModelResolutionStatePath } from "../src/model-resolution.js";

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

function compatibilityCatalog() {
  return [{
    id: "gpt-5.5",
    reasoningEfforts: ["low", "high", "xhigh"],
    serviceTiers: ["fast", "priority"]
  }];
}

async function fixture(t, { compatibility = false, clock = () => NOW, customTarget = false } = {}) {
  const root = await mkdtemp(join(tmpdir(), "superloopy-installed-doctor-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const codexHome = join(root, "codex-home");
  const homeDir = join(root, "home");
  const env = { CODEX_HOME: codexHome };
  const targetDir = customTarget ? join(root, "custom-agents") : join(codexHome, "agents");
  const statePath = resolveModelResolutionStatePath(env, homeDir);
  const argv = [
    ...(compatibility ? ["--compat"] : []),
    ...(customTarget ? ["--target", targetDir] : [])
  ];
  const result = await installAgents(REPO_ROOT, argv, {
    env,
    homeDir,
    policyRoot: REPO_ROOT,
    statePath,
    clock,
    compatibility,
    queryModelCatalog: async () => ({ ok: true, source: "model_list", models: fullCatalog() })
  });
  assert.equal(result.ok, true);
  return { root, codexHome, homeDir, env, targetDir, statePath };
}

function options(setup, overrides = {}) {
  return {
    installedModelPolicy: {
      env: setup.env,
      homeDir: setup.homeDir,
      clock: () => NOW,
      ...overrides
    }
  };
}

function installedCheck(result) {
  assert.ok(result.checks.installedModelPolicy, "doctor must include installedModelPolicy");
  return result.checks.installedModelPolicy;
}

async function readState(setup) {
  return JSON.parse(await readFile(setup.statePath, "utf8"));
}

async function writeState(setup, state) {
  await writeFile(setup.statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

async function snapshot(setup) {
  const paths = [setup.statePath, ...SUPERLOOPY_AGENT_NAMES.map((name) => join(setup.targetDir, `${name}.toml`))];
  return Promise.all(paths.map(async (path) => ({
    path,
    content: await readFile(path, "utf8"),
    mtimeMs: (await stat(path)).mtimeMs
  })));
}

function refreshAction(setup) {
  return `Run \`superloopy agents install --target "${setup.targetDir}" --refresh-models\` to refresh the managed routing state.`;
}

test("installed doctor treats absent state as healthy and makes zero catalog queries", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "superloopy-installed-absent-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  let queries = 0;
  const result = await runDoctor(REPO_ROOT, options({
    env: { CODEX_HOME: join(root, "codex-home") },
    homeDir: join(root, "home")
  }, {
    queryModelCatalog: async () => { queries += 1; throw new Error("must stay offline"); }
  }));
  const check = installedCheck(result);

  assert.equal(queries, 0);
  assert.deepEqual(
    { ok: check.ok, installed: check.installed, degraded: check.degraded, restartRequired: check.restartRequired },
    { ok: true, installed: false, degraded: false, restartRequired: false }
  );
  assert.equal(check.stale, false);
  assert.equal(check.selectionStatus, "not_installed");
  assert.equal(check.availabilityStatus, "not_checked");
  assert.deepEqual(check.agents, {});
});

test("programmatic doctor without installed options never reads process CODEX_HOME", async (t) => {
  const setup = await fixture(t);
  await unlink(join(setup.targetDir, "nami.toml"));
  const previous = process.env.CODEX_HOME;
  process.env.CODEX_HOME = setup.codexHome;
  try {
    const check = installedCheck(await runDoctor(REPO_ROOT));
    assert.equal(check.ok, true);
    assert.equal(check.installed, false);
    assert.equal(check.restartRequired, false);
  } finally {
    if (previous === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = previous;
  }
});

test("ordinary installed doctor reports preferred metadata and makes zero catalog queries", async (t) => {
  const setup = await fixture(t);
  let queries = 0;
  const check = installedCheck(await runDoctor(REPO_ROOT, options(setup, {
    queryModelCatalog: async () => { queries += 1; throw new Error("must stay offline"); }
  })));

  assert.equal(queries, 0);
  assert.deepEqual(
    {
      ok: check.ok,
      installed: check.installed,
      policyVersion: check.policyVersion,
      targetDir: check.targetDir,
      checkedAt: check.checkedAt,
      selectionStatus: check.selectionStatus,
      availabilityStatus: check.availabilityStatus,
      stale: check.stale,
      degraded: check.degraded,
      restartRequired: check.restartRequired
    },
    {
      ok: true,
      installed: true,
      policyVersion: "2026-07-10",
      targetDir: setup.targetDir,
      checkedAt: NOW.toISOString(),
      selectionStatus: "preferred",
      availabilityStatus: "not_checked",
      stale: false,
      degraded: false,
      restartRequired: false
    }
  );
  assert.deepEqual(Object.keys(check.agents), SUPERLOOPY_AGENT_NAMES);
  for (const agent of Object.values(check.agents)) {
    assert.equal(agent.requestedModel.startsWith("gpt-5.6-"), true);
    assert.equal(agent.requestedModel, agent.resolvedModel);
    assert.equal(agent.reason, "preferred_available");
    assert.equal(agent.status, "preferred");
    assert.deepEqual(Object.keys(agent).sort(), ["reason", "requestedModel", "resolvedModel", "status"]);
  }
  assert.doesNotMatch(JSON.stringify(check), /developer_instructions|superloopy-managed-agent/u);
});

test("installed doctor accepts compatibility routing as healthy degraded state", async (t) => {
  const setup = await fixture(t, { compatibility: true });
  const check = installedCheck(await runDoctor(REPO_ROOT, options(setup)));

  assert.equal(check.ok, true);
  assert.equal(check.installed, true);
  assert.equal(check.degraded, true);
  assert.equal(check.selectionStatus, "compatibility");
  assert.equal(check.restartRequired, false);
  assert.deepEqual(new Set(Object.values(check.agents).map(({ resolvedModel }) => resolvedModel)), new Set(["gpt-5.5"]));
  assert.deepEqual(new Set(Object.values(check.agents).map(({ status }) => status)), new Set(["compatibility"]));
});

test("installed doctor fails an exactly 24-hour stale state without requesting restart", async (t) => {
  const setup = await fixture(t);
  const state = await readState(setup);
  state.checkedAt = new Date(NOW.getTime() - MODEL_RESOLUTION_TTL_MS).toISOString();
  await writeState(setup, state);
  const check = installedCheck(await runDoctor(REPO_ROOT, options(setup)));

  assert.equal(check.ok, false);
  assert.equal(check.stale, true);
  assert.equal(check.restartRequired, false);
  assert.deepEqual(new Set(Object.values(check.agents).map(({ status }) => status)), new Set(["stale"]));
  assert.equal(check.next, refreshAction(setup));
});

test("installed doctor preserves a custom target in its repair command", async (t) => {
  const setup = await fixture(t, { customTarget: true });
  const state = await readState(setup);
  state.checkedAt = new Date(NOW.getTime() - MODEL_RESOLUTION_TTL_MS).toISOString();
  await writeState(setup, state);

  const check = installedCheck(await runDoctor(REPO_ROOT, options(setup)));

  assert.equal(check.next, refreshAction(setup));
});

test("installed doctor distinguishes mixed-profile and unsupported routing without leaking values", async (t) => {
  const cases = [
    ["mixed_profile", "zoro", ["gpt-5.6-terra", "high", "priority"], "mixed_profile"],
    ["unsupported_tuple", "nami", ["credential-secret-model", "low", "fast"], "unsupported_tuple"]
  ];
  for (const [label, name, tuple, expectedStatus] of cases) {
    await t.test(label, async (t) => {
      const setup = await fixture(t);
      const path = join(setup.targetDir, `${name}.toml`);
      let content = await readFile(path, "utf8");
      content = content
        .replace(/^model = "[^"]+"$/mu, `model = "${tuple[0]}"`)
        .replace(/^model_reasoning_effort = "[^"]+"$/mu, `model_reasoning_effort = "${tuple[1]}"`)
        .replace(/^service_tier = "[^"]+"$/mu, `service_tier = "${tuple[2]}"`);
      await writeFile(path, content, "utf8");

      const check = installedCheck(await runDoctor(REPO_ROOT, options(setup)));
      assert.equal(check.ok, false);
      assert.equal(check.restartRequired, true);
      assert.equal(check.agents[name].status, expectedStatus);
      assert.doesNotMatch(JSON.stringify(check), /credential-secret/u);
    });
  }
});

test("installed doctor distinguishes missing marker, missing file, and managed hash mismatch", async (t) => {
  const cases = [
    ["marker_missing", "franky", async (path) => writeFile(path, (await readFile(path, "utf8")).replace(`${MANAGED_MARKER}\n`, ""), "utf8")],
    ["missing", "robin", async (path) => unlink(path)],
    ["hash_mismatch", "usopp", async (path) => writeFile(path, `${await readFile(path, "utf8")}# tampered\n`, "utf8")],
    ["symlink", "jinbe", async (path) => {
      const external = `${path}.external`;
      await writeFile(external, await readFile(path, "utf8"), "utf8");
      await unlink(path);
      await symlink(external, path);
    }]
  ];
  for (const [expectedStatus, name, mutate] of cases) {
    await t.test(expectedStatus, async (t) => {
      const setup = await fixture(t);
      await mutate(join(setup.targetDir, `${name}.toml`));
      const check = installedCheck(await runDoctor(REPO_ROOT, options(setup)));

      assert.equal(check.ok, false);
      assert.equal(check.restartRequired, true);
      assert.equal(check.agents[name].status, expectedStatus);
      assert.equal(check.next, refreshAction(setup));
    });
  }
});

test("installed doctor rejects malformed state fields and never echoes raw state errors or values", async (t) => {
  const cases = [
    ["parse", async (setup) => writeFile(setup.statePath, '{"prompt":"credential-secret"', "utf8")],
    ["uppercase hash", async (setup) => { const state = await readState(setup); state.files.nami.sha256 = "A".repeat(64); await writeState(setup, state); }],
    ["relative target", async (setup) => { const state = await readState(setup); state.targetDir = "account-secret/agents"; await writeState(setup, state); }],
    ["unsafe reason", async (setup) => { const state = await readState(setup); state.profiles.fast.reason = "prompt=credential-secret"; state.agents.nami.reason = state.profiles.fast.reason; await writeState(setup, state); }]
  ];
  for (const [label, mutate] of cases) {
    await t.test(label, async (t) => {
      const setup = await fixture(t);
      await mutate(setup);
      const check = installedCheck(await runDoctor(REPO_ROOT, options(setup)));

      assert.equal(check.ok, false);
      assert.equal(check.installed, true);
      assert.equal(check.selectionStatus, "invalid");
      assert.doesNotMatch(JSON.stringify(check), /credential-secret|account-secret|prompt=|JSON|Unexpected|position/iu);
    });
  }
});

test("installed doctor rejects contradictory unknown-compatibility state without leaking agent content", async (t) => {
  const setup = await fixture(t);
  const state = await readState(setup);
  state.selectionReason = "probe_unknown_compatibility";
  state.catalogReason = "timeout";
  await writeState(setup, state);
  const namiPath = join(setup.targetDir, "nami.toml");
  await writeFile(namiPath, `${await readFile(namiPath, "utf8")}# credential-secret-content\n`, "utf8");

  const check = installedCheck(await runDoctor(REPO_ROOT, options(setup)));

  assert.equal(check.ok, false);
  assert.equal(check.installed, true);
  assert.equal(check.selectionStatus, "invalid");
  assert.deepEqual(new Set(Object.values(check.agents).map(({ status }) => status)), new Set(["state_invalid"]));
  assert.doesNotMatch(JSON.stringify(check), /credential-secret|developer_instructions/u);
});

test("explicit doctor refresh queries once, reports current, and mutates no state or agent file", async (t) => {
  const setup = await fixture(t);
  const before = await snapshot(setup);
  let queries = 0;
  const check = installedCheck(await runDoctor(REPO_ROOT, options(setup, {
    refreshModels: true,
    queryModelCatalog: async () => { queries += 1; return { ok: true, source: "model_list", models: fullCatalog() }; }
  })));

  assert.equal(queries, 1);
  assert.equal(check.ok, true);
  assert.equal(check.availabilityStatus, "current");
  assert.deepEqual(new Set(Object.values(check.agents).map(({ status }) => status)), new Set(["current"]));
  assert.deepEqual(await snapshot(setup), before);
});

test("explicit doctor refresh fails changed or unsupported live routing without mutating files", async (t) => {
  const cases = [
    ["changed", compatibilityCatalog(), "changed"],
    ["unsupported", [], "unsupported"]
  ];
  for (const [label, models, availabilityStatus] of cases) {
    await t.test(label, async (t) => {
      const setup = await fixture(t);
      const before = await snapshot(setup);
      let queries = 0;
      const check = installedCheck(await runDoctor(REPO_ROOT, options(setup, {
        refreshModels: true,
        queryModelCatalog: async () => { queries += 1; return { ok: true, source: "model_list", models }; }
      })));

      assert.equal(queries, 1);
      assert.equal(check.ok, false);
      assert.equal(check.availabilityStatus, availabilityStatus);
      assert.equal(check.restartRequired, false);
      assert.equal(check.next, refreshAction(setup));
      assert.deepEqual(await snapshot(setup), before);
    });
  }
});

test("explicit doctor refresh sanitizes unknown availability and keeps a healthy fleet healthy", async (t) => {
  const setup = await fixture(t);
  const before = await snapshot(setup);
  let queries = 0;
  const check = installedCheck(await runDoctor(REPO_ROOT, options(setup, {
    refreshModels: true,
    queryModelCatalog: async () => {
      queries += 1;
      return {
        ok: false,
        source: "model_list",
        reason: "credential-secret-reason",
        stderr: "credential-secret-stderr",
        raw: { prompt: "credential-secret-prompt", account: "credential-secret-account" }
      };
    }
  })));

  assert.equal(queries, 1);
  assert.equal(check.ok, true);
  assert.equal(check.availabilityStatus, "unknown");
  assert.equal(check.restartRequired, false);
  assert.doesNotMatch(JSON.stringify(check), /credential-secret|stderr|prompt|account|raw/iu);
  assert.deepEqual(await snapshot(setup), before);
});

test("doctor CLI passes isolated CODEX_HOME and exposes read-only refresh help", async (t) => {
  const setup = await fixture(t, { clock: () => new Date() });
  const result = spawnSync(process.execPath, [join(REPO_ROOT, "src", "cli.js"), "doctor", "--json"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: { ...process.env, ...setup.env },
    timeout: 10_000
  });
  assert.equal(result.status, 0, result.stderr);
  const check = installedCheck(JSON.parse(result.stdout));
  assert.equal(check.installed, true);
  assert.equal(check.targetDir, setup.targetDir);

  const help = spawnSync(process.execPath, [join(REPO_ROOT, "src", "cli.js"), "doctor", "--help"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: { ...process.env, CODEX_HOME: join(setup.root, "empty-home") }
  });
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /--refresh-models/u);
  assert.match(help.stdout, /read-only/iu);
});
