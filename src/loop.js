import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { readFlag } from "./args.js";
import { resolveEvidenceArtifact, resolveEvidenceOutputPath, validateQualityGate } from "./artifacts.js";
import { enforceAuditProvenance } from "./audit-gate-verify.js";
import {
  collectEvidenceArtifacts,
  deriveGoals,
  findCriterion,
  findGoal,
  isFinalGoal,
  makeGoal,
  nextGoalIndex,
  requireAllPlanCriteriaPass,
  requireEssentialCriteriaPass
} from "./goals.js";
import { readLoopControl } from "./continuation.js";
import { buildGuide, guideLoop } from "./guide.js";
import { helpText } from "./help.js";
import { summarizePlan } from "./plan-summary.js";
import { inspectRepositoryBinding } from "./repository-binding.js";
import {
  appendLedger,
  briefRelativePath,
  ensureSuperloopyDirs,
  evidenceRelativeDir,
  goalsRelativePath,
  goalsPath,
  ledgerRelativePath,
  nowIso,
  readPlan,
  readPlanUnchecked,
  scopeFromSessionId,
  withFileLock,
  writeBrief,
  writeJsonAtomic,
  writePlan
} from "./store.js";
import { createRepositoryBinding } from "./workspace-identity.js";
import { findSteeringReceipt, recordSteeringReceipt } from "./steering-receipts.js";

export { guideLoop, helpText };

export async function createLoop(cwd, argv) {
  const scope = readScope(argv);
  const brief = readFlag(argv, "--brief", { allowLeadingDashValue: true })?.trim();
  if (!brief) throw new Error("Missing --brief.");
  const mode = readMode(readFlag(argv, "--mode") ?? "light");
  const force = argv.includes("--force");
  if (!force && existsSync(goalsPath(cwd, scope))) {
    throw new Error("Superloopy plan already exists. Pass --force to replace it.");
  }
  const now = nowIso();
  const goals = deriveGoals(brief).map((goal, index) => makeGoal(goal, index, mode, now));
  const plan = {
    version: 2,
    mode,
    createdAt: now,
    updatedAt: now,
    briefPath: briefRelativePath(scope),
    evidencePath: evidenceRelativeDir(scope),
    goalsPath: goalsRelativePath(scope),
    ledgerPath: ledgerRelativePath(scope),
    goals,
    aggregateCompletion: null,
    repositoryBinding: await createRepositoryBinding(cwd)
  };
  if (scope?.sessionId) plan.sessionId = scope.sessionId;
  await writeBrief(cwd, brief, scope);
  await writePlan(cwd, plan, scope);
  await appendLedger(cwd, { at: now, kind: "plan_created", mode, goals: goals.length }, scope);
  return { ok: true, plan, summary: summarizePlan(plan), guide: buildGuide(plan, { cwd, scope }) };
}

export async function statusLoop(cwd, argv = []) {
  const scope = readScope(argv);
  const plan = await readPlanUnchecked(cwd, scope);
  const binding = await inspectRepositoryBinding(cwd, plan);
  if (!binding.resumable) {
    return { ok: false, plan, binding, summary: summarizePlan(plan), guide: null };
  }
  const result = { ok: true, plan, binding, summary: summarizePlan(plan), guide: buildGuide(plan, { cwd, scope }) };
  const loopControl = await readLoopControl(cwd, scope);
  if (loopControl !== null) result.loopControl = loopControl;
  return result;
}

export async function nextLoop(cwd, argv = []) {
  const scope = readScope(argv);
  return await withFileLock(goalsPath(cwd, scope), async () => {
    const plan = await readPlan(cwd, scope);
    const result = (fields) => ({
      ok: true,
      plan,
      summary: summarizePlan(plan),
      guide: buildGuide(plan, { cwd, scope }),
      ...fields
    });
    if (plan.aggregateCompletion?.status === "complete") {
      return result({ done: true });
    }
    const existing = plan.goals.find((goal) => goal.status === "in_progress");
    if (existing) return result({ resumed: true, goal: existing });
    const next = plan.goals.find((goal) => goal.status === "pending");
    if (!next) return result({ done: true });
    const now = nowIso();
    next.status = "in_progress";
    next.startedAt = now;
    next.updatedAt = now;
    next.attempt += 1;
    plan.updatedAt = now;
    await writePlan(cwd, plan, scope);
    await appendLedger(cwd, { at: now, kind: "goal_started", goalId: next.id, attempt: next.attempt }, scope);
    return result({ resumed: false, goal: next });
  });
}

export async function evidenceLoop(cwd, argv) {
  const scope = readScope(argv);
  const goalId = required(argv, "--goal-id");
  const criterionId = required(argv, "--criterion-id");
  const status = readEvidenceStatus(required(argv, "--status"));
  const artifact = resolveEvidenceArtifact(cwd, required(argv, "--artifact"), scope);
  const notes = readFlag(argv, "--notes");
  const command = parseCommandFlag(readFlag(argv, "--command"));
  const exitCode = readFlag(argv, "--exit-code");
  // Lock the read->mutate->write so two workers recording evidence in the same scope
  // cannot both read the plan and clobber each other's criterion update.
  const plan = await withFileLock(goalsPath(cwd, scope), async () => {
    const plan = await readPlan(cwd, scope);
    const goal = findGoal(plan, goalId);
    const criterion = findCriterion(goal, criterionId);
    const now = nowIso();
    const before = criterion.status;
    criterion.status = status;
    criterion.artifact = artifact.relativePath;
    criterion.capturedAt = now;
    if (notes !== undefined) criterion.notes = notes;
    if (command !== null) criterion.command = command;
    if (exitCode !== undefined) criterion.exitCode = Number.parseInt(exitCode, 10);
    goal.updatedAt = now;
    plan.updatedAt = now;
    await writePlan(cwd, plan, scope);
    const ledgerEntry = {
      at: now,
      kind: status === "pass" ? "evidence_passed" : `criterion_${status}`,
      goalId,
      criterionId,
      status,
      artifact: artifact.relativePath,
      before
    };
    if (notes !== undefined) ledgerEntry.notes = notes;
    await appendLedger(cwd, ledgerEntry, scope);
    return plan;
  });
  const goal = findGoal(plan, goalId);
  const criterion = findCriterion(goal, criterionId);
  return { ok: true, goal, criterion, plan, summary: summarizePlan(plan), guide: buildGuide(plan, { cwd, scope }) };
}

export async function checkpointLoop(cwd, argv) {
  const scope = readScope(argv);
  const goalId = required(argv, "--goal-id");
  const status = readCheckpointStatus(required(argv, "--status"));
  const evidence = required(argv, "--evidence");
  const preflight = status === "complete"
    ? await preflightCheckpointCompletion(cwd, argv, scope, goalId)
    : { qualityGate: null };
  return await withFileLock(goalsPath(cwd, scope), async () => {
    const plan = await readPlan(cwd, scope);
    const goal = findGoal(plan, goalId);
    const now = nowIso();
    let qualityGate = preflight.qualityGate;
    if (status === "complete") {
      requireEssentialCriteriaPass(goal);
      if (isFinalGoal(plan, goal)) {
        requireAllPlanCriteriaPass(plan);
        if (qualityGate === null) {
          throw new Error("Plan changed during checkpoint validation; retry the final checkpoint.");
        }
        plan.aggregateCompletion = { status: "complete", completedAt: now, evidence, qualityGate };
      }
      goal.status = "complete";
      goal.completedAt = now;
    } else {
      goal.status = status === "failed" ? "failed" : "blocked";
      goal.failureReason = evidence;
    }
    goal.evidence = evidence;
    goal.updatedAt = now;
    plan.updatedAt = now;
    await writePlan(cwd, plan, scope);
    await appendLedger(cwd, {
      at: now,
      kind: plan.aggregateCompletion?.completedAt === now ? "aggregate_completed" : `goal_${goal.status}`,
      goalId,
      status: goal.status,
      evidence,
      qualityGate
    }, scope);
    return { ok: true, goal, plan, summary: summarizePlan(plan), guide: buildGuide(plan, { cwd, scope }) };
  });
}

async function preflightCheckpointCompletion(cwd, argv, scope, goalId) {
  const plan = await readPlan(cwd, scope);
  const goal = findGoal(plan, goalId);
  requireEssentialCriteriaPass(goal);
  if (!isFinalGoal(plan, goal)) return { qualityGate: null };
  requireAllPlanCriteriaPass(plan);
  const qualityGate = await readQualityGate(cwd, required(argv, "--quality-gate"), scope);
  // Run audit re-derivation before taking the goals lock. The audit path takes
  // audit-state first and may then record evidence, so holding goals here would
  // invert that lock order and deadlock concurrent audit acceptance.
  await enforceAuditProvenance(cwd, scope, qualityGate.audit);
  return { qualityGate };
}

export async function reviewLoop(cwd, argv) {
  const scope = readScope(argv);
  const status = readReviewStatus(required(argv, "--status"));
  const artifact = resolveEvidenceOutputPath(cwd, required(argv, "--artifact"), scope);
  requireQualityGateJsonArtifact(artifact.relativePath);
  const notes = readFlag(argv, "--notes")?.trim();
  const plan = await readPlan(cwd, scope);
  requireAllPlanCriteriaPass(plan);
  const now = nowIso();
  const gate = {
    status,
    createdAt: now,
    artifacts: collectEvidenceArtifacts(cwd, plan, scope),
    summary: summarizePlan(plan)
  };
  if (notes) gate.notes = notes;
  await ensureSuperloopyDirs(cwd, scope);
  await writeJsonAtomic(artifact.absolutePath, gate);
  const validatedGate = validateQualityGate(cwd, gate, scope);
  // A "passed" quality gate that carries an audit section must have genuine,
  // re-derived verdicts behind it — not just a structurally valid section.
  await enforceAuditProvenance(cwd, scope, validatedGate.audit);
  await appendLedger(cwd, {
    at: now,
    kind: "quality_gate_passed",
    artifact: artifact.relativePath,
    artifacts: gate.artifacts,
    notes: notes ?? null
  }, scope);
  return { ok: true, kind: "quality_gate_passed", artifact, gate: validatedGate, plan, summary: summarizePlan(plan), guide: buildGuide(plan, { cwd, scope }) };
}

export async function annotateSteering(cwd, directive, scope) {
  return applySteering(cwd, directive, scope);
}

export async function applySteering(cwd, directive, scope) {
  if (directive.kind === "annotate") return annotateOnly(cwd, directive, scope);
  if (directive.kind === "add_goal") return addGoalFromSteering(cwd, directive, scope);
  if (directive.kind === "revise_criterion") return reviseCriterionFromSteering(cwd, directive, scope);
  if (directive.kind === "reorder_pending") return reorderPendingFromSteering(cwd, directive, scope);
  throw new Error(`Unsupported steering kind: ${directive.kind}`);
}

export async function applySteeringIdempotent(cwd, directive, scope, requestKey) {
  return await withFileLock(goalsPath(cwd, scope), async () => {
    const before = await readPlan(cwd, scope);
    const binding = await inspectRepositoryBinding(cwd, before);
    if (!binding.resumable) {
      throw new Error(`Superloopy repository is ${binding.status}; refusing to apply steering.`);
    }
    const prior = findSteeringReceipt(before, requestKey);
    if (prior !== null) return { ...prior.result, deduplicated: true };
    const result = await applySteering(cwd, directive, scope);
    const plan = result.plan ?? await readPlan(cwd, scope);
    const appliedAt = nowIso();
    const stableResult = { ok: true, kind: result.kind, goal: result.goal, criterion: result.criterion };
    recordSteeringReceipt(plan, { key: requestKey, appliedAt, result: stableResult });
    plan.updatedAt = appliedAt;
    await writePlan(cwd, plan, scope);
    return { ...result, plan, requestKey, deduplicated: false };
  });
}

async function annotateOnly(cwd, directive, scope) {
  const now = nowIso();
  await appendLedger(cwd, {
    at: now,
    kind: "steering_annotated",
    evidence: directive.evidence,
    rationale: directive.rationale
  }, scope);
  return { ok: true, kind: "steering_annotated" };
}

async function addGoalFromSteering(cwd, directive, scope) {
  return await withFileLock(goalsPath(cwd, scope), async () => {
    const plan = await readPlan(cwd, scope);
    if (plan.aggregateCompletion?.status === "complete") {
      throw new Error("Cannot add a goal after aggregate completion.");
    }
    const now = nowIso();
    const goal = makeGoal({
      title: directive.title.length > 72 ? `${directive.title.slice(0, 69).trimEnd()}...` : directive.title,
      objective: directive.objective
    }, nextGoalIndex(plan), plan.mode, now);
    plan.goals.push(goal);
    plan.updatedAt = now;
    await writePlan(cwd, plan, scope);
    await appendLedger(cwd, {
      at: now,
      kind: "goal_added",
      goalId: goal.id,
      title: goal.title,
      rationale: directive.rationale
    }, scope);
    return { ok: true, kind: "goal_added", goal, plan, summary: summarizePlan(plan) };
  });
}

async function reviseCriterionFromSteering(cwd, directive, scope) {
  return await withFileLock(goalsPath(cwd, scope), async () => {
    const plan = await readPlan(cwd, scope);
    if (plan.aggregateCompletion?.status === "complete") {
      throw new Error("Cannot revise criteria after aggregate completion.");
    }
    const goal = findGoal(plan, directive.goalId);
    const criterion = findCriterion(goal, directive.criterionId);
    if (goal.status === "complete") throw new Error(`Cannot revise completed goal: ${goal.id}`);
    if (criterion.status === "pass") throw new Error(`Cannot revise passed criterion: ${goal.id}/${criterion.id}`);
    const now = nowIso();
    const before = {
      scenario: criterion.scenario,
      status: criterion.status,
      artifact: criterion.artifact
    };
    criterion.scenario = directive.scenario;
    criterion.status = "pending";
    criterion.artifact = null;
    criterion.capturedAt = null;
    delete criterion.notes;
    goal.updatedAt = now;
    plan.updatedAt = now;
    await writePlan(cwd, plan, scope);
    await appendLedger(cwd, {
      at: now,
      kind: "criterion_revised",
      goalId: goal.id,
      criterionId: criterion.id,
      before,
      after: { scenario: criterion.scenario },
      rationale: directive.rationale
    }, scope);
    return { ok: true, kind: "criterion_revised", goal, criterion, plan, summary: summarizePlan(plan) };
  });
}

async function reorderPendingFromSteering(cwd, directive, scope) {
  return await withFileLock(goalsPath(cwd, scope), async () => {
    const plan = await readPlan(cwd, scope);
    if (plan.aggregateCompletion?.status === "complete") {
      throw new Error("Cannot reorder goals after aggregate completion.");
    }
    const requested = directive.goalIds.map((goalId) => findGoal(plan, goalId));
    const nonPending = requested.filter((goal) => goal.status !== "pending");
    if (nonPending.length > 0) {
      throw new Error(`Cannot reorder non-pending goals: ${nonPending.map((goal) => goal.id).join(", ")}`);
    }
    const now = nowIso();
    const requestedIds = new Set(directive.goalIds);
    const locked = plan.goals.filter((goal) => goal.status !== "pending");
    const remainingPending = plan.goals.filter((goal) => goal.status === "pending" && !requestedIds.has(goal.id));
    const orderedPending = directive.goalIds.map((goalId) => findGoal(plan, goalId));
    const before = plan.goals.map((goal) => goal.id);
    plan.goals = [...locked, ...remainingPending, ...orderedPending];
    plan.updatedAt = now;
    await writePlan(cwd, plan, scope);
    await appendLedger(cwd, {
      at: now,
      kind: "goals_reordered",
      before,
      after: plan.goals.map((goal) => goal.id),
      rationale: directive.rationale
    }, scope);
    return { ok: true, kind: "goals_reordered", plan, summary: summarizePlan(plan) };
  });
}

function readMode(value) {
  if (value === "light" || value === "strict") return value;
  throw new Error("--mode must be light or strict.");
}

function required(argv, flag) {
  const value = readFlag(argv, flag)?.trim();
  if (!value) throw new Error(`Missing ${flag}.`);
  return value;
}

function readScope(argv) {
  return scopeFromSessionId(readFlag(argv, "--session-id"));
}

function readEvidenceStatus(value) {
  if (value === "pass" || value === "fail" || value === "blocked") return value;
  throw new Error("--status must be pass, fail, or blocked.");
}

function parseCommandFlag(raw) {
  // Absent flag => a manual (commandless) criterion, which is legitimate. But a PRESENT
  // `--command` that fails to parse must fail loud: silently dropping it would downgrade a
  // command-backed criterion to an existence-only manual check, weakening the completion gate
  // from a single payload typo with no signal.
  if (raw === undefined) return null;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`--command must be a JSON array of strings (e.g. '["node","test.js"]'); could not parse: ${raw}`);
  }
  if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.every((part) => typeof part === "string")) {
    throw new Error(`--command must be a non-empty JSON array of strings (e.g. '["node","test.js"]'); got: ${raw}`);
  }
  return parsed;
}

function readCheckpointStatus(value) {
  if (value === "complete" || value === "failed" || value === "blocked") return value;
  throw new Error("--status must be complete, failed, or blocked.");
}

function readReviewStatus(value) {
  if (value === "passed") return value;
  throw new Error("--status must be passed.");
}

function requireQualityGateJsonArtifact(path) {
  if (path.toLowerCase().endsWith(".json")) return;
  throw new Error([
    "Quality gate artifact must use a .json path.",
    "Use `superloopy loop report --artifact <path>.md` or a separate worker report for Markdown evidence."
  ].join(" "));
}

async function readQualityGate(cwd, path, scope) {
  const absolute = resolve(cwd, path);
  const raw = await readFile(absolute, "utf8");
  return validateQualityGate(cwd, JSON.parse(raw), scope);
}
