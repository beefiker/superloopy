// Superloopy continuation engine: turns the reactive Stop hook into a bounded,
// progress-gated loop that keeps driving the agent toward evidence-backed
// completion. It NEVER completes anything — completion stays the plan's sole
// authority. A cap or no-progress stall marks the loop blocked for a human,
// never a fabricated done. Hook-only, no daemon: each iteration is one
// short-lived Stop invocation governed by .superloopy/loop-control.json.

import { closeSync, fstatSync, openSync, readSync } from "node:fs";
import { mkdir, readFile, rm } from "node:fs/promises";
import { dirname } from "node:path";
import { appendLedger, auditStatePath, loopControlPath, nowIso, withFileLock, writeJsonAtomic } from "./store.js";

const STATE_VERSION = 1;
const DEFAULT_MAX_ITERATIONS = 50; // loose backstop; 0 = unlimited
const DEFAULT_MAX_STALLED = 3; // mirrors the proven subagent-receipt cap
const MAX_STALLED_CEILING = 50; // upper bound on the no-progress guard when the iteration cap is off
export const TRANSCRIPT_TAIL_BYTES = 65536; // bound the context-pressure scan cost
const BUDGET_MS = 4000; // pause cleanly below the 5s hook budget

// Quota / usage-limit markers: when the host is rate/usage-limited its transcript shows one of
// these. The default set is deliberately conservative + specific (a false positive would wrongly
// pause an otherwise-healthy loop) and is extended per-host via SUPERLOOPY_QUOTA_MARKERS (a comma or
// newline list), since the exact banner text is host-specific. Matched case-insensitively.
export const QUOTA_LIMIT_MARKERS = [
  "usage limit reached",
  "reached your usage limit",
  "rate limit exceeded",
  "quota exceeded",
  "weekly limit reached",
  "session limit reached",
  "too many requests"
];
export const CONTEXT_PRESSURE_MARKERS = [
  "context compacted", "context_length_exceeded", "skill descriptions were shortened",
  "context_too_large", "codex ran out of room in the model's context window",
  "your input exceeds the context window", "long threads and multiple compactions"
];

export function quotaLimitMarkers(env = {}) {
  const extra = String(env.SUPERLOOPY_QUOTA_MARKERS ?? "")
    .split(/[,\n]/)
    .map((marker) => marker.trim().toLowerCase())
    .filter((marker) => marker.length > 0);
  return [...QUOTA_LIMIT_MARKERS, ...extra];
}

export function loopControlLimits(env = {}) {
  return {
    enabled: String(env.SUPERLOOPY_CONTINUATION ?? "on").toLowerCase() !== "off",
    maxIterations: readCount(env.SUPERLOOPY_MAX_ITERATIONS, DEFAULT_MAX_ITERATIONS),
    maxStalled: readCount(env.SUPERLOOPY_MAX_STALLED, DEFAULT_MAX_STALLED)
  };
}

// Progress is measured against a high-water mark of recorded proof so that a
// regression-then-recovery (pass -> pending -> pass) does NOT reset the stall
// counter. Only exceeding the best score ever seen counts as progress.
export function evaluateProgress(prev, summary, audited = 0) {
  // `audited` is a monotonic count of accepted audits — it only ever rises, so a
  // fresh accepted audit registers as genuine progress even when a fail -> re-prove
  // cycle returns the pass count to its prior level.
  const score = summary.criteria.pass + summary.goals.complete + audited;
  const highWater = Number.isInteger(prev?.highWater) ? prev.highWater : -1;
  const advanced = score > highWater;
  const priorStalled = Number.isInteger(prev?.stalledCount) ? prev.stalledCount : 0;
  return {
    advanced,
    highWater: advanced ? score : highWater,
    stalledCount: advanced ? 0 : priorStalled + 1
  };
}

export async function readLoopControl(cwd, scope) {
  try {
    const parsed = JSON.parse(await readFile(loopControlPath(cwd, scope), "utf8"));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
  } catch {
    // absent or unreadable -> treated as no active loop
  }
  return null;
}

async function readAuditsAccepted(cwd, scope) {
  try {
    const parsed = JSON.parse(await readFile(auditStatePath(cwd, scope), "utf8"));
    return Number.isInteger(parsed?.auditsAccepted) ? parsed.auditsAccepted : 0;
  } catch {
    return 0;
  }
}

export async function decideContinuation(payload, deps) {
  const startedAt = Date.now();
  const env = deps.env ?? {};
  const markers = deps.contextPressureMarkers ?? [];
  const limits = loopControlLimits(env);
  const cwd = payload.cwd;
  const scope = deps.scopeFromPayload(payload);

  // Legacy escape hatch: with the engine off, honor the host re-entrancy brake
  // and keep the original single-continuation behavior.
  if (!limits.enabled && payload.stop_hook_active === true) return "";

  // Context pressure: pause without touching the counter so the loop resumes
  // cleanly after a compaction instead of mistaking it for completion.
  if (transcriptTailHasMarker(payload.transcript_path, markers)) return "";

  let status;
  try {
    status = await deps.statusForPayload(payload);
  } catch (err) {
    // No active plan -> nothing to drive; allow the stop.
    if (err instanceof Error && err.message.startsWith("No Superloopy plan found.")) return "";
    // A plan that EXISTS but won't parse (corrupt, or caught mid-write in a co-edited
    // repo) must SURFACE — never be silently treated as completion. Fail closed: block
    // and ask for a re-check. A transient mid-write race self-heals on the next Stop.
    return `${JSON.stringify({ decision: "block", reason: [
      "Superloopy could not read the plan — `.superloopy/goals.json` may be corrupt or mid-write.",
      "The loop will not complete until the plan is readable again; if this persists, repair the plan file."
    ].join("\n") })}\n`;
  }

  // Termination authority is unchanged and absolute.
  if (status.summary.aggregateComplete) {
    await clearLoopControl(cwd, scope);
    return "";
  }
  // Only pending/fail criteria are re-drivable. Blocked criteria need a human,
  // so they surface to the gate rather than spinning the loop forever.
  const remaining = status.summary.criteria.pending + status.summary.criteria.fail;
  if (remaining === 0) return ""; // nothing re-drivable; let the agent run check/finish

  if (!limits.enabled) return blockReason(payload, status, deps); // engine off: single continuation

  // Budget guard: if reading state/plan already took most of the hook window,
  // pause cleanly rather than risk a silent timeout mid-write.
  if (Date.now() - startedAt > BUDGET_MS) return "";

  // Quota / usage limit: the host is rate/usage-limited (its transcript tail shows a limit
  // marker). Pause WITHOUT burning the no-progress counter or fabricating completion, recording a
  // resumable "paused" state. Superloopy is hook-driven and cannot self-wake — an external scheduler
  // (or the host itself on quota reset) resumes the loop; this only makes the stall clean and
  // observable so a quota stall is never mis-counted as no-progress or a fabricated done.
  if (transcriptTailHasMarker(payload.transcript_path, quotaLimitMarkers(env))) {
    await markQuotaPaused(cwd, scope, deps);
    return "";
  }

  // Lock the loop-control read->decide->write so two concurrent Stop hooks cannot both
  // read iteration N and write N+1, losing one increment (or one blocked transition). A short
  // timeout keeps the hook within its budget; on contention it pauses cleanly (next Stop retries).
  let decision;
  try {
    decision = await withFileLock(loopControlPath(cwd, scope), async () => {
    const prev = (await readLoopControl(cwd, scope)) ?? defaultLoopControl(scope);
    const now = nowIso();
    // Resuming from a quota pause: the marker is gone (we are past the quota check), so record the
    // resume; the `next` written below carries status "active", clearing the paused state.
    if (prev.status === "paused") {
      await safeLedger(deps, cwd, scope, { at: now, kind: "loop_resumed", reason: prev.pausedReason ?? "quota" });
    }
    const progress = evaluateProgress(prev, status.summary, await readAuditsAccepted(cwd, scope));
    const iteration = (Number.isInteger(prev.iteration) ? prev.iteration : 0) + 1;
    // When the hard iteration cap is disabled (maxIterations===0), the no-progress
    // guard is the ONLY backstop, so it must stay effective: a 0 (disabled) or an
    // absurdly large maxStalled is clamped to a finite ceiling so an unlimited loop
    // can still never run away. With a finite iteration cap, maxStalled is honored as
    // given (the cap is the runaway backstop).
    const maxStalled = limits.maxIterations === 0
      ? Math.min(limits.maxStalled === 0 ? DEFAULT_MAX_STALLED : limits.maxStalled, MAX_STALLED_CEILING)
      : limits.maxStalled;

    const next = {
      ...defaultLoopControl(scope),
      iteration,
      highWater: progress.highWater,
      stalledCount: progress.stalledCount,
      createdAt: prev.createdAt ?? now,
      lastUpdatedAt: now
    };

    if (maxStalled > 0 && progress.stalledCount >= maxStalled) {
      await persistBlocked(cwd, scope, next, "no-progress", now);
      return { blocked: true };
    }
    if (limits.maxIterations > 0 && iteration > limits.maxIterations) {
      await persistBlocked(cwd, scope, next, "max-iterations", now);
      return { blocked: true };
    }

    await writeLoopControl(cwd, scope, next);
    return { blocked: false, iteration, now };
    }, { timeoutMs: 1500 });
  } catch {
    return "";
  }

  if (decision.blocked) return "";

  await safeLedger(deps, cwd, scope, {
    at: decision.now,
    kind: "loop_iteration",
    iteration: decision.iteration,
    maxIterations: limits.maxIterations,
    criteriaPass: status.summary.criteria.pass,
    goalsComplete: status.summary.goals.complete
  });

  const cap = limits.maxIterations > 0 ? ` of ${limits.maxIterations}` : "";
  const reason = `${deps.renderContinuationDirective(status, deps.guideForPayload(payload, status.plan))}\n` +
    `- Loop iteration: ${decision.iteration}${cap}\n` +
    "- This is an automatic continuation; the Stop hook re-checks recorded proof and keeps you going until aggregate completion or a backstop.";
  return `${JSON.stringify({ decision: "block", reason })}\n`;
}

function blockReason(payload, status, deps) {
  const reason = deps.renderContinuationDirective(status, deps.guideForPayload(payload, status.plan));
  return `${JSON.stringify({ decision: "block", reason })}\n`;
}

function defaultLoopControl(scope) {
  return {
    version: STATE_VERSION,
    sessionId: scope?.sessionId ?? null,
    iteration: 0,
    highWater: -1,
    stalledCount: 0,
    status: "active",
    blockedReason: null,
    pausedReason: null,
    pausedAt: null,
    createdAt: null,
    lastUpdatedAt: null
  };
}

async function persistBlocked(cwd, scope, state, reason, now) {
  await writeLoopControl(cwd, scope, { ...state, status: "blocked", blockedReason: reason, lastUpdatedAt: now });
  await safeLedger({ appendLedger }, cwd, scope, { at: now, kind: "loop_blocked", reason, iteration: state.iteration });
}

// Quota pause: mark the loop "paused" (resumable, NOT "blocked" — no human needed) and log it
// once. Idempotent so a run of quota-limited Stop hooks records a single loop_paused entry, and
// best-effort so it never throws into the hook (the caller pauses by returning "" regardless).
async function markQuotaPaused(cwd, scope, deps) {
  try {
    await withFileLock(loopControlPath(cwd, scope), async () => {
      const prev = (await readLoopControl(cwd, scope)) ?? defaultLoopControl(scope);
      if (prev.status === "paused" && prev.pausedReason === "quota") return;
      const now = nowIso();
      await writeLoopControl(cwd, scope, { ...prev, status: "paused", pausedReason: "quota", pausedAt: now, lastUpdatedAt: now });
      await safeLedger(deps, cwd, scope, { at: now, kind: "loop_paused", reason: "quota" });
    }, { timeoutMs: 1000 });
  } catch {
    // best-effort: even if the paused state can't be recorded, the caller still pauses
  }
}

async function writeLoopControl(cwd, scope, state) {
  const path = loopControlPath(cwd, scope);
  await mkdir(dirname(path), { recursive: true });
  await writeJsonAtomic(path, state);
}

async function clearLoopControl(cwd, scope) {
  await rm(loopControlPath(cwd, scope), { force: true });
}

async function safeLedger(deps, cwd, scope, entry) {
  try {
    await (deps.appendLedger ?? appendLedger)(cwd, entry, scope);
  } catch {
    // ledger is advisory here; never fail the hook over it
  }
}

function readCount(raw, fallback) {
  if (raw === undefined || raw === null || raw === "") return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

// Reads only the trailing TRANSCRIPT_TAIL_BYTES (context-pressure markers live
// at the end) and scans for any lowercase marker. Bounds the scan on multi-MB
// transcripts that grow with session length. Synchronous so both the async
// continuation path and the sync hook handlers can share one reader.
export function readTranscriptTail(transcriptPath) {
  if (typeof transcriptPath !== "string" || transcriptPath.length === 0) return "";
  let fd;
  try {
    fd = openSync(transcriptPath, "r");
    const { size } = fstatSync(fd);
    const start = size > TRANSCRIPT_TAIL_BYTES ? size - TRANSCRIPT_TAIL_BYTES : 0;
    const length = size - start;
    if (length <= 0) return "";
    const buffer = Buffer.alloc(length);
    readSync(fd, buffer, 0, length, start);
    return buffer.toString("utf8");
  } catch {
    return "";
  } finally {
    if (fd !== undefined) {
      try {
        closeSync(fd);
      } catch {
        // best-effort close; nothing actionable on failure
      }
    }
  }
}

export function transcriptTailHasMarker(transcriptPath, markers) {
  if (!Array.isArray(markers) || markers.length === 0) return false;
  const lower = readTranscriptTail(transcriptPath).toLowerCase();
  if (lower.length === 0) return false;
  return markers.some((marker) => lower.includes(marker));
}
