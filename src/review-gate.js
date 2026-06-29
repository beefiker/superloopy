import { validateAuditSection } from "./audit-verdict.js";

const REQUIRED_SECTIONS = ["codeReview", "manualQa", "gateReview", "iteration", "criteriaCoverage"];
const TERMINAL_MULTIPLEXER_SURFACE = ["t", "m", "u", "x"].join("");

export function isReviewQualityGate(value) {
  return REQUIRED_SECTIONS.every((key) => isRecord(value[key]));
}

export function validateReviewQualityGate(value, resolveArtifactPath) {
  const codeReview = section(value.codeReview, "codeReview");
  const manualQa = section(value.manualQa, "manualQa");
  const gateReview = section(value.gateReview, "gateReview");
  const iteration = section(value.iteration, "iteration");
  const coverage = section(value.criteriaCoverage, "criteriaCoverage");
  const artifactRefs = parseArtifactRefs(manualQa.artifactRefs, resolveArtifactPath);
  const byId = new Map(artifactRefs.map((artifact) => [artifact.id, artifact]));

  return {
    codeReview: {
      by: textField(codeReview.by, "codeReview.by"),
      recommendation: literal(textField(codeReview.recommendation, "codeReview.recommendation"), "APPROVE", "codeReview.recommendation"),
      codeQualityStatus: literal(textField(codeReview.codeQualityStatus, "codeReview.codeQualityStatus"), "CLEAR", "codeReview.codeQualityStatus"),
      reportPath: artifactPath(codeReview.reportPath, "codeReview.reportPath", resolveArtifactPath),
      evidence: textField(codeReview.evidence, "codeReview.evidence"),
      blockers: emptyBlockers(codeReview.blockers, "codeReview.blockers")
    },
    manualQa: {
      by: textField(manualQa.by, "manualQa.by"),
      status: literal(textField(manualQa.status, "manualQa.status"), "passed", "manualQa.status"),
      evidence: textField(manualQa.evidence, "manualQa.evidence"),
      surfaceEvidence: parseSurfaceEvidence(manualQa.surfaceEvidence, byId),
      adversarialCases: parseAdversarialCases(manualQa.adversarialCases, byId),
      artifactRefs
    },
    gateReview: {
      by: textField(gateReview.by, "gateReview.by"),
      recommendation: literal(textField(gateReview.recommendation, "gateReview.recommendation"), "APPROVE", "gateReview.recommendation"),
      reportPath: artifactPath(gateReview.reportPath, "gateReview.reportPath", resolveArtifactPath),
      evidence: textField(gateReview.evidence, "gateReview.evidence"),
      blockers: emptyBlockers(gateReview.blockers, "gateReview.blockers")
    },
    iteration: {
      fullRerun: literal(iteration.fullRerun, true, "iteration.fullRerun"),
      status: literal(textField(iteration.status, "iteration.status"), "passed", "iteration.status"),
      rerunCommands: stringArray(iteration.rerunCommands, "iteration.rerunCommands"),
      evidence: textField(iteration.evidence, "iteration.evidence")
    },
    criteriaCoverage: validateCriteriaCoverage(coverage),
    audit: validateAuditSection(value.audit, resolveArtifactPath)
  };
}

function parseArtifactRefs(value, resolveArtifactPath) {
  if (!Array.isArray(value) || value.length === 0) fail("manualQa.artifactRefs must not be empty.");
  const seen = new Set();
  return value.map((item, index) => {
    const ref = section(item, `manualQa.artifactRefs[${index}]`);
    const id = textField(ref.id, `manualQa.artifactRefs[${index}].id`);
    if (seen.has(id)) fail(`manualQa.artifactRefs contains duplicate ${id}.`);
    seen.add(id);
    return {
      id,
      kind: artifactKind(ref.kind, `manualQa.artifactRefs[${index}].kind`),
      description: textField(ref.description, `manualQa.artifactRefs[${index}].description`),
      path: artifactPath(ref.path, `manualQa.artifactRefs[${index}].path`, resolveArtifactPath)
    };
  });
}

function parseSurfaceEvidence(value, byId) {
  if (!Array.isArray(value) || value.length === 0) fail("manualQa.surfaceEvidence must not be empty.");
  return value.map((item, index) => {
    const row = section(item, `manualQa.surfaceEvidence[${index}]`);
    const surface = surfaceKind(row.surface, `manualQa.surfaceEvidence[${index}].surface`);
    const artifactRefs = referencedArtifacts(row.artifactRefs, `manualQa.surfaceEvidence[${index}].artifactRefs`, byId);
    for (const artifact of artifactRefs) {
      if (!artifactCompatible(surface, artifact.kind)) fail(`manualQa.surfaceEvidence ${surface} artifact ${artifact.kind} is incompatible.`);
    }
    return {
      id: textField(row.id, `manualQa.surfaceEvidence[${index}].id`),
      criterionRef: textField(row.criterionRef, `manualQa.surfaceEvidence[${index}].criterionRef`),
      surface,
      invocation: textField(row.invocation, `manualQa.surfaceEvidence[${index}].invocation`),
      verdict: passedVerdict(row.verdict, `manualQa.surfaceEvidence[${index}].verdict`),
      artifactRefs: artifactRefs.map((artifact) => artifact.id)
    };
  });
}

function parseAdversarialCases(value, byId) {
  if (!Array.isArray(value) || value.length === 0) fail("manualQa.adversarialCases must not be empty.");
  return value.map((item, index) => {
    const row = section(item, `manualQa.adversarialCases[${index}]`);
    const artifactRefs = referencedArtifacts(row.artifactRefs, `manualQa.adversarialCases[${index}].artifactRefs`, byId);
    return {
      id: textField(row.id, `manualQa.adversarialCases[${index}].id`),
      criterionRef: textField(row.criterionRef, `manualQa.adversarialCases[${index}].criterionRef`),
      scenario: textField(row.scenario, `manualQa.adversarialCases[${index}].scenario`),
      expectedBehavior: textField(row.expectedBehavior, `manualQa.adversarialCases[${index}].expectedBehavior`),
      verdict: passedVerdict(row.verdict, `manualQa.adversarialCases[${index}].verdict`),
      artifactRefs: artifactRefs.map((artifact) => artifact.id)
    };
  });
}

function validateCriteriaCoverage(coverage) {
  const totalCriteria = numberField(coverage.totalCriteria, "criteriaCoverage.totalCriteria");
  const passCount = numberField(coverage.passCount, "criteriaCoverage.passCount");
  if (passCount < totalCriteria) fail("criteriaCoverage.passCount must cover totalCriteria.");
  return {
    totalCriteria,
    passCount,
    originalIntent: textField(coverage.originalIntent, "criteriaCoverage.originalIntent"),
    desiredOutcome: textField(coverage.desiredOutcome, "criteriaCoverage.desiredOutcome"),
    userOutcomeReview: textField(coverage.userOutcomeReview, "criteriaCoverage.userOutcomeReview"),
    adversarialClassesCovered: stringArray(coverage.adversarialClassesCovered, "criteriaCoverage.adversarialClassesCovered")
  };
}

function artifactPath(value, field, resolveArtifactPath) {
  return resolveArtifactPath(textField(value, field));
}

function section(value, field) {
  if (!isRecord(value)) fail(`${field} must be an object.`);
  return value;
}

function textField(value, field) {
  if (typeof value !== "string" || value.trim().length === 0) fail(`${field} must be a non-empty string.`);
  const trimmed = value.trim();
  if (/^(todo|tbd|placeholder)$/iu.test(trimmed)) fail(`${field} must not be placeholder text.`);
  return trimmed;
}

function numberField(value, field) {
  if (typeof value !== "number" || !Number.isFinite(value)) fail(`${field} must be a number.`);
  return value;
}

function literal(value, expected, field) {
  if (value !== expected) fail(`${field} must be ${expected}.`);
  return expected;
}

function emptyBlockers(value, field) {
  if (!Array.isArray(value)) fail(`${field} must be an array.`);
  if (value.length !== 0) fail(`${field} must be empty.`);
  return [];
}

function stringArray(value, field) {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string" && item.trim().length > 0)) {
    fail(`${field} must be a string array.`);
  }
  return value.map((item) => item.trim());
}

function referencedArtifacts(value, field, byId) {
  return stringArray(value, field).map((id) => {
    const artifact = byId.get(id);
    if (artifact === undefined) fail(`${field} references unknown artifact ${id}.`);
    return artifact;
  });
}

function surfaceKind(value, field) {
  if (["cli", "http", "terminal", "browser", "gui", "data", TERMINAL_MULTIPLEXER_SURFACE].includes(value)) return value;
  fail(`${field} must be a supported manual QA surface.`);
}

function artifactKind(value, field) {
  if (["cli-transcript", "log", "screenshot", "image", "http-dump", "data-diff"].includes(value)) return value;
  fail(`${field} must be a supported artifact kind.`);
}

function passedVerdict(value, field) {
  if (value === "not_applicable") fail(`${field} must not be not_applicable.`);
  return literal(value, "passed", field);
}

function artifactCompatible(surface, kind) {
  if (surface === "cli" || surface === "terminal" || surface === TERMINAL_MULTIPLEXER_SURFACE) return kind === "cli-transcript" || kind === "log";
  if (surface === "http") return kind === "http-dump";
  if (surface === "browser" || surface === "gui") return kind === "screenshot" || kind === "image";
  if (surface === "data") return kind === "data-diff";
  return false;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function fail(message) {
  throw new Error(message);
}
