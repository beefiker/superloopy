import { spawnSync } from "node:child_process";

const PLUGIN_ID = "superloopy@beefiker";
const PLUGIN_NAME = "superloopy";
const MARKETPLACE_NAME = "beefiker";
const DEFAULT_TIMEOUT_MS = 5_000;
const MAX_OUTPUT_BYTES = 1_000_000;
const MAX_VERSION_LENGTH = 256;
const STRICT_SEMVER = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/u;
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
  if (!validAuthorityVersion(executingVersion) || !isRecord(payload) || !Array.isArray(payload.installed)) {
    return unavailable();
  }
  const matches = payload.installed.filter((entry) => isRecord(entry) && entry.pluginId === PLUGIN_ID);
  if (matches.length === 0) {
    return informational("not_registered", "Codex does not report an installed superloopy@beefiker plugin.");
  }
  if (matches.length !== 1 || !validExactEntry(matches[0])) return unavailable();
  const entry = matches[0];
  if (entry.installed !== true) {
    return informational("not_registered", "Codex does not report an installed superloopy@beefiker plugin.");
  }
  if (entry.version === executingVersion) {
    return {
      ok: true,
      informational: true,
      state: "current",
      executingVersion,
      installedVersion: entry.version,
      message: `Codex and this doctor both report Superloopy v${executingVersion}.`
    };
  }
  return {
    ok: false,
    informational: true,
    state: "version_mismatch",
    executingVersion,
    installedVersion: entry.version,
    message: `This doctor runs Superloopy v${executingVersion}, but Codex reports installed v${entry.version}.`,
    next: NEXT
  };
}

function validExactEntry(entry) {
  return entry.pluginId === PLUGIN_ID
    && entry.name === PLUGIN_NAME
    && entry.marketplaceName === MARKETPLACE_NAME
    && validAuthorityVersion(entry.version)
    && typeof entry.installed === "boolean"
    && (entry.enabled === undefined || typeof entry.enabled === "boolean");
}

function validAuthorityVersion(version) {
  if (typeof version !== "string" || version.length === 0 || version.length > MAX_VERSION_LENGTH) return false;
  const match = STRICT_SEMVER.exec(version);
  if (match === null || match[1] === undefined) return match !== null;
  return match[1].split(".").every((identifier) => !/^\d+$/u.test(identifier) || identifier === "0" || !identifier.startsWith("0"));
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
