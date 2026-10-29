#!/usr/bin/env node
// Release guard: a commit whose shipped files (package.json `files`) changed since the newest
// v* tag must carry a version above that tag. Used by the pre-push hook (blocks main, warns on
// other branches), by CI on pull requests and pushes to main, and by `npm prepare` to install the hook.
import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RELEASE_BRANCHES = new Set(["refs/heads/main", "refs/heads/master"]);
const ZERO_SHA = /^0+$/u;
const HOOKS_PATH = ".githooks";

function git(cwd, args) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function parseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/u.exec(version ?? "");
  return match ? match.slice(1).map(Number) : null;
}

export function compareVersions(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  if (!a || !b) throw new Error(`Expected x.y.z versions, got ${left} and ${right}`);
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return 0;
}

export function newestReleaseTag(cwd) {
  const tags = git(cwd, ["tag", "--list", "v[0-9]*", "--sort=-v:refname"]).split("\n").filter(Boolean);
  return tags.find((tag) => parseVersion(tag.slice(1))) ?? null;
}

export function checkVersionBump({ cwd = process.cwd(), ref = "HEAD" } = {}) {
  const tag = newestReleaseTag(cwd);
  if (tag === null) return { ok: true, reason: "no v* release tag", changed: [] };
  const pkg = JSON.parse(git(cwd, ["show", `${ref}:package.json`]));
  const shipped = Array.isArray(pkg.files) ? pkg.files : [];
  // Three-dot diff: only what this ref added since it forked from the tag, so a branch cut
  // before the tag is not blamed for the release's own changes.
  const changed = shipped.length === 0
    ? []
    : git(cwd, ["diff", "--name-only", `${tag}...${ref}`, "--", ...shipped]).split("\n").filter(Boolean);
  const tagVersion = tag.slice(1);
  if (changed.length === 0) return { ok: true, reason: `no shipped file changed since ${tag}`, tag, version: pkg.version, changed };
  if (compareVersions(pkg.version, tagVersion) > 0) return { ok: true, reason: `version ${pkg.version} is above ${tag}`, tag, version: pkg.version, changed };
  return { ok: false, reason: `shipped files changed since ${tag} but package.json is still ${pkg.version}`, tag, version: pkg.version, changed };
}

function describeFailure(result) {
  const listed = result.changed.slice(0, 8).map((path) => `  ${path}`).join("\n");
  const more = result.changed.length > 8 ? `\n  … ${result.changed.length - 8} more` : "";
  return `${result.reason}:\n${listed}${more}\nBump with: npm run release:bump -- <patch|minor|major>`;
}

// git passes one line per ref: <local ref> <local sha> <remote ref> <remote sha>.
export function prePush(cwd, stdinText) {
  let blocked = false;
  for (const line of stdinText.split("\n")) {
    const [, localSha, remoteRef] = line.trim().split(/\s+/u);
    if (!localSha || ZERO_SHA.test(localSha) || !remoteRef?.startsWith("refs/heads/")) continue;
    const result = checkVersionBump({ cwd, ref: localSha });
    if (result.ok) continue;
    if (RELEASE_BRANCHES.has(remoteRef)) {
      console.error(`version-guard: push to ${remoteRef} blocked. ${describeFailure(result)}\n(git push --no-verify skips this check.)`);
      blocked = true;
    } else {
      console.error(`version-guard: warning for ${remoteRef}. ${describeFailure(result)}\nThe pull request check will fail until the version moves.`);
    }
  }
  return blocked ? 1 : 0;
}

// Runs from `npm prepare`. Never fails the install: outside a git checkout, or when the clone
// already points core.hooksPath somewhere else, it leaves git config alone.
export function installHook(cwd) {
  let topLevel;
  try {
    topLevel = git(cwd, ["rev-parse", "--show-toplevel"]);
  } catch {
    return "skipped: not a git checkout";
  }
  // A copy nested inside another repository must not rewrite that repository's hooks.
  if (realpathSync.native(topLevel) !== realpathSync.native(cwd)) return `skipped: ${cwd} is not the top of ${topLevel}`;
  let current = "";
  try {
    current = git(cwd, ["config", "--get", "core.hooksPath"]);
  } catch {
    current = "";
  }
  if (current && current !== HOOKS_PATH) return `skipped: core.hooksPath is already ${current}`;
  if (current === HOOKS_PATH) return "already installed";
  git(cwd, ["config", "core.hooksPath", HOOKS_PATH]);
  return `installed: core.hooksPath=${HOOKS_PATH}`;
}

async function readStdin() {
  let text = "";
  for await (const chunk of process.stdin) text += chunk;
  return text;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
  const [mode, value] = process.argv.slice(2);
  if (mode === "--install-hook") {
    // stderr: npm runs `prepare` during `npm pack`, and stdout there must stay valid `--json`.
    console.error(`version-guard: ${installHook(repoRoot)}`);
  } else if (mode === "--pre-push") {
    process.exitCode = prePush(repoRoot, await readStdin());
  } else if (mode === "--ref") {
    const result = checkVersionBump({ cwd: repoRoot, ref: value ?? "HEAD" });
    if (result.ok) console.log(`version-guard: ok (${result.reason})`);
    else {
      console.error(`version-guard: ${describeFailure(result)}`);
      process.exitCode = 1;
    }
  } else {
    console.error("Usage: version-guard.mjs --ref <commit> | --pre-push | --install-hook");
    process.exitCode = 2;
  }
}
