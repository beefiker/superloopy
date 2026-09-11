// `say-it-straight on/off` (and its Korean forms) typed as a prompt: flips the current loop's output
// style under the plan lock and answers with additionalContext. Extracted from hooks.js, which sat at
// the 550-line reviewability cap; the wrapper that folds in the calque nudge lives there.
import { formatMeasuredAdditionalContext } from "./context-cost.js";
import { statusLoop } from "./loop.js";
import { isSayItStraightEnabled, renderSayItStraightLoopOverlay } from "./loop-output-style.js";
import { inspectRepositoryBinding } from "./repository-binding.js";
import { goalsPath, readPlan, scopeFromSessionId, withFileLock } from "./store.js";

export function isMissingPlanError(error) {
  return error instanceof Error && error.message.startsWith("No Superloopy plan found.");
}

export async function runOutputStyleControlHook(payload, control, updateOutputStyle) {
  let status;
  try {
    status = await statusForOutputStyleControl(payload);
  } catch (error) {
    if (isMissingPlanError(error)) return formatOutputStyleContext("No active Superloopy loop; no output style changed.");
    return formatOutputStyleContext("Superloopy could not change the output style; the prior loop setting remains authoritative.");
  }
  if (status.binding?.resumable === false) {
    return formatOutputStyleContext(`Superloopy repository binding is ${status.binding.status}; no output style changed.`);
  }
  if (status.plan.aggregateCompletion?.status === "complete") {
    return formatOutputStyleContext("The current Superloopy loop is already complete; no output style changed.");
  }
  try {
    const scope = scopeFromSessionId(status.plan.sessionId);
    const mutation = await withFileLock(goalsPath(payload.cwd, scope), async () => {
      const plan = await readPlan(payload.cwd, scope);
      const binding = await inspectRepositoryBinding(payload.cwd, plan);
      if (binding.resumable === false) return { binding };
      if (plan.aggregateCompletion?.status === "complete") return { complete: true };
      return { result: await updateOutputStyle(payload.cwd, scope, control.enabled) };
    });
    if (mutation.binding !== undefined) {
      return formatOutputStyleContext(`Superloopy repository binding is ${mutation.binding.status}; no output style changed.`);
    }
    if (mutation.complete) {
      return formatOutputStyleContext("The current Superloopy loop is already complete; no output style changed.");
    }
    const enabled = isSayItStraightEnabled(mutation.result.plan);
    return formatOutputStyleContext([
      `Say It Straight output is ${enabled ? "enabled" : "disabled"} for the current loop only.`,
      renderSayItStraightLoopOverlay(enabled)
    ].filter(Boolean).join("\n\n"));
  } catch (error) {
    const failure = error?.outputStyleFailure;
    if (failure?.priorRestored === false && typeof failure.effectiveEnabled === "boolean") {
      const effective = failure.effectiveEnabled ? "enabled" : "disabled";
      return formatOutputStyleContext(`Superloopy could not record or roll back the output-style change; the actual persisted current-loop output style is ${effective}.`);
    }
    if (failure?.priorRestored === false) return formatOutputStyleContext("Superloopy could not record or roll back the output-style change; the actual persisted current-loop output style could not be verified. Inspect the current loop before continuing.");
    return formatOutputStyleContext("Superloopy could not change the output style; the prior loop setting remains authoritative.");
  }
}

function formatOutputStyleContext(message) {
  return formatMeasuredAdditionalContext("UserPromptSubmit", message);
}

async function statusForOutputStyleControl(payload) {
  const scope = scopeFromSessionId(payload.session_id);
  if (scope !== undefined) {
    try {
      return await statusLoop(payload.cwd, ["--session-id", scope.sessionId]);
    } catch (error) {
      if (!isMissingPlanError(error)) throw error;
    }
  }
  return await statusLoop(payload.cwd);
}
