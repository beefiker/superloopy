// Deterministic validation for the rovyn's verdict (the LLM judgment).
//
// Superloopy treats the LLM verdict as ADVISORY and DOWNGRADE-ONLY: it can never
// turn a deterministic re-run failure/inconclusive into a pass. The hard
// guarantees enforced here are (a) the verdict is structurally well formed,
// (b) it cites the re-run artifact by content hash, and (c) floor dominance is
// SYMMETRIC — the verdict may act only when the floor reproduced (`pass`); a
// non-pass floor surfaces to a human and is never upgraded OR flipped by the LLM.
// The LLM's prose is never trusted on its own.
//
// IMPORTANT: `verifyVerdictAgainstState` checks the verdict against a `stateEntry`
// supplied by its caller. Callers (audit-hooks.js accept path, audit-gate-verify.js
// completion path) pass a FRESHLY re-derived entry — never the worker-writable
// recorded audit-state — so the hash and floor it dominance-checks against are values
// Superloopy just computed in-process, which the worker cannot predict or forge.
//
// NOTE on independence: Superloopy cannot verify the auditor subagent was actually
// spawned read-only/isolated — that depends on the host honoring the agent frame.

const VERDICTS = new Set(["pass", "fail"]);

export function validateAuditVerdict(value, resolveArtifactPath) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Audit verdict must be an object.");
  }
  const criterion = textField(value.criterion, "criterion");
  const verdict = value.verdict;
  if (!VERDICTS.has(verdict)) throw new Error('Audit verdict.verdict must be "pass" or "fail".');

  const rerun = value.rerun;
  if (rerun === null || typeof rerun !== "object" || Array.isArray(rerun)) {
    throw new Error("Audit verdict.rerun must be an object.");
  }
  const rerunArtifact = resolveArtifactPath(textField(rerun.artifact, "rerun.artifact"));
  const rerunStatus = textField(rerun.status, "rerun.status");
  const exitCode = rerun.exitCode === null || rerun.exitCode === undefined ? null : numberField(rerun.exitCode, "rerun.exitCode");

  const citations = value.citations;
  if (!Array.isArray(citations) || citations.length === 0 || !citations.every((c) => typeof c === "string" && c.trim().length > 0)) {
    throw new Error("Audit verdict.citations must be a non-empty array of strings.");
  }

  const normalized = { criterion, verdict, rerun: { artifact: rerunArtifact, status: rerunStatus, exitCode }, citations };
  if (verdict === "fail") {
    normalized.gap = textField(value.gap, "gap");
    normalized.nextAction = textField(value.nextAction, "nextAction");
  }
  return normalized;
}

// Cross-checks the (structurally valid) verdict against Superloopy's own audit-state
// entry. observedRerunHash is the content hash the hook computed for the cited
// re-run artifact. Returns { ok, reason }.
export function verifyVerdictAgainstState(verdict, stateEntry, observedRerunHash) {
  if (!stateEntry) {
    return fail("No Superloopy audit-state for this criterion. Run `superloopy loop audit` first.");
  }
  if (verdict.criterion !== stateEntry.criterion) {
    return fail(`Verdict criterion ${verdict.criterion} does not match audited criterion ${stateEntry.criterion}.`);
  }
  if (typeof observedRerunHash !== "string" || observedRerunHash !== stateEntry.rerunArtifactHash) {
    return fail("Cited re-run artifact does not match Superloopy's recorded re-run (content hash mismatch).");
  }
  if (verdict.rerun.status !== stateEntry.rerunStatus) {
    return fail(`Verdict re-run status ${verdict.rerun.status} disagrees with Superloopy's recorded ${stateEntry.rerunStatus}.`);
  }
  if (stateEntry.rerunExitCode !== undefined && stateEntry.rerunExitCode !== null && verdict.rerun.exitCode !== stateEntry.rerunExitCode) {
    return fail(`Verdict re-run exit code ${verdict.rerun.exitCode} disagrees with Superloopy's recorded ${stateEntry.rerunExitCode}.`);
  }
  // Floor dominance is symmetric: the advisory verdict may only act when Superloopy's
  // own deterministic re-run reproduced (floor pass). A pass over a non-reproducing
  // floor would fabricate proof; a fail over an inconclusive (flaky) floor would let
  // the advisory channel auto-flip a re-run that did NOT reproduce — exactly what the
  // deterministic spine refuses to do. Either way a non-pass floor must SURFACE to a
  // human (via the audit report), never be driven off/on pass by the LLM.
  if (stateEntry.floor !== "pass") {
    return fail(`Cannot accept an advisory verdict when Superloopy's deterministic floor is "${stateEntry.floor}"; it must surface for a human.`);
  }
  return { ok: true, reason: null };
}

// Validates the `audit` gate section (used by review + matrix gates). Requires
// an APPROVE recommendation, a non-empty list of resolvable verdict artifacts,
// and no blockers.
export function validateAuditSection(value, resolveArtifactPath) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Quality gate audit section must be an object.");
  }
  if (value.recommendation !== "APPROVE") {
    throw new Error('Quality gate audit.recommendation must be "APPROVE".');
  }
  const verdicts = value.verdicts;
  if (!Array.isArray(verdicts) || verdicts.length === 0) {
    throw new Error("Quality gate audit.verdicts must be a non-empty array of verdict artifacts.");
  }
  const blockers = value.blockers ?? [];
  if (!Array.isArray(blockers) || blockers.length > 0) {
    throw new Error("Quality gate audit.blockers must be an empty array.");
  }
  return { recommendation: "APPROVE", verdicts: verdicts.map((artifact) => resolveArtifactPath(artifact)), blockers: [] };
}

export function hasAuditSection(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) && typeof value.audit === "object" && value.audit !== null;
}

function textField(value, name) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Audit verdict.${name} must be a non-empty string.`);
  }
  return value.trim();
}

function numberField(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Audit verdict.${name} must be a number.`);
  }
  return value;
}

function fail(reason) {
  return { ok: false, reason };
}
