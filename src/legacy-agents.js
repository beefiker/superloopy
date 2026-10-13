import { createHash } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

import { RETIRED_AGENT_NAMES, SUPERLOOPY_AGENT_NAMES } from "./agent-names.js";

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
// Every published pre-managed fleet used the pre-rename lane names, so the manifest stays keyed by them.
const LEGACY_AGENT_NAMES = Object.keys(RETIRED_AGENT_NAMES);

export async function loadLegacyAgentManifests(root) {
  const parsed = JSON.parse(await readFile(join(root, "legacy-agent-manifests.json"), "utf8"));
  if (parsed?.version !== 1 || !Array.isArray(parsed.releases)) {
    throw new Error("Legacy agent manifest must use schema version 1.");
  }
  for (const release of parsed.releases) {
    if (typeof release?.id !== "string" || !hasExactNames(release.files)) {
      throw new Error("Legacy agent manifest release is invalid.");
    }
    for (const name of LEGACY_AGENT_NAMES) {
      if (!SHA256_PATTERN.test(release.files[name]?.sha256 ?? "")) {
        throw new Error(`Legacy agent manifest hash is invalid for ${name}.`);
      }
    }
  }
  return parsed.releases;
}

// A pre-managed fleet lives under the retired names. Files under the current names without managed
// state can only be personal agents, so their presence is a conflict. Retired-name files that do not
// all match one release are `legacy_modified`: install retires the proven ones and keeps the rest.
export async function inspectLegacyAgentFleet(targetDir, manifests) {
  const [files, current] = await Promise.all([
    Promise.all(LEGACY_AGENT_NAMES.map((name) => inspectAgentPath(targetDir, name))),
    Promise.all(SUPERLOOPY_AGENT_NAMES.map((name) => inspectAgentPath(targetDir, name)))
  ]);
  if ([...files, ...current].every(({ kind }) => kind === "absent")) return { status: "absent", release: null };
  if (current.some(({ kind }) => kind !== "absent")) return { status: "unmanaged_conflict", release: null };
  const release = manifests.find((candidate) => files.every(({ name, kind, sha256: hash }) =>
    kind === "file" && candidate.files[name].sha256 === hash
  ));
  return release === undefined
    ? { status: "legacy_modified", release: null }
    : { status: "legacy_unmanaged", release: release.id };
}

async function inspectAgentPath(targetDir, name) {
  const path = join(targetDir, `${name}.toml`);
  try {
    const stats = await lstat(path);
    if (!stats.isFile() || stats.isSymbolicLink()) return { name, kind: "foreign", sha256: null };
    return { name, kind: "file", sha256: legacyAgentSha256(await readFile(path, "utf8")) };
  } catch (error) {
    if (error?.code === "ENOENT") return { name, kind: "absent", sha256: null };
    return { name, kind: "foreign", sha256: null };
  }
}

// Exact shell command for removing a retired agent path the installer refused to delete.
export function retiredAgentRemovalCommand(path, kind, platform = process.platform) {
  const directory = kind === "other";
  if (platform === "win32") {
    return `Remove-Item -LiteralPath '${String(path).replaceAll("'", "''")}'${directory ? " -Recurse" : ""}`;
  }
  return `rm ${directory ? "-rf" : "-f"} -- '${String(path).replaceAll("'", "'\\''")}'`;
}

export function resolveDefaultAgentTarget(env = process.env, homeDir = homedir()) {
  const configured = typeof env?.CODEX_HOME === "string" ? env.CODEX_HOME.trim() : "";
  const codexHome = configured.length > 0 ? resolveHome(configured, homeDir) : join(resolve(homeDir), ".codex");
  return join(codexHome, "agents");
}

function resolveHome(path, homeDir) {
  if (path === "~") return resolve(homeDir);
  if (path.startsWith("~/") || path.startsWith("~\\")) return resolve(homeDir, path.slice(2));
  return resolve(path);
}

function hasExactNames(files) {
  return files !== null
    && typeof files === "object"
    && !Array.isArray(files)
    && Object.keys(files).length === LEGACY_AGENT_NAMES.length
    && LEGACY_AGENT_NAMES.every((name) => Object.hasOwn(files, name));
}

export function legacyAgentSha256(content) {
  return createHash("sha256").update(content.replace(/\r\n/gu, "\n"), "utf8").digest("hex");
}
