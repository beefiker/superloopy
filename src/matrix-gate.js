import { validateAuditSection } from "./audit-verdict.js";
import {
  artifactPath,
  emptyBlockers,
  fail,
  isRecord,
  literal,
  passedVerdict,
  qualityGateArtifactCompatible,
  qualityGateArtifactKind,
  qualityGateEvidenceScope,
  qualityGateSurfaceFamilies,
  rejectQualityGateScopeFields,
  referencedArtifacts,
  requireQualityGateSurfaceProof,
  section,
  stringArray,
  textField
} from "./review-gate.js";

const REQUIRED_SECTIONS = ["architectReview", "executorQa", "iteration"];

export function isMatrixQualityGate(value) {
  return REQUIRED_SECTIONS.every((key) => isRecord(value[key]));
}

export function validateMatrixQualityGate(value, resolveArtifactPath) {
  const architectReview = section(value.architectReview, "architectReview");
  const executorQa = section(value.executorQa, "executorQa");
  const iteration = section(value.iteration, "iteration");
  const artifactRefs = parseArtifactRefs(executorQa.artifactRefs, resolveArtifactPath);
  const byId = new Map(artifactRefs.map((artifact) => [artifact.id, artifact]));
  const surfaceEvidence = parseSurfaceEvidence(executorQa.surfaceEvidence, byId);
  const adversarialCases = parseAdversarialCases(executorQa.adversarialCases, byId);
  const surfaceById = new Map(surfaceEvidence.map((row) => [row.id, row]));
  const adversarialById = new Map(adversarialCases.map((row) => [row.id, row]));

  return {
    architectReview: {
      architectureStatus: literal(textField(architectReview.architectureStatus, "architectReview.architectureStatus"), "CLEAR", "architectReview.architectureStatus"),
      productStatus: literal(textField(architectReview.productStatus, "architectReview.productStatus"), "CLEAR", "architectReview.productStatus"),
      codeStatus: literal(textField(architectReview.codeStatus, "architectReview.codeStatus"), "CLEAR", "architectReview.codeStatus"),
      recommendation: literal(textField(architectReview.recommendation, "architectReview.recommendation"), "APPROVE", "architectReview.recommendation"),
      evidence: textField(architectReview.evidence, "architectReview.evidence"),
      commands: stringArray(architectReview.commands, "architectReview.commands"),
      blockers: emptyBlockers(architectReview.blockers, "architectReview.blockers")
    },
    executorQa: {
      status: literal(textField(executorQa.status, "executorQa.status"), "passed", "executorQa.status"),
      e2eStatus: literal(textField(executorQa.e2eStatus, "executorQa.e2eStatus"), "passed", "executorQa.e2eStatus"),
      redTeamStatus: literal(textField(executorQa.redTeamStatus, "executorQa.redTeamStatus"), "passed", "executorQa.redTeamStatus"),
      evidence: textField(executorQa.evidence, "executorQa.evidence"),
      e2eCommands: stringArray(executorQa.e2eCommands, "executorQa.e2eCommands"),
      redTeamCommands: stringArray(executorQa.redTeamCommands, "executorQa.redTeamCommands"),
      artifactRefs,
      contractCoverage: parseContractCoverage(executorQa.contractCoverage, surfaceById, adversarialById, byId),
      surfaceEvidence,
      adversarialCases,
      blockers: emptyBlockers(executorQa.blockers, "executorQa.blockers")
    },
    iteration: {
      status: literal(textField(iteration.status, "iteration.status"), "passed", "iteration.status"),
      evidence: textField(iteration.evidence, "iteration.evidence"),
      fullRerun: literal(iteration.fullRerun, true, "iteration.fullRerun"),
      rerunCommands: stringArray(iteration.rerunCommands, "iteration.rerunCommands"),
      blockers: emptyBlockers(iteration.blockers, "iteration.blockers")
    },
    audit: validateAuditSection(value.audit, resolveArtifactPath)
  };
}

function parseArtifactRefs(value, resolveArtifactPath) {
  if (!Array.isArray(value) || value.length === 0) fail("executorQa.artifactRefs must not be empty.");
  const seenIds = new Set();
  const seenPaths = new Set();
  return value.map((item, index) => {
    const ref = section(item, `executorQa.artifactRefs[${index}]`);
    const id = textField(ref.id, `executorQa.artifactRefs[${index}].id`);
    if (seenIds.has(id)) fail(`executorQa.artifactRefs contains duplicate ${id}.`);
    seenIds.add(id);
    if (!("path" in ref)) {
      fail("inlineEvidence" in ref ? "executorQa.artifactRefs inlineEvidence alone is not sufficient." : `executorQa.artifactRefs[${index}].path is required.`);
    }
    const path = artifactPath(ref.path, `executorQa.artifactRefs[${index}].path`, resolveArtifactPath);
    if (seenPaths.has(path)) fail(`executorQa.artifactRefs contains duplicate resolved path ${path}.`);
    seenPaths.add(path);
    return {
      id,
      kind: qualityGateArtifactKind(ref.kind, `executorQa.artifactRefs[${index}].kind`),
      description: textField(ref.description, `executorQa.artifactRefs[${index}].description`),
      path
    };
  });
}

function parseSurfaceEvidence(value, byId) {
  if (!Array.isArray(value) || value.length === 0) fail("executorQa.surfaceEvidence must not be empty.");
  const seen = new Set();
  const seenScopes = new Set();
  const artifactScopes = new Map();
  return value.map((item, index) => {
    const row = section(item, `executorQa.surfaceEvidence[${index}]`);
    const status = optionalText(row.status);
    const id = textField(row.id, `executorQa.surfaceEvidence[${index}].id`);
    if (seen.has(id)) fail(`executorQa.surfaceEvidence contains duplicate ${id}.`);
    seen.add(id);
    const base = {
      id,
      contractRef: textField(row.contractRef, `executorQa.surfaceEvidence[${index}].contractRef`)
    };
    if (status === "not_applicable") {
      const forbidden = ["surface", "invocation", "verdict", "result", "artifactRefs", "target", "owner", "claims", "scopeReason"]
        .filter((key) => Object.prototype.hasOwnProperty.call(row, key));
      if (forbidden.length > 0) {
        fail(`executorQa.surfaceEvidence[${index}] with status not_applicable must not include proof or scope fields: ${forbidden.join(", ")}.`);
      }
      return {
        ...base,
        status,
        reason: textField(row.reason, `executorQa.surfaceEvidence[${index}].reason`),
        artifactRefs: []
      };
    }
    const surface = textField(row.surface, `executorQa.surfaceEvidence[${index}].surface`);
    const families = qualityGateSurfaceFamilies(surface, `executorQa.surfaceEvidence[${index}].surface`);
    const scope = qualityGateEvidenceScope(row, families, `executorQa.surfaceEvidence[${index}]`);
    const artifactRefs = referencedArtifacts(row.artifactRefs, `executorQa.surfaceEvidence[${index}].artifactRefs`, byId);
    registerScopedEvidence(scope, artifactRefs, `executorQa.surfaceEvidence[${index}]`, seenScopes, artifactScopes);
    for (const artifact of artifactRefs) {
      if (!qualityGateArtifactCompatible(scope.proofFamilies, artifact.kind)) fail(`executorQa.surfaceEvidence ${surface} artifact ${artifact.kind} is incompatible.`);
    }
    requirePassedOutcome(row, `executorQa.surfaceEvidence[${index}]`);
    requireQualityGateSurfaceProof(scope.proofFamilies, artifactRefs, `executorQa.surfaceEvidence[${index}]`, {
      claims: scope.claims,
      legacyMatrixSurface: !scope.scoped && ["browser", "gui", "web", "native", "desktop", "tui"].includes(surface.trim().toLowerCase())
        ? surface.trim().toLowerCase()
        : undefined
    });
    return {
      ...base,
      surface,
      invocation: textField(row.invocation, `executorQa.surfaceEvidence[${index}].invocation`),
      verdict: row.verdict === undefined ? "passed" : passedVerdict(row.verdict, `executorQa.surfaceEvidence[${index}].verdict`),
      artifactRefs: artifactRefs.map((artifact) => artifact.id),
      ...(scope.scoped ? { target: scope.target, owner: scope.owner, claims: scope.claims, scopeReason: scope.scopeReason } : {})
    };
  });
}

function parseAdversarialCases(value, byId) {
  if (!Array.isArray(value) || value.length === 0) fail("executorQa.adversarialCases must not be empty.");
  const seen = new Set();
  return value.map((item, index) => {
    const row = section(item, `executorQa.adversarialCases[${index}]`);
    rejectQualityGateScopeFields(row, `executorQa.adversarialCases[${index}]`);
    const id = textField(row.id, `executorQa.adversarialCases[${index}].id`);
    if (seen.has(id)) fail(`executorQa.adversarialCases contains duplicate ${id}.`);
    seen.add(id);
    if (optionalText(row.status) === "not_applicable") fail(`executorQa.adversarialCases[${index}].status must not be not_applicable.`);
    const artifactRefs = referencedArtifacts(row.artifactRefs, `executorQa.adversarialCases[${index}].artifactRefs`, byId);
    requirePassedOutcome(row, `executorQa.adversarialCases[${index}]`);
    return {
      id,
      contractRef: textField(row.contractRef, `executorQa.adversarialCases[${index}].contractRef`),
      scenario: textField(row.scenario, `executorQa.adversarialCases[${index}].scenario`),
      expectedBehavior: textField(row.expectedBehavior, `executorQa.adversarialCases[${index}].expectedBehavior`),
      verdict: row.verdict === undefined ? "passed" : passedVerdict(row.verdict, `executorQa.adversarialCases[${index}].verdict`),
      artifactRefs: artifactRefs.map((artifact) => artifact.id)
    };
  });
}

function parseContractCoverage(value, surfaceById, adversarialById, artifactById) {
  if (!Array.isArray(value) || value.length === 0) fail("executorQa.contractCoverage must not be empty.");
  const seen = new Set();
  return value.map((item, index) => {
    const row = section(item, `executorQa.contractCoverage[${index}]`);
    rejectQualityGateScopeFields(row, `executorQa.contractCoverage[${index}]`);
    const id = textField(row.id, `executorQa.contractCoverage[${index}].id`);
    if (seen.has(id)) fail(`executorQa.contractCoverage contains duplicate ${id}.`);
    seen.add(id);
    const contractRef = textField(row.contractRef, `executorQa.contractCoverage[${index}].contractRef`);
    const surfaceRefs = optionalStringArray(row.surfaceEvidenceRefs, `executorQa.contractCoverage[${index}].surfaceEvidenceRefs`);
    const adversarialRefs = optionalStringArray(row.adversarialCaseRefs, `executorQa.contractCoverage[${index}].adversarialCaseRefs`);
    const artifactRefs = optionalStringArray(row.artifactRefs, `executorQa.contractCoverage[${index}].artifactRefs`);
    if (surfaceRefs.length + adversarialRefs.length === 0) {
      fail(`executorQa.contractCoverage[${index}] must link to at least one contract-bound surfaceEvidenceRefs or adversarialCaseRefs proof row; artifactRefs alone are insufficient.`);
    }
    for (const id of surfaceRefs) {
      const surface = surfaceById.get(id);
      if (surface === undefined) fail(`executorQa.contractCoverage[${index}].surfaceEvidenceRefs references unknown ${id}.`);
      if (surface.status === "not_applicable") fail(`executorQa.contractCoverage[${index}].surfaceEvidenceRefs.${id}.status must be passed.`);
      if (surface.contractRef !== contractRef) fail(`executorQa.contractCoverage[${index}].surfaceEvidenceRefs.${id}.contractRef must match ${contractRef}.`);
    }
    for (const id of adversarialRefs) {
      const adversarial = adversarialById.get(id);
      if (adversarial === undefined) fail(`executorQa.contractCoverage[${index}].adversarialCaseRefs references unknown ${id}.`);
      if (adversarial.contractRef !== contractRef) fail(`executorQa.contractCoverage[${index}].adversarialCaseRefs.${id}.contractRef must match ${contractRef}.`);
    }
    for (const id of artifactRefs) {
      if (!artifactById.has(id)) fail(`executorQa.contractCoverage[${index}].artifactRefs references unknown ${id}.`);
    }
    return {
      id,
      contractRef,
      obligation: textField(row.obligation, `executorQa.contractCoverage[${index}].obligation`),
      status: coveredStatus(row.status, `executorQa.contractCoverage[${index}].status`),
      surfaceEvidenceRefs: surfaceRefs,
      adversarialCaseRefs: adversarialRefs,
      artifactRefs
    };
  });
}

function optionalStringArray(value, field) {
  return value === undefined ? [] : stringArray(value, field);
}

function optionalText(value) {
  return typeof value === "string" ? value.trim() : undefined;
}

function requirePassedOutcome(row, field) {
  for (const key of ["status", "verdict", "result"]) {
    if (row[key] !== undefined) passedVerdict(row[key], `${field}.${key}`);
  }
}

function coveredStatus(value, field) {
  const status = textField(value, field);
  if (["covered", "passed", "verified"].includes(status)) return status;
  fail(`${field} must be covered, passed, or verified.`);
}

function registerScopedEvidence(scope, artifacts, field, seenScopes, artifactScopes) {
  if (!scope.scoped) return;
  const scopeKey = `${scope.target.id}\u0000${scope.owner}`;
  if (seenScopes.has(scopeKey)) {
    fail(`${field} duplicates scoped target ${scope.target.id} and owner ${scope.owner}.`);
  }
  seenScopes.add(scopeKey);
  for (const artifact of artifacts) {
    const priorScope = artifactScopes.get(artifact.path);
    if (priorScope !== undefined && priorScope !== scopeKey) {
      fail(`${field} artifact path ${artifact.path} is reused across distinct scoped target/owner rows.`);
    }
    artifactScopes.set(artifact.path, scopeKey);
  }
}
