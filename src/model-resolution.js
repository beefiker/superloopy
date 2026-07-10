import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";

import { SUPERLOOPY_AGENT_NAMES } from "./agent-names.js";
import { queryCodexModelCatalog } from "./model-catalog.js";
import { loadModelPolicyData, resolveCodexModelPolicy } from "./model-policy.js";

export const MODEL_RESOLUTION_SCHEMA_VERSION = 1;
export const MODEL_RESOLUTION_TTL_MS = 86_400_000;

const PROFILE_FIELDS = [
  "model",
  "model_reasoning_effort",
  "service_tier",
  "requestedModel",
  "resolvedModel",
  "reason"
];
const AGENT_FIELDS = ["profile", "purpose", ...PROFILE_FIELDS];
const STATE_FIELDS = [
  "schemaVersion",
  "policyVersion",
  "targetDir",
  "checkedAt",
  "availabilitySource",
  "selectionReason",
  "degraded",
  "profiles",
  "agents",
  "files"
];
const SELECTION_REASONS = new Set([
  "catalog_resolved",
  "compatibility_override",
  "probe_unknown_kept_cached",
  "probe_unknown_compatibility"
]);
const SAFE_CATALOG_REASONS = new Set([
  "spawn_error",
  "protocol_error",
  "server_error",
  "process_exit",
  "timeout"
]);
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

export function resolveModelResolutionStatePath(env = process.env, homeDir = homedir()) {
  const configured = typeof env?.CODEX_HOME === "string" ? env.CODEX_HOME.trim() : "";
  const codexHome = configured.length > 0 ? resolveHomePath(configured, homeDir) : join(resolve(homeDir), ".codex");
  return join(codexHome, "superloopy", "model-resolution.json");
}

export async function prepareCodexModelResolution(options = {}) {
  const policyRoot = options.policyRoot;
  const targetDir = options.targetDir;
  const statePath = options.statePath;
  if (typeof policyRoot !== "string" || policyRoot.length === 0) return fail("Model policy root must be provided.");
  if (typeof targetDir !== "string" || !isAbsolute(targetDir)) return fail("Codex agent target directory must be absolute.");
  if (typeof statePath !== "string" || statePath.length === 0) return fail("Model resolution state path must be provided.");

  const nowMs = readClock(options.clock ?? (() => new Date()));
  if (nowMs === null) return fail("Model resolution clock returned an invalid time.");
  const checkedAt = new Date(nowMs).toISOString();
  const policyResult = await loadModelPolicyData(policyRoot);
  if (!policyResult.ok) return fail(policyResult.message);
  const policy = policyResult.data;
  const storedState = await readState(statePath);
  const previousState = isReusableState(storedState, policy, targetDir, nowMs) ? storedState : null;

  if (options.compatibility === true) {
    const resolution = resolveCompatibility(policy.codex);
    if (!resolution.ok) return resolution;
    return success(policy, previousState, buildState({
      policy,
      targetDir,
      checkedAt,
      availabilitySource: "policy",
      selectionReason: "compatibility_override",
      resolution
    }), "compatibility_override");
  }

  if (options.refreshModels !== true && previousState !== null && isFresh(previousState, nowMs)) {
    return success(policy, previousState, previousState, "fresh");
  }

  const query = options.queryModelCatalog ?? queryCodexModelCatalog;
  let catalogResult;
  try {
    catalogResult = await query({ clock: options.clock });
  } catch {
    catalogResult = { ok: false, source: "model_list", reason: "protocol_error" };
  }
  const attemptCheckedAt = sanitizeCheckedAt(catalogResult?.checkedAt, checkedAt);

  if (catalogResult?.ok === true) {
    const resolution = resolveCodexModelPolicy(policy.codex, catalogResult.models);
    if (!resolution.ok) return resolution;
    return success(policy, previousState, buildState({
      policy,
      targetDir,
      checkedAt: attemptCheckedAt,
      availabilitySource: "model_list",
      selectionReason: "catalog_resolved",
      resolution
    }), "refreshed");
  }

  const catalogReason = sanitizeCatalogReason(catalogResult?.reason);
  if (previousState !== null) {
    const state = {
      ...previousState,
      checkedAt: attemptCheckedAt,
      availabilitySource: "model_list",
      selectionReason: "probe_unknown_kept_cached",
      catalogReason
    };
    return success(policy, previousState, state, "unknown_kept_cached");
  }

  const resolution = resolveCompatibility(policy.codex);
  if (!resolution.ok) return resolution;
  return success(policy, null, buildState({
    policy,
    targetDir,
    checkedAt: attemptCheckedAt,
    availabilitySource: "model_list",
    selectionReason: "probe_unknown_compatibility",
    catalogReason,
    resolution
  }), "unknown_compatibility");
}

function resolveCompatibility(codexPolicy) {
  const profiles = {};
  const catalog = [];
  for (const [profileName, profile] of Object.entries(codexPolicy.profiles)) {
    const candidate = profile.candidates[1];
    if (candidate === undefined) return fail(`No compatibility candidate for Codex profile ${profileName}.`);
    profiles[profileName] = { candidates: [candidate] };
    catalog.push({
      id: candidate.model,
      reasoningEfforts: [candidate.model_reasoning_effort],
      serviceTiers: [candidate.service_tier]
    });
  }

  const selected = resolveCodexModelPolicy({ ...codexPolicy, profiles }, catalog);
  if (!selected.ok) return selected;
  const resolvedProfiles = Object.fromEntries(Object.entries(selected.profiles).map(([profileName, profile]) => [
    profileName,
    {
      ...profile,
      requestedModel: codexPolicy.profiles[profileName].candidates[0].model,
      reason: "compatibility_fallback"
    }
  ]));
  const agents = Object.fromEntries(Object.entries(selected.agents).map(([name, agent]) => [
    name,
    { profile: agent.profile, purpose: agent.purpose, ...resolvedProfiles[agent.profile] }
  ]));
  return { ok: true, profiles: resolvedProfiles, agents };
}

function buildState({ policy, targetDir, checkedAt, availabilitySource, selectionReason, catalogReason, resolution }) {
  return {
    schemaVersion: MODEL_RESOLUTION_SCHEMA_VERSION,
    policyVersion: policy.version,
    targetDir,
    checkedAt,
    availabilitySource,
    selectionReason,
    ...(catalogReason === undefined ? {} : { catalogReason }),
    degraded: Object.values(resolution.profiles).some(({ reason }) => reason === "compatibility_fallback"),
    profiles: resolution.profiles,
    agents: resolution.agents,
    files: {}
  };
}

async function readState(statePath) {
  try {
    return JSON.parse(await readFile(statePath, "utf8"));
  } catch {
    return null;
  }
}

function isReusableState(state, policy, targetDir, nowMs) {
  if (!isRecord(state)) return false;
  const expectedStateFields = Object.hasOwn(state, "catalogReason") ? [...STATE_FIELDS, "catalogReason"] : STATE_FIELDS;
  if (!hasExactKeys(state, expectedStateFields)) return false;
  if (state.schemaVersion !== MODEL_RESOLUTION_SCHEMA_VERSION) return false;
  if (state.policyVersion !== policy.version || state.targetDir !== targetDir) return false;
  const checkedAtMs = typeof state.checkedAt === "string" ? Date.parse(state.checkedAt) : Number.NaN;
  if (!Number.isFinite(checkedAtMs) || checkedAtMs > nowMs) return false;
  if (!SELECTION_REASONS.has(state.selectionReason)) return false;
  if (state.availabilitySource !== "model_list" && state.availabilitySource !== "policy") return false;
  const unknownSelection = state.selectionReason === "probe_unknown_kept_cached"
    || state.selectionReason === "probe_unknown_compatibility";
  if (unknownSelection !== Object.hasOwn(state, "catalogReason")) return false;
  if (unknownSelection && sanitizeCatalogReason(state.catalogReason) !== state.catalogReason) return false;
  if ((state.selectionReason === "compatibility_override") !== (state.availabilitySource === "policy")) return false;

  const profileIndexes = validateProfiles(state.profiles, policy.codex.profiles);
  if (profileIndexes === null) return false;
  if (state.degraded !== Object.values(profileIndexes).some((index) => index > 0)) return false;
  if (!validateAgents(state.agents, policy.codex.agents, state.profiles)) return false;
  return validateFiles(state.files);
}

function validateProfiles(profiles, policyProfiles) {
  if (!isRecord(profiles) || !hasExactKeys(profiles, Object.keys(policyProfiles))) return null;
  const indexes = {};
  for (const [profileName, policyProfile] of Object.entries(policyProfiles)) {
    const profile = profiles[profileName];
    if (!isRecord(profile) || !hasExactKeys(profile, PROFILE_FIELDS)) return null;
    const index = policyProfile.candidates.findIndex((candidate) => tupleMatches(profile, candidate));
    if (index === -1) return null;
    if (profile.requestedModel !== policyProfile.candidates[0].model) return null;
    if (profile.resolvedModel !== profile.model) return null;
    const expectedReason = index === 0 ? "preferred_available" : "compatibility_fallback";
    if (profile.reason !== expectedReason) return null;
    indexes[profileName] = index;
  }
  return indexes;
}

function validateAgents(agents, policyAgents, profiles) {
  if (!isRecord(agents) || !hasExactKeys(agents, SUPERLOOPY_AGENT_NAMES)) return false;
  for (const name of SUPERLOOPY_AGENT_NAMES) {
    const agent = agents[name];
    const policyAgent = policyAgents?.[name];
    if (!isRecord(agent) || !isRecord(policyAgent) || !hasExactKeys(agent, AGENT_FIELDS)) return false;
    if (agent.profile !== policyAgent.profile || agent.purpose !== policyAgent.purpose) return false;
    const profile = profiles[agent.profile];
    if (!isRecord(profile) || PROFILE_FIELDS.some((field) => agent[field] !== profile[field])) return false;
  }
  return true;
}

function validateFiles(files) {
  if (!isRecord(files) || !hasExactKeys(files, SUPERLOOPY_AGENT_NAMES)) return false;
  return SUPERLOOPY_AGENT_NAMES.every((name) => {
    const record = files[name];
    return isRecord(record)
      && hasExactKeys(record, ["sha256"])
      && typeof record.sha256 === "string"
      && SHA256_PATTERN.test(record.sha256);
  });
}

function tupleMatches(value, candidate) {
  return value.model === candidate.model
    && value.model_reasoning_effort === candidate.model_reasoning_effort
    && value.service_tier === candidate.service_tier;
}

function isFresh(state, nowMs) {
  return nowMs - Date.parse(state.checkedAt) < MODEL_RESOLUTION_TTL_MS;
}

function sanitizeCatalogReason(reason) {
  return SAFE_CATALOG_REASONS.has(reason) ? reason : "unknown";
}

function sanitizeCheckedAt(value, fallback) {
  const milliseconds = typeof value === "string" ? Date.parse(value) : Number.NaN;
  return Number.isFinite(milliseconds) ? new Date(milliseconds).toISOString() : fallback;
}

function readClock(clock) {
  try {
    const value = clock();
    const milliseconds = value instanceof Date ? value.getTime() : new Date(value).getTime();
    return Number.isFinite(milliseconds) ? milliseconds : null;
  } catch {
    return null;
  }
}

function resolveHomePath(value, homeDir) {
  if (value === "~") return resolve(homeDir);
  if (value.startsWith("~/") || value.startsWith("~\\")) return join(resolve(homeDir), value.slice(2));
  return resolve(value);
}

function hasExactKeys(value, expected) {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return actual.length === sortedExpected.length && actual.every((key, index) => key === sortedExpected[index]);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function success(policy, previousState, state, cacheStatus) {
  return { ok: true, policy, previousState, state, cacheStatus };
}

function fail(message) {
  return { ok: false, message };
}
