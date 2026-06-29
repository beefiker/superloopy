import { buildGuide } from "./guide.js";
import { createLoop, nextLoop } from "./loop.js";
import { summarizePlan } from "./plan-summary.js";

export async function beginLoop(cwd, argv) {
  const created = await createLoop(cwd, argv);
  const next = await nextLoop(cwd, argv);
  const summary = summarizePlan(next.plan);
  return {
    ok: true,
    kind: "begun",
    created,
    goal: next.goal,
    plan: next.plan,
    summary,
    guide: buildGuide(next.plan, { cwd })
  };
}
