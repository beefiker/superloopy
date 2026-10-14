import { closeSync, fstatSync, openSync, readFileSync, readSync, rmSync, statSync, writeSync } from "node:fs";
import { appendFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { basename, dirname, join, posix } from "node:path";
import { AsyncLocalStorage } from "node:async_hooks";

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

// Track re-entrancy per async call chain. A process-global set lets an unrelated
// concurrent operation mistake another chain's lock for its own and enter the
// critical section without serialization.
const lockContext = new AsyncLocalStorage();
let lockSequence = 0;

// Serialize a read-modify-write critical section on `targetPath` across PROCESSES
// (parallel subagents each run a separate CLI/hook process). writeJsonAtomic keeps a
// single write torn-free, but the surrounding read->mutate->write can still lose updates
// when two processes interleave; this guards the whole section with an O_EXCL lock file.
// Fail-closed: on timeout it throws rather than proceeding unguarded. A lock is reclaimed
// only when its holder PROCESS is dead (never on age alone), so a slow-but-alive critical
// section makes waiters fail closed at the timeout instead of double-entering. Superloopy issues
// Nested same-file operations re-enter only within their async call chain; unrelated chains
// still serialize through the lock file.
export async function withFileLock(targetPath, fn, options = {}) {
  const lockPath = `${targetPath}.lock`;
  const parentContext = lockContext.getStore();
  const inheritedLease = parentContext?.get(lockPath);
  if (inheritedLease?.active) return fn();
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
      if (!isFileLockContention(error)) throw error;
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
  const lease = { active: true };
  const childContext = new Map(parentContext);
  childContext.set(lockPath, lease);
  try {
    return await lockContext.run(childContext, fn);
  } finally {
    lease.active = false;
    releaseIfOwned(lockPath, token);
  }
}

export function isFileLockContention(error, platform = process.platform) {
  return error?.code === "EEXIST"
    || (platform === "win32" && (error?.code === "EPERM" || error?.code === "EACCES"));
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
  return await readPlanUnchecked(cwd, scope);
}

export async function readPlanUnchecked(cwd, scope) {
  let parsed;
  try {
    parsed = JSON.parse(await readFile(goalsPath(cwd, scope), "utf8"));
  } catch (error) {
    if (error && error.code === "ENOENT") {
      throw new Error("No Superloopy plan found. Run `superloopy loop create --brief ...` first.");
    }
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid Superloopy plan JSON in ${goalsRelativePath(scope)}: ${error.message}`);
    }
    throw error;
  }
  validatePlanShape(parsed, scope);
  return parsed;
}

// The ledger is advisory telemetry appended without a lock, so a crash mid-append can leave a
// torn record. One bad line must not make trace/report/capture unusable, so an unparseable line
// becomes a `{ kind: MALFORMED_LEDGER_LINE, line }` placeholder (1-based) in its original position:
// readers can surface it, and order-sensitive readers can treat it as an unknown event (it may
// have been a torn `plan_created`) instead of joining the records around it.
export const MALFORMED_LEDGER_LINE = "ledger_malformed_line";

export async function readLedger(cwd, scope) {
  let raw;
  try {
    raw = await readFile(ledgerPath(cwd, scope), "utf8");
  } catch (error) {
    if (error && error.code === "ENOENT") return [];
    throw error;
  }
  const entries = [];
  raw.split(/\r?\n/).forEach((line, index) => {
    if (line.trim().length === 0) return;
    entries.push(parseLedgerLine(line) ?? { kind: MALFORMED_LEDGER_LINE, line: index + 1 });
  });
  return entries;
}

export async function writePlan(cwd, plan, scope) {
  await ensureSuperloopyDirs(cwd, scope);
  await writeJsonAtomic(goalsPath(cwd, scope), plan);
}

export async function appendLedger(cwd, entry, scope) {
  await ensureSuperloopyDirs(cwd, scope);
  const path = ledgerPath(cwd, scope);
  await appendFile(path, ledgerLine(path, entry), "utf8");
}

// A torn previous record has no trailing newline; start on a fresh line so it cannot swallow this one.
export function ledgerLine(path, entry) {
  return `${endsWithoutNewline(path) ? "\n" : ""}${JSON.stringify(entry)}\n`;
}

function endsWithoutNewline(path) {
  let fd;
  try {
    fd = openSync(path, "r");
  } catch (error) {
    if (error && error.code === "ENOENT") return false;
    throw error;
  }
  try {
    const { size } = fstatSync(fd);
    if (size === 0) return false;
    const byte = Buffer.alloc(1);
    readSync(fd, byte, 0, 1, size - 1);
    return byte[0] !== 0x0a;
  } finally {
    closeSync(fd);
  }
}

export async function writeBrief(cwd, brief, scope) {
  await ensureSuperloopyDirs(cwd, scope);
  await writeFile(briefPath(cwd, scope), brief.endsWith("\n") ? brief : `${brief}\n`, "utf8");
}

export function nowIso() {
  return new Date().toISOString();
}

function parseLedgerLine(line) {
  try {
    const entry = JSON.parse(line);
    return entry !== null && typeof entry === "object" && !Array.isArray(entry) ? entry : undefined;
  } catch {
    return undefined;
  }
}

function validatePlanShape(plan, scope) {
  if (plan === null || typeof plan !== "object" || Array.isArray(plan)) {
    throw new Error(`Invalid Superloopy plan in ${goalsRelativePath(scope)}: plan must be an object.`);
  }
  if (!Array.isArray(plan.goals)) {
    throw new Error(`Invalid Superloopy plan: goals must be an array in ${goalsRelativePath(scope)}.`);
  }
  for (const [goalIndex, goal] of plan.goals.entries()) {
    if (goal === null || typeof goal !== "object" || Array.isArray(goal)) {
      throw new Error(`Invalid Superloopy plan: goals[${goalIndex}] must be an object.`);
    }
    if (!Array.isArray(goal.criteria)) {
      throw new Error(`Invalid Superloopy plan: goals[${goalIndex}].criteria must be an array.`);
    }
  }
}
