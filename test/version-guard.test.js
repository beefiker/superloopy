import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { releaseBump } from "../scripts/release-bump.mjs";
import { checkVersionBump, installHook, prePush } from "../scripts/version-guard.mjs";

// CI runners have no git identity, and a developer's global core.hooksPath would change what
// installHook sees; releaseBump inherits process.env, so pin both once here.
const emptyGlobalConfig = join(await mkdtemp(join(tmpdir(), "superloopy-gitconfig-")), "config");
await writeFile(emptyGlobalConfig, "");
Object.assign(process.env, {
  GIT_CONFIG_GLOBAL: emptyGlobalConfig,
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_AUTHOR_NAME: "t",
  GIT_AUTHOR_EMAIL: "t@example.com",
  GIT_COMMITTER_NAME: "t",
  GIT_COMMITTER_EMAIL: "t@example.com"
});
const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

// A released repo: v1.0.0 tagged, `src/` shipped, `notes/` not shipped, plus the manifests the bump stamps.
async function releasedRepo() {
  const repo = await mkdtemp(join(tmpdir(), "superloopy-version-guard-"));
  git(repo, "init", "--quiet", "--initial-branch=main");
  await mkdir(join(repo, "src"));
  await mkdir(join(repo, "notes"));
  await mkdir(join(repo, ".codex-plugin"));
  await writeJson(join(repo, "package.json"), { name: "superloopy", version: "1.0.0", files: ["src/"] });
  await writeJson(join(repo, "package-lock.json"), { name: "superloopy", version: "1.0.0", packages: { "": { name: "superloopy", version: "1.0.0" } } });
  await writeJson(join(repo, ".codex-plugin", "plugin.json"), { name: "superloopy", version: "1.0.0" });
  await writeFile(join(repo, "src", "a.js"), "export const a = 1;\n");
  await writeFile(join(repo, "notes", "n.md"), "note\n");
  git(repo, "add", ".");
  git(repo, "commit", "--quiet", "-m", "release 1.0.0");
  git(repo, "tag", "v1.0.0");
  return repo;
}

async function commitFile(repo, path, content) {
  await writeFile(join(repo, path), content);
  git(repo, "add", path);
  git(repo, "commit", "--quiet", "-m", `edit ${path}`);
  return git(repo, "rev-parse", "HEAD");
}

test("a shipped change since the last tag needs a version above it; a bump clears it", async () => {
  const repo = await releasedRepo();
  await commitFile(repo, "src/a.js", "export const a = 2;\n");
  const blocked = checkVersionBump({ cwd: repo });
  assert.equal(blocked.ok, false);
  assert.deepEqual(blocked.changed, ["src/a.js"]);

  const bump = await releaseBump({ repoRoot: repo, kind: "minor" });
  assert.equal(bump.version, "1.1.0");
  assert.equal(bump.committed, true);
  assert.equal(git(repo, "log", "-1", "--format=%s"), "release 1.1.0");
  assert.deepEqual(git(repo, "show", "--name-only", "--format=", "HEAD").split("\n").sort(), [".codex-plugin/plugin.json", "package-lock.json", "package.json"]);
  assert.equal(JSON.parse(await readFile(join(repo, ".codex-plugin", "plugin.json"), "utf8")).version, "1.1.0");
  assert.equal(checkVersionBump({ cwd: repo }).ok, true);
});

test("a change outside package.json files needs no bump", async () => {
  const repo = await releasedRepo();
  await commitFile(repo, "notes/n.md", "edited\n");
  assert.equal(checkVersionBump({ cwd: repo }).ok, true);
});

test("a branch cut before the tag is judged only on its own shipped changes", async () => {
  const repo = await releasedRepo();
  git(repo, "checkout", "--quiet", "-b", "old", "HEAD");
  git(repo, "checkout", "--quiet", "main");
  await commitFile(repo, "src/a.js", "export const a = 3;\n");
  await releaseBump({ repoRoot: repo, kind: "patch" });
  git(repo, "tag", "v1.0.1");
  git(repo, "checkout", "--quiet", "old");
  await commitFile(repo, "notes/n.md", "docs only\n");
  assert.equal(checkVersionBump({ cwd: repo }).ok, true, "docs-only branch must not inherit the release's src change");
  await commitFile(repo, "src/b.js", "export const b = 1;\n");
  assert.equal(checkVersionBump({ cwd: repo }).ok, false);
});

test("pre-push blocks main, only warns on other branches, and ignores deletions", async () => {
  const repo = await releasedRepo();
  const sha = await commitFile(repo, "src/a.js", "export const a = 4;\n");
  const zeros = "0".repeat(40);
  assert.equal(prePush(repo, `refs/heads/main ${sha} refs/heads/main ${zeros}\n`), 1);
  assert.equal(prePush(repo, `refs/heads/feat ${sha} refs/heads/feat/x ${zeros}\n`), 0);
  assert.equal(prePush(repo, `(delete) ${zeros} refs/heads/main ${sha}\n`), 0);
});

test("release bump refuses to sweep uncommitted manifest edits and rejects a non-increasing version", async () => {
  const repo = await releasedRepo();
  await writeJson(join(repo, "package.json"), { name: "superloopy", version: "1.0.0", files: ["src/", "extra/"] });
  await assert.rejects(releaseBump({ repoRoot: repo, kind: "patch" }), /Commit or stash these first/);
  git(repo, "checkout", "--", "package.json");
  await assert.rejects(releaseBump({ repoRoot: repo, kind: "1.0.0" }), /above 1\.0\.0/);
});

test("hook install sets core.hooksPath at the repo top only, and leaves another hooks path alone", async () => {
  const repo = await releasedRepo();
  assert.match(installHook(join(repo, "src")), /^skipped: .* is not the top of /);
  assert.equal(installHook(repo), "installed: core.hooksPath=.githooks");
  git(repo, "config", "core.hooksPath", ".husky");
  assert.equal(installHook(repo), "skipped: core.hooksPath is already .husky");
  assert.equal(git(repo, "config", "--get", "core.hooksPath"), ".husky");
});
