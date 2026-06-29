import assert from "node:assert/strict";
import test from "node:test";

import { validateAuditVerdict, verifyVerdictAgainstState } from "../src/audit-verdict.js";

const ident = (p) => p;

function passVerdict(overrides = {}) {
  return {
    criterion: "G001/C001",
    verdict: "pass",
    rerun: { artifact: ".loopy/evidence/audit/G001-C001-rerun.txt", status: "pass", exitCode: 0 },
    citations: ["audit/G001-C001-rerun.txt:3 \"status: pass\""],
    ...overrides
  };
}

const stateEntry = {
  criterion: "G001/C001",
  rerunArtifact: ".loopy/evidence/audit/G001-C001-rerun.txt",
  rerunArtifactHash: "abc123",
  rerunStatus: "pass",
  rerunExitCode: 0,
  floor: "pass"
};

test("validateAuditVerdict accepts a well-formed pass with citations", () => {
  const v = validateAuditVerdict(passVerdict(), ident);
  assert.equal(v.verdict, "pass");
  assert.equal(v.rerun.status, "pass");
  assert.equal(v.citations.length, 1);
});

test("validateAuditVerdict rejects a pass with no citations", () => {
  assert.throws(() => validateAuditVerdict(passVerdict({ citations: [] }), ident), /citations/);
});

test("validateAuditVerdict requires gap and nextAction on fail", () => {
  assert.throws(() => validateAuditVerdict(passVerdict({ verdict: "fail", citations: ["x"] }), ident), /gap/);
  const v = validateAuditVerdict(passVerdict({ verdict: "fail", citations: ["x"], gap: "missing edge", nextAction: "loopy loop prove -- npm test" }), ident);
  assert.equal(v.gap, "missing edge");
});

test("validateAuditVerdict rejects an unknown verdict value", () => {
  assert.throws(() => validateAuditVerdict(passVerdict({ verdict: "maybe" }), ident), /must be "pass" or "fail"/);
});

test("verifyVerdictAgainstState accepts a verdict bound to the recorded re-run", () => {
  const v = validateAuditVerdict(passVerdict(), ident);
  assert.deepEqual(verifyVerdictAgainstState(v, stateEntry, "abc123"), { ok: true, reason: null });
});

test("verifyVerdictAgainstState rejects a hash mismatch (forged or stale re-run)", () => {
  const v = validateAuditVerdict(passVerdict(), ident);
  assert.equal(verifyVerdictAgainstState(v, stateEntry, "different").ok, false);
});

test("verifyVerdictAgainstState rejects a criterion mismatch", () => {
  const v = validateAuditVerdict(passVerdict({ criterion: "G002/C001" }), ident);
  assert.equal(verifyVerdictAgainstState(v, stateEntry, "abc123").ok, false);
});

test("verifyVerdictAgainstState rejects pass over a non-reproducing floor (downgrade-only)", () => {
  const v = validateAuditVerdict(passVerdict(), ident);
  assert.equal(verifyVerdictAgainstState(v, { ...stateEntry, floor: "inconclusive" }, "abc123").ok, false);
});

test("verifyVerdictAgainstState rejects FAIL over an inconclusive floor (symmetric dominance: flaky re-run surfaces, is not auto-flipped)", () => {
  const v = validateAuditVerdict(passVerdict({ verdict: "fail", citations: ["x"], gap: "g", nextAction: "loopy loop prove -- npm test", rerun: { artifact: ".loopy/evidence/audit/G001-C001-rerun.txt", status: "pass", exitCode: 0 } }), ident);
  assert.equal(verifyVerdictAgainstState(v, { ...stateEntry, floor: "inconclusive" }, "abc123").ok, false);
});

test("verifyVerdictAgainstState rejects a status disagreement with Loopy's record", () => {
  const v = validateAuditVerdict(passVerdict({ rerun: { artifact: ".loopy/evidence/audit/G001-C001-rerun.txt", status: "fail", exitCode: 1 } }), ident);
  assert.equal(verifyVerdictAgainstState(v, stateEntry, "abc123").ok, false);
});

test("verifyVerdictAgainstState fails closed when there is no audit-state entry", () => {
  const v = validateAuditVerdict(passVerdict(), ident);
  assert.equal(verifyVerdictAgainstState(v, undefined, "abc123").ok, false);
});
