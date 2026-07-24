import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { bindingMatches, checkoutIdentity, createRepositoryBinding, resolveWorkspaceRoot } from "../src/workspace-identity.js";

async function gitRepo() {
  const root = await mkdtemp(join(tmpdir(), "superloopy-workspace-"));
  execFileSync("git", ["init", "-q", root]);
  return root;
}

test("workspace root and checkout identity stay stable from a child directory", async () => {
  const root = await gitRepo();
  const child = join(root, "src", "nested");
  await mkdir(child, { recursive: true });
  assert.equal(resolveWorkspaceRoot(child), realpathSync(root));
  assert.equal(await checkoutIdentity(child), await checkoutIdentity(root));
});

test("repository bindings distinguish separate worktrees", async () => {
  const first = await gitRepo();
  const second = await gitRepo();
  const binding = await createRepositoryBinding(first);
  assert.equal(await bindingMatches(first, binding), true);
  assert.equal(await bindingMatches(second, binding), false);
});

test("non-Git workspaces reuse the nearest Superloopy ancestor", async () => {
  const root = await mkdtemp(join(tmpdir(), "superloopy-state-root-"));
  await mkdir(join(root, ".superloopy"));
  const child = join(root, "a", "b");
  await mkdir(child, { recursive: true });
  assert.equal(resolveWorkspaceRoot(child), realpathSync(root));
});
