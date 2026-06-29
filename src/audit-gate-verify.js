// Completion-time audit provenance enforcement.
//
// The quality gate's `audit` section lists verdict artifacts; structural validation
// (audit-verdict.js validateAuditSection) only checks they are well-shaped and resolve
// to real files. That is NOT enough on its own: the cited file could be hand-written.
// This module makes the gate as strong as the SubagentStop hook — for every cited
// verdict it RE-DERIVES the criterion's deterministic floor in-process (auditOneCriterion,
// which bypasses the worker-writable cache/state) and requires the verdict be a genuine,
// hash-bound PASS over that fresh re-run. So a worker cannot reach aggregate completion
// by writing an APPROVE section plus a dummy `{"verdict":"pass"}` file: the proof must
// actually reproduce here, and the artifact is re-hashed from Loopy's own fresh capture.
//
// Wired into the completion authorities (loop.js reviewLoop + checkpointLoop). It is
// deliberately NOT part of validateQualityGate, which stays a synchronous structural
// check used by the read-only guide preview.

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolveEvidenceArtifact } from "./artifacts.js";
import { auditOneCriterion } from "./audit.js";
import { validateAuditVerdict, verifyVerdictAgainstState } from "./audit-verdict.js";
import { readPlan } from "./store.js";

export async function enforceAuditProvenance(cwd, scope, audit) {
  // Re-derive EVERY passed criterion UNCONDITIONALLY — on the default gate too, not only
  // when an audit section is present. This is the project's core guarantee: a command-backed
  // criterion that no longer reproduces can never reach aggregate completion, even with
  // LOOPY_AUDIT=off and no cited verdicts (a worker-asserted `status:"pass"` is re-checked
  // against a fresh in-process re-run here). For a command-backed criterion this re-runs the
  // command and requires floor 'pass'. NOTE (disclosed limit): a MANUAL (commandless)
  // criterion re-derives to an artifact-existence check only — its correctness is not
  // command-reproducible and rests on the auditor's judgment, not this deterministic floor.
  //
  // Intentional asymmetry with the continuation engine: `loopy loop audit` leaves a
  // non-reproducing ("inconclusive") command criterion ON pass to avoid spinning the loop on a
  // flaky test mid-run. The COMPLETION gate is stricter — it requires the proof to reproduce
  // NOW, so any non-pass floor (fail OR inconclusive) blocks rather than fabricating a "done".
  // The escape is to re-prove the criterion (a flaky command that passes on retry then
  // re-derives to pass), not to weaken the gate.
  const plan = await readPlan(cwd, scope);
  const freshByCriterion = new Map();
  for (const goal of plan.goals) {
    for (const criterion of goal.criteria) {
      if (criterion.status !== "pass") continue;
      const key = `${goal.id}/${criterion.id}`;
      const fresh = await auditOneCriterion(cwd, scope, key);
      if (fresh === null || fresh.entry.floor !== "pass") {
        throw new Error(`Quality gate: criterion ${key} did not re-derive to a passing floor (got "${fresh?.entry?.floor ?? "unknown"}"). Re-prove it with \`loopy loop prove\` (or repair the command) before completing — completion requires the proof to reproduce now.`);
      }
      freshByCriterion.set(key, fresh.entry);
    }
  }

  // The cited verdicts add the LLM judgment layer, present only when an audit section
  // exists (LOOPY_AUDIT=on, or a review/matrix gate). The default gate stops here, having
  // already re-derived every floor above.
  if (audit === undefined || audit === null) return;

  // Each cited verdict must be a genuine, hash-bound PASS over the criterion's freshly
  // re-derived re-run.
  const verdicts = Array.isArray(audit.verdicts) ? audit.verdicts : [];
  if (verdicts.length === 0) {
    throw new Error("Quality gate audit has no verdict artifacts to verify.");
  }
  for (const relPath of verdicts) {
    const resolved = resolveEvidenceArtifact(cwd, relPath, scope);
    const verdict = validateAuditVerdict(
      JSON.parse(await readFile(resolved.absolutePath, "utf8")),
      (artifactPath) => resolveEvidenceArtifact(cwd, artifactPath, scope).relativePath
    );
    if (verdict.verdict !== "pass") {
      throw new Error(`Quality gate audit verdict ${relPath} is not a pass.`);
    }
    const entry = freshByCriterion.get(verdict.criterion);
    if (entry === undefined) {
      throw new Error(`Quality gate audit verdict ${relPath} cites ${verdict.criterion}, which is not a passed plan criterion.`);
    }
    const observedHash = createHash("sha256")
      .update(await readFile(resolveEvidenceArtifact(cwd, verdict.rerun.artifact, scope).absolutePath))
      .digest("hex");
    const verified = verifyVerdictAgainstState(verdict, entry, observedHash);
    if (!verified.ok) {
      throw new Error(`Quality gate audit verdict ${relPath} is not bound to Loopy's re-derived re-run: ${verified.reason}`);
    }
  }
}
