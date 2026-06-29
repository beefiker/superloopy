import { readFlag } from "./args.js";
import { checkpointLoop, reviewLoop } from "./loop.js";
import { reportLoop } from "./report.js";
import { evidenceRelativeDir, scopeFromSessionId } from "./store.js";

const DEFAULT_EVIDENCE = "criteria passed";
const DEFAULT_NOTES = "criteria reviewed";
const DEFAULT_GATE_NAME = "gate.json";

export async function finishLoop(cwd, argv = []) {
  const scope = readScope(argv);
  const artifact = readFlag(argv, "--artifact") ?? `${evidenceRelativeDir(scope)}/${DEFAULT_GATE_NAME}`;
  const evidence = readFlag(argv, "--evidence")?.trim() || DEFAULT_EVIDENCE;
  const notes = readFlag(argv, "--notes")?.trim() || DEFAULT_NOTES;
  const scopedArgs = scope?.sessionId ? ["--session-id", scope.sessionId] : [];
  const review = await reviewLoop(cwd, [
    "--status",
    "passed",
    "--artifact",
    artifact,
    "--notes",
    notes,
    ...scopedArgs
  ]);
  let checkpoint = null;
  for (const goal of review.plan.goals) {
    if (goal.status === "complete") continue;
    checkpoint = await checkpointLoop(cwd, [
      "--goal-id",
      goal.id,
      "--status",
      "complete",
      "--evidence",
      evidence,
      "--quality-gate",
      review.artifact.relativePath,
      ...scopedArgs
    ]);
  }
  if (checkpoint === null) {
    checkpoint = await checkpointLoop(cwd, [
      "--goal-id",
      review.plan.goals.at(-1).id,
      "--status",
      "complete",
      "--evidence",
      evidence,
      "--quality-gate",
      review.artifact.relativePath,
      ...scopedArgs
    ]);
  }
  const report = await reportLoop(cwd, scopedArgs);
  return {
    ok: true,
    kind: "finished",
    review,
    report,
    goal: checkpoint.goal,
    plan: checkpoint.plan,
    summary: checkpoint.summary,
    guide: checkpoint.guide
  };
}

function readScope(argv) {
  return scopeFromSessionId(readFlag(argv, "--session-id"));
}
