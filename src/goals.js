import { resolveEvidenceArtifact } from "./artifacts.js";

export function deriveGoals(brief) {
  const delimitedGoals = parseGoalDelimitedBrief(brief);
  if (delimitedGoals !== null) return delimitedGoals;
  const bullets = brief
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*+]\s+/.test(line))
    .map((line) => line.replace(/^[-*+]\s+/, "").trim())
    .filter(Boolean);
  const selected = bullets.length > 0 ? bullets : [brief.replace(/\s+/g, " ").trim()];
  return selected.map((objective) => ({
    title: truncateTitle(objective),
    objective
  }));
}

export function makeGoal(goal, index, mode, now) {
  const goalNumber = String(index + 1).padStart(3, "0");
  return {
    id: `G${goalNumber}`,
    title: goal.title,
    objective: goal.objective,
    status: "pending",
    attempt: 0,
    createdAt: now,
    updatedAt: now,
    criteria: seedCriteria(mode)
  };
}

export function nextGoalIndex(plan) {
  return plan.goals.reduce((max, goal) => {
    const match = /^G(\d+)$/u.exec(goal.id);
    if (!match) return max;
    return Math.max(max, Number.parseInt(match[1], 10));
  }, 0);
}

export function findGoal(plan, goalId) {
  const goal = plan.goals.find((candidate) => candidate.id === goalId);
  if (!goal) throw new Error(`Unknown goal: ${goalId}`);
  return goal;
}

export function findCriterion(goal, criterionId) {
  const criterion = goal.criteria.find((candidate) => candidate.id === criterionId);
  if (!criterion) throw new Error(`Unknown criterion: ${criterionId}`);
  return criterion;
}

export function requireEssentialCriteriaPass(goal) {
  const unresolved = goal.criteria.filter((criterion) => criterion.essential && criterion.status !== "pass");
  if (unresolved.length > 0) {
    throw new Error(`Goal ${goal.id} has unresolved essential criteria: ${unresolved.map((item) => item.id).join(", ")}`);
  }
}

export function requireAllPlanCriteriaPass(plan) {
  const unresolved = plan.goals.flatMap((goal) =>
    goal.criteria
      .filter((criterion) => criterion.status !== "pass")
      .map((criterion) => `${goal.id}/${criterion.id}`)
  );
  if (unresolved.length > 0) {
    throw new Error(`Final completion has unresolved criteria: ${unresolved.join(", ")}`);
  }
}

export function isFinalGoal(plan, goal) {
  return plan.goals.every((candidate) => candidate.id === goal.id || candidate.status === "complete");
}

export function collectEvidenceArtifacts(cwd, plan, scope) {
  const artifacts = plan.goals.flatMap((goal) => goal.criteria.map((criterion) => criterion.artifact));
  const missing = artifacts.filter((artifact) => typeof artifact !== "string" || artifact.length === 0);
  if (missing.length > 0) throw new Error("Passed criteria must have evidence artifacts.");
  return [...new Set(artifacts.map((artifact) => resolveEvidenceArtifact(cwd, artifact, scope).relativePath))];
}

function parseGoalDelimitedBrief(brief) {
  const lines = brief.split(/\r?\n/);
  const blocks = [];
  let current = null;
  let sawDelimiter = false;
  for (const line of lines) {
    const delimiter = /^@goal(?:(?::[ \t]*)|[ \t]+|$)(.*)$/u.exec(line);
    if (delimiter) {
      sawDelimiter = true;
      if (current !== null) blocks.push(materializeGoalBlock(current));
      current = { title: delimiter[1]?.trim() ?? "", body: [] };
    } else if (current !== null) {
      current.body.push(line);
    }
  }
  if (!sawDelimiter) return null;
  if (current !== null) blocks.push(materializeGoalBlock(current));
  if (blocks.length === 0) throw new Error("Empty @goal block.");
  return blocks;
}

function materializeGoalBlock(block) {
  const objective = trimBlankLines(block.body).join("\n").trim();
  const title = block.title || firstContentLine(objective);
  if (!title && !objective) throw new Error("Empty @goal block.");
  return {
    title: truncateTitle(title),
    objective: objective || title
  };
}

function trimBlankLines(lines) {
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start].trim() === "") start += 1;
  while (end > start && lines[end - 1].trim() === "") end -= 1;
  return lines.slice(start, end);
}

function firstContentLine(value) {
  return value.split(/\r?\n/).find((line) => line.trim().length > 0)?.trim() ?? "";
}

function seedCriteria(mode) {
  const base = [
    criterion("C001", "happy", "Happy path works from the real user-facing surface.", true),
    criterion("C002", "risk", "Riskiest edge or failure path is handled.", true)
  ];
  if (mode === "light") return base;
  return [...base, criterion("C003", "regression", "Adjacent existing behavior still works.", true)];
}

function criterion(id, kind, scenario, essential) {
  return {
    id,
    kind,
    scenario,
    essential,
    status: "pending",
    artifact: null,
    capturedAt: null
  };
}

function truncateTitle(value) {
  return value.length > 72 ? `${value.slice(0, 69).trimEnd()}...` : value;
}
