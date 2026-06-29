import { closeSync, openSync, readFileSync, rmSync, statSync, writeSync } from "node:fs";
import { appendFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { basename, dirname, join, posix } from "node:path";

export const SUPERLOOPY_DIR = ".superloopy";
export const EVIDENCE_DIR = "evidence";

export function normalizeLoopSessionId(sessionId) {
  const trimmed = typeof sessionId === "string" ? sessionId.trim() : "";
  if (!trimmed) return null;
  const pathSegments = trimmed
    .split(/[\\/]+/)
    .filter((segment) => segment.length > 0 && segment !== "." && segment !== "..");
  const candidate = (pathSegments.length > 0 ? pathSegments.join("-") : trimmed)
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+/g, "")
    .replace(/^[.-]+|[.-]+$/g, "");
  return candidate.length > 0 ? candidate : null;
}

export function scopeFromSessionId(sessionId) {
  const normalized = normalizeLoopSessionId(sessionId);
  return normalized === null ? undefined : { sessionId: normalized };
}

export function superloopyRelativeDir(scope) {
  const sessionId = normalizeLoopSessionId(scope?.sessionId);
  return sessionId === null ? SUPERLOOPY_DIR : relativePath(SUPERLOOPY_DIR, "sessions", sessionId);
}

export function superloopyDir(cwd, scope) {
  return join(cwd, superloopyRelativeDir(scope));
}

export function evidenceRelativeDir(scope) {
  return relativePath(superloopyRelativeDir(scope), EVIDENCE_DIR);
}

export function evidenceDir(cwd, scope) {
  return join(cwd, evidenceRelativeDir(scope));
}

export function briefRelativePath(scope) {
  return relativePath(superloopyRelativeDir(scope), "brief.md");
}

export function goalsRelativePath(scope) {
  return relativePath(superloopyRelativeDir(scope), "goals.json");
}

export function ledgerRelativePath(scope) {
  return relativePath(superloopyRelativeDir(scope), "ledger.jsonl");
}

export function loopControlRelativePath(scope) {
  return relativePath(superloopyRelativeDir(scope), "loop-control.json");
}

export function briefPath(cwd, scope) {
  return join(cwd, briefRelativePath(scope));
}

export function goalsPath(cwd, scope) {
  return join(cwd, goalsRelativePath(scope));
}

export function ledgerPath(cwd, scope) {
  return join(cwd, ledgerRelativePath(scope));
}

export function loopControlPath(cwd, scope) {
  return join(cwd, loopControlRelativePath(scope));
}

export function auditStateRelativePath(scope) {
  return relativePath(superloopyRelativeDir(scope), "audit-state.json");
}

export function auditStatePath(cwd, scope) {
  return join(cwd, auditStateRelativePath(scope));
}

export function repoRelativePath(path) {
  return path.split("\\").join("/");
}

function relativePath(...segments) {
  return posix.join(...segments.map(repoRelativePath));
}

export async function ensureSuperloopyDirs(cwd, scope) {
  await mkdir(evidenceDir(cwd, scope), { recursive: true });
}

export async function writeJsonAtomic(path, value) {
  const tmpPath = `${path}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmpPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(tmpPath, path);
}

// Module-level set of lock paths this process currently holds, so a nested
// withFileLock on the SAME file (e.g. the audit-state accept path calling
// auditOneCriterion) re-enters instead of self-deadlocking.
const heldLocks = new Set();
let lockSequence = 0;

// Serialize a read-modify-write critical section on `targetPath` across PROCESSES
// (parallel subagents each run a separate CLI/hook process). writeJsonAtomic keeps a
// single write torn-free, but the surrounding read->mutate->write can still lose updates
// when two processes interleave; this guards the whole section with an O_EXCL lock file.
// Fail-closed: on timeout it throws rather than proceeding unguarded. A lock is reclaimed
// only when its holder PROCESS is dead (never on age alone), so a slow-but-alive critical
// section makes waiters fail closed at the timeout instead of double-entering. Superloopy issues
// one mutation per process and only nests same-file sections, so process-global re-entrancy
// is sufficient.
export async function withFileLock(targetPath, fn, options = {}) {
  const lockPath = `${targetPath}.lock`;
  if (heldLocks.has(lockPath)) return fn();
  const timeoutMs = options.timeoutMs ?? 10000;
  const staleMs = options.staleMs ?? 60000;
  const retryMs = options.retryMs ?? 25;
  await mkdir(dirname(targetPath), { recursive: true });
  const token = `${process.pid} ${Date.now()} ${++lockSequence}`;
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      const fd = openSync(lockPath, "wx");
      try {
        writeSync(fd, `${token}\n`);
      } finally {
        closeSync(fd);
      }
      break;
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      const reclaim = reclaimableLock(lockPath, staleMs);
      if (reclaim.reclaimable) {
        // Compare-and-delete: remove the lock only if it STILL holds the exact (unique) token we
        // judged stale, so a successor that already replaced it is never force-deleted. A corrupt
        // unreadable lock (no token) is removed best-effort.
        if (reclaim.token === null) rmSyncQuiet(lockPath);
        else rmIfContentMatches(lockPath, reclaim.token);
        continue;
      }
      if (Date.now() >= deadline) {
        throw new Error(`Timed out acquiring lock for ${basename(targetPath)} after ${timeoutMs}ms.`);
      }
      await sleep(retryMs);
    }
  }
  heldLocks.add(lockPath);
  try {
    return await fn();
  } finally {
    heldLocks.delete(lockPath);
    releaseIfOwned(lockPath, token);
  }
}

// Decide whether a held lock can be reclaimed, returning the exact content inspected so the
// caller can compare-and-delete. Reclaim only when the recorded holder PID is dead
// (process.kill(pid, 0) -> ESRCH); a live holder is never preempted (waiters fail closed at the
// timeout). A corrupt/unreadable file falls back to mtime age with token null (best-effort).
function reclaimableLock(lockPath, staleMs) {
  let content;
  try {
    content = readFileSync(lockPath, "utf8");
  } catch {
    return { reclaimable: staleByMtime(lockPath, staleMs), token: null };
  }
  const pid = Number.parseInt(content.trim().split(/\s+/)[0], 10);
  if (Number.isInteger(pid) && pid > 0) {
    try {
      process.kill(pid, 0);
      return { reclaimable: false, token: null };
    } catch (error) {
      return { reclaimable: error.code === "ESRCH", token: content };
    }
  }
  // Readable but no valid PID (corrupt) -> reclaim by mtime, comparing on the exact content.
  return { reclaimable: staleByMtime(lockPath, staleMs), token: content };
}

function staleByMtime(lockPath, staleMs) {
  try {
    return Date.now() - statSync(lockPath).mtimeMs > staleMs;
  } catch {
    return false;
  }
}

// Delete the lock only if it still holds exactly `content` (a unique per-acquisition token), so
// a concurrent reclaimer cannot force-delete a successor's freshly-created live lock.
function rmIfContentMatches(lockPath, content) {
  try {
    if (readFileSync(lockPath, "utf8") === content) rmSync(lockPath, { force: true });
  } catch {
    // gone or unreadable -> nothing to remove
  }
}

// Remove the lock only if we still own it (content matches our token), so a holder that was
// reclaimed (e.g. presumed dead) and superseded cannot delete the successor's lock.
function releaseIfOwned(lockPath, token) {
  try {
    if (readFileSync(lockPath, "utf8").trim() === token) {
      rmSync(lockPath, { force: true });
    }
  } catch {
    // unreadable/absent -> nothing safe to remove
  }
}

function rmSyncQuiet(path) {
  try {
    rmSync(path, { force: true });
  } catch {
    // best-effort release; a dead-holder lock is reclaimed by the next acquirer
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function readPlan(cwd, scope) {
  try {
    return JSON.parse(await readFile(goalsPath(cwd, scope), "utf8"));
  } catch (error) {
    if (error && error.code === "ENOENT") {
      throw new Error("No Superloopy plan found. Run `superloopy loop create --brief ...` first.");
    }
    throw error;
  }
}

export async function readLedger(cwd, scope) {
  try {
    const raw = await readFile(ledgerPath(cwd, scope), "utf8");
    return raw
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0)
      .map((line, index) => parseLedgerLine(line, index));
  } catch (error) {
    if (error && error.code === "ENOENT") return [];
    throw error;
  }
}

export async function writePlan(cwd, plan, scope) {
  await ensureSuperloopyDirs(cwd, scope);
  await writeJsonAtomic(goalsPath(cwd, scope), plan);
}

export async function appendLedger(cwd, entry, scope) {
  await ensureSuperloopyDirs(cwd, scope);
  await appendFile(ledgerPath(cwd, scope), `${JSON.stringify(entry)}\n`, "utf8");
}

export async function writeBrief(cwd, brief, scope) {
  await ensureSuperloopyDirs(cwd, scope);
  await writeFile(briefPath(cwd, scope), brief.endsWith("\n") ? brief : `${brief}\n`, "utf8");
}

export function nowIso() {
  return new Date().toISOString();
}

function parseLedgerLine(line, index) {
  try {
    return JSON.parse(line);
  } catch (error) {
    throw new Error(`Invalid Superloopy ledger JSON on line ${index + 1}.`);
  }
}
