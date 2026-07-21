import assert from "node:assert/strict";
import test from "node:test";

import { validateMatrixQualityGate } from "../src/matrix-gate.js";
import { validateReviewQualityGate } from "../src/review-gate.js";
import { cloneJson, matrixStyleQualityGate, reviewStyleQualityGate } from "./golden-helpers.js";

const identityArtifactPath = (value) => value;
const target = (id, platform, environment) => ({ id, platform, environment });
const SHARED_KINDS = ["app-automation-transcript", "device-report", "app-automation-transcript", "device-report"];
const windowsScope = () => ({
  target: target("desktop", "windows", "Windows 11 workstation"),
  owner: "native",
  claims: ["interaction", "target"],
  scopeReason: "Windows run of the shared desktop journey."
});
const linuxRow = (row) => ({
  ...cloneJson(row),
  id: "surface-linux",
  target: target("desktop", "linux", "Ubuntu 24.04 workstation"),
  scopeReason: "Linux run of the shared desktop journey.",
  artifactRefs: ["proof-2", "proof-3"]
});

function matrixGateForSurface(surface, kinds, scope = {}) {
  const gate = matrixStyleQualityGate({ cliRun: ".superloopy/evidence/matrix-cli-run.txt", redTeam: ".superloopy/evidence/matrix-risk-probe.txt", auditVerdict: ".superloopy/evidence/matrix-audit-verdict.json" });
  gate.executorQa.artifactRefs = kinds.map((kind, index) => ({ id: `proof-${index}`, kind, path: `.superloopy/evidence/${kind}-${index}.txt`, description: `${kind} proof for ${surface}.` }));
  gate.executorQa.surfaceEvidence[0].surface = surface;
  Object.assign(gate.executorQa.surfaceEvidence[0], scope);
  gate.executorQa.surfaceEvidence[0].artifactRefs = ["proof-0", "proof-1"];
  gate.executorQa.adversarialCases[0].artifactRefs = [gate.executorQa.artifactRefs[0].id];
  return gate;
}

function reviewGateForSurface(surface, kinds, scope = {}) {
  const gate = reviewStyleQualityGate({ codeReview: ".superloopy/evidence/code-review.md", gateReview: ".superloopy/evidence/gate-review.md", cliPass: ".superloopy/evidence/cli-pass.txt", malformedReject: ".superloopy/evidence/malformed-reject.txt", auditVerdict: ".superloopy/evidence/review-audit-verdict.json" });
  gate.manualQa.artifactRefs = kinds.map((kind, index) => ({ id: `proof-${index}`, kind, path: `.superloopy/evidence/${kind}-${index}.txt`, description: `${kind} proof for ${surface}.` }));
  gate.manualQa.surfaceEvidence[0].surface = surface;
  Object.assign(gate.manualQa.surfaceEvidence[0], scope);
  gate.manualQa.surfaceEvidence[0].artifactRefs = ["proof-0", "proof-1"];
  gate.manualQa.adversarialCases[0].artifactRefs = [gate.manualQa.artifactRefs[0].id];
  return gate;
}

test("matrix quality gate accepts one generic target id across distinct platforms", () => {
  const gate = matrixGateForSurface("native desktop", SHARED_KINDS, windowsScope());
  gate.executorQa.surfaceEvidence.push(linuxRow(gate.executorQa.surfaceEvidence[0]));
  gate.executorQa.contractCoverage[0].surfaceEvidenceRefs.push("surface-linux");

  assert.doesNotThrow(() => validateMatrixQualityGate(gate, identityArtifactPath));
});

test("review quality gate accepts one generic target id across distinct platforms", () => {
  const gate = reviewGateForSurface("native desktop", SHARED_KINDS, windowsScope());
  gate.manualQa.surfaceEvidence.push(linuxRow(gate.manualQa.surfaceEvidence[0]));

  assert.doesNotThrow(() => validateReviewQualityGate(gate, identityArtifactPath));
});

test("matrix and review gates still reject one repeated target id on one platform and owner", () => {
  const matrix = matrixGateForSurface("native desktop", SHARED_KINDS, windowsScope());
  matrix.executorQa.surfaceEvidence.push({ ...linuxRow(matrix.executorQa.surfaceEvidence[0]), target: target("desktop", "windows", "Second Windows 11 workstation") });
  matrix.executorQa.contractCoverage[0].surfaceEvidenceRefs.push("surface-linux");
  const review = reviewGateForSurface("native desktop", SHARED_KINDS, windowsScope());
  review.manualQa.surfaceEvidence.push({ ...linuxRow(review.manualQa.surfaceEvidence[0]), target: target("desktop", "windows", "Second Windows 11 workstation") });

  assert.throws(() => validateMatrixQualityGate(matrix, identityArtifactPath), /duplicates scoped target.*platform.*owner/i);
  assert.throws(() => validateReviewQualityGate(review, identityArtifactPath), /duplicates scoped target.*platform.*owner/i);
});
