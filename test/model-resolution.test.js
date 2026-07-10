import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import * as modelPolicy from "../src/model-policy.js";

const AGENTS = {
  franky: { profile: "standard", purpose: "Bounded implementation lane." },
  zoro: { profile: "deep", purpose: "Skeptical code review lane." },
  usopp: { profile: "standard", purpose: "QA and regression lane." },
  jinbe: { profile: "deep", purpose: "Final gate integration lane." },
  robin: { profile: "standard", purpose: "Evidence auditor lane." },
  nami: { profile: "fast", purpose: "Read-only navigation lane." }
};

function codexPolicy() {
  return {
    compatibilityModel: "gpt-5.5",
    allowed: {
      models: [
        "gpt-5.6-terra",
        "gpt-5.6-sol",
        "gpt-5.6-luna",
        "gpt-5.5",
        "gpt-5.4",
        "gpt-5.4-mini",
        "gpt-5.3-codex-spark"
      ],
      reasoningEfforts: ["low", "medium", "high", "xhigh"],
      serviceTiers: ["priority", "fast", "efficient"]
    },
    profiles: {
      standard: {
        candidates: [
          { model: "gpt-5.6-terra", model_reasoning_effort: "high", service_tier: "priority" },
          { model: "gpt-5.5", model_reasoning_effort: "high", service_tier: "priority" }
        ]
      },
      deep: {
        candidates: [
          { model: "gpt-5.6-sol", model_reasoning_effort: "xhigh", service_tier: "priority" },
          { model: "gpt-5.5", model_reasoning_effort: "xhigh", service_tier: "priority" }
        ]
      },
      fast: {
        candidates: [
          { model: "gpt-5.6-luna", model_reasoning_effort: "low", service_tier: "fast" },
          { model: "gpt-5.5", model_reasoning_effort: "low", service_tier: "fast" }
        ]
      }
    },
    agents: structuredClone(AGENTS)
  };
}

function policyData() {
  return {
    version: "2026-07-10",
    policy: "advisory-model-defaults-are-explicit",
    codex: codexPolicy(),
    claude: {
      allowed: { models: ["opus", "sonnet", "haiku"] },
      profiles: {
        standard: { model: "sonnet" },
        deep: { model: "opus" },
        fast: { model: "haiku" }
      },
      agents: structuredClone(AGENTS)
    }
  };
}

function fullCatalog() {
  return [
    { id: "gpt-5.6-terra", reasoningEfforts: ["high"], serviceTiers: ["priority"] },
    { id: "gpt-5.6-sol", reasoningEfforts: ["xhigh"], serviceTiers: ["priority"] },
    { id: "gpt-5.6-luna", reasoningEfforts: ["low"], serviceTiers: ["fast"] },
    { id: "gpt-5.5", reasoningEfforts: ["low", "high", "xhigh"], serviceTiers: ["fast", "priority"] }
  ];
}

function requireExport(name) {
  assert.equal(typeof modelPolicy[name], "function", `${name} must be exported`);
  return modelPolicy[name];
}

async function writePolicyFixture(data) {
  const cwd = await mkdtemp(join(tmpdir(), "superloopy-model-policy-"));
  await writeFile(join(cwd, "model-policy.json"), `${JSON.stringify(data, null, 2)}\n`, "utf8");
  return cwd;
}

test("resolver selects every preferred GPT-5.6 tuple when fully available", () => {
  const resolveCodexModelPolicy = requireExport("resolveCodexModelPolicy");

  const result = resolveCodexModelPolicy(codexPolicy(), fullCatalog());

  assert.equal(result.ok, true);
  assert.deepEqual(result.profiles.standard, {
    model: "gpt-5.6-terra",
    model_reasoning_effort: "high",
    service_tier: "priority",
    requestedModel: "gpt-5.6-terra",
    resolvedModel: "gpt-5.6-terra",
    reason: "preferred_available"
  });
  assert.deepEqual(result.profiles.deep, {
    model: "gpt-5.6-sol",
    model_reasoning_effort: "xhigh",
    service_tier: "priority",
    requestedModel: "gpt-5.6-sol",
    resolvedModel: "gpt-5.6-sol",
    reason: "preferred_available"
  });
  assert.deepEqual(result.profiles.fast, {
    model: "gpt-5.6-luna",
    model_reasoning_effort: "low",
    service_tier: "fast",
    requestedModel: "gpt-5.6-luna",
    resolvedModel: "gpt-5.6-luna",
    reason: "preferred_available"
  });
  assert.deepEqual(result.agents.franky, {
    profile: "standard",
    purpose: "Bounded implementation lane.",
    ...result.profiles.standard
  });
  assert.deepEqual(Object.keys(result.agents), Object.keys(AGENTS));
});

test("resolver falls back only the deep profile when Sol is unavailable", () => {
  const resolveCodexModelPolicy = requireExport("resolveCodexModelPolicy");
  const catalog = fullCatalog().filter(({ id }) => id !== "gpt-5.6-sol");

  const result = resolveCodexModelPolicy(codexPolicy(), catalog);

  assert.equal(result.ok, true);
  assert.equal(result.profiles.standard.reason, "preferred_available");
  assert.equal(result.profiles.deep.requestedModel, "gpt-5.6-sol");
  assert.equal(result.profiles.deep.resolvedModel, "gpt-5.5");
  assert.equal(result.profiles.deep.reason, "compatibility_fallback");
  assert.equal(result.agents.zoro.resolvedModel, "gpt-5.5");
  assert.equal(result.agents.jinbe.resolvedModel, "gpt-5.5");
  assert.equal(result.profiles.fast.reason, "preferred_available");
});

test("resolver selects GPT-5.5 compatibility tuples when the whole GPT-5.6 family is unavailable", () => {
  const resolveCodexModelPolicy = requireExport("resolveCodexModelPolicy");
  const catalog = fullCatalog().filter(({ id }) => id === "gpt-5.5");

  const result = resolveCodexModelPolicy(codexPolicy(), catalog);

  assert.equal(result.ok, true);
  assert.deepEqual(
    Object.fromEntries(Object.entries(result.profiles).map(([name, profile]) => [name, [profile.resolvedModel, profile.reason]])),
    {
      standard: ["gpt-5.5", "compatibility_fallback"],
      deep: ["gpt-5.5", "compatibility_fallback"],
      fast: ["gpt-5.5", "compatibility_fallback"]
    }
  );
});

test("resolver returns a visible failure when neither the preferred nor GPT-5.5 tuple is available", () => {
  const resolveCodexModelPolicy = requireExport("resolveCodexModelPolicy");

  const result = resolveCodexModelPolicy(codexPolicy(), []);

  assert.deepEqual(result, {
    ok: false,
    message: "No fully supported model tuple for Codex profile standard (requested gpt-5.6-terra)."
  });
});

test("resolver requires model, effort, and tier support from one catalog item", () => {
  const resolveCodexModelPolicy = requireExport("resolveCodexModelPolicy");
  const catalog = [
    { id: "gpt-5.6-terra", reasoningEfforts: ["high"], serviceTiers: ["fast"] },
    { id: "gpt-5.6-sol", reasoningEfforts: ["xhigh"], serviceTiers: ["priority"] },
    { id: "gpt-5.6-luna", reasoningEfforts: ["low"], serviceTiers: ["fast"] },
    { id: "gpt-5.5", reasoningEfforts: ["low", "high", "xhigh"], serviceTiers: ["fast", "priority"] }
  ];

  const result = resolveCodexModelPolicy(codexPolicy(), catalog);

  assert.equal(result.ok, true);
  assert.equal(result.profiles.standard.resolvedModel, "gpt-5.5");
  assert.equal(result.profiles.standard.reason, "compatibility_fallback");
});

test("resolver does not combine effort and tier support across duplicate catalog items", () => {
  const resolveCodexModelPolicy = requireExport("resolveCodexModelPolicy");
  const catalog = [
    { id: "gpt-5.6-terra", reasoningEfforts: ["high"], serviceTiers: ["priority"] },
    { id: "gpt-5.6-sol", reasoningEfforts: ["xhigh"], serviceTiers: ["fast"] },
    { id: "gpt-5.6-sol", reasoningEfforts: ["high"], serviceTiers: ["priority"] },
    { id: "gpt-5.6-luna", reasoningEfforts: ["low"], serviceTiers: ["fast"] },
    { id: "gpt-5.5", reasoningEfforts: ["low", "high"], serviceTiers: ["fast", "priority"] }
  ];

  const result = resolveCodexModelPolicy(codexPolicy(), catalog);

  assert.deepEqual(result, {
    ok: false,
    message: "No fully supported model tuple for Codex profile deep (requested gpt-5.6-sol)."
  });
});

test("policy loader preserves its result contract for valid candidate data", async () => {
  const loadModelPolicyData = requireExport("loadModelPolicyData");
  const data = policyData();
  const cwd = await writePolicyFixture(data);
  try {
    assert.deepEqual(await loadModelPolicyData(cwd), { ok: true, data });
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("policy loader rejects unsupported candidate tuple fields", async (t) => {
  const loadModelPolicyData = requireExport("loadModelPolicyData");
  const cases = [
    ["model", "gpt-unsupported"],
    ["model_reasoning_effort", "ultra"],
    ["service_tier", "unknown"]
  ];

  for (const [field, value] of cases) {
    await t.test(field, async () => {
      const data = policyData();
      data.codex.profiles.standard.candidates[0][field] = value;
      const cwd = await writePolicyFixture(data);
      try {
        const result = await loadModelPolicyData(cwd);
        assert.equal(result.ok, false);
        assert.match(result.message, new RegExp(`profiles\\.standard\\.candidates\\.0\\.${field} is not allowed`, "u"));
      } finally {
        await rm(cwd, { recursive: true, force: true });
      }
    });
  }
});

test("policy loader rejects malformed candidate arrays", async (t) => {
  const loadModelPolicyData = requireExport("loadModelPolicyData");
  const cases = [
    ["empty", []],
    ["not an array", {}],
    ["malformed tuple", [null]]
  ];

  for (const [name, candidates] of cases) {
    await t.test(name, async () => {
      const data = policyData();
      data.codex.profiles.standard.candidates = candidates;
      const cwd = await writePolicyFixture(data);
      try {
        const result = await loadModelPolicyData(cwd);
        assert.equal(result.ok, false);
        assert.match(result.message, /model policy data\.codex\.profiles\.standard\.candidates/u);
      } finally {
        await rm(cwd, { recursive: true, force: true });
      }
    });
  }
});

test("policy loader requires the declared model in the second compatibility position", async (t) => {
  const loadModelPolicyData = requireExport("loadModelPolicyData");
  const cases = [
    ["missing candidate", (data) => {
      data.codex.profiles.standard.candidates = data.codex.profiles.standard.candidates.slice(0, 1);
    }, /Missing compatibility candidate for Codex profile standard/u],
    ["wrong model", (data) => {
      data.codex.profiles.standard.candidates[1].model = "gpt-5.4";
    }, /profiles\.standard\.candidates\.1\.model must match compatibilityModel gpt-5\.5/u]
  ];
  for (const [name, mutate, expected] of cases) {
    await t.test(name, async () => {
      const data = policyData();
      mutate(data);
      const cwd = await writePolicyFixture(data);
      try {
        const result = await loadModelPolicyData(cwd);
        assert.equal(result.ok, false);
        assert.match(result.message, expected);
      } finally {
        await rm(cwd, { recursive: true, force: true });
      }
    });
  }
});
