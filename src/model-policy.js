import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { SUPERLOOPY_AGENT_NAMES } from "./agents.js";

export const MODEL_POLICY_PATH = "docs/superloopy-model-policy.md";

const ALLOWED_MODELS = ["gpt-5.5", "gpt-5.4", "gpt-5.4-mini", "gpt-5.3-codex-spark"];
const ALLOWED_EFFORTS = ["low", "medium", "high", "xhigh"];
const ALLOWED_TIERS = ["priority", "fast", "efficient"];

const AGENT_MODEL_DEFAULTS = {
  fronk: { model: "gpt-5.5", model_reasoning_effort: "high", service_tier: "priority" },
  zyro: { model: "gpt-5.5", model_reasoning_effort: "xhigh", service_tier: "priority" },
  usk: { model: "gpt-5.5", model_reasoning_effort: "high", service_tier: "priority" },
  jumbo: { model: "gpt-5.5", model_reasoning_effort: "xhigh", service_tier: "priority" },
  rovyn: { model: "gpt-5.5", model_reasoning_effort: "high", service_tier: "priority" },
  nomi: { model: "gpt-5.4-mini", model_reasoning_effort: "low", service_tier: "fast" }
};

export async function checkModelPolicy(cwd) {
  const policyPath = join(cwd, MODEL_POLICY_PATH);
  const problems = [];
  if (!existsSync(policyPath)) return fail(`Missing ${MODEL_POLICY_PATH}.`);
  const doc = await readFile(policyPath, "utf8");
  if (!/steering,\s*not proof/i.test(doc)) problems.push(`${MODEL_POLICY_PATH} must state that model choice is steering, not proof`);
  for (const model of ALLOWED_MODELS) {
    if (!doc.includes(model)) problems.push(`${MODEL_POLICY_PATH} must list allowed model ${model}`);
  }
  for (const agent of SUPERLOOPY_AGENT_NAMES) {
    const path = join(cwd, ".codex", "agents", `${agent}.toml`);
    if (!existsSync(path)) {
      problems.push(`missing .codex/agents/${agent}.toml`);
      continue;
    }
    const fields = parseTopLevelStringFields(await readFile(path, "utf8"));
    const expected = AGENT_MODEL_DEFAULTS[agent];
    for (const [field, value] of Object.entries(expected)) {
      if (fields[field] !== value) problems.push(`${agent}.toml ${field} must be ${value}`);
    }
    if (!ALLOWED_MODELS.includes(fields.model)) problems.push(`${agent}.toml has unsupported model ${fields.model ?? "<missing>"}`);
    if (!ALLOWED_EFFORTS.includes(fields.model_reasoning_effort)) problems.push(`${agent}.toml has unsupported effort ${fields.model_reasoning_effort ?? "<missing>"}`);
    if (!ALLOWED_TIERS.includes(fields.service_tier)) problems.push(`${agent}.toml has unsupported tier ${fields.service_tier ?? "<missing>"}`);
  }
  if (problems.length > 0) return fail(`Model policy drift: ${problems.join("; ")}.`);
  return {
    ok: true,
    policy: "advisory-model-defaults-are-explicit",
    policyPath: MODEL_POLICY_PATH,
    allowedModels: ALLOWED_MODELS,
    allowedEfforts: ALLOWED_EFFORTS,
    allowedTiers: ALLOWED_TIERS,
    agents: AGENT_MODEL_DEFAULTS
  };
}

function parseTopLevelStringFields(content) {
  const fields = {};
  const pattern = /^([A-Za-z0-9_]+)\s*=\s*"([^"]*)"\s*$/gmu;
  let match;
  while ((match = pattern.exec(content)) !== null) fields[match[1]] = match[2];
  return fields;
}

function fail(message) {
  return { ok: false, message };
}
