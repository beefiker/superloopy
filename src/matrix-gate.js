import { validateAuditSection } from "./audit-verdict.js";
import { artifactPath, emptyBlockers, fail, isRecord, literal, passedVerdict, referencedArtifacts, section, stringArray, textField } from "./review-gate.js";

const REQUIRED_SECTIONS = ["architectReview", "executorQa", "iteration"];
const TERMINAL_MULTIPLEXER_SURFACE = ["t", "m", "u", "x"].join("");

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
  const seen = new Set();
  return value.map((item, index) => {
    const ref = section(item, `executorQa.artifactRefs[${index}]`);
    const id = textField(ref.id, `executorQa.artifactRefs[${index}].id`);
    if (seen.has(id)) fail(`executorQa.artifactRefs contains duplicate ${id}.`);
    seen.add(id);
    if (!("path" in ref)) {
      fail("inlineEvidence" in ref ? "executorQa.artifactRefs inlineEvidence alone is not sufficient." : `executorQa.artifactRefs[${index}].path is required.`);
    }
    return {
      id,
      kind: artifactKind(ref.kind, `executorQa.artifactRefs[${index}].kind`),
      description: textField(ref.description, `executorQa.artifactRefs[${index}].description`),
      path: artifactPath(ref.path, `executorQa.artifactRefs[${index}].path`, resolveArtifactPath)
    };
  });
}

function parseSurfaceEvidence(value, byId) {
  if (!Array.isArray(value) || value.length === 0) fail("executorQa.surfaceEvidence must not be empty.");
  return value.map((item, index) => {
    const row = section(item, `executorQa.surfaceEvidence[${index}]`);
    const status = optionalText(row.status);
    const base = {
      id: textField(row.id, `executorQa.surfaceEvidence[${index}].id`),
      contractRef: textField(row.contractRef, `executorQa.surfaceEvidence[${index}].contractRef`)
    };
    if (status === "not_applicable") {
      return {
        ...base,
        status,
        reason: textField(row.reason, `executorQa.surfaceEvidence[${index}].reason`),
        artifactRefs: []
      };
    }
    const surface = textField(row.surface, `executorQa.surfaceEvidence[${index}].surface`);
    const family = surfaceFamily(surface);
    const artifactRefs = referencedArtifacts(row.artifactRefs, `executorQa.surfaceEvidence[${index}].artifactRefs`, byId);
    requirePassedOutcome(row, `executorQa.surfaceEvidence[${index}]`);
    requireSurfaceProof(family, artifactRefs, `executorQa.surfaceEvidence[${index}]`);
    return {
      ...base,
      surface,
      invocation: textField(row.invocation, `executorQa.surfaceEvidence[${index}].invocation`),
      verdict: row.verdict === undefined ? "passed" : passedVerdict(row.verdict, `executorQa.surfaceEvidence[${index}].verdict`),
      artifactRefs: artifactRefs.map((artifact) => artifact.id)
    };
  });
}

function parseAdversarialCases(value, byId) {
  if (!Array.isArray(value) || value.length === 0) fail("executorQa.adversarialCases must not be empty.");
  return value.map((item, index) => {
    const row = section(item, `executorQa.adversarialCases[${index}]`);
    if (optionalText(row.status) === "not_applicable") fail(`executorQa.adversarialCases[${index}].status must not be not_applicable.`);
    const artifactRefs = referencedArtifacts(row.artifactRefs, `executorQa.adversarialCases[${index}].artifactRefs`, byId);
    requirePassedOutcome(row, `executorQa.adversarialCases[${index}]`);
    return {
      id: textField(row.id, `executorQa.adversarialCases[${index}].id`),
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
  return value.map((item, index) => {
    const row = section(item, `executorQa.contractCoverage[${index}]`);
    const surfaceRefs = optionalStringArray(row.surfaceEvidenceRefs, `executorQa.contractCoverage[${index}].surfaceEvidenceRefs`);
    const adversarialRefs = optionalStringArray(row.adversarialCaseRefs, `executorQa.contractCoverage[${index}].adversarialCaseRefs`);
    const artifactRefs = optionalStringArray(row.artifactRefs, `executorQa.contractCoverage[${index}].artifactRefs`);
    if (surfaceRefs.length + adversarialRefs.length + artifactRefs.length === 0) {
      fail(`executorQa.contractCoverage[${index}] must link to proof rows or artifacts.`);
    }
    for (const id of surfaceRefs) {
      const surface = surfaceById.get(id);
      if (surface === undefined) fail(`executorQa.contractCoverage[${index}].surfaceEvidenceRefs references unknown ${id}.`);
      if (surface.status === "not_applicable") fail(`executorQa.contractCoverage[${index}].surfaceEvidenceRefs.${id}.status must be passed.`);
    }
    for (const id of adversarialRefs) {
      if (!adversarialById.has(id)) fail(`executorQa.contractCoverage[${index}].adversarialCaseRefs references unknown ${id}.`);
    }
    for (const id of artifactRefs) {
      if (!artifactById.has(id)) fail(`executorQa.contractCoverage[${index}].artifactRefs references unknown ${id}.`);
    }
    return {
      id: textField(row.id, `executorQa.contractCoverage[${index}].id`),
      contractRef: textField(row.contractRef, `executorQa.contractCoverage[${index}].contractRef`),
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

function surfaceFamily(value) {
  const normalized = value.toLowerCase();
  if (normalized === TERMINAL_MULTIPLEXER_SURFACE) return "cli";
  if (/\b(cli|shell|terminal)\b/u.test(normalized)) return "cli";
  if (/\b(gui|web|browser)\b/u.test(normalized)) return "web";
  if (/\b(native|desktop|tui)\b/u.test(normalized)) return "native";
  if (/\b(http|data|api|package|algorithm|math)\b/u.test(normalized)) return "data";
  fail(`executorQa surface ${value} is unsupported.`);
}

function artifactKind(value, field) {
  const normalized = textField(value, field).toLowerCase().replaceAll("_", "-");
  const allowed = [
    "cli-transcript",
    "log",
    "failure-mode-test",
    "browser-automation",
    "screenshot",
    "image",
    "http-dump",
    "data-diff",
    "cli-replay",
    "pty-capture",
    "app-automation-transcript",
    "api-package-test-report"
  ];
  if (allowed.includes(normalized)) return normalized;
  fail(`${field} must be a supported executor QA artifact kind.`);
}

function coveredStatus(value, field) {
  const status = textField(value, field);
  if (["covered", "passed", "verified"].includes(status)) return status;
  fail(`${field} must be covered, passed, or verified.`);
}

function requireSurfaceProof(family, artifacts, field) {
  const kinds = artifacts.map((artifact) => artifact.kind);
  if (family === "cli" && !kinds.some((kind) => ["cli-transcript", "log", "cli-replay"].includes(kind))) {
    fail(`${field} for CLI surfaces must reference CLI transcript, log, or replay artifacts.`);
  }
  if (family === "web") {
    const hasAutomation = kinds.some((kind) => ["browser-automation", "app-automation-transcript"].includes(kind));
    const hasScreenshot = kinds.some((kind) => ["screenshot", "image"].includes(kind));
    if (!hasAutomation || !hasScreenshot) fail(`${field} for GUI/web surfaces must reference automation plus screenshot artifacts.`);
  }
  if (family === "native" && !kinds.some((kind) => ["screenshot", "image", "pty-capture", "app-automation-transcript"].includes(kind))) {
    fail(`${field} for native surfaces must reference screenshot, PTY, or app automation artifacts.`);
  }
}
