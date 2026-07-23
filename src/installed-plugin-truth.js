import { spawnSync } from "node:child_process";

import { parseVersion } from "./auto-update-plan.js";

const PLUGIN_ID = "superloopy@beefiker";
const PLUGIN_NAME = "superloopy";
const MARKETPLACE_NAME = "beefiker";
const DEFAULT_TIMEOUT_MS = 5_000;
const MAX_OUTPUT_BYTES = 1_000_000;
const NEXT = "Run `codex plugin add superloopy@beefiker --json`, then start a new Codex session.";

export function queryInstalledPluginTruth(executingVersion, options = {}) {
  let result;
  try {
    if (!isRecord(options)) return unavailable();
    const spawnSyncImpl = options.spawnSyncImpl ?? spawnSync;
    if (typeof spawnSyncImpl !== "function") return unavailable();
    result = spawnSyncImpl("codex", ["plugin", "list", "--json"], {
      encoding: "utf8",
      maxBuffer: MAX_OUTPUT_BYTES,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      timeout: DEFAULT_TIMEOUT_MS,
      windowsHide: true
    });
  } catch {
    return unavailable();
  }
  if (result?.status !== 0 || typeof result.stdout !== "string" || Buffer.byteLength(result.stdout, "utf8") > MAX_OUTPUT_BYTES) {
    return unavailable();
  }
  try {
    return classifyInstalledPluginTruth(executingVersion, JSON.parse(result.stdout));
  } catch {
    return unavailable();
  }
}

export function classifyInstalledPluginTruth(executingVersion, payload) {
  if (parseVersion(executingVersion) === null || !isRecord(payload) || !Array.isArray(payload.installed)) {
    return unavailable();
  }
  const normalizedExecutingVersion = executingVersion.trim();
  const matches = payload.installed.filter((entry) => isRecord(entry) && entry.pluginId === PLUGIN_ID);
  if (matches.length === 0) {
    return informational("not_registered", "Codex does not report an installed superloopy@beefiker plugin.");
  }
  if (matches.length !== 1 || !validExactEntry(matches[0])) return unavailable();
  const entry = matches[0];
  if (entry.installed !== true) {
    return informational("not_registered", "Codex does not report an installed superloopy@beefiker plugin.");
  }
  if (entry.version === normalizedExecutingVersion) {
    return {
      ok: true,
      informational: true,
      state: "current",
      executingVersion: normalizedExecutingVersion,
      installedVersion: entry.version,
      message: `Codex and this doctor both report Superloopy v${normalizedExecutingVersion}.`
    };
  }
  return {
    ok: false,
    informational: true,
    state: "version_mismatch",
    executingVersion: normalizedExecutingVersion,
    installedVersion: entry.version,
    message: `This doctor runs Superloopy v${normalizedExecutingVersion}, but Codex reports installed v${entry.version}.`,
    next: NEXT
  };
}

function validExactEntry(entry) {
  return entry.pluginId === PLUGIN_ID
    && entry.name === PLUGIN_NAME
    && entry.marketplaceName === MARKETPLACE_NAME
    && parseVersion(entry.version) !== null
    && typeof entry.installed === "boolean"
    && (entry.enabled === undefined || typeof entry.enabled === "boolean");
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function informational(state, message) {
  return { ok: true, informational: true, state, message };
}

function unavailable() {
  return informational("authority_unavailable", "Codex installed-plugin authority is unavailable.");
}
