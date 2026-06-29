import { readFlag } from "./args.js";
import { resolveEvidenceArtifact } from "./artifacts.js";
import { buildGuide, formatGuideResult } from "./guide.js";
import { traceLoop } from "./trace.js";
import { readPlan, scopeFromSessionId } from "./store.js";

export async function checkLoop(cwd, argv = []) {
  const scope = scopeFromSessionId(readFlag(argv, "--session-id"));
  const plan = await readPlan(cwd, scope);
  const trace = await traceLoop(cwd, argv);
  const invalidArtifacts = trace.artifacts.flatMap((item) => validateArtifact(cwd, item, scope));
  const unresolvedCriteria = trace.missingCriteria;
  const repairCommands = [
    ...unresolvedCriteria.map((item) => repairCommand(item, scope?.sessionId, "missing-proof", item.suggestedArtifact)),
    ...invalidArtifacts.map((item) => repairCommand(item, scope?.sessionId, "invalid-artifact", item.artifact))
  ];
  const repairPlan = repairCommands.map(repairStep);
  return {
    ok: invalidArtifacts.length === 0 && unresolvedCriteria.length === 0,
    kind: "check",
    summary: trace.summary,
    unresolvedCriteria,
    invalidArtifacts,
    repairCommands,
    repairPlan,
    trace,
    warnings: trace.warnings,
    guide: buildGuide(plan, { cwd, scope })
  };
}

export function formatCheckResult(result) {
  if (result.ok) {
    return `loopy check: ok\n${evidenceSummaryLine(result)}\n${formatWarnings(result.warnings)}${formatGuide(result)}`;
  }
  const lines = ["loopy check: blocked", evidenceSummaryLine(result)];
  lines.push(...warningLines(result.warnings));
  if (result.unresolvedCriteria.length > 0) {
    lines.push("", "Unresolved criteria:", ...result.unresolvedCriteria.map((item) => `- ${item.ref} ${item.status} -> \`${item.suggestedArtifact}\` ${item.scenario}`));
  }
  if (result.invalidArtifacts.length > 0) {
    lines.push("", "Invalid artifacts:", ...result.invalidArtifacts.map((item) => `- ${item.ref} ${item.artifact}: ${item.error}`));
  }
  if (result.repairPlan.length > 0) {
    lines.push("", "Repair plan:", ...result.repairPlan.flatMap(repairStepLines));
  }
  if (result.repairCommands.length > 0) {
    lines.push("", "Repair commands:", ...result.repairCommands.map(repairCommandLine));
  }
  return `${lines.join("\n")}\n${formatGuide(result)}`;
}

function evidenceSummaryLine(result) {
  return `Evidence summary: ${result.trace.artifacts.length} artifact-backed criteria, ${result.unresolvedCriteria.length} unresolved, ${result.invalidArtifacts.length} invalid`;
}

function formatGuide(result) {
  return result.guide === undefined ? "" : formatGuideResult(result);
}

function formatWarnings(warnings) {
  const lines = warningLines(warnings);
  return lines.length === 0 ? "" : `${lines.join("\n")}\n`;
}

function warningLines(warnings) {
  if (!Array.isArray(warnings) || warnings.length === 0) return [];
  return ["", "Warnings:", ...warnings.map((item) => `- ${item.kind}: ${item.message}`)];
}

function validateArtifact(cwd, item, scope) {
  try {
    resolveEvidenceArtifact(cwd, item.artifact, scope);
    return [];
  } catch (error) {
    return [{
      ref: item.ref,
      goalId: item.goalId,
      criterionId: item.criterionId,
      status: item.status,
      scenario: item.scenario,
      artifact: item.artifact,
      error: error instanceof Error ? error.message : String(error)
    }];
  }
}

function repairCommand(item, sessionId, reason, artifact) {
  return {
    ref: item.ref,
    goalId: item.goalId,
    criterionId: item.criterionId,
    status: item.status,
    reason,
    scenario: item.scenario,
    artifact,
    captureCommand: captureCommand(sessionId, item.goalId, item.criterionId),
    evidenceCommand: evidenceCommand(sessionId, item.goalId, item.criterionId, artifact)
  };
}

function repairCommandLine(item) {
  return `- ${item.ref} ${item.reason} capture \`${item.captureCommand}\` or evidence \`${item.evidenceCommand}\``;
}

function repairStep(item, index) {
  return {
    step: index + 1,
    ref: item.ref,
    goalId: item.goalId,
    criterionId: item.criterionId,
    status: item.status,
    reason: item.reason,
    scenario: item.scenario,
    artifact: item.artifact,
    instruction: repairInstruction(item),
    primaryCommand: item.captureCommand,
    alternativeCommand: item.evidenceCommand
  };
}

function repairInstruction(item) {
  if (item.reason === "invalid-artifact") return `Replace or recapture the stale pass artifact for ${item.ref}.`;
  return `Record artifact-backed pass proof for ${item.ref}.`;
}

function repairStepLines(item) {
  return [
    `${item.step}. ${item.ref} ${item.reason} -> \`${item.artifact}\``,
    `   capture: \`${item.primaryCommand}\``,
    `   evidence: \`${item.alternativeCommand}\``
  ];
}

function command(subcommand, sessionId, args) {
  const parts = ["loopy", "loop", subcommand];
  if (sessionId) parts.push("--session-id", sessionId);
  return [...parts, ...args.map((arg) => quoteCommandArg(arg))].join(" ");
}

function captureCommand(sessionId, goalId, criterionId) {
  return `${command("capture", sessionId, ["--goal-id", goalId, "--criterion-id", criterionId, "--notes", "<summary>"])} -- <validation-command>`;
}

function evidenceCommand(sessionId, goalId, criterionId, artifact) {
  return command("evidence", sessionId, ["--goal-id", goalId, "--criterion-id", criterionId, "--status", "pass", "--artifact", artifact, "--notes", "<summary>", "--json"]);
}

function quoteCommandArg(value) {
  if (/^[A-Za-z0-9._/@:=+-]+$/u.test(value)) return value;
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}
