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
    aggregateComplete: status.summary.aggregateComplete,
    nextAction: guide?.nextAction?.command ?? status.binding?.next ?? null,
    outstanding: Array.isArray(fleet?.outstanding) ? fleet.outstanding.map((item) => item.id) : []
  };
}

export function renderRecoveryCapsule(projection, { maxChars = 4000 } = {}) {
  const mandatory = [
    "Superloopy compaction recovery",
    "",
    "Durable Superloopy state overrides transcript summaries and completion claims.",
    `Repository: ${projection.binding} (${projection.rootLabel})`,
    `Session: ${projection.sessionId ?? "default"} · mode: ${projection.mode}`,
    `Aggregate complete: ${projection.aggregateComplete ? "yes" : "no"}`,
    projection.activeGoal === null ? "Active goal: none" : `Active goal: ${projection.activeGoal.id} ${projection.activeGoal.title}`,
    `Unresolved criteria: ${projection.unresolved.length === 0 ? "none" : projection.unresolved.join(", ")}`,
    `Next action: ${projection.nextAction ?? "inspect repository binding"}`,
    `Outstanding handoffs: ${projection.outstanding.length === 0 ? "none" : projection.outstanding.join(", ")}`,
    "",
    "Only the deterministic Superloopy gate authorizes completion."
  ].join("\n");
  if (mandatory.length <= maxChars) return mandatory;
  return `${mandatory.slice(0, Math.max(0, maxChars - 32)).trimEnd()}\n[recovery capsule truncated]`;
}
