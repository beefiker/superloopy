import {
  appendLedger,
  goalsPath,
  nowIso,
  readPlan,
  withFileLock,
  writePlan
} from "./store.js";

const CONTROL_PATTERN = /^(?:say-it-straight\s+(off|on)|(직설\s+모드\s+(끄기|켜기)))[.!?。！？]?$/iu;

export function defaultLoopOutputStyle() {
  return { sayItStraight: true };
}

export function isSayItStraightEnabled(plan) {
  return plan?.outputStyle?.sayItStraight !== false;
}

export function parseLoopOutputStyleControl(prompt) {
  if (typeof prompt !== "string") return null;
  const command = prompt.trim();
  const match = CONTROL_PATTERN.exec(command);
  if (!match) return null;
  return {
    enabled: String(match[1] ?? match[3]).toLowerCase() === "on" || match[3] === "켜기",
    command
  };
}

export function renderSayItStraightLoopOverlay(enabled) {
  if (!enabled) return "";
  return [
    "Say It Straight loop output overlay",
    "",
    "Apply this wording style only to user-facing progress reports and final answers.",
    "Lead with the result, progress, blocker, or next required action.",
    "Include only context needed to use the update correctly.",
    "Keep required caveats, commands, evidence, validation, and completion requirements intact.",
    "Do not silently rewrite task artifacts, code, documentation, comments, evidence, quotations, or user source text.",
    "When ADHD-friendly output also applies, it owns structure and this overlay improves wording inside that structure.",
    "Stop when the update or final answer is complete."
  ].join("\n");
}

export async function updateSayItStraightOutput(cwd, scope, enabled) {
  if (typeof enabled !== "boolean") throw new Error("say-it-straight state must be boolean.");
  return withFileLock(goalsPath(cwd, scope), async () => {
    const plan = await readPlan(cwd, scope);
    if (plan.aggregateCompletion?.status === "complete") {
      throw new Error("The current Superloopy loop is already complete.");
    }
    const now = nowIso();
    plan.outputStyle = { ...(plan.outputStyle ?? {}), sayItStraight: enabled };
    plan.updatedAt = now;
    await writePlan(cwd, plan, scope);
    await appendLedger(cwd, { at: now, kind: "output_style_changed", sayItStraight: enabled }, scope);
    return { enabled, plan };
  });
}
