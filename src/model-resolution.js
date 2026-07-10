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

  const clock = options.clock ?? (() => new Date());
  const nowMs = readClock(clock);
  if (nowMs === null) return fail("Model resolution clock returned an invalid time.");
  const checkedAt = new Date(nowMs).toISOString();
  const policyResult = await loadModelPolicyData(policyRoot);
  if (!policyResult.ok) return fail(policyResult.message);
  const policy = policyResult.data;
  const storedState = await readState(statePath);
  const previousFileManifest = readPreviousFileManifest(storedState, targetDir);
  const previousState = validateModelResolutionState(storedState, policy, { targetDir, nowMs }).ok
    ? storedState
    : null;

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
    }), "compatibility_override", previousFileManifest);
  }

  if (options.refreshModels !== true && previousState !== null && isFresh(previousState, nowMs)) {
    return success(policy, previousState, previousState, "fresh", previousFileManifest);
  }

  const query = options.queryModelCatalog ?? queryCodexModelCatalog;
  let catalogResult;
  try {
    catalogResult = await query({ clock: options.clock });
  } catch {
    catalogResult = { ok: false, source: "model_list", reason: "protocol_error" };
  }
  const completionMs = readClock(clock);
  const priorCheckedAtMs = previousState === null ? nowMs : Date.parse(previousState.checkedAt);
  const completionFloorMs = Math.max(nowMs, priorCheckedAtMs);
  const attemptCheckedAt = new Date(
    completionMs === null || completionMs < completionFloorMs ? completionFloorMs : completionMs
  ).toISOString();

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
    }), "refreshed", previousFileManifest);
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
    return success(policy, previousState, state, "unknown_kept_cached", previousFileManifest);
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
  }), "unknown_compatibility", previousFileManifest);
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

export function validateModelResolutionState(state, policy, options = {}) {
  if (!isRecord(state) || !isRecord(policy) || !isRecord(policy.codex)) return invalid("invalid_schema");
  const expectedStateFields = Object.hasOwn(state, "catalogReason") ? [...STATE_FIELDS, "catalogReason"] : STATE_FIELDS;
  if (!hasExactKeys(state, expectedStateFields)) return invalid("invalid_schema");
  if (state.schemaVersion !== MODEL_RESOLUTION_SCHEMA_VERSION) return invalid("schema_version");
  if (state.policyVersion !== policy.version) return invalid("policy_version");
  if (typeof state.targetDir !== "string" || !isAbsolute(state.targetDir)) return invalid("target_dir");
  if (options.targetDir !== undefined && state.targetDir !== options.targetDir) return invalid("target_dir");
  const checkedAtMs = typeof state.checkedAt === "string" ? Date.parse(state.checkedAt) : Number.NaN;
  if (!Number.isFinite(checkedAtMs) || new Date(checkedAtMs).toISOString() !== state.checkedAt) {
    return invalid("checked_at");
  }
  if (options.nowMs !== undefined && checkedAtMs > options.nowMs) return invalid("checked_at");
  if (!SELECTION_REASONS.has(state.selectionReason)) return invalid("selection");
  if (state.availabilitySource !== "model_list" && state.availabilitySource !== "policy") return invalid("selection");
  const unknownSelection = state.selectionReason === "probe_unknown_kept_cached"
    || state.selectionReason === "probe_unknown_compatibility";
  if (unknownSelection !== Object.hasOwn(state, "catalogReason")) return invalid("selection");
  if (unknownSelection && sanitizeCatalogReason(state.catalogReason) !== state.catalogReason) return invalid("selection");
  if ((state.selectionReason === "compatibility_override") !== (state.availabilitySource === "policy")) {
    return invalid("selection");
  }

  const profileValidation = validateProfiles(state.profiles, policy.codex.profiles);
  if (!profileValidation.ok) return profileValidation;
  const compatibilitySelection = state.selectionReason === "compatibility_override"
    || state.selectionReason === "probe_unknown_compatibility";
  if (compatibilitySelection && !Object.values(profileValidation.indexes).every((index) => index === 1)) {
    return invalid("selection");
  }
  if (state.degraded !== Object.values(profileValidation.indexes).some((index) => index > 0)) {
    return invalid("degraded");
  }
  const agentValidation = validateAgents(state.agents, policy.codex.agents, state.profiles);
  if (!agentValidation.ok) return agentValidation;
  if (!validateFiles(state.files)) return invalid("files");
  return { ok: true, checkedAtMs, profileIndexes: profileValidation.indexes };
}

function validateProfiles(profiles, policyProfiles) {
  if (!isRecord(policyProfiles) || !isRecord(profiles) || !hasExactKeys(profiles, Object.keys(policyProfiles))) {
    return invalid("profiles");
  }
  const indexes = {};
  for (const [profileName, policyProfile] of Object.entries(policyProfiles)) {
    const profile = profiles[profileName];
    if (!isRecord(profile) || !hasExactKeys(profile, PROFILE_FIELDS)) return invalid("profiles");
    const index = policyProfile.candidates.findIndex((candidate) => tupleMatches(profile, candidate));
    if (index === -1) return invalid("unsupported_tuple");
    if (profile.requestedModel !== policyProfile.candidates[0].model) return invalid("profiles");
    if (profile.resolvedModel !== profile.model) return invalid("profiles");
    const expectedReason = index === 0 ? "preferred_available" : "compatibility_fallback";
    if (profile.reason !== expectedReason) return invalid("profiles");
    indexes[profileName] = index;
  }
  return { ok: true, indexes };
}

function validateAgents(agents, policyAgents, profiles) {
  if (!isRecord(agents) || !hasExactKeys(agents, SUPERLOOPY_AGENT_NAMES)) return invalid("agents");
  for (const name of SUPERLOOPY_AGENT_NAMES) {
    const agent = agents[name];
    const policyAgent = policyAgents?.[name];
    if (!isRecord(agent) || !isRecord(policyAgent) || !hasExactKeys(agent, AGENT_FIELDS)) return invalid("agents");
    if (agent.profile !== policyAgent.profile || agent.purpose !== policyAgent.purpose) return invalid("agents");
    const profile = profiles[agent.profile];
    if (!isRecord(profile) || PROFILE_FIELDS.some((field) => agent[field] !== profile[field])) {
      return invalid("mixed_profile");
    }
  }
  return { ok: true };
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

function readPreviousFileManifest(state, targetDir) {
  if (!isRecord(state)
    || state.schemaVersion !== MODEL_RESOLUTION_SCHEMA_VERSION
    || state.targetDir !== targetDir
    || !validateFiles(state.files)) {
    return null;
  }
  return state.files;
}

function tupleMatches(value, candidate) {
  return value.model === candidate.model
    && value.model_reasoning_effort === candidate.model_reasoning_effort
    && value.service_tier === candidate.service_tier;
}

export function isAllowedCodexModelTuple(codexPolicy, value) {
  if (!isRecord(codexPolicy?.profiles) || !isRecord(value)) return false;
  return Object.values(codexPolicy.profiles).some((profile) =>
    Array.isArray(profile?.candidates) && profile.candidates.some((candidate) => tupleMatches(value, candidate))
  );
}

function isFresh(state, nowMs) {
  return nowMs - Date.parse(state.checkedAt) < MODEL_RESOLUTION_TTL_MS;
}

function sanitizeCatalogReason(reason) {
  return SAFE_CATALOG_REASONS.has(reason) ? reason : "unknown";
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

function success(policy, previousState, state, cacheStatus, previousFileManifest) {
  return { ok: true, policy, previousState, previousFileManifest, state, cacheStatus };
}

function invalid(reason) {
  return { ok: false, reason };
}

function fail(message) {
  return { ok: false, message };
}
