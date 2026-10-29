#!/usr/bin/env node
// `npm run release:bump -- <patch|minor|major|x.y.z> [--no-commit]`: computes the next version,
// stamps every manifest through syncVersion, and commits only those files as "release <version>".
// Publishing and tagging stay manual.
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { manifestTargets, syncVersion } from "./sync-version.mjs";
import { compareVersions } from "./version-guard.mjs";

function git(cwd, args) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

export function nextVersion(current, kind) {
  const parts = /^(\d+)\.(\d+)\.(\d+)$/u.exec(current)?.slice(1).map(Number);
  if (!parts) throw new Error(`package.json version ${current} is not x.y.z`);
  const [major, minor, patch] = parts;
  if (kind === "major") return `${major + 1}.0.0`;
  if (kind === "minor") return `${major}.${minor + 1}.0`;
  if (kind === "patch") return `${major}.${minor}.${patch + 1}`;
  if (/^\d+\.\d+\.\d+$/u.test(kind ?? "") && compareVersions(kind, current) > 0) return kind;
  throw new Error(`Expected patch, minor, major, or a version above ${current}; got ${kind ?? "nothing"}`);
}

export async function releaseBump({ repoRoot, kind, commit = true }) {
  const current = JSON.parse(await readFile(join(repoRoot, "package.json"), "utf8")).version;
  const version = nextVersion(current, kind);
  const files = [...manifestTargets(repoRoot), join(repoRoot, "package-lock.json"), join(repoRoot, ".claude-plugin", "marketplace.json")]
    .map((path) => relative(repoRoot, path));
  if (commit) {
    // Refuse to sweep someone's uncommitted edits to these files into the release commit.
    const dirty = git(repoRoot, ["status", "--porcelain", "--", ...files]);
    if (dirty) throw new Error(`Commit or stash these first, or pass --no-commit:\n${dirty}`);
  }
  const result = await syncVersion({ repoRoot, version });
  const changed = result.changed.map((path) => relative(repoRoot, path));
  if (commit && changed.length > 0) git(repoRoot, ["commit", "--quiet", "-m", `release ${version}`, "--", ...changed]);
  return { from: current, version, changed, committed: commit && changed.length > 0 };
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const commit = !args.includes("--no-commit");
  const kind = args.find((arg) => !arg.startsWith("--"));
  try {
    const result = await releaseBump({ repoRoot: dirname(dirname(fileURLToPath(import.meta.url))), kind, commit });
    console.log(`release-bump: ${result.from} -> ${result.version}, ${result.changed.length} files${result.committed ? `, committed "release ${result.version}"` : ", not committed"}`);
    // The guard measures against the newest v* tag, so an untagged publish lets later changes reuse this version.
    console.log(`After merging: npm publish && git tag v${result.version} && git push origin v${result.version}`);
  } catch (error) {
    console.error(`release-bump: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
