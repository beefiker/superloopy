import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { readFlag } from "./args.js";
import { resolveEvidenceOutputPath, writeEvidenceOutputFile } from "./artifacts.js";
import { buildGuide, proofPlanLine, recordedEvidenceLine, unresolvedCriterionLine } from "./guide.js";
import { evidenceArtifactLine, timelineLine, traceLoop, warningLine } from "./trace.js";
import { appendLedger, ensureSuperloopyDirs, evidenceRelativeDir, nowIso, readPlan, scopeFromSessionId } from "./store.js";

const DEFAULT_REPORT_NAME = "report.md";

export async function reportLoop(cwd, argv = []) {
  const scope = scopeFromSessionId(readFlag(argv, "--session-id"));
  const artifactPath = readFlag(argv, "--artifact") ?? `${evidenceRelativeDir(scope)}/${DEFAULT_REPORT_NAME}`;
  const artifact = resolveEvidenceOutputPath(cwd, artifactPath, scope);
  const trace = await traceLoop(cwd, argv);
  await ensureSuperloopyDirs(cwd, scope);
  await mkdir(dirname(artifact.absolutePath), { recursive: true });
  await writeEvidenceOutputFile(artifact, renderEvidenceReport(trace));
  const now = nowIso();
  await appendLedger(cwd, {
    at: now,
    kind: "evidence_report_written",
    artifact: artifact.relativePath,
    missingCriteria: trace.missingCriteria.length,
    artifacts: trace.artifacts.length
  }, scope);
  const plan = await readPlan(cwd, scope);
  return { ok: true, kind: "report", artifact, trace, summary: trace.summary, guide: buildGuide(plan, { cwd, scope }) };
}

export function renderEvidenceReport(trace) {
  return [
    "# Superloopy Evidence Report",
    "",
    `Evidence root: \`${trace.paths.evidence}\``,
    `Ledger: \`${trace.paths.ledger}\``,
    `Progress: ${trace.summary.goals.complete}/${trace.summary.goals.total} goals, ${trace.summary.criteria.pass}/${trace.summary.criteria.total} criteria`,
    "",
    "## Evidence Summary",
    ...renderEvidenceSummary(trace.evidenceSummary),
    "",
    "## Evidence Warnings",
    ...renderWarnings(trace.warnings),
    "",
    "## Next Action",
    ...renderNextAction(trace.guide),
    "",
    "## Recorded Evidence",
    ...renderRecordedEvidence(trace.guide?.recordedEvidence ?? []),
    "",
    "## Proof Plan",
    ...renderProofPlan(trace.guide?.proofPlan ?? []),
    "",
    "## Evidence Artifacts",
    ...renderArtifacts(trace.artifacts),
    "",
    "## Missing Proof",
    ...renderMissingCriteria(trace.missingCriteria),
    "",
    "## Timeline",
    ...renderTimeline(trace.timeline),
    ""
  ].join("\n");
}

function renderWarnings(warnings) {
  if (!Array.isArray(warnings) || warnings.length === 0) return ["- none"];
  return warnings.map(warningLine);
}

function renderEvidenceSummary(summary) {
  return [
    `- ${summary.artifactBackedCriteria} artifact-backed criteria`,
    `- ${summary.missingProof} missing proof`,
    `- ${summary.timelineEvents} timeline events`
  ];
}

function renderNextAction(guide) {
  if (guide === undefined) return ["- none"];
  const lines = [
    `- State: \`${guide.state}\``,
    `- Command: \`${guide.nextAction.command}\``,
    `- Reason: ${guide.nextAction.reason}`
  ];
  if (guide.proofTarget !== null) {
    lines.push(`- Proof target: ${guide.proofTarget.ref} ${guide.proofTarget.status} -> \`${guide.proofTarget.artifact}\``);
  }
  return lines;
}

function renderProofPlan(proofPlan) {
  if (proofPlan.length === 0) return ["- none"];
  return proofPlan.map(proofPlanLine);
}

function renderRecordedEvidence(recordedEvidence) {
  if (recordedEvidence.length === 0) return ["- none"];
  return recordedEvidence.map(recordedEvidenceLine);
}

function renderArtifacts(artifacts) {
  if (artifacts.length === 0) return ["- none"];
  return artifacts.map(evidenceArtifactLine);
}

function renderMissingCriteria(criteria) {
  if (criteria.length === 0) return ["- none"];
  return criteria.map(unresolvedCriterionLine);
}

function renderTimeline(timeline) {
  if (timeline.length === 0) return ["- none"];
  return timeline.map(timelineLine);
}
