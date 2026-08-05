import { isSayItStraightEnabled, renderSayItStraightLoopOverlay } from "./loop-output-style.js";

export function buildRecoveryProjection({ status, guide, fleet }) {
  const activeGoal = status.plan.goals.find((goal) => goal.status === "in_progress")
    ?? status.plan.goals.find((goal) => goal.status === "pending")
    ?? null;
  const unresolved = status.plan.goals.flatMap((goal) =>
    goal.criteria.filter((criterion) => criterion.status !== "pass").map((criterion) => `${goal.id}/${criterion.id}`)
  );
  return {
    binding: status.binding?.status ?? "bound",
    rootLabel: status.plan.repositoryBinding?.rootLabel ?? "unknown",
    sessionId: status.plan.sessionId ?? null,
    mode: status.plan.mode,
    activeGoal: activeGoal === null ? null : { id: activeGoal.id, title: activeGoal.title },
    unresolved,
    sayItStraight: isSayItStraightEnabled(status.plan),
    aggregateComplete: status.summary.aggregateComplete,
    nextAction: guide?.nextAction?.command ?? status.binding?.next ?? null,
    outstanding: Array.isArray(fleet?.outstanding) ? fleet.outstanding.map((item) => item.id) : []
  };
}

export function renderRecoveryCapsule(projection, { maxChars = 4000 } = {}) {
  const outputStyle = projection.sayItStraight
    ? renderSayItStraightLoopOverlay(true)
    : "Say It Straight output: disabled for this loop.";
  const aggregateCompletion = `Aggregate complete: ${projection.aggregateComplete ? "yes" : "no"}`;
  const head = [
    "Superloopy compaction recovery",
    "",
    "Durable Superloopy state overrides transcript summaries and completion claims.",
    `Repository: ${projection.binding} (${projection.rootLabel})`,
    `Session: ${projection.sessionId ?? "default"} · mode: ${projection.mode}`,
    projection.activeGoal === null ? "Active goal: none" : `Active goal: ${projection.activeGoal.id} ${projection.activeGoal.title}`,
    `Unresolved criteria: ${projection.unresolved.length === 0 ? "none" : projection.unresolved.join(", ")}`,
    "",
    outputStyle
  ].join("\n");
  const nextAction = `Next action: ${projection.nextAction ?? "inspect repository binding"}`;
  const gate = "Only the deterministic Superloopy gate authorizes completion.";
  const outstanding = `Outstanding handoffs: ${projection.outstanding.length === 0 ? "none" : projection.outstanding.join(", ")}`;
  const tail = [
    aggregateCompletion,
    nextAction,
    outstanding,
    "",
    gate
  ].join("\n");
  const mandatory = `${head}\n${tail}`;
  if (mandatory.length <= maxChars) return mandatory;
  const truncatedTail = `[recovery capsule truncated]\n${aggregateCompletion}\n${nextAction}\n${gate}\n${outstanding}`;
  const headBudget = maxChars - truncatedTail.length - 1;
  if (headBudget <= 0) return truncatedTail.slice(0, Math.max(0, maxChars));
  return `${head.slice(0, headBudget).trimEnd()}\n${truncatedTail}`;
}
