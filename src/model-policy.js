import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { SUPERLOOPY_AGENT_NAMES } from "./agents.js";

export const MODEL_POLICY_PATH = "docs/superloopy-model-policy.md";

const ALLOWED_MODELS = ["gpt-5.5", "gpt-5.4", "gpt-5.4-mini", "gpt-5.3-codex-spark"];
const ALLOWED_EFFORTS = ["low", "medium", "high", "xhigh"];
const ALLOWED_TIERS = ["priority", "fast", "efficient"];

const AGENT_MODEL_DEFAULTS = {
  franky: { model: "gpt-5.5", model_reasoning_effort: "high", service_tier: "priority" },
  zoro: { model: "gpt-5.5", model_reasoning_effort: "xhigh", service_tier: "priority" },
  usopp: { model: "gpt-5.5", model_reasoning_effort: "high", service_tier: "priority" },
  jinbe: { model: "gpt-5.5", model_reasoning_effort: "xhigh", service_tier: "priority" },
  robin: { model: "gpt-5.5", model_reasoning_effort: "high", service_tier: "priority" },
  nami: { model: "gpt-5.4-mini", model_reasoning_effort: "low", service_tier: "fast" }
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

export const CLAUDE_MODEL_POLICY_PATH = "docs/superloopy-model-policy-claude.md";

const ALLOWED_CLAUDE_MODELS = ["opus", "sonnet", "haiku"];

const CLAUDE_AGENT_MODEL_DEFAULTS = {
  franky: "sonnet",
  zoro: "opus",
  usopp: "sonnet",
  jinbe: "opus",
  robin: "sonnet",
  nami: "haiku"
};

// Mirror of checkModelPolicy for the Claude host: the port ships model-policy-claude.md as the
// contract and each agents/*.md carries a `model` frontmatter default; without this the two host
// policies could silently drift.
export async function checkClaudeModelPolicy(cwd) {
  const policyPath = join(cwd, CLAUDE_MODEL_POLICY_PATH);
  const problems = [];
  if (!existsSync(policyPath)) return fail(`Missing ${CLAUDE_MODEL_POLICY_PATH}.`);
  const doc = await readFile(policyPath, "utf8");
  if (!/steering,\s*not proof/i.test(doc)) problems.push(`${CLAUDE_MODEL_POLICY_PATH} must state that model choice is steering, not proof`);
  for (const model of ALLOWED_CLAUDE_MODELS) {
    if (!doc.includes(model)) problems.push(`${CLAUDE_MODEL_POLICY_PATH} must list allowed model ${model}`);
  }
  for (const agent of SUPERLOOPY_AGENT_NAMES) {
    const path = join(cwd, "agents", `${agent}.md`);
    if (!existsSync(path)) {
      problems.push(`missing agents/${agent}.md`);
      continue;
    }
    const model = parseFrontmatterField(await readFile(path, "utf8"), "model");
    const expected = CLAUDE_AGENT_MODEL_DEFAULTS[agent];
    // The expected value is always an allowed model, so an exact-match check also enforces the
    // allowed set — any drift (including an unsupported value) fails here.
    if (model !== expected) problems.push(`agents/${agent}.md model must be ${expected} (found ${model ?? "<missing>"})`);
  }
  if (problems.length > 0) return fail(`Claude model policy drift: ${problems.join("; ")}.`);
  return {
    ok: true,
    policy: "advisory-claude-model-defaults-are-explicit",
    policyPath: CLAUDE_MODEL_POLICY_PATH,
    allowedModels: ALLOWED_CLAUDE_MODELS,
    agents: CLAUDE_AGENT_MODEL_DEFAULTS
  };
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
