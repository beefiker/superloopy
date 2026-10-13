import { readFlag } from "./args.js";
import { buildGuide, formatGuideResult, unresolvedCriterionLine } from "./guide.js";
import { summarizePlan } from "./plan-summary.js";
import { evidenceRelativeDir, ledgerRelativePath, readLedger, readPlan, scopeFromSessionId } from "./store.js";

const REPEATED_FAILURE_THRESHOLD = 3; // matches Superloopy's other caps (stall, receipt, audit)

export async function traceLoop(cwd, argv = []) {
  const scope = scopeFromSessionId(readFlag(argv, "--session-id"));
  const plan = await readPlan(cwd, scope);
  const ledger = await readLedger(cwd, scope);
  const summary = summarizePlan(plan);
  const artifacts = collectArtifacts(plan);
  const missingCriteria = collectMissingCriteria(plan, plan.evidencePath ?? evidenceRelativeDir(scope));
  const timeline = ledger.map(timelineEntry);
  const warnings = collectWarnings(plan, timeline, ledger);
  return {
    ok: true,
    kind: "trace",
    summary,
    paths: {
      evidence: plan.evidencePath ?? evidenceRelativeDir(scope),
      ledger: plan.ledgerPath ?? ledgerRelativePath(scope)
    },
    evidenceSummary: evidenceSummary(artifacts, missingCriteria, timeline),
    artifacts,
    missingCriteria,
    timeline,
    warnings,
    guide: buildGuide(plan, { cwd, scope })
  };
}

export function formatTraceResult(result) {
  const lines = [
    "Superloopy trace",
    "",
    `Evidence root: \`${result.paths.evidence}\``,
    `Progress: ${result.summary.goals.complete}/${result.summary.goals.total} goals, ${result.summary.criteria.pass}/${result.summary.criteria.total} criteria`,
    evidenceSummaryLine(result.evidenceSummary),
    "",
    "Evidence artifacts:",
    ...renderArtifacts(result.artifacts),
    "",
    "Missing proof:",
    ...renderMissingCriteria(result.missingCriteria),
    "",
    "Warnings:",
    ...renderWarnings(result.warnings),
    "",
    "Timeline:",
    ...renderTimeline(result.timeline)
  ];
  const guideText = result.guide === undefined ? "" : `\n${formatGuideResult(result)}`;
  return `${lines.join("\n")}\n${guideText}`;
}

function evidenceSummary(artifacts, missingCriteria, timeline) {
  return {
    artifactBackedCriteria: artifacts.length,
    missingProof: missingCriteria.length,
    timelineEvents: timeline.length
  };
}

export function evidenceSummaryLine(summary) {
  return `Evidence summary: ${summary.artifactBackedCriteria} artifact-backed criteria, ${summary.missingProof} missing proof, ${summary.timelineEvents} timeline events`;
}

function collectArtifacts(plan) {
  return plan.goals.flatMap((goal) =>
    goal.criteria
      .filter((criterion) => typeof criterion.artifact === "string" && criterion.artifact.length > 0)
      .map((criterion) => criterionTrace(goal, criterion))
  );
}

function collectMissingCriteria(plan, evidenceRoot) {
  return plan.goals.flatMap((goal) =>
    goal.criteria
      .filter((criterion) => criterion.status !== "pass" || !criterion.artifact)
      .map((criterion) => ({
        ...criterionTrace(goal, criterion),
        suggestedArtifact: `${evidenceRoot}/${goal.id}-${criterion.id}.txt`
      }))
  );
}

function criterionTrace(goal, criterion) {
  const item = {
    ref: `${goal.id}/${criterion.id}`,
    goalId: goal.id,
    criterionId: criterion.id,
    status: criterion.status,
    scenario: criterion.scenario,
    artifact: criterion.artifact ?? null,
    capturedAt: criterion.capturedAt ?? null
  };
  if (criterion.notes !== undefined) item.notes = criterion.notes;
  if (Array.isArray(criterion.command)) item.command = criterion.command;
  return item;
}

function timelineEntry(entry, index) {
  return {
    index: index + 1,
    at: typeof entry.at === "string" ? entry.at : null,
    kind: typeof entry.kind === "string" ? entry.kind : "unknown",
    ref: entry.goalId && entry.criterionId ? `${entry.goalId}/${entry.criterionId}` : entry.goalId ?? null,
    status: entry.status ?? null,
    artifact: entry.artifact ?? null,
    evidence: entry.evidence ?? null,
    notes: entry.notes ?? null,
    agentType: entry.agentType ?? null,
    agentId: entry.agentId ?? null,
    attempts: Number.isInteger(entry.attempts) ? entry.attempts : null
  };
}

function collectWarnings(plan, timeline, ledger) {
  return [
    ...manualProofWarnings(plan),
    ...attemptExhaustionWarnings(timeline),
    ...repeatedFailureWarnings(ledger)
  ];
}

// Consecutive failing proofs of one criterion with an identical failure signature
// (see failure-signature.js). Any other ledger event for that criterion ends the streak.
// `loop create --force` keeps the ledger and reuses ids like G001/C001, so a new plan
// starts every streak over.
export function repeatedFailureWarnings(ledger) {
  const streaks = new Map();
  for (const entry of ledger) {
    if (entry.kind === "plan_created") {
      streaks.clear();
      continue;
    }
    if (typeof entry.goalId !== "string" || typeof entry.criterionId !== "string") continue;
    const ref = `${entry.goalId}/${entry.criterionId}`;
    const signature = entry.kind === "criterion_fail" && typeof entry.failureSignature === "string" ? entry.failureSignature : null;
    if (signature === null) {
      streaks.delete(ref);
      continue;
    }
    const current = streaks.get(ref);
    streaks.set(ref, { signature, count: current?.signature === signature ? current.count + 1 : 1, artifact: entry.artifact ?? null });
  }
  return [...streaks]
    .filter(([, streak]) => streak.count >= REPEATED_FAILURE_THRESHOLD)
    .map(([ref, streak]) => ({
      kind: "repeated-failing-proof",
      ref,
      artifact: streak.artifact,
      count: streak.count,
      message: `${ref} failed ${streak.count} times in a row with the same command and the same output (timestamps, durations, and other run-to-run noise ignored). If nothing relevant changed since the last run, re-running will not help: read the failure in \`${streak.artifact}\`, then change the code or the proof command, or ask the user to revise the criterion (\`SUPERLOOPY_STEER\` \`revise_criterion\`), before proving again.`
    }));
}

export function formatWarningBlock(warnings) {
  return !Array.isArray(warnings) || warnings.length === 0 ? "" : `Warnings:\n${warnings.map(warningLine).join("\n")}\n`;
}

function manualProofWarnings(plan) {
  return plan.goals.flatMap((goal) =>
    goal.criteria
      .filter((criterion) => criterion.status === "pass" && criterion.artifact && !Array.isArray(criterion.command))
      .map((criterion) => ({
        kind: "manual-proof",
        ref: `${goal.id}/${criterion.id}`,
        artifact: criterion.artifact,
        message: `${goal.id}/${criterion.id} is passed with artifact-only proof; prefer command-backed proof when feasible.`
      }))
  );
}

function attemptExhaustionWarnings(timeline) {
  return timeline
    .filter((entry) => entry.kind === "subagent_attempt_exhausted" || entry.kind === "audit_attempt_exhausted")
    .map((entry) => ({
      kind: entry.kind,
      ref: entry.ref,
      artifact: entry.artifact,
      message: `${entry.kind} for ${entry.agentType ?? "unknown-agent"}${entry.attempts === null ? "" : ` after ${entry.attempts} attempts`}.`
    }));
}

function renderArtifacts(artifacts) {
  if (artifacts.length === 0) return ["- none"];
  return artifacts.map(evidenceArtifactLine);
}

function renderMissingCriteria(criteria) {
  if (criteria.length === 0) return ["- none"];
  return criteria.map(unresolvedCriterionLine);
}

function renderWarnings(warnings) {
  if (!Array.isArray(warnings) || warnings.length === 0) return ["- none"];
  return warnings.map(warningLine);
}

function renderTimeline(timeline) {
  if (timeline.length === 0) return ["- none"];
  return timeline.map(timelineLine);
}

export function evidenceArtifactLine(item) {
  const capturedAt = item.capturedAt === null ? "" : ` at ${item.capturedAt}`;
  const notes = item.notes === undefined ? "" : ` - notes: ${item.notes}`;
  return `- ${item.ref} ${item.status}${capturedAt} \`${item.artifact}\` - ${item.scenario}${notes}`;
}

export function warningLine(item) {
  return `- ${item.kind}: ${item.message}`;
}

export function timelineLine(item) {
  const parts = [`${item.index}.`];
  if (item.at) parts.push(item.at);
  parts.push(item.kind);
  if (item.ref) parts.push(item.ref);
  if (item.status) parts.push(item.status);
  if (item.artifact) parts.push(`\`${item.artifact}\``);
  if (item.notes !== null && item.notes !== undefined) parts.push(`notes: ${item.notes}`);
  return `- ${parts.join(" ")}`;
}
