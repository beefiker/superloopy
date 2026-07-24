import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { readFileSync, realpathSync, statSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";

export function resolveWorkspaceRoot(start, options = {}) {
  const origin = realpathSync(resolve(start));
  const git = findNearestGitWorktree(origin);
  if (git !== null) return git.root;
  const sharedStateRoot = realpathSync(resolve(options.sharedStateRoot ?? tmpdir()));
  let cursor = origin;
  while (true) {
    if (cursor === sharedStateRoot && cursor !== origin) return origin;
    try {
      if (statSync(join(cursor, ".superloopy")).isDirectory()) return cursor;
    } catch {
      // Keep walking.
    }
    const parent = dirname(cursor);
    if (parent === cursor) return origin;
    cursor = parent;
  }
}

export function findNearestGitWorktree(start) {
  let cursor = realpathSync(resolve(start));
  while (true) {
    const gitDir = resolveGitDirectoryAt(cursor);
    if (gitDir !== null) return { root: cursor, gitDir };
    const parent = dirname(cursor);
    if (parent === cursor) return null;
    cursor = parent;
  }
}

export async function checkoutIdentity(start) {
  const root = resolveWorkspaceRoot(start);
  const git = findNearestGitWorktree(root);
  if (git !== null) {
    return hash({
      version: 1,
      kind: "git",
      id: await checkoutUuid(git.gitDir),
      ...filesystemIdentity(git.gitDir)
    });
  }
  return hash({ version: 1, kind: "path", ...filesystemIdentity(root) });
}

export async function createRepositoryBinding(start) {
  const root = resolveWorkspaceRoot(start);
  return {
    version: 1,
    kind: findNearestGitWorktree(root) === null ? "path" : "git-worktree",
    identity: await checkoutIdentity(root),
    rootLabel: basename(root)
  };
}

export async function bindingMatches(start, binding) {
  if (!validBinding(binding)) return false;
  const actual = Buffer.from(await checkoutIdentity(start), "utf8");
  const expected = Buffer.from(binding.identity, "utf8");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function validBinding(binding) {
  return binding !== null
    && typeof binding === "object"
    && !Array.isArray(binding)
    && binding.version === 1
    && (binding.kind === "git-worktree" || binding.kind === "path")
    && typeof binding.identity === "string"
    && /^[a-f0-9]{64}$/u.test(binding.identity)
    && typeof binding.rootLabel === "string"
    && binding.rootLabel.length > 0;
}

function resolveGitDirectoryAt(root) {
  const candidate = join(root, ".git");
  try {
    const stat = statSync(candidate);
    if (stat.isDirectory()) return realpathSync(candidate);
    if (!stat.isFile()) return null;
    const match = /^gitdir:\s*(.+)\s*$/iu.exec(readFileSync(candidate, "utf8"));
    if (!match) return null;
    return realpathSync(isAbsolute(match[1]) ? match[1] : resolve(root, match[1]));
  } catch {
    return null;
  }
}

async function checkoutUuid(gitDir) {
  const markerPath = join(gitDir, "superloopy-trust-id");
  try {
    return readFileSync(markerPath, "utf8").trim();
  } catch {
    const id = randomUUID();
    await writeFile(markerPath, `${id}\n`, { encoding: "utf8", flag: "wx" }).catch((error) => {
      if (error?.code !== "EEXIST") throw error;
    });
    return readFileSync(markerPath, "utf8").trim();
  }
}

function hash(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function filesystemIdentity(path) {
  const stat = statSync(path, { bigint: true });
  return {
    dev: stat.dev.toString(),
    ino: stat.ino.toString(),
    birthtimeNs: stat.birthtimeNs.toString()
  };
}
