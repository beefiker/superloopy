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

export async function updateSayItStraightOutput(cwd, scope, enabled, options = {}) {
  if (typeof enabled !== "boolean") throw new Error("say-it-straight state must be boolean.");
  return withFileLock(goalsPath(cwd, scope), async () => {
    const priorPlan = await readPlan(cwd, scope);
    if (priorPlan.aggregateCompletion?.status === "complete") {
      throw new Error("The current Superloopy loop is already complete.");
    }
    const persistPlan = options.writePlan ?? writePlan;
    const recordChange = options.appendLedger ?? appendLedger;
    const now = nowIso();
    const plan = {
      ...priorPlan,
      outputStyle: { ...(priorPlan.outputStyle ?? {}), sayItStraight: enabled },
      updatedAt: now
    };
    await persistPlan(cwd, plan, scope);
    try {
      await recordChange(cwd, { at: now, kind: "output_style_changed", sayItStraight: enabled }, scope);
    } catch (ledgerError) {
      try {
        await persistPlan(cwd, priorPlan, scope);
      } catch (rollbackError) {
        let effectiveEnabled = null;
        try {
          effectiveEnabled = isSayItStraightEnabled(await readPlan(cwd, scope));
        } catch {
          // The hook will instruct the user to inspect state instead of guessing.
        }
        throw outputStyleUpdateFailure(
          "The output-style ledger write and plan rollback both failed.",
          { priorRestored: false, effectiveEnabled },
          new AggregateError([ledgerError, rollbackError], "Output-style transaction failed.")
        );
      }
      throw outputStyleUpdateFailure(
        "The output-style ledger write failed; the prior plan was restored.",
        { priorRestored: true, effectiveEnabled: isSayItStraightEnabled(priorPlan) },
        ledgerError
      );
    }
    return { enabled, plan };
  });
}

function outputStyleUpdateFailure(message, outputStyleFailure, cause) {
  const error = new Error(message, { cause });
  error.outputStyleFailure = outputStyleFailure;
  return error;
}
