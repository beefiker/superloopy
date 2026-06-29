import { existsSync, readFileSync } from "node:fs";
import { goalsPath, scopeFromSessionId } from "./store.js";

const CREATE_GOAL_PAYLOAD_WARNING =
  "Use create_goal with objective only. Omit token_budget so the goal stays unlimited; use update_goal only after Loopy aggregate completion is recorded.";
const UPDATE_GOAL_COMPLETE_WARNING =
  "Loopy plan is not complete. Do not call update_goal with status=complete until Loopy aggregate completion is recorded. Run `loopy loop check --json` and `loopy loop finish --evidence \"<summary>\" --json` first.";
const UPDATE_GOAL_UNREADABLE_WARNING =
  "Loopy plan exists but could not be read. Refusing update_goal completion until `loopy loop status --json` can verify aggregate completion.";

export function runPreToolUseHook(payload) {
  if (!isRecord(payload)) return "";
  if (payload.hook_event_name !== "PreToolUse") return "";
  if (payload.tool_name === "create_goal" && hasInvalidCreateGoalInput(payload.tool_input)) {
    return denyPreToolUse(CREATE_GOAL_PAYLOAD_WARNING);
  }
  if (payload.tool_name === "update_goal" && wantsGoalComplete(payload.tool_input)) {
    const reason = prematureUpdateGoalReason(payload);
    if (reason !== null) return denyPreToolUse(reason);
  }
  return "";
}

function hasInvalidCreateGoalInput(value) {
  return isRecord(value) && Object.keys(value).some((key) => key !== "objective");
}

function wantsGoalComplete(value) {
  return isRecord(value) && String(value.status ?? "").trim().toLowerCase() === "complete";
}

function prematureUpdateGoalReason(payload) {
  if (typeof payload.cwd !== "string") return null;
  const planPath = activePlanPath(payload.cwd, payload.session_id);
  if (planPath === null) return null;
  try {
    const plan = JSON.parse(readFileSync(planPath, "utf8"));
    return plan?.aggregateCompletion?.status === "complete" ? null : UPDATE_GOAL_COMPLETE_WARNING;
  } catch {
    return UPDATE_GOAL_UNREADABLE_WARNING;
  }
}

function activePlanPath(cwd, sessionId) {
  const scoped = scopeFromSessionId(sessionId);
  if (scoped !== undefined) {
    const path = goalsPath(cwd, scoped);
    if (existsSync(path)) return path;
  }
  const global = goalsPath(cwd);
  return existsSync(global) ? global : null;
}

function denyPreToolUse(message) {
  return `${JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: message,
      additionalContext: message
    }
  })}\n`;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
