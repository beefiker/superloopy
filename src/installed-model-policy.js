import { createHash } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import { join } from "node:path";

import { SUPERLOOPY_AGENT_NAMES } from "./agent-names.js";
import { MANAGED_AGENT_MARKER, parseManagedAgentRouting } from "./managed-agents.js";
import { queryCodexModelCatalog } from "./model-catalog.js";
import { loadModelPolicyData, resolveCodexModelPolicy } from "./model-policy.js";
import {
  isAllowedCodexModelTuple,
  MODEL_RESOLUTION_TTL_MS,
  resolveModelResolutionStatePath,
  validateModelResolutionState
} from "./model-resolution.js";

const REPAIR_STATUSES = new Set([
  "hash_mismatch",
  "marker_missing",
  "missing",
  "mixed_profile",
  "routing_invalid",
  "symlink",
  "unreadable",
  "unsupported_tuple"
]);
const REFRESH_ACTION = "Run `superloopy agents install --refresh-models` to refresh the managed routing state.";

export async function checkInstalledModelPolicy(policyRoot, options = {}) {
  const statePath = resolveStatePath(options);
  if (statePath === null) return absent();
  let raw;
  try {
    raw = await readFile(statePath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return absent();
    return invalidState(null, "state_unreadable");
  }

  const policyResult = await loadModelPolicyData(policyRoot);
  if (!policyResult.ok) return invalidState(null, "policy_invalid");
  const policy = policyResult.data;
  let state;
  try {
    state = JSON.parse(raw);
  } catch {
    return invalidState(policy.version, "state_invalid");
  }
  const nowMs = readClock(options.clock ?? (() => new Date()));
  if (nowMs === null) return invalidState(policy.version, "clock_invalid");
  const validation = validateModelResolutionState(state, policy, { nowMs });
  if (!validation.ok) return invalidState(policy.version, validation.reason);

  const stale = nowMs - validation.checkedAtMs >= MODEL_RESOLUTION_TTL_MS;
  const inspections = await Promise.all(SUPERLOOPY_AGENT_NAMES.map((name) =>
    inspectAgentFile(name, state, policy.codex)
  ));
  const agents = Object.fromEntries(inspections.map(({ name, status }) => {
    const resolution = state.agents[name];
    const healthyStatus = resolution.reason === "compatibility_fallback" ? "compatibility" : "preferred";
    return [name, publicAgent(resolution, status ?? (stale ? "stale" : healthyStatus))];
  }));
  const restartRequired = inspections.some(({ status }) => REPAIR_STATUSES.has(status));
  const base = {
    ok: !stale && !restartRequired,
    installed: true,
    policyVersion: state.policyVersion,
    targetDir: state.targetDir,
    checkedAt: state.checkedAt,
    availabilitySource: state.availabilitySource,
    selectionReason: state.selectionReason,
    selectionStatus: state.degraded ? "compatibility" : "preferred",
    availabilityStatus: "not_checked",
    stale,
    degraded: state.degraded,
    restartRequired,
    agents
  };
  if (restartRequired) {
    base.message = "Installed model policy files require repair before Codex is restarted.";
    base.next = REFRESH_ACTION;
  } else if (stale) {
    base.message = "Installed model policy state is stale.";
    base.next = REFRESH_ACTION;
  }
  if (options.refreshModels !== true || restartRequired) return base;
  return compareLivePolicy(base, state, policy, options);
}

async function inspectAgentFile(name, state, codexPolicy) {
  const path = join(state.targetDir, `${name}.toml`);
  let stats;
  try {
    stats = await lstat(path);
  } catch (error) {
    return { name, status: error?.code === "ENOENT" ? "missing" : "unreadable" };
  }
  if (stats.isSymbolicLink()) return { name, status: "symlink" };
  if (!stats.isFile()) return { name, status: "unreadable" };
  let content;
  try {
    content = await readFile(path, "utf8");
  } catch (error) {
    return { name, status: error?.code === "ENOENT" ? "missing" : "unreadable" };
  }
  if (!content.startsWith(`${MANAGED_AGENT_MARKER}\n`)) return { name, status: "marker_missing" };
  const parsed = parseManagedAgentRouting(content);
  if (!parsed.ok) return { name, status: "routing_invalid" };
  if (!isAllowedCodexModelTuple(codexPolicy, parsed.routing)) return { name, status: "unsupported_tuple" };
  if (!sameTuple(parsed.routing, state.agents[name])) return { name, status: "mixed_profile" };
  if (sha256(content) !== state.files[name].sha256) return { name, status: "hash_mismatch" };
  return { name, status: null };
}

async function compareLivePolicy(base, state, policy, options) {
  const query = options.queryModelCatalog ?? queryCodexModelCatalog;
  let catalog;
  try {
    catalog = await query({ clock: options.clock });
  } catch {
    catalog = null;
  }
  if (catalog?.ok !== true) return { ...base, availabilityStatus: "unknown" };
  const resolution = resolveCodexModelPolicy(policy.codex, catalog.models);
  if (!resolution.ok) {
    return {
      ...base,
      ok: false,
      availabilityStatus: "unsupported",
      restartRequired: false,
      agents: mapAgentStatuses(base.agents, () => "refresh_required"),
      message: "Live model availability has no fully supported policy selection.",
      next: REFRESH_ACTION
    };
  }
  const changed = new Set(SUPERLOOPY_AGENT_NAMES.filter((name) =>
    !sameTuple(resolution.agents[name], state.agents[name])
  ));
  if (changed.size === 0) {
    return {
      ...base,
      availabilityStatus: "current",
      agents: mapAgentStatuses(base.agents, () => "current")
    };
  }
  return {
    ...base,
    ok: false,
    availabilityStatus: "changed",
    restartRequired: false,
    agents: mapAgentStatuses(base.agents, (name) => changed.has(name) ? "refresh_required" : "current"),
    message: "Live model availability differs from the installed routing selection.",
    next: REFRESH_ACTION
  };
}

function mapAgentStatuses(agents, statusFor) {
  return Object.fromEntries(Object.entries(agents).map(([name, agent]) => [
    name,
    { ...agent, status: statusFor(name) }
  ]));
}

function publicAgent(resolution, status) {
  return {
    requestedModel: resolution.requestedModel,
    resolvedModel: resolution.resolvedModel,
    reason: resolution.reason,
    status
  };
}

function absent() {
  return {
    ok: true,
    installed: false,
    policyVersion: null,
    targetDir: null,
    checkedAt: null,
    selectionStatus: "not_installed",
    availabilityStatus: "not_checked",
    stale: false,
    degraded: false,
    restartRequired: false,
    agents: {}
  };
}

function invalidState(policyVersion, reason) {
  const status = reason === "unsupported_tuple"
    ? "unsupported_tuple"
    : reason === "mixed_profile" ? "mixed_profile" : "state_invalid";
  return {
    ok: false,
    installed: true,
    policyVersion,
    targetDir: null,
    checkedAt: null,
    selectionStatus: "invalid",
    availabilityStatus: "not_checked",
    stale: false,
    degraded: false,
    restartRequired: true,
    agents: Object.fromEntries(SUPERLOOPY_AGENT_NAMES.map((name) => [name, {
      requestedModel: null,
      resolvedModel: null,
      reason: "invalid_state",
      status
    }])),
    message: "Installed model policy state is invalid and cannot be trusted.",
    next: REFRESH_ACTION
  };
}

function resolveStatePath(options) {
  if (typeof options.statePath === "string" && options.statePath.length > 0) return options.statePath;
  if (typeof options.homeDir !== "string" || options.homeDir.length === 0) return null;
  return resolveModelResolutionStatePath(options.env ?? {}, options.homeDir);
}

function readClock(clock) {
  try {
    const value = clock();
    const milliseconds = value instanceof Date ? value.getTime() : new Date(value).getTime();
    if (!Number.isFinite(milliseconds)) return null;
    new Date(milliseconds).toISOString();
    return milliseconds;
  } catch {
    return null;
  }
}

function sameTuple(left, right) {
  return left.model === right.model
    && left.model_reasoning_effort === right.model_reasoning_effort
    && left.service_tier === right.service_tier;
}

function sha256(content) {
  return createHash("sha256").update(content, "utf8").digest("hex");
}
