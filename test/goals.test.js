import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveGoals,
  findCriterion,
  findGoal,
  makeGoal,
  nextGoalIndex,
  requireAllPlanCriteriaPass
} from "../src/goals.js";

test("deriveGoals splits column-zero @goal blocks without creating a preamble goal", () => {
  const goals = deriveGoals("Context only\n@goal Build\nDo it\n@goal Verify\nCheck it");

  assert.deepEqual(goals, [
    { title: "Build", objective: "Do it" },
    { title: "Verify", objective: "Check it" }
  ]);
});

test("makeGoal seeds strict criteria and lookup helpers report exact missing ids", () => {
  const goal = makeGoal({ title: "Ship", objective: "Ship the loop" }, 1, "strict", "2026-06-23T00:00:00.000Z");
  const plan = { goals: [goal] };

  assert.equal(goal.id, "G002");
  assert.deepEqual(goal.criteria.map((criterion) => criterion.id), ["C001", "C002", "C003"]);
  assert.equal(findGoal(plan, "G002").title, "Ship");
  assert.equal(findCriterion(goal, "C003").kind, "regression");
  assert.throws(() => findGoal(plan, "G999"), /Unknown goal: G999/);
  assert.throws(() => findCriterion(goal, "C999"), /Unknown criterion: C999/);
});

test("nextGoalIndex and completion guard summarize plan-wide criteria", () => {
  const plan = {
    goals: [
      {
        id: "G001",
        criteria: [
          { id: "C001", status: "pass" },
          { id: "C002", status: "pending" }
        ]
      },
      {
        id: "G007",
        criteria: [{ id: "C001", status: "fail" }]
      }
    ]
  };

  assert.equal(nextGoalIndex(plan), 7);
  assert.throws(
    () => requireAllPlanCriteriaPass(plan),
    /Final completion has unresolved criteria: G001\/C002, G007\/C001/
  );
});
