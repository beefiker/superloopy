import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readFlag } from "./args.js";
import { validateQualityGate } from "./artifacts.js";
import { summarizePlan } from "./plan-summary.js";
import { evidenceRelativeDir, readPlan, scopeFromSessionId } from "./store.js";

const DEFAULT_GATE_NAME = "gate.json";

export async function guideLoop(cwd, argv = []) {
  const scope = readScope(argv);
  const plan = await readPlan(cwd, scope);
  return {
    ok: true,
    plan,
    summary: summarizePlan(plan),
    guide: buildGuide(plan, { cwd, scope })
  };
}

export function buildGuide(plan, options = {}) {
  const scope = options.scope ?? scopeFromSessionId(plan.sessionId);
  const sessionId = scope?.sessionId ?? plan.sessionId;
  const evidenceRoot = plan.evidencePath ?? evidenceRelativeDir(scope);
  const gatePath = `${evidenceRoot}/${DEFAULT_GATE_NAME}`;
  const unresolvedCriteria = collectUnresolvedCriteria(plan, evidenceRoot);
  const commands = baseCommands(sessionId);

  if (plan.aggregateCompletion?.status === "complete") {
    return guide("complete", plan, {
      evidenceRoot,
      unresolvedCriteria,
      commands,
      nextAction: action("Inspect completed loop state", commands.status, "Aggregate completion is already recorded.")
    });
  }

  const activeGoal = plan.goals.find((goal) => goal.status === "in_progress");
  if (activeGoal !== undefined) {
    return guideForGoal(plan, activeGoal, { evidenceRoot, gatePath, unresolvedCriteria, commands, sessionId, cwd: options.cwd, scope });
  }

  if (allCriteriaPass(plan)) {
    return guideForReviewOrFinalCheckpoint(plan, lastGoal(plan), { evidenceRoot, gatePath, unresolvedCriteria, commands, sessionId, cwd: options.cwd, scope });
  }

  const pendingGoal = plan.goals.find((goal) => goal.status === "pending");
  if (pendingGoal !== undefined) {
    return guide("start_goal", plan, {
      goal: goalView(pendingGoal),
      evidenceRoot,
      unresolvedCriteria,
      commands,
      blockers: ["No goal is active."],
      nextAction: action("Start next goal", command("next", sessionId, ["--json"]), "No goal is active.")
    });
  }

  const unfinishedGoal = plan.goals.find((goal) => goal.status !== "complete") ?? lastGoal(plan);
  return guideForGoal(plan, unfinishedGoal, { evidenceRoot, gatePath, unresolvedCriteria, commands, sessionId, cwd: options.cwd, scope });
}

export function formatGuideResult(result) {
  return `${renderGuideText(result.guide, result.summary)}\n`;
}

export function renderGuideText(guideResult, summary) {
  const lines = [
    "Loopy guide",
    "",
    `State: ${guideResult.state}`,
    `Evidence root: \`${guideResult.evidenceRoot}\``,
    summary === undefined ? "" : `Progress: ${summary.goals.complete}/${summary.goals.total} goals, ${summary.criteria.pass}/${summary.criteria.total} criteria`,
    guideResult.goal === null ? "" : `Goal: ${guideResult.goal.id} ${guideResult.goal.title} (${guideResult.goal.status})`,
    guideResult.criterion === null ? "" : `Criterion: ${guideResult.criterion.id} ${guideResult.criterion.scenario}`,
    "",
    `Next action: \`${guideResult.nextAction.command}\``,
    guideResult.proofTarget === null ? "" : proofTargetLine(guideResult.proofTarget),
    guideResult.captureTemplate === null ? "" : `Capture template: \`${guideResult.captureTemplate.command}\``,
    guideResult.evidenceTemplate === null ? "" : `Evidence template: \`${guideResult.evidenceTemplate.command}\``,
    evidenceToolsLine(guideResult.commands),
    `Reason: ${guideResult.nextAction.reason}`
  ];
  if (guideResult.flow.length > 0) {
    lines.push("", "Flow checklist:", ...guideResult.flow.map(flowStepLine));
  }
  if (guideResult.proofPlan.length > 0) {
    lines.push("", "Proof plan:", ...guideResult.proofPlan.map(proofPlanLine));
  }
  if (guideResult.recordedEvidence.length > 0) {
    lines.push("", "Recorded evidence:", ...guideResult.recordedEvidence.map(recordedEvidenceLine));
  }
  if (guideResult.blockers.length > 0) {
    lines.push("", "Blockers:", ...guideResult.blockers.map((blocker) => `- ${blocker}`));
  }
  if (guideResult.unresolvedCriteria.length > 0) {
    lines.push("", "Unresolved criteria:", ...guideResult.unresolvedCriteria.map(unresolvedCriterionLine));
  }
  return lines.filter(Boolean).join("\n");
}

function guideForGoal(plan, goal, context) {
  const criterion = goal.criteria.find((candidate) => candidate.status !== "pass");
  if (criterion !== undefined) {
    const artifact = `${context.evidenceRoot}/${goal.id}-${criterion.id}.txt`;
    return guide("record_evidence", plan, {
      goal: goalView(goal),
      criterion: criterionView(criterion),
      evidenceRoot: context.evidenceRoot,
      unresolvedCriteria: context.unresolvedCriteria,
      commands: context.commands,
      blockers: [`${goal.id}/${criterion.id} needs artifact-backed pass evidence.`],
      proofTarget: {
        ref: `${goal.id}/${criterion.id}`,
        status: "pass",
        artifact
      },
      captureTemplate: action(
        "Capture command evidence",
        captureCommand(context.sessionId, goal.id, criterion.id),
        "Run a validation command and record its transcript as criterion evidence."
      ),
      evidenceTemplate: action(
        "Record existing artifact evidence",
        evidenceCommand(context.sessionId, goal.id, criterion.id, artifact),
        "Record a pre-existing non-empty artifact as criterion evidence."
      ),
      nextAction: action(
        "Prove criterion with command",
        proveCommand(context.sessionId),
        `${goal.id}/${criterion.id} is not passed.`
      )
    });
  }

  if (allCriteriaPass(plan)) {
    return guideForReviewOrFinalCheckpoint(plan, goal, context);
  }

  return guide("checkpoint_goal", plan, {
    goal: goalView(goal),
    evidenceRoot: context.evidenceRoot,
    unresolvedCriteria: context.unresolvedCriteria,
    commands: context.commands,
    nextAction: action(
      "Checkpoint completed goal",
      command("checkpoint", context.sessionId, ["--goal-id", goal.id, "--status", "complete", "--evidence", "criteria passed", "--json"]),
      `${goal.id} has all criteria passed and later goals remain.`
    )
  });
}

function guideForReviewOrFinalCheckpoint(plan, goal, context) {
  if (defaultGateIsReady(context.cwd, context.gatePath, context.scope)) {
    return guide("final_checkpoint", plan, {
      goal: goalView(goal),
      evidenceRoot: context.evidenceRoot,
      unresolvedCriteria: context.unresolvedCriteria,
      commands: context.commands,
      nextAction: action(
        "Checkpoint final completion",
        command("checkpoint", context.sessionId, [
          "--goal-id",
          goal.id,
          "--status",
          "complete",
          "--evidence",
          "criteria passed",
          "--quality-gate",
          context.gatePath,
          "--json"
        ]),
        "All criteria pass and the default quality gate artifact validates."
      )
    });
  }

  return guide("finish", plan, {
    goal: goalView(goal),
    evidenceRoot: context.evidenceRoot,
    unresolvedCriteria: context.unresolvedCriteria,
    commands: context.commands,
    nextAction: action(
      "Finish loop",
      command("finish", context.sessionId, ["--evidence", "criteria passed", "--artifact", context.gatePath, "--notes", "criteria reviewed", "--json"]),
      "All criteria pass; finish can create the default quality gate and complete the loop."
    )
  });
}

function guide(state, plan, fields) {
  return {
    state,
    evidenceRoot: fields.evidenceRoot,
    goal: fields.goal ?? null,
    criterion: fields.criterion ?? null,
    unresolvedCriteria: fields.unresolvedCriteria,
    blockers: fields.blockers ?? [],
    nextAction: fields.nextAction,
    proofTarget: fields.proofTarget ?? null,
    captureTemplate: fields.captureTemplate ?? null,
    evidenceTemplate: fields.evidenceTemplate ?? null,
    proofPlan: buildProofPlan(fields.unresolvedCriteria, fields.sessionId ?? plan.sessionId),
    recordedEvidence: collectRecordedEvidence(plan),
    flow: buildFlow(state, plan, fields),
    commands: fields.commands,
    paths: {
      plan: plan.goalsPath ?? ".loopy/goals.json",
      ledger: plan.ledgerPath ?? ".loopy/ledger.jsonl",
      evidence: fields.evidenceRoot
    }
  };
}

function action(label, commandText, reason) {
  return { label, command: commandText, reason };
}

function collectUnresolvedCriteria(plan, evidenceRoot) {
  return plan.goals.flatMap((goal) =>
    goal.criteria
      .filter((criterion) => criterion.status !== "pass")
      .map((criterion) => ({
        ref: `${goal.id}/${criterion.id}`,
        goalId: goal.id,
        criterionId: criterion.id,
        status: criterion.status,
        scenario: criterion.scenario,
        artifact: criterion.artifact ?? null,
        suggestedArtifact: `${evidenceRoot}/${goal.id}-${criterion.id}.txt`
      }))
  );
}

function collectRecordedEvidence(plan) {
  return plan.goals.flatMap((goal) =>
    goal.criteria
      .filter((criterion) => criterion.status !== "pending" || (criterion.artifact !== null && criterion.artifact !== undefined))
      .map((criterion) => {
        const item = {
          ref: `${goal.id}/${criterion.id}`,
          goalId: goal.id,
          criterionId: criterion.id,
          status: criterion.status,
          artifact: criterion.artifact ?? null,
          capturedAt: criterion.capturedAt ?? null,
          scenario: criterion.scenario
        };
        if (criterion.notes !== undefined) item.notes = criterion.notes;
        return item;
      })
  );
}

function allCriteriaPass(plan) {
  return plan.goals.every((goal) => goal.criteria.every((criterion) => criterion.status === "pass"));
}

function defaultGateIsReady(cwd, gatePath, scope) {
  if (typeof cwd !== "string") return false;
  const absolute = join(cwd, gatePath);
  if (!existsSync(absolute)) return false;
  try {
    validateQualityGate(cwd, JSON.parse(readFileSync(absolute, "utf8")), scope);
    return true;
  } catch {
    return false;
  }
}

function baseCommands(sessionId) {
  return {
    status: command("status", sessionId, ["--json"]),
    guide: command("guide", sessionId, ["--json"]),
    next: command("next", sessionId, ["--json"]),
    trace: command("trace", sessionId, ["--json"]),
    report: command("report", sessionId, ["--json"]),
    check: command("check", sessionId, ["--json"])
  };
}

function evidenceToolsLine(commands) {
  const tools = [commands?.trace, commands?.report, commands?.check].filter(Boolean);
  return tools.length === 0 ? "" : `Evidence tools: ${tools.map((tool) => `\`${tool}\``).join(", ")}`;
}

function buildFlow(state, plan, fields) {
  const sessionId = fields.sessionId ?? plan.sessionId;
  const gatePath = fields.gatePath ?? `${fields.evidenceRoot}/${DEFAULT_GATE_NAME}`;
  const finalGoal = fields.goal?.id ?? lastGoal(plan)?.id ?? "G001";
  const finishCommand = state === "final_checkpoint"
    ? command("checkpoint", sessionId, ["--goal-id", finalGoal, "--status", "complete", "--evidence", "criteria passed", "--quality-gate", gatePath, "--json"])
    : command("finish", sessionId, ["--evidence", "criteria passed", "--artifact", gatePath, "--notes", "criteria reviewed", "--json"]);
  return [
    flowStep("start_goal", "Start or resume goal", state === "start_goal" ? "current" : "complete", fields.commands.next),
    flowStep("record_evidence", "Record artifact-backed proof", proofFlowStatus(state, fields.unresolvedCriteria), proveCommand(sessionId)),
    flowStep("check_evidence", "Check evidence", "anytime", fields.commands.check),
    flowStep("finish", "Finish with quality gate", finishFlowStatus(state), finishCommand)
  ];
}

function proofFlowStatus(state, unresolvedCriteria) {
  if (state === "record_evidence") return "current";
  return unresolvedCriteria.length === 0 ? "complete" : "pending";
}

function finishFlowStatus(state) {
  if (state === "complete") return "complete";
  return state === "finish" || state === "final_checkpoint" ? "current" : "pending";
}

function flowStep(id, label, status, commandText) {
  return { id, label, status, command: commandText };
}

function flowStepLine(step) {
  return `- [${step.status}] ${step.label}: \`${step.command}\``;
}

function buildProofPlan(unresolvedCriteria, sessionId) {
  return unresolvedCriteria.map((criterion) => ({
    ref: criterion.ref,
    goalId: criterion.goalId,
    criterionId: criterion.criterionId,
    status: criterion.status,
    scenario: criterion.scenario,
    suggestedArtifact: criterion.suggestedArtifact,
    captureCommand: captureCommand(sessionId, criterion.goalId, criterion.criterionId),
    evidenceCommand: evidenceCommand(sessionId, criterion.goalId, criterion.criterionId, criterion.suggestedArtifact)
  }));
}

function proofPlanLine(item) {
  return `- ${item.ref} ${item.status} capture \`${item.captureCommand}\` or evidence \`${item.evidenceCommand}\``;
}

function proofTargetLine(target) {
  return `Proof target: ${target.ref} ${target.status} -> \`${target.artifact}\``;
}

function recordedEvidenceLine(item) {
  const artifact = item.artifact === null ? "no artifact" : `\`${item.artifact}\``;
  const capturedAt = item.capturedAt === null ? "" : ` at ${item.capturedAt}`;
  const notes = item.notes === undefined ? "" : ` - notes: ${item.notes}`;
  return `- ${item.ref} ${item.status}${capturedAt} -> ${artifact} ${item.scenario}${notes}`;
}

function unresolvedCriterionLine(criterion) {
  return `- ${criterion.ref} ${criterion.status} -> \`${criterion.suggestedArtifact}\` ${criterion.scenario}`;
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

function proveCommand(sessionId) {
  return `${command("prove", sessionId, [])} -- <validation-command>`;
}

function quoteCommandArg(value) {
  if (/^[A-Za-z0-9._/@:=+-]+$/u.test(value)) return value;
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

function goalView(goal) {
  return goal === undefined || goal === null ? null : {
    id: goal.id,
    title: goal.title,
    status: goal.status,
    attempt: goal.attempt
  };
}

function criterionView(criterion) {
  return criterion === undefined ? null : {
    id: criterion.id,
    kind: criterion.kind,
    scenario: criterion.scenario,
    status: criterion.status,
    artifact: criterion.artifact ?? null
  };
}

function lastGoal(plan) {
  return plan.goals[plan.goals.length - 1] ?? null;
}

function readScope(argv) {
  return scopeFromSessionId(readFlag(argv, "--session-id"));
}
