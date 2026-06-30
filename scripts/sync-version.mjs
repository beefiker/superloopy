#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = dirname(scriptDir);

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

function normalizeVersion(version) {
  if (typeof version !== "string") return "";
  return version.trim();
}

export async function resolveAuthoritativeVersion(options = {}) {
  const env = options.env ?? process.env;
  const explicit = normalizeVersion(options.version ?? env.SUPERLOOPY_RELEASE_VERSION);
  if (explicit.length > 0) return explicit;

  const repoRoot = options.repoRoot ?? defaultRepoRoot;
  const rootVersion = normalizeVersion((await readJson(join(repoRoot, "package.json"))).version);
  if (rootVersion.length === 0) {
    throw new Error(`Cannot resolve authoritative version: ${join(repoRoot, "package.json")} has no version`);
  }
  return rootVersion;
}

async function stampJsonVersion(path, version) {
  let parsed;
  try {
    parsed = await readJson(path);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return false;
    throw error;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return false;
  if (!("version" in parsed)) return false;
  if (parsed.version === version) return false;
  parsed.version = version;
  await writeJson(path, parsed);
  return true;
}

async function stampPackageLockVersion(path, version) {
  let parsed;
  try {
    parsed = await readJson(path);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return false;
    throw error;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return false;

  let changed = false;
  if (parsed.version !== version) {
    parsed.version = version;
    changed = true;
  }

  const rootPackage = parsed.packages?.[""];
  if (typeof rootPackage === "object" && rootPackage !== null && rootPackage.version !== version) {
    rootPackage.version = version;
    changed = true;
  }

  if (!changed) return false;
  await writeJson(path, parsed);
  return true;
}

export function manifestTargets(repoRoot) {
  return [
    join(repoRoot, "package.json"),
    join(repoRoot, ".codex-plugin", "plugin.json")
  ];
}

export async function syncVersion(options = {}) {
  const repoRoot = options.repoRoot ?? defaultRepoRoot;
  const version = options.version ?? (await resolveAuthoritativeVersion({ ...options, version: undefined }));
  const targets = manifestTargets(repoRoot);
  const changed = [];
  for (const target of targets) {
    if (await stampJsonVersion(target, version)) changed.push(target);
  }
  const packageLock = join(repoRoot, "package-lock.json");
  if (await stampPackageLockVersion(packageLock, version)) changed.push(packageLock);
  return { version, targets, changed };
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await syncVersion();
  console.log(`Synced Superloopy manifests to version ${result.version} (${result.changed.length} updated)`);
}
