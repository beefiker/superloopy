import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  MODEL_RESOLUTION_SCHEMA_VERSION,
  MODEL_RESOLUTION_TTL_MS,
  prepareCodexModelResolution,
  resolveModelResolutionStatePath,
  validateModelResolutionState
} from "../src/model-resolution.js";

const NOW = Date.parse("2026-07-10T12:00:00.000Z");
const AGENTS = {
  franky: { profile: "standard", purpose: "Build." },
  zoro: { profile: "deep", purpose: "Review." },
  usopp: { profile: "standard", purpose: "Test." },
  jinbe: { profile: "deep", purpose: "Gate." },
  robin: { profile: "standard", purpose: "Audit." },
  nami: { profile: "fast", purpose: "Navigate." }
};

function candidate(model, model_reasoning_effort, service_tier) {
  return { model, model_reasoning_effort, service_tier };
}

function policyData(version = "policy-v1") {
  const profiles = {
    standard: {
      candidates: [candidate("preferred-standard", "high", "priority"), candidate("stable", "high", "priority")]
    },
    deep: {
      candidates: [candidate("preferred-deep", "xhigh", "priority"), candidate("stable", "xhigh", "priority")]
    },
    fast: {
      candidates: [candidate("preferred-fast", "low", "fast"), candidate("stable", "low", "fast")]
    }
  };
  return {
    version,
    policy: "explicit-test-policy",
    codex: {
      compatibilityModel: "stable",
      allowed: {
        models: Object.values(profiles).flatMap(({ candidates }) => candidates.map(({ model }) => model)),
        reasoningEfforts: ["low", "high", "xhigh"],
        serviceTiers: ["fast", "priority"]
      },
      profiles,
      agents: structuredClone(AGENTS)
    },
    claude: {
      allowed: { models: ["opus", "sonnet", "haiku"] },
      profiles: { standard: { model: "sonnet" }, deep: { model: "opus" }, fast: { model: "haiku" } },
      agents: structuredClone(AGENTS)
    }
  };
}

function catalogFor(policy, indexes = {}) {
  return Object.entries(policy.codex.profiles).map(([profileName, profile]) => {
    const selected = profile.candidates[indexes[profileName] ?? 0];
    return {
      id: selected.model,
      reasoningEfforts: [selected.model_reasoning_effort],
      serviceTiers: [selected.service_tier]
    };
  });
}

function resolvedProfiles(policy, indexes = {}) {
  return Object.fromEntries(Object.entries(policy.codex.profiles).map(([profileName, profile]) => {
    const index = indexes[profileName] ?? 0;
    const selected = profile.candidates[index];
    return [profileName, {
      ...selected,
      requestedModel: profile.candidates[0].model,
      resolvedModel: selected.model,
      reason: index === 0 ? "preferred_available" : "compatibility_fallback"
    }];
  }));
}

function persistedState(policy, targetDir, options = {}) {
  const indexes = options.indexes ?? {};
  const profiles = resolvedProfiles(policy, indexes);
  const agents = Object.fromEntries(Object.entries(policy.codex.agents).map(([name, config]) => [
    name,
    { ...config, ...profiles[config.profile] }
  ]));
  const files = Object.fromEntries(Object.keys(AGENTS).map((name, index) => [
    name,
    { sha256: (index + 1).toString(16).repeat(64) }
  ]));
  return {
    schemaVersion: MODEL_RESOLUTION_SCHEMA_VERSION,
    policyVersion: policy.version,
    targetDir,
    checkedAt: options.checkedAt ?? new Date(NOW - 60_000).toISOString(),
    availabilitySource: options.availabilitySource ?? "model_list",
    selectionReason: options.selectionReason ?? "catalog_resolved",
    ...(options.catalogReason === undefined ? {} : { catalogReason: options.catalogReason }),
    degraded: Object.values(indexes).some((index) => index > 0),
    profiles,
    agents,
    files
  };
}

async function fixture(t, policy = policyData()) {
  const root = await mkdtemp(join(tmpdir(), "superloopy-resolution-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "model-policy.json"), `${JSON.stringify(policy, null, 2)}\n`, "utf8");
  return {
    policy,
    policyRoot: root,
    targetDir: join(root, "codex", "agents"),
    statePath: join(root, "codex", "superloopy", "model-resolution.json")
  };
}

function prepareOptions(setup, queryModelCatalog, overrides = {}) {
  return {
    policyRoot: setup.policyRoot,
    targetDir: setup.targetDir,
    statePath: setup.statePath,
    queryModelCatalog,
    clock: () => new Date(NOW),
    ...overrides
  };
}

function sequenceClock(...values) {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
}

async function writeState(setup, state) {
  await mkdir(join(setup.policyRoot, "codex", "superloopy"), { recursive: true });
  await writeFile(setup.statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function successfulQuery(policy, indexes = {}) {
  return async () => ({
    ok: true,
    source: "model_list",
    checkedAt: new Date(NOW).toISOString(),
    models: catalogFor(policy, indexes)
  });
}

test("resolution constants and state path follow the Codex home contract", () => {
  assert.equal(MODEL_RESOLUTION_SCHEMA_VERSION, 1);
  assert.equal(MODEL_RESOLUTION_TTL_MS, 86_400_000);
  assert.equal(
    resolveModelResolutionStatePath({ CODEX_HOME: "/opt/codex-home" }, "/home/tester"),
    join(resolve("/opt/codex-home"), "superloopy", "model-resolution.json")
  );
  assert.equal(
    resolveModelResolutionStatePath({ CODEX_HOME: "" }, "/home/tester"),
    join(resolve("/home/tester"), ".codex", "superloopy", "model-resolution.json")
  );
});

test("state validator requires generated compatibility reasons to select candidate index one for every profile", () => {
  const policy = policyData();
  const targetDir = "/tmp/superloopy-agents";
  const allCompatibility = { standard: 1, deep: 1, fast: 1 };
  const reasons = [
    { selectionReason: "compatibility_override", availabilitySource: "policy" },
    { selectionReason: "probe_unknown_compatibility", availabilitySource: "model_list", catalogReason: "timeout" }
  ];

  for (const reason of reasons) {
    const valid = persistedState(policy, targetDir, { ...reason, indexes: allCompatibility });
    assert.equal(validateModelResolutionState(valid, policy, { targetDir, nowMs: NOW }).ok, true);
    for (const indexes of [{}, { deep: 1 }]) {
      const contradictory = persistedState(policy, targetDir, { ...reason, indexes });
      assert.deepEqual(
        validateModelResolutionState(contradictory, policy, { targetDir, nowMs: NOW }),
        { ok: false, reason: "selection" }
      );
    }
  }
});

test("state validator lets catalog and cached-unknown reasons preserve preferred, partial, or all-compat selections", () => {
  const policy = policyData();
  const targetDir = "/tmp/superloopy-agents";
  const reasons = [
    { selectionReason: "catalog_resolved", availabilitySource: "model_list" },
    { selectionReason: "probe_unknown_kept_cached", availabilitySource: "model_list", catalogReason: "timeout" }
  ];

  for (const reason of reasons) {
    for (const indexes of [{}, { deep: 1 }, { standard: 1, deep: 1, fast: 1 }]) {
      const state = persistedState(policy, targetDir, { ...reason, indexes });
      assert.equal(validateModelResolutionState(state, policy, { targetDir, nowMs: NOW }).ok, true);
    }
  }
});

test("fresh valid state is reused without querying", async (t) => {
  const setup = await fixture(t);
  const state = persistedState(setup.policy, setup.targetDir);
  await writeState(setup, state);
  let queries = 0;

  const result = await prepareCodexModelResolution(prepareOptions(setup, async () => {
    queries += 1;
    throw new Error("query must not run");
  }));

  assert.equal(result.ok, true);
  assert.equal(result.cacheStatus, "fresh");
  assert.equal(queries, 0);
  assert.deepEqual(result.previousState, state);
  assert.deepEqual(result.state, state);
});

test("stale, explicit, policy-version, and target changes refresh", async (t) => {
  const cases = [
    ["stale", (state) => { state.checkedAt = new Date(NOW - MODEL_RESOLUTION_TTL_MS).toISOString(); }, {}],
    ["explicit", () => {}, { refreshModels: true }],
    ["policy version", (state) => { state.policyVersion = "old-policy"; }, {}],
    ["target", (state) => { state.targetDir = `${state.targetDir}-old`; }, {}]
  ];
  for (const [name, mutate, overrides] of cases) {
    await t.test(name, async (t) => {
      const setup = await fixture(t);
      const state = persistedState(setup.policy, setup.targetDir);
      mutate(state);
      await writeState(setup, state);
      let queries = 0;
      const result = await prepareCodexModelResolution(prepareOptions(setup, async () => {
        queries += 1;
        return successfulQuery(setup.policy)();
      }, overrides));
      assert.equal(result.ok, true);
      assert.equal(result.cacheStatus, "refreshed");
      assert.equal(queries, 1);
      assert.equal(result.state.checkedAt, new Date(NOW).toISOString());
      assert.deepEqual(result.state.files, {});
    });
  }
});

test("compatibility override makes zero queries and uses each profile non-first candidate", async (t) => {
  const setup = await fixture(t);
  let queries = 0;
  const result = await prepareCodexModelResolution(prepareOptions(setup, async () => {
    queries += 1;
    throw new Error("query must not run");
  }, { compatibility: true }));

  assert.equal(result.ok, true);
  assert.equal(queries, 0);
  assert.equal(result.state.selectionReason, "compatibility_override");
  assert.equal(result.state.availabilitySource, "policy");
  assert.equal(result.state.degraded, true);
  assert.deepEqual(
    Object.fromEntries(Object.entries(result.state.profiles).map(([name, profile]) => [name, [profile.resolvedModel, profile.reason]])),
    {
      standard: ["stable", "compatibility_fallback"],
      deep: ["stable", "compatibility_fallback"],
      fast: ["stable", "compatibility_fallback"]
    }
  );
  assert.deepEqual(result.state.files, {});
});

test("successful query selects preferred tuples without persisting preparation state", async (t) => {
  const setup = await fixture(t);
  const result = await prepareCodexModelResolution(prepareOptions(setup, successfulQuery(setup.policy)));

  assert.equal(result.ok, true);
  assert.equal(result.state.selectionReason, "catalog_resolved");
  assert.equal(result.state.availabilitySource, "model_list");
  assert.equal(result.state.degraded, false);
  assert.deepEqual(Object.values(result.state.profiles).map(({ reason }) => reason), [
    "preferred_available", "preferred_available", "preferred_available"
  ]);
  assert.deepEqual(Object.keys(result.state.agents), Object.keys(AGENTS));
  assert.deepEqual(result.state.files, {});
  await assert.rejects(access(setup.statePath), { code: "ENOENT" });
});

test("successful query can fall back only an unavailable profile", async (t) => {
  const setup = await fixture(t);
  const result = await prepareCodexModelResolution(prepareOptions(setup, successfulQuery(setup.policy, { deep: 1 })));

  assert.equal(result.ok, true);
  assert.equal(result.state.degraded, true);
  assert.equal(result.state.profiles.standard.reason, "preferred_available");
  assert.equal(result.state.profiles.deep.resolvedModel, "stable");
  assert.equal(result.state.profiles.deep.reason, "compatibility_fallback");
  assert.equal(result.state.agents.zoro.resolvedModel, "stable");
  assert.equal(result.state.profiles.fast.reason, "preferred_available");
});

test("successful live query uses the local completion clock instead of catalog checkedAt", async (t) => {
  const catalogCheckedAtValues = [
    new Date(NOW - MODEL_RESOLUTION_TTL_MS).toISOString(),
    new Date(NOW + MODEL_RESOLUTION_TTL_MS).toISOString(),
    "account=private prompt=do-not-store"
  ];
  for (const catalogCheckedAt of catalogCheckedAtValues) {
    await t.test(catalogCheckedAt, async (t) => {
      const setup = await fixture(t);
      const completedAt = new Date(NOW + 5_000);
      const result = await prepareCodexModelResolution(prepareOptions(setup, async () => ({
        ok: true,
        source: "model_list",
        checkedAt: catalogCheckedAt,
        models: catalogFor(setup.policy)
      }), {
        clock: sequenceClock(new Date(NOW), completedAt)
      }));

      assert.equal(result.ok, true);
      assert.equal(result.state.checkedAt, completedAt.toISOString());
      assert.notEqual(result.state.checkedAt, catalogCheckedAt);
      assert.doesNotMatch(JSON.stringify(result.state), /account|private|prompt|do-not-store/u);
    });
  }
});

test("successful query with no full candidate returns a visible failure and writes nothing", async (t) => {
  const setup = await fixture(t);
  const result = await prepareCodexModelResolution(prepareOptions(setup, async () => ({
    ok: true,
    source: "model_list",
    models: catalogFor(setup.policy).filter(({ id }) => id !== "preferred-standard")
  })));

  assert.equal(result.ok, false);
  assert.match(result.message, /No fully supported model tuple for Codex profile standard/u);
  await assert.rejects(access(setup.statePath), { code: "ENOENT" });
});

test("unknown query preserves a valid stale state and stores only its sanitized reason", async (t) => {
  const setup = await fixture(t);
  const completedAt = new Date(NOW + 5_000);
  const maliciousCatalogCheckedAt = new Date(NOW + MODEL_RESOLUTION_TTL_MS).toISOString();
  const prior = persistedState(setup.policy, setup.targetDir, {
    checkedAt: new Date(NOW - MODEL_RESOLUTION_TTL_MS - 1).toISOString(),
    indexes: { deep: 1 }
  });
  await writeState(setup, prior);
  const before = await readFile(setup.statePath, "utf8");

  const result = await prepareCodexModelResolution(prepareOptions(setup, async () => ({
    ok: false,
    source: "model_list",
    checkedAt: maliciousCatalogCheckedAt,
    reason: "server_error",
    stderr: "token=do-not-store",
    raw: { account: "private" }
  }), {
    clock: sequenceClock(new Date(NOW), completedAt)
  }));

  assert.equal(result.ok, true);
  assert.equal(result.cacheStatus, "unknown_kept_cached");
  assert.deepEqual(result.state.profiles, prior.profiles);
  assert.deepEqual(result.state.agents, prior.agents);
  assert.deepEqual(result.state.files, prior.files);
  assert.equal(result.state.checkedAt, completedAt.toISOString());
  assert.notEqual(result.state.checkedAt, maliciousCatalogCheckedAt);
  assert.equal(result.state.selectionReason, "probe_unknown_kept_cached");
  assert.equal(result.state.catalogReason, "server_error");
  assert.doesNotMatch(JSON.stringify(result.state), /token|private|stderr|raw/u);
  assert.equal(await readFile(setup.statePath, "utf8"), before);
});

test("backward or invalid post-query clocks cannot decrease an unknown cached timestamp", async (t) => {
  const completionValues = [
    new Date(NOW - (MODEL_RESOLUTION_TTL_MS * 2)),
    new Date(Number.NaN)
  ];
  for (const completionValue of completionValues) {
    await t.test(String(completionValue), async (t) => {
      const setup = await fixture(t);
      const prior = persistedState(setup.policy, setup.targetDir, {
        checkedAt: new Date(NOW - MODEL_RESOLUTION_TTL_MS).toISOString()
      });
      await writeState(setup, prior);
      const result = await prepareCodexModelResolution(prepareOptions(setup, async () => ({
        ok: false,
        source: "model_list",
        checkedAt: new Date(NOW + MODEL_RESOLUTION_TTL_MS).toISOString(),
        reason: "timeout"
      }), {
        clock: sequenceClock(new Date(NOW), completionValue)
      }));

      assert.equal(result.ok, true);
      assert.equal(result.state.checkedAt, new Date(NOW).toISOString());
      assert.ok(Date.parse(result.state.checkedAt) >= Date.parse(prior.checkedAt));
    });
  }
});

test("unknown first query uses policy compatibility candidates without GPT-5.5 or inheritance", async (t) => {
  const setup = await fixture(t);
  const result = await prepareCodexModelResolution(prepareOptions(setup, async () => ({
    ok: false,
    source: "model_list",
    reason: "timeout"
  })));

  assert.equal(result.ok, true);
  assert.equal(result.cacheStatus, "unknown_compatibility");
  assert.equal(result.state.selectionReason, "probe_unknown_compatibility");
  assert.equal(result.state.catalogReason, "timeout");
  assert.equal(result.state.degraded, true);
  assert.deepEqual(Object.values(result.state.profiles).map(({ resolvedModel }) => resolvedModel), [
    "stable", "stable", "stable"
  ]);
  assert.doesNotMatch(JSON.stringify(result.state), /gpt-5\.5|parent|default/u);
});

test("unknown first query fails visibly when a profile has no compatibility candidate", async (t) => {
  const policy = policyData();
  policy.codex.profiles.standard.candidates = [policy.codex.profiles.standard.candidates[0]];
  const setup = await fixture(t, policy);
  const result = await prepareCodexModelResolution(prepareOptions(setup, async () => ({
    ok: false,
    source: "model_list",
    reason: "timeout"
  })));

  assert.equal(result.ok, false);
  assert.match(result.message, /compatibility candidate.*standard/iu);
  await assert.rejects(access(setup.statePath), { code: "ENOENT" });
});

test("malformed, unreadable, future, and tuple-invalid state is ignored", async (t) => {
  const cases = [
    ["invalid JSON", async (setup) => writeState(setup, "not-json"), true],
    ["read error", async (setup) => mkdir(setup.statePath, { recursive: true }), false],
    ["missing hash", async (setup) => {
      const state = persistedState(setup.policy, setup.targetDir);
      delete state.files.nami;
      await writeState(setup, state);
    }, false],
    ["uppercase hash", async (setup) => {
      const state = persistedState(setup.policy, setup.targetDir);
      state.files.nami.sha256 = "A".repeat(64);
      await writeState(setup, state);
    }, false],
    ["future time", async (setup) => writeState(setup, persistedState(setup.policy, setup.targetDir, {
      checkedAt: new Date(NOW + MODEL_RESOLUTION_TTL_MS).toISOString()
    })), false],
    ["unsupported tuple", async (setup) => {
      const state = persistedState(setup.policy, setup.targetDir);
      state.profiles.fast.resolvedModel = "foreign-model";
      await writeState(setup, state);
    }, false]
  ];
  for (const [name, arrange, stringPayload] of cases) {
    await t.test(name, async (t) => {
      const setup = await fixture(t);
      if (stringPayload) {
        await mkdir(join(setup.policyRoot, "codex", "superloopy"), { recursive: true });
        await writeFile(setup.statePath, "{not valid json", "utf8");
      } else {
        await arrange(setup);
      }
      let queries = 0;
      const result = await prepareCodexModelResolution(prepareOptions(setup, async () => {
        queries += 1;
        return successfulQuery(setup.policy)();
      }));
      assert.equal(result.ok, true);
      assert.equal(queries, 1);
      assert.equal(result.previousState, null);
      assert.equal(result.cacheStatus, "refreshed");
    });
  }
});

test("a valid state checked at exact now is fresh", async (t) => {
  const setup = await fixture(t);
  const state = persistedState(setup.policy, setup.targetDir, { checkedAt: new Date(NOW).toISOString() });
  await writeState(setup, state);
  let queries = 0;
  const result = await prepareCodexModelResolution(prepareOptions(setup, async () => {
    queries += 1;
    return successfulQuery(setup.policy)();
  }));

  assert.equal(result.ok, true);
  assert.equal(result.cacheStatus, "fresh");
  assert.equal(queries, 0);
});

test("initial clock accepts Date's boundary and rejects finite values outside it", async (t) => {
  const maximumDateMs = 8_640_000_000_000_000;
  await t.test("maximum boundary", async (t) => {
    const setup = await fixture(t);
    const result = await prepareCodexModelResolution(prepareOptions(setup, async () => {
      throw new Error("compatibility must not query");
    }, {
      compatibility: true,
      clock: () => maximumDateMs
    }));

    assert.equal(result.ok, true);
    assert.equal(result.state.checkedAt, new Date(maximumDateMs).toISOString());
  });

  await t.test("outside boundary", async (t) => {
    const setup = await fixture(t);
    class OutOfRangeDate extends Date {
      getTime() {
        return maximumDateMs + 1;
      }
    }
    let result;
    await assert.doesNotReject(async () => {
      result = await prepareCodexModelResolution(prepareOptions(setup, async () => {
        throw new Error("invalid clock must not query");
      }, {
        clock: () => new OutOfRangeDate(0)
      }));
    });
    assert.deepEqual(result, { ok: false, message: "Model resolution clock returned an invalid time." });
  });
});
