// PreToolUse hook: Codex plan discipline plus the Claude crew write-scope guard.
//
// On Codex it matches only the native planning tools `create_goal`/`update_goal`: it rejects a
// `create_goal` that carries anything beyond `objective`, and an `update_goal status=complete`
// issued before Superloopy has recorded aggregate completion. On Claude Code it matches the file
// write tools and keeps the non-implementing crew lanes inside the evidence root (see
// crew-write-guard.js). It is not a dangerous-command blocker: it never inspects shell or network
// tools. The real completion authority is the evidence gate (see audit-gate-verify.js). See
// docs/superloopy-host-contract.md.
import { existsSync, readFileSync } from "node:fs";
import { crewWriteDenial } from "./crew-write-guard.js";
import { goalsPath, scopeFromSessionId } from "./store.js";
import { appendContextCost } from "./context-cost.js";
import { resolveWorkspaceRoot } from "./workspace-identity.js";

const CREATE_GOAL_PAYLOAD_WARNING =
  "Use create_goal with objective only. Omit token_budget so the goal stays unlimited; use update_goal only after Superloopy aggregate completion is recorded.";
const UPDATE_GOAL_COMPLETE_WARNING =
  "Superloopy plan is not complete. Do not call update_goal with status=complete until Superloopy aggregate completion is recorded. Run `superloopy loop check --json` and `superloopy loop finish --evidence \"<summary>\" --json` first.";
const UPDATE_GOAL_UNREADABLE_WARNING =
  "Superloopy plan exists but could not be read. Refusing update_goal completion until `superloopy loop status --json` can verify aggregate completion.";

export function runPreToolUseHook(payload, context = { host: "codex" }) {
  if (!isRecord(payload)) return "";
  if (payload.hook_event_name !== "PreToolUse") return "";
  const crewDenial = crewWriteDenial(payload, context.host);
  if (crewDenial !== null) return denyPreToolUse(crewDenial);
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
  const planPath = activePlanPath(resolveWorkspaceRoot(payload.cwd), payload.session_id);
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
      additionalContext: appendContextCost(message)
    }
  })}\n`;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
