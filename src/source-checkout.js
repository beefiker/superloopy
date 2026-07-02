import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

// A source checkout carries its own .git marker (repo root or linked worktree) or is a
// TRACKED subdirectory of an enclosing repo (monorepo), where `git ls-files` still answers
// correctly. A packed/installed tree is neither: an enclosing repo ignores or does not track
// it (e.g. node_modules/), so Git's answer would be wrong — use filesystem semantics there.
export function isSourceCheckoutRoot(cwd) {
  if (existsSync(join(cwd, ".git"))) return true;
  const result = spawnSync("git", ["ls-files", "--cached", "--", "."], { cwd, encoding: "utf8" });
  if (result.status !== 0) return false;
  return result.stdout.split("\n").some((line) => line.trim().length > 0);
}
