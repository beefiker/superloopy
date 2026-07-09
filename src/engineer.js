// Loop engineer: the `loopy` keyword (or its Korean alias `루피`) wakes an operator
// that drives the whole evidence loop, so a person never types begin, prove, or finish.
// `loopy team`/`loopy crew`, the connected one-word `loopycrew`, or the
// standalone `ultrawork` escalate the same operator into crew fan-out mode: it
// is steered to delegate independent slices to parallel workers via the host's
// native spawn tool, while the Superloopy plan and its evidence gates stay the
// single source of truth. This module stays dependency-free; the hook runtime
// injects the helpers it needs.

import { detectSuperpowers } from "./interop.js";

// Invocation syntax is intentionally lexical, not semantic: an alias must be the first
// complete token and end or be followed by whitespace, `:`, or `,`. Do not use `\b` here:
// JavaScript treats the boundary before a Korean particle as a word boundary (`loopy가`),
// while a bare Hangul prefix (`루피가`) has no useful `\b` boundary at all.
const ENGINEER_TRIGGER_PATTERN = /^\s*@?(?:loopy|루피)(?=$|[\s:,])[\s:,]*/iu;
// Suppress only a prompt-shaped `loopy loop <subcommand>` command reference (or a bare `loopy loop`),
// NOT any task that merely starts with the word "loop" — e.g. "loopy loop over the array"
// is a real task and must still wake the engineer.
const CLI_REFERENCE_PATTERN = /^loop(?:\s+(?:begin|create|next|guide|trace|report|check|evidence|capture|prove|review|checkpoint|finish|status|audit|fleet|handoff)(?=$|[\s:,])|\s*$)/iu;
// Escalation keyword right after the leading keyword: `team`/`crew` (English) or
// `팀`/`크루` (Korean). Every form uses the same explicit-token separator contract.
const TEAM_TRIGGER_PATTERN = /^(?:team|crew|팀|크루)(?=$|[\s:,])[\s:,]*/iu;
// Connected one-word escalation: `loopycrew <task>`. Leading-only (like the `loopy`
// keyword) and boundary-guarded so "loopycrewmate" stays inert.
const CONNECTED_CREW_TRIGGER_PATTERN = /^\s*@?loopycrew(?=$|[\s:,])[\s:,]*/iu;
// Standalone escalation keyword: `ultrawork <task>` wakes the engineer straight into
// crew fan-out, with no `loopy` prefix. Leading-only and boundary-guarded.
const ULTRAWORK_TRIGGER_PATTERN = /^\s*@?ultrawork(?=$|[\s:,])[\s:,]*/iu;
const HEADER = "Superloopy loop engineer";

export function hasEngineerTrigger(prompt) {
  if (typeof prompt !== "string") return false;
  // Connected (`loopycrew`) and standalone (`ultrawork`) escalations wake the engineer too —
  // the plain `loopy` token excludes the connected form, and `ultrawork` has no `loopy` prefix.
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
  const { statusForPayload, guideForPayload, renderSuperloopyContext, formatAdditionalContext } = deps;
  const { orchestrate } = parseInvocation(payload.prompt);
  // Best-effort coexistence check; never throws, so compute it outside the try.
  const interop = detectSuperpowers();
  try {
    const status = await statusForPayload(payload);
    if (status.summary.aggregateComplete) {
      return formatAdditionalContext("UserPromptSubmit", renderComplete(status, interop));
    }
    const guide = guideForPayload(payload, status.plan);
    return formatAdditionalContext("UserPromptSubmit", renderResume(renderSuperloopyContext(status, guide), orchestrate, interop));
  } catch {
    return formatAdditionalContext("UserPromptSubmit", renderStart(payload, orchestrate, interop));
  }
}

function renderStart(payload, orchestrate, interop) {
  const { brief } = parseInvocation(payload.prompt);
  const cli = superloopyCommand();
  if (brief.length === 0) {
    return [
      HEADER,
      "",
      orchestrate
        ? "The user woke the loop engineer in crew mode with `loopy team` but named no task."
        : "The user woke the loop engineer with `loopy` but named no task.",
      "Ask in one short question what they want built or fixed, then drive the loop yourself:",
      "",
      `- Start: \`${cli} loop begin --brief "<their answer>" --mode light --json\`.`,
      `- Follow \`${cli} loop guide --json\` for each next command; do not ask the user to run Superloopy.`,
      `- Prove every criterion with \`${cli} loop prove -- <validation-command>\` (real artifacts only).`,
      `- Preflight \`${cli} loop check\`, then \`${cli} loop finish --evidence "<summary>" --artifact .superloopy/evidence/gate.json --json\`.`,
      ...interopBlock(interop),
      ...(orchestrate ? ["", ...orchestrationLines(interop)] : [])
    ].join("\n");
  }
  return [
    HEADER,
    "",
    orchestrate
      ? "The user woke the loop engineer in crew mode with `loopy team`. Own the whole evidence loop and delegate independent slices to the crew; do not ask the user to run Superloopy commands."
      : "The user woke the loop engineer with `loopy`. Own the whole evidence loop; do not ask the user to run Superloopy commands.",
    "",
    `- Brief: ${brief}`,
    `- Start now: \`${cli} loop begin --brief ${shellQuote(brief)} --mode light --json\`.`,
    `- Drive each step with \`${cli} loop guide --json\` and act on its next command.`,
    `- Prove every criterion with \`${cli} loop prove -- <validation-command>\`; record real artifacts only.`,
    `- Preflight with \`${cli} loop check\`, then complete with \`${cli} loop finish --evidence "<summary>" --artifact .superloopy/evidence/gate.json --json\`.`,
    "- Report progress in plain terms (criteria proven, next step), not raw command dumps.",
    "- Keep it light unless the task needs heavier review. The Stop hook blocks completion until evidence exists.",
    ...interopBlock(interop),
    "",
    ...(orchestrate ? orchestrationLines(interop) : [baselineDelegationLine()])
  ].join("\n");
}

function renderResume(context, orchestrate, interop) {
  return [
    HEADER,
    "",
    "A loop is already in progress. Resume as the loop engineer and run the next action yourself; do not start a second plan or ask the user to run Superloopy commands.",
    ...interopBlock(interop),
    ...(orchestrate
      ? ["", "You opened this with `loopy team`: keep delegating independent slices to the crew via `multi_agent_v1.spawn_agent`, and record only artifact-backed proof.", "", ...orchestrationLines(interop)]
      : []),
    "",
    context
  ].join("\n");
}

// Coexistence routing (guidance only): when the Superpowers methodology plugin is
// installed, keep the two plugins in their lanes instead of double-driving the task.
// Returns [] when Superpowers is absent so solo output is unchanged.
function interopBlock(interop) {
  if (!interop || interop.installed !== true) return [];
  const cli = superloopyCommand();
  return [
    "",
    "Superpowers coexistence (detected):",
    "- Superpowers is installed. Use its skills for the front of the loop: `brainstorming` and `writing-plans` for design and planning, and `test-driven-development` plus its code-review skills while implementing. Do not re-derive a second plan here.",
    `- Superloopy owns proof-of-done: capture the work as command-backed criteria and re-run them at \`finish\`. Register the TDD test command with \`${cli} loop prove -- <test command>\` so it re-runs deterministically at completion.`,
    "- One orchestrator per task: if Superpowers is running subagent-driven development, do not also fan out the Superloopy crew on the same slices."
  ];
}

function renderComplete(status, interop) {
  const session = status.plan.sessionId === undefined ? "" : ` --session-id ${shellQuote(status.plan.sessionId)}`;
  const cli = superloopyCommand();
  return [
    HEADER,
    "",
    "The current Superloopy aggregate is already complete.",
    "",
    `- Inspect: \`${cli} loop status${session} --json\`.`,
    "- For new work, begin a fresh loop and keep it separate with a new --session-id.",
    ...interopBlock(interop)
  ].join("\n");
}

// Tier 1 (always-on, conservative): one line that keeps a single cohesive change
// solo but opens the door to parallel delegation when slices are truly independent.
function baselineDelegationLine() {
  return "- If the work splits into 2+ genuinely independent slices, you may delegate them in parallel with `multi_agent_v1.spawn_agent` (set `agent_type` to the matching crew role, self-contained `message`, `fork_context: false`) and record each worker's artifact-backed proof; for a single cohesive change, stay solo. Type `loopy team <task>` to run the full crew.";
}

// Tier 2 (escalation): the crew fan-out playbook, wired to Superloopy's receipt gate.
function orchestrationLines(interop) {
  const cli = superloopyCommand();
  return [
    "Crew fan-out (team mode):",
    ...(interop && interop.installed === true
      ? ["- Superpowers is installed: pick ONE orchestrator for this task. If Superpowers drives planning and implementation, keep the Superloopy crew for evidence lanes (usopp QA, robin audit, jinbe gate) and the command-backed final gate — do not run both on the same slices."]
      : []),
    "- If the requested repository path differs from `cwd`, verify and state the exact target path before editing or dispatching workers.",
    "- This task is big enough to split. Delegate independent slices to parallel workers instead of doing everything in one thread.",
    "- Spawn each worker with the host's native tool, and ALWAYS set `agent_type` to the crew role so the child loads that role's model and instructions, e.g.: `multi_agent_v1.spawn_agent({\"message\": \"TASK: act as franky — <self-contained assignment>\", \"agent_type\": \"franky\", \"fork_context\": false})`.",
    "- Match `agent_type` to the lane, one per crew role: `agent_type: \"franky\"` builds one slice, `\"zoro\"` reviews a diff, `\"usopp\"` tests, `\"jinbe\"` gates, `\"robin\"` audits (read-only), `\"nami\"` finds files (read-only). Dispatch `nami` first to scope a slice before assigning `franky`.",
    "- Role routing by name is best-effort across hosts, so ALSO make the `message` self-contained: lead with `TASK: act as <role>` and paste all needed context, so the worker behaves correctly even if the host ignores `agent_type`.",
    "- The implementation worker must own a real bounded implementation slice before the parent edits or completes that slice. If no safe independent implementation slice exists, stay solo or use a smaller read-only crew.",
    "- Parallelize read-heavy lanes first (`nami` navigation, `zoro` review, `usopp` QA); never run two editors on overlapping files at once.",
    "- Each worker ends its report with `SUPERLOOPY_EVIDENCE: <path-under-active-evidence-root>` (`robin` uses `SUPERLOOPY_AUDIT:`). Collect them with `multi_agent_v1.wait_agent`; treat a running child as alive, not a timeout.",
    "- After each worker returns, show a concise role completion line with role, normalized verdict, artifact path, risk, and next action before closing or respawning that lane.",
    "- Give `jinbe` a Markdown final gate report such as `.superloopy/evidence/jinbe-final-gate-report.md`; keep it separate from the machine quality gate `.superloopy/evidence/gate.json`.",
    `- You own the plan: record a criterion pass only from a real artifact via \`${cli} loop prove\` or \`${cli} loop evidence\`, never from a worker's claim alone. Track each dispatch with \`${cli} loop handoff\` and run \`${cli} loop fleet --json\` before the final gate.`,
    "- Before the final summary, run `git status --short --untracked-files=all` and `git ls-files --others --exclude-standard` so untracked evidence, scripts, and reports are not omitted.",
    `- Keep the Superloopy loop the source of truth: you still begin, prove, check, and finish through the CLI yourself with \`${cli} loop finish --evidence "<summary>" --artifact .superloopy/evidence/gate.json --json\`.`
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

function superloopyCommand() {
  const pluginRoot = cleanPluginRoot(process.env.CLAUDE_PLUGIN_ROOT) ?? cleanPluginRoot(process.env.PLUGIN_ROOT);
  if (pluginRoot !== null) return `node ${commandPathArg(pluginCliPath(pluginRoot))}`;
  return "superloopy";
}

function cleanPluginRoot(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && !/["\r\n]/u.test(trimmed) ? trimmed : null;
}

function pluginCliPath(pluginRoot) {
  const root = pluginRoot.replace(/[\\/]+$/u, "");
  const sep = root.includes("\\") ? "\\" : "/";
  return `${root}${sep}src${sep}cli.js`;
}

function commandPathArg(value) {
  if (/^[a-z]:[\\/]/iu.test(value) || value.includes("\\")) return `"${value}"`;
  return shellQuote(value);
}
