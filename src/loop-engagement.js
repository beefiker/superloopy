// Who the Stop-hook continuation engine drives, and what it tells the parent about workers that
// gave up without proof.
//
// Plugin hooks are installed for every session, so continuation must never take over a session
// that did not ask for a loop. `SUPERLOOPY_STOP_HOOK` picks the mode:
// - `on`: drive every session that has unresolved work (the original opt-in behavior);
// - unset or empty: drive only a host session whose user started or resumed a loop with a full-loop
//   trigger (`loopy …`, `loopycrew`, `ultrawork`), until that user sends a plain prompt;
// - anything else (`off`, `0`, …): never.
// Engagement is a per-host-session marker under `.superloopy/stop-engaged/`, so a second session in
// the same repo is unaffected. Claude Code skips Stop on a user interrupt and Codex reports an
// interrupt as its own event, so an interrupt is never turned into a continuation.
//
// Workers that exhaust their receipt attempts are allowed to stop (a hook cannot hold them forever),
// and the parent only sees their last message. The next continuation reports each such worker once,
// so the parent does not treat an unproven worker reply as done.
import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { MALFORMED_LEDGER_LINE, SUPERLOOPY_DIR, appendLedger, normalizeLoopSessionId, nowIso, readLedger } from "./store.js";

// Present in every continuation reason. Codex replays a Stop `block` reason as a new user prompt,
// so UserPromptSubmit must recognize it and keep the session engaged.
export const CONTINUATION_MARKER = "This is an automatic Superloopy continuation.";
export const WORKER_EXHAUSTION_REPORTED = "worker_exhaustion_reported";
const EXHAUSTION_KINDS = new Set(["subagent_attempt_exhausted", "audit_attempt_exhausted"]);

export function stopContinuationMode(env) {
  const value = String(env.SUPERLOOPY_STOP_HOOK ?? "").trim().toLowerCase();
  if (value === "on") return "on";
  return value === "" ? "engaged" : "off";
}

export function shouldDriveStop(payload, env) {
  const mode = stopContinuationMode(env);
  if (mode === "on") return true;
  if (mode === "off") return false;
  const path = engagementPath(payload.cwd, payload.session_id);
  return path !== null && existsSync(path);
}

// intent: "engage" (loop trigger), "keep" (steering, style toggle, or a replayed continuation),
// "release" (any other prompt: the user has taken the wheel). Best-effort; never throws.
export function recordPromptIntent(cwd, sessionId, intent) {
  const path = engagementPath(cwd, sessionId);
  if (path === null || intent === "keep") return;
  try {
    if (intent === "release") {
      rmSync(path, { force: true });
      return;
    }
    mkdirSync(join(cwd, SUPERLOOPY_DIR, "stop-engaged"), { recursive: true });
    const tmpPath = `${path}.${process.pid}.${Date.now()}.tmp`;
    writeFileSync(tmpPath, `${JSON.stringify({ sessionId, engagedAt: nowIso() })}\n`, "utf8");
    renameSync(tmpPath, path);
  } catch {
    // Engagement is advisory; a failed write only means this session is not auto-continued.
  }
}

// Exhaustion records since the last report or plan replacement, oldest first; records the report so
// each is told once. `loop create --force` keeps the ledger, so a new plan starts the window over.
// The report records how many ledger lines it read (`through`): workers finish in parallel, and an
// entry appended between this read and the report line must stay in the next window. Two Stops
// reading the same lines may both report them; a repeated notice is harmless, a lost one is not.
// A torn (unparseable) line may have been a `plan_created`, so it also starts the window over, as
// store.js asks of order-sensitive readers: misattributing an old plan's worker is worse than
// dropping a notice that sat next to a crash.
export async function takeWorkerExhaustion(cwd, scope) {
  const ledger = await readLedger(cwd, scope);
  let start = 0;
  ledger.forEach((entry, index) => {
    if (entry.kind === "plan_created" || entry.kind === MALFORMED_LEDGER_LINE) start = Math.max(start, index + 1);
    if (entry.kind === WORKER_EXHAUSTION_REPORTED) start = Math.max(start, Number.isInteger(entry.through) ? entry.through : index + 1);
  });
  const pending = ledger.slice(start).filter((entry) => EXHAUSTION_KINDS.has(entry.kind));
  if (pending.length > 0) await appendLedger(cwd, { at: nowIso(), kind: WORKER_EXHAUSTION_REPORTED, count: pending.length, through: ledger.length }, scope);
  return pending;
}

export function renderWorkerExhaustion(entries) {
  if (entries.length === 0) return [];
  return [
    "",
    "Workers that stopped without proof:",
    ...entries.map((entry) => {
      const who = `${entry.agentType ?? "unknown-agent"}${entry.agentId ? ` (${entry.agentId})` : ""}`;
      const receipt = entry.kind === "audit_attempt_exhausted" ? "SUPERLOOPY_AUDIT verdict" : "SUPERLOOPY_EVIDENCE receipt";
      const attempts = Number.isInteger(entry.attempts) ? ` after ${entry.attempts} attempts` : "";
      return `- ${who} returned${attempts} with no valid ${receipt}. Treat its reply as unproven: re-dispatch with a narrower card, or do the work and prove it yourself.`;
    })
  ];
}

function engagementPath(cwd, sessionId) {
  const id = normalizeLoopSessionId(sessionId);
  if (typeof cwd !== "string" || id === null) return null;
  return join(cwd, SUPERLOOPY_DIR, "stop-engaged", `${id}.json`);
}
