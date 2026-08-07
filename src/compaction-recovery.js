import { isSayItStraightEnabled, renderSayItStraightLoopOverlay } from "./loop-output-style.js";

const COMPLETION_AUTHORITY = "Only the deterministic Superloopy gate authorizes completion.";
const MAX_RECOVERY_LIST_ITEMS = 6;

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
  const budget = normalizeMaxChars(maxChars);
  const outputStyle = projection.sayItStraight
    ? renderSayItStraightLoopOverlay(true)
    : "Say It Straight output: disabled for this loop.";
  const aggregateCompletion = `Aggregate complete: ${projection.aggregateComplete ? "yes" : "no"}`;
  const nextAction = `Next action: ${projection.nextAction ?? "inspect repository binding"}`;
  const mandatoryCore = [
    outputStyle,
    "",
    aggregateCompletion,
    nextAction,
    "",
    COMPLETION_AUTHORITY
  ].join("\n");
  if (mandatoryCore.length > budget) {
    return renderSmallBudgetCore({ outputStyle, aggregateCompletion, nextAction, budget });
  }

  const details = [
    "Superloopy compaction recovery",
    "",
    "Durable Superloopy state overrides transcript summaries and completion claims.",
    `Repository: ${projection.binding} (${projection.rootLabel})`,
    `Session: ${projection.sessionId ?? "default"} · mode: ${projection.mode}`,
    projection.activeGoal === null ? "Active goal: none" : `Active goal: ${projection.activeGoal.id} ${projection.activeGoal.title}`,
    `Unresolved criteria: ${summarizeRecoveryIds(projection.unresolved)}`,
    `Outstanding handoffs: ${summarizeRecoveryIds(projection.outstanding)}`
  ];
  return prependDetails(details, mandatoryCore, budget);
}

function summarizeRecoveryIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return "none";
  const visible = ids.slice(0, MAX_RECOVERY_LIST_ITEMS).join(", ");
  if (ids.length <= MAX_RECOVERY_LIST_ITEMS) return visible;
  return `${ids.length} (${visible}, … +${ids.length - MAX_RECOVERY_LIST_ITEMS} more)`;
}

function normalizeMaxChars(maxChars) {
  const numericMaxChars = Number(maxChars);
  if (!Number.isFinite(numericMaxChars) || numericMaxChars <= 0) return 0;
  return Math.floor(numericMaxChars);
}

function renderSmallBudgetCore({ outputStyle, aggregateCompletion, nextAction, budget }) {
  const chunks = [COMPLETION_AUTHORITY, aggregateCompletion, nextAction, outputStyle];
  const retained = [];
  for (const chunk of chunks) {
    const candidate = [...retained, chunk].join("\n");
    if (candidate.length <= budget) retained.push(chunk);
  }
  return retained.join("\n");
}

function prependDetails(details, mandatoryCore, budget) {
  const retained = [];
  for (const detail of details) {
    const candidate = [...retained, detail].join("\n");
    if (`${candidate}\n\n${mandatoryCore}`.length > budget) break;
    retained.push(detail);
  }
  return retained.length === 0 ? mandatoryCore : `${retained.join("\n")}\n\n${mandatoryCore}`;
}
