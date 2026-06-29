import { readFlag } from "./args.js";
import { captureLoop } from "./capture.js";
import { buildGuide } from "./guide.js";
import { readPlan, scopeFromSessionId } from "./store.js";

export async function proveLoop(cwd, argv = []) {
  const { options, command } = splitProveArgv(argv);
  const scope = readScope(options);
  const plan = await readPlan(cwd, scope);
  const goal = plan.goals.find((candidate) => candidate.status === "in_progress");
  if (goal === undefined) throw new Error("No active Loopy goal. Run `loopy loop next --json` first.");
  const criterion = goal.criteria.find((candidate) => candidate.status !== "pass");
  if (criterion === undefined) throw new Error(`Active goal ${goal.id} has no unresolved criteria.`);

  const captureArgs = [
    "--goal-id",
    goal.id,
    "--criterion-id",
    criterion.id
  ];
  const artifact = readFlag(options, "--artifact");
  const notes = readFlag(options, "--notes");
  if (artifact !== undefined) captureArgs.push("--artifact", artifact);
  if (notes !== undefined) captureArgs.push("--notes", notes);
  if (scope?.sessionId) captureArgs.push("--session-id", scope.sessionId);
  const result = await captureLoop(cwd, [...captureArgs, "--", ...command]);
  return {
    ...result,
    guide: buildGuide(result.plan, { cwd, scope })
  };
}

function splitProveArgv(argv) {
  const delimiter = argv.indexOf("--");
  if (delimiter === -1 || delimiter === argv.length - 1) {
    throw new Error("Missing prove command. Use `-- COMMAND [ARGS...]`.");
  }
  return {
    options: argv.slice(0, delimiter),
    command: argv.slice(delimiter + 1)
  };
}

function readScope(argv) {
  return scopeFromSessionId(readFlag(argv, "--session-id"));
}
