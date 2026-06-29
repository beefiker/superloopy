// Loop engineer: the `loopy` keyword wakes an operator that drives the whole
// evidence loop, so a person never has to type begin, prove, or finish by hand.
// `loopy team`/`loopy crew`, the connected one-word `loopycrew`, or the
// standalone `ultrawork` escalate the same operator into crew fan-out mode: it
// is steered to delegate independent slices to parallel workers via the host's
// native spawn tool, while the Loopy plan and its evidence gates stay the
// single source of truth. This module stays dependency-free; the hook runtime
// injects the helpers it needs.

const ENGINEER_TRIGGER_PATTERN = /^\s*@?loopy\b[ \t:,]*/iu;
// Suppress only an actual `loopy loop <subcommand>` CLI reference (or a bare `loopy loop`),
// NOT any task that merely starts with the word "loop" — e.g. "loopy loop over the array"
// is a real task and must still wake the engineer.
const CLI_REFERENCE_PATTERN = /^loop(\s+(begin|create|next|guide|trace|report|check|evidence|capture|prove|review|checkpoint|finish|status|audit|fleet|handoff)\b|\s*$)/iu;
// Escalation keyword right after `loopy`: `loopy team <task>` / `loopy crew <task>`.
// Requires a word boundary so "teamwork" or "crews" stay ordinary briefs.
const TEAM_TRIGGER_PATTERN = /^(?:team|crew)\b[ \t:,]*/iu;
// Connected one-word escalation: `loopycrew <task>`. Leading-only (like the `loopy`
// keyword) and boundary-guarded so "loopycrewmate" stays inert.
const CONNECTED_CREW_TRIGGER_PATTERN = /^\s*@?loopycrew\b[ \t:,]*/iu;
// Standalone escalation keyword: `ultrawork <task>` wakes the engineer straight into
// crew fan-out, with no `loopy` prefix. Leading-only and boundary-guarded.
const ULTRAWORK_TRIGGER_PATTERN = /^\s*@?ultrawork\b[ \t:,]*/iu;
const HEADER = "Loopy loop engineer";

export function hasEngineerTrigger(prompt) {
  if (typeof prompt !== "string") return false;
  // Connected (`loopycrew`) and standalone (`ultrawork`) escalations wake the engineer too —
  // the plain `loopy\b` pattern misses the connected form, and `ultrawork` has no `loopy` prefix.
  if (CONNECTED_CREW_TRIGGER_PATTERN.test(prompt) || ULTRAWORK_TRIGGER_PATTERN.test(prompt)) return true;
  if (!ENGINEER_TRIGGER_PATTERN.test(prompt)) return false;
  return !CLI_REFERENCE_PATTERN.test(prompt.replace(ENGINEER_TRIGGER_PATTERN, ""));
}

// True when the invocation requests crew fan-out: spaced (`loopy crew`), connected
// (`loopycrew`), or the standalone `ultrawork` keyword.
export function hasTeamTrigger(prompt) {
  if (typeof prompt !== "string") return false;
  if (CONNECTED_CREW_TRIGGER_PATTERN.test(prompt) || ULTRAWORK_TRIGGER_PATTERN.test(prompt)) return true;
  if (!hasEngineerTrigger(prompt)) return false;
  return TEAM_TRIGGER_PATTERN.test(prompt.replace(ENGINEER_TRIGGER_PATTERN, ""));
}

// Strip the leading trigger keyword and report whether crew fan-out was requested,
// alongside the cleaned task brief.
export function parseInvocation(prompt) {
  if (typeof prompt !== "string") return { orchestrate: false, brief: "" };
  // Connected one-word form: `loopycrew <task>`.
  if (CONNECTED_CREW_TRIGGER_PATTERN.test(prompt)) {
    return { orchestrate: true, brief: normalizeBrief(prompt.replace(CONNECTED_CREW_TRIGGER_PATTERN, "")) };
  }
  // Standalone escalation keyword: `ultrawork <task>`.
  if (ULTRAWORK_TRIGGER_PATTERN.test(prompt)) {
    return { orchestrate: true, brief: normalizeBrief(prompt.replace(ULTRAWORK_TRIGGER_PATTERN, "")) };
  }
  let rest = prompt.replace(ENGINEER_TRIGGER_PATTERN, "");
  const orchestrate = TEAM_TRIGGER_PATTERN.test(rest);
  if (orchestrate) rest = rest.replace(TEAM_TRIGGER_PATTERN, "");
  return { orchestrate, brief: normalizeBrief(rest) };
}

export async function runEngineerTriggerHook(payload, deps) {
  const { statusForPayload, guideForPayload, renderLoopyContext, formatAdditionalContext } = deps;
  const { orchestrate } = parseInvocation(payload.prompt);
  try {
    const status = await statusForPayload(payload);
    if (status.summary.aggregateComplete) {
      return formatAdditionalContext("UserPromptSubmit", renderComplete(status));
    }
    const guide = guideForPayload(payload, status.plan);
    return formatAdditionalContext("UserPromptSubmit", renderResume(renderLoopyContext(status, guide), orchestrate));
  } catch {
    return formatAdditionalContext("UserPromptSubmit", renderStart(payload, orchestrate));
  }
}

function renderStart(payload, orchestrate) {
  const { brief } = parseInvocation(payload.prompt);
  if (brief.length === 0) {
    return [
      HEADER,
      "",
      orchestrate
        ? "The user woke the loop engineer in crew mode with `loopy team` but named no task."
        : "The user woke the loop engineer with `loopy` but named no task.",
      "Ask in one short question what they want built or fixed, then drive the loop yourself:",
      "",
      "- Start: `loopy loop begin --brief \"<their answer>\" --mode light --json`.",
      "- Follow `loopy loop guide --json` for each next command; do not ask the user to run Loopy.",
      "- Prove every criterion with `loopy loop prove -- <validation-command>` (real artifacts only).",
      "- Preflight `loopy loop check`, then `loopy loop finish --evidence \"<summary>\" --artifact .loopy/evidence/gate.json --json`.",
      ...(orchestrate ? ["", ...orchestrationLines()] : [])
    ].join("\n");
  }
  return [
    HEADER,
    "",
    orchestrate
      ? "The user woke the loop engineer in crew mode with `loopy team`. Own the whole evidence loop and delegate independent slices to the crew; do not ask the user to run Loopy commands."
      : "The user woke the loop engineer with `loopy`. Own the whole evidence loop; do not ask the user to run Loopy commands.",
    "",
    `- Brief: ${brief}`,
    `- Start now: \`loopy loop begin --brief ${shellQuote(brief)} --mode light --json\`.`,
    "- Drive each step with `loopy loop guide --json` and act on its next command.",
    "- Prove every criterion with `loopy loop prove -- <validation-command>`; record real artifacts only.",
    "- Preflight with `loopy loop check`, then complete with `loopy loop finish --evidence \"<summary>\" --artifact .loopy/evidence/gate.json --json`.",
    "- Report progress in plain terms (criteria proven, next step), not raw command dumps.",
    "- Keep it light unless the task needs heavier review. The Stop hook blocks completion until evidence exists.",
    "",
    ...(orchestrate ? orchestrationLines() : [baselineDelegationLine()])
  ].join("\n");
}

function renderResume(context, orchestrate) {
  return [
    HEADER,
    "",
    "A loop is already in progress. Resume as the loop engineer and run the next action yourself; do not start a second plan or ask the user to run Loopy commands.",
    ...(orchestrate
      ? ["", "You opened this with `loopy team`: keep delegating independent slices to the crew via `multi_agent_v1.spawn_agent`, and record only artifact-backed proof.", "", ...orchestrationLines()]
      : []),
    "",
    context
  ].join("\n");
}

function renderComplete(status) {
  const session = status.plan.sessionId === undefined ? "" : ` --session-id ${shellQuote(status.plan.sessionId)}`;
  return [
    HEADER,
    "",
    "The current Loopy aggregate is already complete.",
    "",
    `- Inspect: \`loopy loop status${session} --json\`.`,
    "- For new work, begin a fresh loop and keep it separate with a new --session-id."
  ].join("\n");
}

// Tier 1 (always-on, conservative): one line that keeps a single cohesive change
// solo but opens the door to parallel delegation when slices are truly independent.
function baselineDelegationLine() {
  return "- If the work splits into 2+ genuinely independent slices, you may delegate them in parallel with `multi_agent_v1.spawn_agent` (set `agent_type` to the matching crew role, self-contained `message`, `fork_context: false`) and record each worker's artifact-backed proof; for a single cohesive change, stay solo. Type `loopy team <task>` to run the full crew.";
}

// Tier 2 (escalation): the crew fan-out playbook, wired to Loopy's receipt gate.
function orchestrationLines() {
  return [
    "Crew fan-out (team mode):",
    "- If the requested repository path differs from `cwd`, verify and state the exact target path before editing or dispatching workers.",
    "- This task is big enough to split. Delegate independent slices to parallel workers instead of doing everything in one thread.",
    "- Spawn each worker with the host's native tool, and ALWAYS set `agent_type` to the crew role so the child loads that role's model and instructions, e.g.: `multi_agent_v1.spawn_agent({\"message\": \"TASK: act as franky — <self-contained assignment>\", \"agent_type\": \"franky\", \"fork_context\": false})`.",
    "- Match `agent_type` to the lane, one per crew role: `agent_type: \"franky\"` builds one slice, `\"zoro\"` reviews a diff, `\"usopp\"` tests, `\"jinbe\"` gates, `\"robin\"` audits (read-only), `\"nami\"` finds files (read-only). Dispatch `nami` first to scope a slice before assigning `franky`.",
    "- Role routing by name is best-effort across hosts, so ALSO make the `message` self-contained: lead with `TASK: act as <role>` and paste all needed context, so the worker behaves correctly even if the host ignores `agent_type`.",
    "- The implementation worker must own a real bounded implementation slice before the parent edits or completes that slice. If no safe independent implementation slice exists, stay solo or use a smaller read-only crew.",
    "- Parallelize read-heavy lanes first (`nami` navigation, `zoro` review, `usopp` QA); never run two editors on overlapping files at once.",
    "- Each worker ends its report with `LOOPY_EVIDENCE: <path-under-active-evidence-root>` (`robin` uses `LOOPY_AUDIT:`). Collect them with `multi_agent_v1.wait_agent`; treat a running child as alive, not a timeout.",
    "- After each worker returns, show a concise role completion line with role, normalized verdict, artifact path, risk, and next action before closing or respawning that lane.",
    "- Give `jinbe` a Markdown final gate report such as `.loopy/evidence/jinbe-final-gate-report.md`; keep it separate from the machine quality gate `.loopy/evidence/gate.json`.",
    "- You own the plan: record a criterion pass only from a real artifact via `loopy loop prove` or `loopy loop evidence`, never from a worker's claim alone. Track each dispatch with `loopy loop handoff` and run `loopy loop fleet --json` before the final gate.",
    "- Before the final summary, run `git status --short --untracked-files=all` and `git ls-files --others --exclude-standard` so untracked evidence, scripts, and reports are not omitted.",
    "- Keep the Loopy loop the source of truth: you still begin, prove, check, and finish through the CLI yourself with `loopy loop finish --evidence \"<summary>\" --artifact .loopy/evidence/gate.json --json`."
  ];
}

function normalizeBrief(rest) {
  return rest
    .replace(/[ \t]+/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .trim();
}

function shellQuote(value) {
  return `'${value.replace(/'/g, "'\"'\"'")}'`;
}
