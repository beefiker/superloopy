import { existsSync, readFileSync } from "node:fs";
import { bootstrapHasUserSignal, bootstrapSuperloopy, formatBootstrapHookContext, isClaudeHost } from "./agents.js";
import { runAutoUpdateCheck } from "./auto-update.js";
import { parseJson } from "./args.js";
import { resolveEvidenceArtifact } from "./artifacts.js";
import { buildGuide, flowStepLine, proofPlanLine, recordedEvidenceLine } from "./guide.js";
import { CONTEXT_PRESSURE_MARKERS, decideContinuation, transcriptTailHasMarker } from "./continuation.js";
import { normalizeAgentType, receiptFromPayload, subagentTranscriptPath } from "./receipt.js";
import { hasEngineerTrigger, hasFrontendTrigger, hasKoreanWritingTrigger, renderFrontendTriggerContext, renderKoreanWritingTriggerContext, runEngineerTriggerHook } from "./engineer.js";
import { applySteering, statusLoop } from "./loop.js";
import { appendLedger, evidenceRelativeDir, goalsPath, scopeFromSessionId } from "./store.js";
import { MAX_SUBAGENT_ATTEMPTS, clearAttemptState, nextAttemptState, recordSubagentLedger } from "./subagent-attempts.js";

export { runPreToolUseHook } from "./pre-tool-use.js";

const EVIDENCE_RECEIPT_AGENT_TYPES = new Set(["franky", "zoro", "usopp", "jinbe"]);
// An artifact up to this size must carry non-whitespace content to satisfy the receipt gate;
// only larger artifacts (assumed non-trivial) skip the read. Closes the blank-placeholder hole.
const MAX_BLANK_CHECK_BYTES = 1_000_000;
const LOOSE_TRIGGER_PATTERN = /(^|[^A-Za-z0-9_-])(\$?(?:loopywork|lpy))(?=$|[^A-Za-z0-9_-])/iu;
const LOOSE_TRIGGER_GLOBAL_PATTERN = /(^|[^A-Za-z0-9_-])(\$?(?:loopywork|lpy))(?=$|[^A-Za-z0-9_-])/giu;
const PROTECTED_STEERING_KEYS = new Set([
  "aggregateCompletion",
  "qualityGate",
  "status",
  "completedAt",
  "completionStatus"
]);

export function runSubagentStopHook(payload) {
  if (!isRecord(payload)) return "";
  if (payload.hook_event_name !== "SubagentStop") return "";
  if (!EVIDENCE_RECEIPT_AGENT_TYPES.has(normalizeAgentType(payload.agent_type))) return "";
  // Read the SAME transcript the receipt recovery reads, so a context-pressure marker in a
  // different transcript (e.g. the parent session on Claude) can't skip the receipt gate.
  if (transcriptHasContextPressureMarker(subagentTranscriptPath(payload))) return "";
  const receipt = receiptFromPayload(payload);
  if (receipt !== null) {
    try {
      resolveEvidenceReceipt(payload, receipt);
      clearAttemptState(payload);
      return "";
    } catch {
      // Fall through to the blocking directive.
    }
  }
  const attemptState = nextAttemptState(payload);
  if (attemptState.limitReached) {
    // Free pass after the cap: the worker is allowed to stop without a valid receipt. Leave
    // a durable ledger signal so this is observable instead of a silent vanish. It does NOT
    // confer a criterion pass — completion still requires a real artifact + the floor.
    recordSubagentLedger(payload, "subagent_attempt_exhausted", attemptState.attempts);
    clearAttemptState(payload);
    return "";
  }
  const evidenceRoot = evidenceRootForReceipt(payload);
  return `${JSON.stringify({
    decision: "block",
    reason: [
      "Superloopy evidence receipt missing or invalid.",
      `Attempt ${attemptState.attempts} of ${MAX_SUBAGENT_ATTEMPTS}.`,
      `Run the relevant validation, write a non-empty artifact under the active evidence root: \`${evidenceRoot}\`.`,
      "End with:",
      "SUPERLOOPY_EVIDENCE: <path-under-active-evidence-root>",
      "EVIDENCE_RECORDED: <path-under-active-evidence-root> is accepted for compatibility."
    ].join("\n")
  })}\n`;
}

export async function runUserPromptSubmitHook(payload) {
  if (!isRecord(payload)) return "";
  if (payload.hook_event_name !== "UserPromptSubmit") return "";
  if (typeof payload.prompt !== "string" || typeof payload.cwd !== "string") return "";
  if (hasContextPressureMarker(payload.prompt) || transcriptHasContextPressureMarker(payload.transcript_path)) return "";
  const directive = parseSteeringDirective(payload.prompt);
  if (directive === null) {
    if (hasSteeringMarker(payload.prompt)) return "";
    if (hasEngineerTrigger(payload.prompt)) return await runEngineerTriggerHook(payload, { statusForPayload, guideForPayload, renderSuperloopyContext, formatAdditionalContext });
    if (hasLoosePromptTrigger(payload.prompt)) return await runLoosePromptTriggerHook(payload);
    // Auto-steer UI/visual prompts to the frontend skill even without a `loopy` keyword. Guidance
    // only (no state mutation), so it fires regardless of SUPERLOOPY_AUTO_CONTEXT. Default-on;
    // set SUPERLOOPY_FRONTEND_STEER=off to silence it without uninstalling.
    if (!envOff(process.env, "SUPERLOOPY_FRONTEND_STEER") && hasFrontendTrigger(payload.prompt)) {
      return formatAdditionalContext("UserPromptSubmit", renderFrontendTriggerContext());
    }
    // Auto-steer Korean prose generation toward a light post-generation humanize-korean pass.
    // Kept after frontend so UI/page requests get the stronger visual-work steer.
    if (hasKoreanWritingTrigger(payload.prompt)) return formatAdditionalContext("UserPromptSubmit", renderKoreanWritingTriggerContext());
    if (!envOn(process.env, "SUPERLOOPY_AUTO_CONTEXT")) return "";
    return await runContextInjectionHook(payload, "UserPromptSubmit");
  }
  try {
    const result = await applySteeringForPayload(payload, directive);
    const status = await statusForPayload(payload);
    return `${JSON.stringify({
      ...result,
      plan: status.plan,
      summary: status.summary,
      guide: guideForPayload(payload, status.plan)
    })}\n`;
  } catch {
    return "";
  }
}

export async function runSessionStartHook(payload) {
  if (!isRecord(payload)) return "";
  if (payload.hook_event_name !== "SessionStart") return "";
  if (typeof payload.cwd !== "string") return "";
  if (transcriptHasContextPressureMarker(payload.transcript_path)) return "";
  const contexts = [];
  try {
    // Auto-update is the Codex install-flow concern; on Claude Code updates are managed by
    // `/plugin`, so skip it there (like the bootstrap no-op) to avoid emitting Codex upgrade notices.
    if (!isClaudeHost()) {
      const update = await runAutoUpdateCheck({ env: process.env });
      if (update.notices.length > 0) contexts.push(update.notices.join("\n\n"));
    }
  } catch {
    // Update checks must never break the bootstrap/session context hook.
  }
  try {
    const bootstrap = await bootstrapSuperloopy(payload.cwd);
    if (bootstrapHasUserSignal(bootstrap)) {
      contexts.push(formatBootstrapHookContext(bootstrap));
    }
  } catch (error) {
    contexts.push([
      "Superloopy bootstrap",
      "",
      `- setup failed: ${error instanceof Error ? error.message : String(error)}`,
      "- Run `superloopy install --json` or `node <plugin-root>/src/cli.js install --json` to retry."
    ].join("\n"));
  }
  if (envOn(process.env, "SUPERLOOPY_AUTO_CONTEXT")) {
    const superloopyContext = await readContextInjection(payload);
    if (superloopyContext.length > 0) contexts.push(superloopyContext);
  }
  return formatAdditionalContext("SessionStart", contexts.join("\n\n"));
}

export async function runStopHook(payload) {
  if (!isRecord(payload)) return "";
  if (payload.hook_event_name !== "Stop" && payload.hook_event_name !== "SubagentStop") return "";
  if (typeof payload.cwd !== "string") return "";
  if (!envOn(process.env, "SUPERLOOPY_STOP_HOOK")) return "";
  return await decideContinuation(payload, {
    statusForPayload,
    guideForPayload,
    renderContinuationDirective,
    scopeFromPayload,
    appendLedger,
    contextPressureMarkers: CONTEXT_PRESSURE_MARKERS,
    env: process.env
  });
}

export function parseSteeringDirective(prompt) {
  const match = /(?:^|\s)SUPERLOOPY_STEER:\s*(\{[\s\S]*\})\s*$/u.exec(prompt);
  if (!match) return null;
  const parsed = parseJson(match[1]);
  if (!isRecord(parsed)) return null;
  if (hasProtectedSteeringPayload(parsed) || weakensVerification(parsed)) return null;
  if (parsed.kind === "annotate") {
    const evidence = readNonEmptyString(parsed.evidence);
    const rationale = readNonEmptyString(parsed.rationale);
    if (evidence === null || rationale === null) return null;
    return { kind: "annotate", evidence, rationale };
  }
  if (parsed.kind === "add_goal") {
    const title = readNonEmptyString(parsed.title);
    const objective = readNonEmptyString(parsed.objective);
    const rationale = readNonEmptyString(parsed.rationale);
    if (title === null || objective === null || rationale === null) return null;
    return { kind: "add_goal", title, objective, rationale };
  }
  if (parsed.kind === "revise_criterion") {
    const goalId = readNonEmptyString(parsed.goalId);
    const criterionId = readNonEmptyString(parsed.criterionId);
    const scenario = readNonEmptyString(parsed.scenario);
    const rationale = readNonEmptyString(parsed.rationale);
    if (goalId === null || criterionId === null || scenario === null || rationale === null) return null;
    return { kind: "revise_criterion", goalId, criterionId, scenario, rationale };
  }
  if (parsed.kind === "reorder_pending") {
    if (!Array.isArray(parsed.goalIds)) return null;
    const goalIds = parsed.goalIds.map((goalId) => readNonEmptyString(goalId));
    const rationale = readNonEmptyString(parsed.rationale);
    if (goalIds.length === 0 || goalIds.some((goalId) => goalId === null) || rationale === null) return null;
    if (new Set(goalIds).size !== goalIds.length) return null;
    return { kind: "reorder_pending", goalIds, rationale };
  }
  return null;
}

export function hasLoosePromptTrigger(prompt) {
  if (typeof prompt !== "string") return false;
  return LOOSE_TRIGGER_PATTERN.test(prompt);
}

function hasSteeringMarker(prompt) {
  return /(?:^|\s)SUPERLOOPY_STEER:/u.test(prompt);
}

function hasProtectedSteeringPayload(value) {
  if (Array.isArray(value)) return value.some((item) => hasProtectedSteeringPayload(item));
  if (!isRecord(value)) return false;
  return Object.entries(value).some(([key, child]) =>
    PROTECTED_STEERING_KEYS.has(key) || key.toLowerCase().includes("complete") || hasProtectedSteeringPayload(child)
  );
}

function weakensVerification(value) {
  const text = flattenText(value).toLowerCase();
  return /\b(skip|bypass|weaken|remove|omit|auto[-\s]?complete|mark complete|complete faster)\b/u.test(text)
    && /\b(test|tests|verification|review|quality gate|complete|completion)\b/u.test(text);
}

function flattenText(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map((item) => flattenText(item)).join("\n");
  if (isRecord(value)) return Object.values(value).map((item) => flattenText(item)).join("\n");
  return "";
}

function readNonEmptyString(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}


async function runContextInjectionHook(payload, hookEventName) {
  const context = await readContextInjection(payload);
  return formatAdditionalContext(hookEventName, context);
}

async function readContextInjection(payload) {
  let status;
  try {
    status = await statusForPayload(payload);
  } catch {
    return "";
  }
  if (status.summary.aggregateComplete) return "";
  const guide = guideForPayload(payload, status.plan);
  return renderSuperloopyContext(status, guide);
}

async function runLoosePromptTriggerHook(payload) {
  try {
    const status = await statusForPayload(payload);
    if (status.summary.aggregateComplete) {
      return formatAdditionalContext("UserPromptSubmit", renderLoosePromptCompleted(status));
    }
    const guide = guideForPayload(payload, status.plan);
    return formatAdditionalContext("UserPromptSubmit", [
      "Loopywork trigger",
      "",
      "Loose prompt trigger detected. Use existing repo-local Superloopy state; do not create a second plan.",
      "",
      renderSuperloopyContext(status, guide)
    ].join("\n"));
  } catch {
    return formatAdditionalContext("UserPromptSubmit", renderLoosePromptStarter(payload));
  }
}

function formatAdditionalContext(hookEventName, additionalContext) {
  const normalized = typeof additionalContext === "string" ? additionalContext.trim() : "";
  if (normalized.length === 0) return "";
  return `${JSON.stringify({ hookSpecificOutput: { hookEventName, additionalContext: normalized } })}\n`;
}

function envOn(env, key) {
  return String(env[key] ?? "off").toLowerCase() === "on";
}

// Default-on gate: true only when the key is explicitly set to "off". For steers that
// fire by default (e.g. the frontend visual-work steer) but need an opt-out switch.
function envOff(env, key) {
  return String(env[key] ?? "on").toLowerCase() === "off";
}

function renderLoosePromptStarter(payload) {
  const brief = stripLoosePromptTrigger(payload.prompt);
  const briefArg = brief.length === 0 ? '"<task>"' : shellQuote(brief);
  return [
    "Loopywork trigger",
    "",
    "Loose prompt trigger detected. This trigger is guidance only; it must not mutate Superloopy state by itself.",
    "",
    `- Start unless the user is only asking about Superloopy: \`superloopy loop begin --brief ${briefArg} --mode light --json\``,
    "- Then follow `superloopy loop guide --json` for the exact next command.",
    "- Record proof with `superloopy loop prove -- <validation-command>` or artifact-backed `superloopy loop evidence ...`.",
    "- Completion still requires `superloopy loop check` and `superloopy loop finish --evidence \"<summary>\" --json`."
  ].join("\n");
}

function renderLoosePromptCompleted(status) {
  const session = status.plan.sessionId === undefined ? "" : ` --session-id ${shellQuote(status.plan.sessionId)}`;
  return [
    "Loopywork trigger",
    "",
    "Loose prompt trigger detected, but the current Superloopy aggregate is already complete.",
    "",
    `- Inspect: \`superloopy loop status${session} --json\``,
    "- Start unrelated work with a fresh session id or intentionally replace state with `--force`."
  ].join("\n");
}

function stripLoosePromptTrigger(prompt) {
  return prompt.replace(LOOSE_TRIGGER_GLOBAL_PATTERN, "$1").replace(/[ \t]+/g, " ").replace(/\s+\n/g, "\n").replace(/\n\s+/g, "\n").trim();
}

function shellQuote(value) {
  return `'${value.replace(/'/g, "'\"'\"'")}'`;
}

function renderSuperloopyContext(status, guide) {
  const nextGoal = status.plan.goals.find((goal) => goal.status === "in_progress")
    ?? status.plan.goals.find((goal) => goal.status === "pending")
    ?? null;
  return [
    "Superloopy context",
    "",
    "Repo-local Superloopy state exists. Use it as the durable source of truth for this task.",
    "",
    `- Plan: \`${status.plan.goalsPath ?? ".superloopy/goals.json"}\``,
    `- Ledger: \`${status.plan.ledgerPath ?? ".superloopy/ledger.jsonl"}\``,
    `- Evidence root: \`${status.plan.evidencePath ?? ".superloopy/evidence"}\``,
    `- Goal progress: ${status.summary.goals.complete}/${status.summary.goals.total} complete`,
    `- Criteria progress: ${status.summary.criteria.pass}/${status.summary.criteria.total} pass`,
    nextGoal === null ? "" : `- Current goal: ${nextGoal.id} ${nextGoal.title}`,
    `- Guide: \`${guide.commands.guide}\``,
    `- Next action: \`${guide.nextAction.command}\``,
    guide.proofTarget === null ? "" : `- Proof target: ${guide.proofTarget.ref} ${guide.proofTarget.status} -> \`${guide.proofTarget.artifact}\``,
    guide.captureTemplate === null ? "" : `- Capture template: \`${guide.captureTemplate.command}\``,
    guide.evidenceTemplate === null ? "" : `- Evidence template: \`${guide.evidenceTemplate.command}\``,
    ...renderFlow(guide),
    ...renderProofPlan(guide),
    ...renderRecordedEvidence(guide),
    "",
    "Run `superloopy loop status --json` before claiming progress.",
    `Run \`${guide.commands.guide}\` for the exact next Superloopy command.`,
    `Record criterion evidence only with a non-empty artifact under \`${status.plan.evidencePath ?? ".superloopy/evidence"}\`.`
  ].filter(Boolean).join("\n");
}

function renderContinuationDirective(status, guide) {
  const nextGoal = status.plan.goals.find((goal) => goal.status === "in_progress")
    ?? status.plan.goals.find((goal) => goal.status === "pending")
    ?? null;
  const nextCriterion = nextGoal?.criteria.find((criterion) => criterion.status !== "pass") ?? null;
  return [
    "Superloopy continuation",
    "",
    "You are mid-loop. Do not ask whether to continue; resume from repo-local Superloopy state.",
    "",
    "State:",
    `- Plan: \`${status.plan.goalsPath ?? ".superloopy/goals.json"}\``,
    `- Ledger: \`${status.plan.ledgerPath ?? ".superloopy/ledger.jsonl"}\``,
    `- Evidence root: \`${status.plan.evidencePath ?? ".superloopy/evidence"}\``,
    `- Goal progress: ${status.summary.goals.complete}/${status.summary.goals.total} complete`,
    `- Criteria progress: ${status.summary.criteria.pass}/${status.summary.criteria.total} pass`,
    nextGoal === null ? "" : `- Next goal: ${nextGoal.id} ${nextGoal.title}`,
    nextCriterion === null ? "" : `- Next criterion: ${nextCriterion.id} ${nextCriterion.scenario}`,
    `- Guide: \`${guide.commands.guide}\``,
    `- Next action: \`${guide.nextAction.command}\``,
    guide.proofTarget === null ? "" : `- Proof target: ${guide.proofTarget.ref} ${guide.proofTarget.status} -> \`${guide.proofTarget.artifact}\``,
    guide.captureTemplate === null ? "" : `- Capture template: \`${guide.captureTemplate.command}\``,
    guide.evidenceTemplate === null ? "" : `- Evidence template: \`${guide.evidenceTemplate.command}\``,
    ...renderFlow(guide),
    ...renderProofPlan(guide),
    ...renderRecordedEvidence(guide),
    "",
    "Required next actions:",
    "1. Run `superloopy loop status --json` and inspect current state.",
    `2. Run \`${guide.commands.guide}\` to confirm the exact next command.`,
    `3. Execute next action: \`${guide.nextAction.command}\`.`,
    `4. Produce a real artifact under \`${status.plan.evidencePath ?? ".superloopy/evidence"}\` before recording criterion evidence.`,
    "5. Checkpoint only after required criteria pass."
  ].filter(Boolean).join("\n");
}

function renderProofPlan(guide) {
  if (!Array.isArray(guide.proofPlan) || guide.proofPlan.length === 0) return [];
  return [
    "Proof plan:",
    ...guide.proofPlan.map(proofPlanLine)
  ];
}

function renderFlow(guide) {
  if (!Array.isArray(guide.flow) || guide.flow.length === 0) return [];
  return [
    "Flow checklist:",
    ...guide.flow.map(flowStepLine)
  ];
}

function renderRecordedEvidence(guide) {
  if (!Array.isArray(guide.recordedEvidence) || guide.recordedEvidence.length === 0) return [];
  return [
    "Recorded evidence:",
    ...guide.recordedEvidence.map(recordedEvidenceLine)
  ];
}

function guideForPayload(payload, plan) {
  return buildGuide(plan, { cwd: payload.cwd, scope: scopeFromSessionId(plan.sessionId) });
}

function resolveEvidenceReceipt(payload, receipt) {
  const scope = scopeFromPayload(payload);
  const resolved = scope !== undefined && existsSync(goalsPath(payload.cwd, scope))
    ? resolveEvidenceArtifact(payload.cwd, receipt, scope)
    : resolveEvidenceArtifact(payload.cwd, receipt);
  // Content floor: a tiny artifact must contain non-whitespace, so a blank/whitespace-only
  // placeholder cannot satisfy the gate. resolveEvidenceArtifact already rejects empty files.
  if (resolved.size <= MAX_BLANK_CHECK_BYTES && readFileSync(resolved.absolutePath, "utf8").trim().length === 0) {
    throw new Error("Evidence artifact is blank.");
  }
  return resolved;
}

function evidenceRootForReceipt(payload) {
  const scope = scopeFromPayload(payload);
  if (scope !== undefined && typeof payload.cwd === "string" && existsSync(goalsPath(payload.cwd, scope))) {
    return evidenceRelativeDir(scope);
  }
  return evidenceRelativeDir();
}

async function applySteeringForPayload(payload, directive) {
  const scope = scopeFromPayload(payload);
  if (scope !== undefined) {
    try {
      return await applySteering(payload.cwd, directive, scope);
    } catch (error) {
      if (!isMissingPlanError(error)) throw error;
    }
  }
  return await applySteering(payload.cwd, directive);
}

async function statusForPayload(payload) {
  const args = argsFromPayloadScope(payload);
  if (args.length > 0) {
    try {
      return await statusLoop(payload.cwd, args);
    } catch (error) {
      if (!isMissingPlanError(error)) throw error;
    }
  }
  return await statusLoop(payload.cwd);
}

function isMissingPlanError(error) {
  return error instanceof Error && error.message.startsWith("No Superloopy plan found.");
}

function scopeFromPayload(payload) {
  return scopeFromSessionId(payload.session_id);
}

function argsFromPayloadScope(payload) {
  const scope = scopeFromPayload(payload);
  return scope?.sessionId ? ["--session-id", scope.sessionId] : [];
}

// Scan only the transcript's trailing window: context-pressure markers are
// appended near the current end, so a bounded tail read is equally correct and
// avoids reading a multi-MB transcript that grows with session length.
function transcriptHasContextPressureMarker(transcriptPath) {
  return transcriptTailHasMarker(transcriptPath, CONTEXT_PRESSURE_MARKERS);
}

function hasContextPressureMarker(text) {
  if (typeof text !== "string") return false;
  const lower = text.toLowerCase();
  return CONTEXT_PRESSURE_MARKERS.some((marker) => lower.includes(marker));
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
