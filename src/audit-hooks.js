// SubagentStop handler for the read-only robin subagent. It validates
// the auditor's verdict RECEIPT deterministically. Crucially it does NOT trust the
// recorded .loopy/audit-state.json (worker-writable): on each receipt it RE-DERIVES
// the cited criterion's floor in-process (auditOneCriterion) and accepts the verdict
// only if it is hash-bound to that fresh re-run and the floor reproduced. The worker
// cannot fake a pass — it cannot make a failing command reproduce, and the re-run hash
// is computed here from Loopy's own fresh capture. Honest limit: Loopy still cannot
// verify the auditor subagent was spawned isolated/read-only; it trusts the host's
// agent frame for that and enforces only re-derivation + hash binding + structural shape.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { resolveEvidenceArtifact } from "./artifacts.js";
import { auditMaxFails, auditOneCriterion, recordAuditFailure } from "./audit.js";
import { transcriptTailHasMarker } from "./continuation.js";
import { validateAuditVerdict, verifyVerdictAgainstState } from "./audit-verdict.js";
import { appendLedger, auditStatePath, evidenceRelativeDir, goalsPath, nowIso, scopeFromSessionId, withFileLock, writeJsonAtomic } from "./store.js";

const MAX_AUDIT_ATTEMPTS = 3;
// Generic context-pressure markers (kept in sync with the hook runtime); on a
// compaction the handler pauses without burning an attempt.
const CONTEXT_PRESSURE_MARKERS = [
  "context compacted", "context_length_exceeded", "skill descriptions were shortened",
  "context_too_large", "codex ran out of room in the model's context window",
  "your input exceeds the context window", "long threads and multiple compactions"
];

export async function runAuditorStopHook(payload) {
  if (payload === null || typeof payload !== "object") return "";
  if (payload.hook_event_name !== "SubagentStop") return "";
  if (payload.agent_type !== "robin") return "";
  if (typeof payload.cwd !== "string") return "";
  if (transcriptTailHasMarker(payload.transcript_path, CONTEXT_PRESSURE_MARKERS)) return "";

  const scope = scopeFromSessionId(payload.session_id);
  const useScope = scope !== undefined && existsSync(goalsPath(payload.cwd, scope)) ? scope : undefined;
  const accepted = await tryAcceptVerdict(payload, useScope);
  if (accepted) {
    clearAuditAttempt(payload);
    return "";
  }
  const attempt = nextAuditAttempt(payload);
  if (attempt.limitReached) {
    // Free pass after the audit cap: leave a durable ledger signal so the give-up is
    // observable rather than silent (it never flips a criterion to pass on its own).
    try {
      await appendLedger(payload.cwd, { at: nowIso(), kind: "audit_attempt_exhausted", agentType: payload.agent_type ?? null, agentId: payload.agent_id ?? null, attempts: attempt.attempts }, useScope);
    } catch {
      // ledger is advisory; never fail the hook over it
    }
    clearAuditAttempt(payload);
    return "";
  }
  return `${JSON.stringify({
    decision: "block",
    reason: [
      "Loopy audit verdict missing or invalid.",
      `Attempt ${attempt.attempts} of ${MAX_AUDIT_ATTEMPTS}.`,
      `Re-run \`loopy loop audit\` first, then write a verdict JSON under \`${evidenceRelativeDir(useScope)}/audit/\` that cites Loopy's recorded re-run artifact.`,
      "End your message with:",
      "LOOPY_AUDIT: <path-under-active-evidence-root>"
    ].join("\n")
  })}\n`;
}

async function tryAcceptVerdict(payload, scope) {
  const receipt = extractAuditReceipt(payload.last_assistant_message);
  if (receipt === null) return false;
  // Lock the entire accept (re-derive floor -> verify -> persist) so it is atomic against a
  // concurrent auditor process; auditOneCriterion re-enters the same lock harmlessly. A lock
  // acquisition timeout (contention) is treated as "not accepted" so the hook retries cleanly.
  try {
    return await withFileLock(auditStatePath(payload.cwd, scope), async () => {
  try {
    const verdictArtifact = resolveEvidenceArtifact(payload.cwd, receipt, scope);
    const raw = await readFile(verdictArtifact.absolutePath, "utf8");
    const verdictHash = createHash("sha256").update(raw).digest("hex");
    const verdict = validateAuditVerdict(
      JSON.parse(raw),
      (artifactPath) => resolveEvidenceArtifact(payload.cwd, artifactPath, scope).relativePath
    );
    // Re-derive the floor IN-PROCESS now: never trust the worker-writable recorded
    // audit-state. The cited re-run is hashed against state Loopy just computed, so a
    // forged floor/hash cannot survive — the proof must actually reproduce here.
    const fresh = await auditOneCriterion(payload.cwd, scope, verdict.criterion);
    if (fresh === null) return false;
    const { state, entry } = fresh;
    const observedHash = await hashArtifact(payload.cwd, verdict.rerun.artifact, scope);
    const verified = verifyVerdictAgainstState(verdict, entry, observedHash);
    if (!verified.ok) return false;
    // Idempotency keyed on verdict CONTENT hash (not the file path): re-accepting a
    // byte-identical verdict must not re-bump the monotonic audit count or re-increment
    // failCount, even if re-submitted under a different filename (closes replay-based
    // progress inflation and fail-cap over-escalation).
    const replay = entry.verdictHash === verdictHash;
    entry.verdict = verdict.verdict;
    entry.verdictArtifact = verdictArtifact.relativePath;
    entry.verdictHash = verdictHash;
    if (verdict.verdict === "pass") {
      // Monotonic counter: each fresh accepted audit is genuine progress, so an
      // honest fail -> re-prove -> re-audit cycle is not miscounted as a stall.
      if (!replay) state.auditsAccepted = (state.auditsAccepted ?? 0) + 1;
      entry.failCount = 0;
      await writeJsonAtomic(auditStatePath(payload.cwd, scope), state);
    } else {
      // Verdict fail: the LLM judged the proof insufficient. Flip the criterion
      // off pass (with the gap) so the continuation engine re-drives it.
      if (!replay) entry.failCount = (entry.failCount ?? 0) + 1;
      await writeJsonAtomic(auditStatePath(payload.cwd, scope), state);
      await recordAuditFailure(payload.cwd, scope, verdict.criterion, verdict.gap, verdictArtifact.relativePath, entry.failCount, auditMaxFails(process.env));
    }
    return true;
  } catch {
    return false;
  }
    }, { timeoutMs: 2000 });
  } catch {
    return false;
  }
}

function extractAuditReceipt(message) {
  if (typeof message !== "string") return null;
  const match = /LOOPY_AUDIT:\s*(\S+)/u.exec(message);
  return match?.[1] ?? null;
}

async function hashArtifact(cwd, relativePath, scope) {
  const resolved = resolveEvidenceArtifact(cwd, relativePath, scope);
  return createHash("sha256").update(await readFile(resolved.absolutePath)).digest("hex");
}

function auditAttemptPath(payload) {
  if (typeof payload.cwd !== "string") return null;
  // Fall back to a session-only (or cwd-only) key when the host omits agent_id/session_id,
  // so the audit attempt cap still counts instead of looping forever at "Attempt 1 of 3".
  const session = typeof payload.session_id === "string" ? sanitizeKey(payload.session_id) : "nosession";
  const agent = typeof payload.agent_id === "string" ? sanitizeKey(payload.agent_id) : "noagent";
  return join(payload.cwd, ".loopy", "subagent-audit", `${session}-${agent}.json`);
}

function nextAuditAttempt(payload) {
  const path = auditAttemptPath(payload);
  if (path === null) return { attempts: 1, limitReached: false };
  let current = 0;
  try {
    current = JSON.parse(readFileSync(path, "utf8")).attempts ?? 0;
  } catch {
    current = 0;
  }
  if (current >= MAX_AUDIT_ATTEMPTS) return { attempts: current, limitReached: true };
  const attempts = current + 1;
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify({ attempts })}\n`, "utf8");
  renameSync(tmp, path);
  return { attempts, limitReached: false };
}

function clearAuditAttempt(payload) {
  const path = auditAttemptPath(payload);
  if (path !== null) rmSync(path, { force: true });
}

function sanitizeKey(value) {
  const sanitized = value.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return sanitized.length > 0 ? sanitized : "missing";
}
