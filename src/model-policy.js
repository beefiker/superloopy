import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { SUPERLOOPY_AGENT_NAMES } from "./agents.js";

export const MODEL_POLICY_PATH = "docs/superloopy-model-policy.md";
export const MODEL_POLICY_DATA_PATH = "model-policy.json";

export async function checkModelPolicy(cwd) {
  const policyPath = join(cwd, MODEL_POLICY_PATH);
  const problems = [];
  if (!existsSync(policyPath)) return fail(`Missing ${MODEL_POLICY_PATH}.`);
  const dataResult = await loadModelPolicyData(cwd);
  if (!dataResult.ok) return fail(`Model policy drift: ${dataResult.message}.`);
  const data = dataResult.data;
  const codex = data.codex;
  const agentDefaultsResult = resolveHostAgentsSafely(codex, "codex");
  if (!agentDefaultsResult.ok) return fail(`Model policy drift: ${agentDefaultsResult.message}.`);
  const agentDefaults = agentDefaultsResult.agents;
  const doc = await readFile(policyPath, "utf8");
  if (!/steering,\s*not proof/i.test(doc)) problems.push(`${MODEL_POLICY_PATH} must state that model choice is steering, not proof`);
  if (!doc.includes(MODEL_POLICY_DATA_PATH)) problems.push(`${MODEL_POLICY_PATH} must reference ${MODEL_POLICY_DATA_PATH}`);
  for (const model of codex.allowed.models) {
    if (!doc.includes(model)) problems.push(`${MODEL_POLICY_PATH} must list allowed model ${model}`);
  }
  for (const agent of SUPERLOOPY_AGENT_NAMES) {
    const path = join(cwd, ".codex", "agents", `${agent}.toml`);
    if (!existsSync(path)) {
      problems.push(`missing .codex/agents/${agent}.toml`);
      continue;
    }
    const fields = parseTopLevelStringFields(await readFile(path, "utf8"));
    const expected = pickCodexFields(agentDefaults[agent]);
    for (const [field, value] of Object.entries(expected)) {
      if (fields[field] !== value) problems.push(`${agent}.toml ${field} must be ${value}`);
    }
    if (!codex.allowed.models.includes(fields.model)) problems.push(`${agent}.toml has unsupported model ${fields.model ?? "<missing>"}`);
    if (!codex.allowed.reasoningEfforts.includes(fields.model_reasoning_effort)) problems.push(`${agent}.toml has unsupported effort ${fields.model_reasoning_effort ?? "<missing>"}`);
    if (!codex.allowed.serviceTiers.includes(fields.service_tier)) problems.push(`${agent}.toml has unsupported tier ${fields.service_tier ?? "<missing>"}`);
  }
  if (problems.length > 0) return fail(`Model policy drift: ${problems.join("; ")}.`);
  return {
    ok: true,
    policy: data.policy,
    policyPath: MODEL_POLICY_PATH,
    policyDataPath: MODEL_POLICY_DATA_PATH,
    policyDataVersion: data.version,
    allowedModels: codex.allowed.models,
    allowedEfforts: codex.allowed.reasoningEfforts,
    allowedTiers: codex.allowed.serviceTiers,
    profiles: codex.profiles,
    agents: agentDefaults
  };
}

function parseTopLevelStringFields(content) {
  const fields = {};
  const pattern = /^([A-Za-z0-9_]+)\s*=\s*"([^"]*)"\s*$/gmu;
  let match;
  while ((match = pattern.exec(content)) !== null) fields[match[1]] = match[2];
  return fields;
}

export const CLAUDE_MODEL_POLICY_PATH = "docs/superloopy-model-policy-claude.md";

// Mirror of checkModelPolicy for the Claude host: the port ships model-policy-claude.md as the
// contract and each agents/*.md carries a `model` frontmatter default; without this the two host
// policies could silently drift.
export async function checkClaudeModelPolicy(cwd) {
  const policyPath = join(cwd, CLAUDE_MODEL_POLICY_PATH);
  const problems = [];
  if (!existsSync(policyPath)) return fail(`Missing ${CLAUDE_MODEL_POLICY_PATH}.`);
  const dataResult = await loadModelPolicyData(cwd);
  if (!dataResult.ok) return fail(`Claude model policy drift: ${dataResult.message}.`);
  const data = dataResult.data;
  const claude = data.claude;
  const agentDefaultsResult = resolveHostAgentsSafely(claude, "claude");
  if (!agentDefaultsResult.ok) return fail(`Claude model policy drift: ${agentDefaultsResult.message}.`);
  const agentDefaults = agentDefaultsResult.agents;
  const agentModels = Object.fromEntries(Object.entries(agentDefaults).map(([agent, config]) => [agent, config.model]));
  const doc = await readFile(policyPath, "utf8");
  if (!/steering,\s*not proof/i.test(doc)) problems.push(`${CLAUDE_MODEL_POLICY_PATH} must state that model choice is steering, not proof`);
  if (!doc.includes(MODEL_POLICY_DATA_PATH)) problems.push(`${CLAUDE_MODEL_POLICY_PATH} must reference ${MODEL_POLICY_DATA_PATH}`);
  for (const model of claude.allowed.models) {
    if (!doc.includes(model)) problems.push(`${CLAUDE_MODEL_POLICY_PATH} must list allowed model ${model}`);
  }
  for (const agent of SUPERLOOPY_AGENT_NAMES) {
    const path = join(cwd, "agents", `${agent}.md`);
    if (!existsSync(path)) {
      problems.push(`missing agents/${agent}.md`);
      continue;
    }
    const model = parseFrontmatterField(await readFile(path, "utf8"), "model");
    const expected = agentDefaults[agent].model;
    // The expected value is always an allowed model, so an exact-match check also enforces the
    // allowed set — any drift (including an unsupported value) fails here.
    if (model !== expected) problems.push(`agents/${agent}.md model must be ${expected} (found ${model ?? "<missing>"})`);
  }
  if (problems.length > 0) return fail(`Claude model policy drift: ${problems.join("; ")}.`);
  return {
    ok: true,
    policy: "advisory-claude-model-defaults-are-explicit",
    policyPath: CLAUDE_MODEL_POLICY_PATH,
    policyDataPath: MODEL_POLICY_DATA_PATH,
    policyDataVersion: data.version,
    allowedModels: claude.allowed.models,
    profiles: claude.profiles,
    agentProfiles: agentDefaults,
    agents: agentModels
  };
}

async function loadModelPolicyData(cwd) {
  const path = join(cwd, MODEL_POLICY_DATA_PATH);
  if (!existsSync(path)) return { ok: false, message: `Missing ${MODEL_POLICY_DATA_PATH}` };
  try {
    const data = JSON.parse(await readFile(path, "utf8"));
    validateModelPolicyData(data);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

function validateModelPolicyData(data) {
  assertRecord(data, "model policy data");
  assertString(data.version, "model policy data.version");
  assertString(data.policy, "model policy data.policy");
  validateCodexPolicyData(data.codex);
  validateClaudePolicyData(data.claude);
}

function validateCodexPolicyData(codex) {
  assertRecord(codex, "model policy data.codex");
  assertStringArray(codex.allowed?.models, "model policy data.codex.allowed.models");
  assertStringArray(codex.allowed?.reasoningEfforts, "model policy data.codex.allowed.reasoningEfforts");
  assertStringArray(codex.allowed?.serviceTiers, "model policy data.codex.allowed.serviceTiers");
  assertRecord(codex.profiles, "model policy data.codex.profiles");
  assertRecord(codex.agents, "model policy data.codex.agents");
  for (const [profileName, profile] of Object.entries(codex.profiles)) {
    assertString(profile.model, `model policy data.codex.profiles.${profileName}.model`);
    assertString(profile.model_reasoning_effort, `model policy data.codex.profiles.${profileName}.model_reasoning_effort`);
    assertString(profile.service_tier, `model policy data.codex.profiles.${profileName}.service_tier`);
    if (!codex.allowed.models.includes(profile.model)) throw new Error(`model policy data.codex.profiles.${profileName}.model is not allowed`);
    if (!codex.allowed.reasoningEfforts.includes(profile.model_reasoning_effort)) throw new Error(`model policy data.codex.profiles.${profileName}.model_reasoning_effort is not allowed`);
    if (!codex.allowed.serviceTiers.includes(profile.service_tier)) throw new Error(`model policy data.codex.profiles.${profileName}.service_tier is not allowed`);
  }
}

function validateClaudePolicyData(claude) {
  assertRecord(claude, "model policy data.claude");
  assertStringArray(claude.allowed?.models, "model policy data.claude.allowed.models");
  assertRecord(claude.profiles, "model policy data.claude.profiles");
  assertRecord(claude.agents, "model policy data.claude.agents");
  for (const [profileName, profile] of Object.entries(claude.profiles)) {
    assertString(profile.model, `model policy data.claude.profiles.${profileName}.model`);
    if (!claude.allowed.models.includes(profile.model)) throw new Error(`model policy data.claude.profiles.${profileName}.model is not allowed`);
  }
}

function resolveHostAgents(hostPolicy, hostName) {
  const resolved = {};
  for (const agent of SUPERLOOPY_AGENT_NAMES) {
    const agentConfig = hostPolicy.agents?.[agent];
    assertRecord(agentConfig, `model policy data.${hostName}.agents.${agent}`);
    assertString(agentConfig.profile, `model policy data.${hostName}.agents.${agent}.profile`);
    assertString(agentConfig.purpose, `model policy data.${hostName}.agents.${agent}.purpose`);
    const profile = hostPolicy.profiles?.[agentConfig.profile];
    assertRecord(profile, `model policy data.${hostName}.profiles.${agentConfig.profile}`);
    resolved[agent] = {
      profile: agentConfig.profile,
      purpose: agentConfig.purpose,
      ...profile
    };
  }
  return resolved;
}

function resolveHostAgentsSafely(hostPolicy, hostName) {
  try {
    return { ok: true, agents: resolveHostAgents(hostPolicy, hostName) };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

function pickCodexFields(config) {
  return {
    model: config.model,
    model_reasoning_effort: config.model_reasoning_effort,
    service_tier: config.service_tier
  };
}

function assertRecord(value, path) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error(`${path} must be an object`);
}

function assertString(value, path) {
  if (typeof value !== "string" || value.length === 0) throw new Error(`${path} must be a non-empty string`);
}

function assertStringArray(value, path) {
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== "string" || item.length === 0)) {
    throw new Error(`${path} must be a non-empty string array`);
  }
}

// Read a scalar field from the leading `---` YAML frontmatter block of a Markdown agent file.
// Normalizes CRLF so a Windows/autocrlf checkout still parses, and drops a trailing inline `# …`
// YAML comment so `model: sonnet # default` reads as `sonnet`.
function parseFrontmatterField(content, field) {
  const normalized = content.replace(/\r\n/gu, "\n");
  const frontmatter = normalized.match(/^---\n([\s\S]*?)\n---/u);
  if (frontmatter === null) return undefined;
  const line = frontmatter[1].match(new RegExp(`^${field}:\\s*(.+?)\\s*$`, "mu"));
  if (line === null) return undefined;
  const value = line[1].replace(/\s+#.*$/u, "").trim();
  return value.length > 0 ? value : undefined;
}

function fail(message) {
  return { ok: false, message };
}
