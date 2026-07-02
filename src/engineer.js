// Loop engineer: the `loopy` keyword (or its Korean alias `루피`) wakes an operator
// that drives the whole evidence loop, so a person never types begin, prove, or finish.
// `loopy team`/`loopy crew`, the connected one-word `loopycrew`, or the
// standalone `ultrawork` escalate the same operator into crew fan-out mode: it
// is steered to delegate independent slices to parallel workers via the host's
// native spawn tool, while the Superloopy plan and its evidence gates stay the
// single source of truth. This module stays dependency-free; the hook runtime
// injects the helpers it needs.

import { detectSuperpowers } from "./interop.js";

// Leading invocation keyword: ASCII `loopy` (with a word boundary so `loopyfoo`/`loopycrew`
// stay out) or its Korean alias `루피`. Hangul has no `\b`, so `루피` matches as a leading
// token and the optional separators are consumed the same way.
const ENGINEER_TRIGGER_PATTERN = /^\s*@?(?:loopy\b|루피)[ \t:,]*/iu;
// Suppress only a prompt-shaped `loopy loop <subcommand>` command reference (or a bare `loopy loop`),
// NOT any task that merely starts with the word "loop" — e.g. "loopy loop over the array"
// is a real task and must still wake the engineer.
const CLI_REFERENCE_PATTERN = /^loop(\s+(begin|create|next|guide|trace|report|check|evidence|capture|prove|review|checkpoint|finish|status|audit|fleet|handoff)\b|\s*$)/iu;
// Escalation keyword right after the leading keyword: `team`/`crew` (English) or
// `팀`/`크루` (Korean). English forms require a word boundary so "teamwork"/"crews" stay
// ordinary briefs; the Korean forms require a following separator/end so "팀워크" stays a brief.
const TEAM_TRIGGER_PATTERN = /^(?:team\b|crew\b|팀(?=$|[\s:,])|크루(?=$|[\s:,]))[ \t:,]*/iu;
// Connected one-word escalation: `loopycrew <task>`. Leading-only (like the `loopy`
// keyword) and boundary-guarded so "loopycrewmate" stays inert.
const CONNECTED_CREW_TRIGGER_PATTERN = /^\s*@?loopycrew\b[ \t:,]*/iu;
// Standalone escalation keyword: `ultrawork <task>` wakes the engineer straight into
// crew fan-out, with no `loopy` prefix. Leading-only and boundary-guarded.
const ULTRAWORK_TRIGGER_PATTERN = /^\s*@?ultrawork\b[ \t:,]*/iu;
const HEADER = "Superloopy loop engineer";

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

// Frontend intent: keyword/phrase patterns that mark UI/visual work so the prompt
// hook can steer toward the superloopy-frontend skill even when the user never
// typed `loopy`. Curated for precision — bare "design"/"layout"/"component" are
// excluded (they collide with API/data work); the steer is guidance-only, so an
// occasional miss costs nothing more than a few unused context lines.
const FRONTEND_TRIGGER_PATTERNS = [
  /\bfront[\s-]?end\b/iu,
  /\bu[ix]\b/iu,
  /\bui\/ux\b|\bux\/ui\b/iu,
  /\buser interface\b/iu,
  /\b(css|scss|tailwind|tailwindcss)\b/iu,
  /\b(landing|pricing|marketing|signup|sign-up) page\b/iu,
  /\bhero section\b/iu,
  /\bnav ?bar\b/iu,
  /\bdesign system\b/iu,
  /\bdesign\.md\b/iu,
  /\bdesign tokens?\b/iu,
  /\bcolor (palette|scheme)\b/iu,
  /\bfont (pairing|stack)\b/iu,
  /\bdark mode\b/iu,
  /\bresponsive\b/iu,
  /\bredesign\b|\brestyle\b|\bre-?skin\b/iu,
  /\bmock-?up\b|\bwireframe\b/iu,
  /\bmake (?:it|this|the [\w-]+) (?:look|feel) (?:better|good|nicer|prettier|premium|professional|polished|designed|modern|clean)\b/iu,
  /\bmake (?:it|this) pretty\b/iu,
  /\blooks? (?:generic|bland|boring|cheap|unfinished|like ai|ai[\s-]?generated|like a template|templated)\b/iu,
  /\banti[\s-]?slop\b|\bawwwards\b|\bpolish the (?:ui|design|page|frontend|landing)\b/iu
];

// Non-visual contexts that share vocabulary with UI work. Each exclusion requires an
// explicit backend/systems noun sitting next to the shared token — there is deliberately
// NO blanket "responsive to", because an explicit frontend trigger must win unless the
// nearby wording is genuinely systems vocabulary (e.g. "responsive to touch input" and
// "responsive to dark mode changes" are UI and must still steer; "responsive to incoming
// signals" / "API endpoint unresponsive" / "UI thread" are systems and must not). Mirrors
// the Korean-writing exclusion gate; a false exclusion only costs a missed steer.
const FRONTEND_EXCLUSION_PATTERNS = [
  /\b(?:un)?responsive\b[^.\n]{0,24}\b(?:server|service|api|endpoint|backend|database|thread|process|socket|node|cluster|daemon|requests?|workers?|queue|signals?|handler|listener|webhook|rpc|grpc|stream|packets?|event loop)\b/iu,
  /\b(?:server|service|api|endpoint|backend|database|thread|process|socket|node|cluster|daemon|requests?|workers?|queue|signals?|handler|listener|webhook|rpc|grpc|stream|packets?|event loop)\b[^.\n]{0,24}\b(?:un)?responsive\b/iu,
  /\bui\s+thread\b/iu
];

// Genuine responsive-DESIGN wording that must keep the steer even though it says
// "responsive to ..." — e.g. "responsive to different screen sizes / mobile breakpoints".
// When a real visual target is named, the exclusion gate is bypassed: over-firing is now
// cheap (the payload is a light pointer), while missing this UI work is the real harm.
const RESPONSIVE_VISUAL_TARGET = /\bresponsive(?:ness)?\b[^.\n]{0,40}\b(?:screens?|screen ?sizes?|breakpoints?|mobile|tablet|desktop|viewport|devices?|resolutions?|layouts?|orientation|widths?|form ?factors?)\b/iu;

// True when the prompt reads as frontend/visual work. Used by the prompt hook to
// inject a steer toward the superloopy-frontend skill (no state mutation). The steer
// is a light pointer; the superloopy-frontend skill carries the rules and loads them
// on demand, so an occasional over-fire costs a couple of context lines, not a rulebook.
export function hasFrontendTrigger(prompt) {
  if (typeof prompt !== "string") return false;
  // A named visual target ("responsive to mobile breakpoints") overrides the systems-
  // vocabulary exclusions, so genuine responsive-design work is never suppressed.
  if (!RESPONSIVE_VISUAL_TARGET.test(prompt)
      && FRONTEND_EXCLUSION_PATTERNS.some((pattern) => pattern.test(prompt))) {
    return false;
  }
  return FRONTEND_TRIGGER_PATTERNS.some((pattern) => pattern.test(prompt));
}

// Guidance-only steer: a light pointer to the frontend skill, which carries the actual
// rules (DESIGN.md gate, anti-slop pre-flight, visual-QA evidence) and loads them on
// demand. Kept compact on purpose so an over-fire is cheap — the skill is the rulebook.
// Interop-aware to match the engineer trigger's `interopBlock`: this is a separate
// (non-`loopy`) guidance path, so it carries the same coexistence routing rather than
// double-driving design when Superpowers is installed. `interop` is injectable for tests.
export function renderFrontendTriggerContext(interop = detectSuperpowers()) {
  const lines = [
    "Superloopy frontend trigger",
    "",
    "This looks like UI/visual work — engage the `superloopy-frontend` skill (guidance only; no state change). It is a router that loads only the rules a request needs: a mandatory DESIGN.md token gate, the anti-slop pre-flight, and a real-browser visual-QA artifact under `.superloopy/evidence/frontend/` before done. Follow the skill; do not expand these rules here."
  ];
  if (interop && interop.installed === true) {
    lines.push(
      "",
      "Superpowers coexistence (detected): let Superpowers drive brainstorming, planning, and TDD; superloopy-frontend still owns the visual layer — the DESIGN.md token gate, the anti-slop pre-flight, and the visual-QA evidence. Keep one orchestrator: do not open a second design/plan pass here."
    );
  }
  return lines.join("\n");
}

const KOREAN_WRITING_EXCLUSION_PATTERNS = [
  /번역\s*(?:해|해줘|해주세요|해라)/u,
  /요약\s*(?:해|해줘|해주세요|해라)?/u,
  /정리\s*(?:해|해줘|해주세요|해라)/u,
  /(?:영어|영문|일본어|일문|중국어|중문|프랑스어|독일어|스페인어|포르투갈어|이탈리아어|베트남어|태국어|러시아어|아랍어|인도네시아어|힌디어|터키어|english|japanese|chinese|french|german|spanish|portuguese|italian|vietnamese|thai|russian|arabic|indonesian|hindi|turkish)[^\n]{0,20}(?:글|소개글|소개문|메일|이메일|공지|안내문|답변|댓글|후기\s*답변|문구)?\s*(?:써|작성|draft|write|다듬어|윤문|고쳐)/iu,
  /(?:코드|테스트|README|readme|리드미|릴리즈\s*노트|문서|docs?)[^\n]{0,20}(?:작성|생성|써|써줘|고쳐|수정|다듬어|정리)/iu,
  /(?:법률|계약서|약관)/u,
  /(?:뭐야|알려줘|설명\s*(?:해|해줘|해주세요)?)/u
];

const KOREAN_WRITING_TRIGGER_PATTERNS = [
  /AI\s*티\s*(?:안\s*나게|없게|없애|제거)/iu,
  /(?:사람|인간)(?:이)?\s*쓴\s*것처럼/u,
  /번역투\s*(?:없이|고쳐|줄여|없애|안\s*나게)/u,
  /(?:글|문장|문구|카피|공지|안내문|메일|이메일|소개글|소개문|답변|댓글|후기\s*답변)\s*(?:자연스럽게|어색하지\s*않게|다듬어|윤문|고쳐)/u,
  /윤문/u,
  /한국어로\s*글\s*(?:써|작성)/u,
  /글\s*(?:써줘|써\s*줘|작성해줘|작성\s*해줘)/u,
  /글써줘/u,
  /(?:공지|안내문|메일|이메일|소개글|소개문|답변|댓글|후기\s*답변|문구)\s*(?:써줘|써\s*줘|작성해줘|작성\s*해줘|작성)/u
];

// True when the prompt asks for Korean prose generation or human-sounding Korean copy.
// The exclusions keep broad Korean requests like translation, summary, code, legal text,
// and factual Q&A from getting an unnecessary post-generation humanization steer.
export function hasKoreanWritingTrigger(prompt) {
  if (typeof prompt !== "string") return false;
  if (KOREAN_WRITING_EXCLUSION_PATTERNS.some((pattern) => pattern.test(prompt))) return false;
  return KOREAN_WRITING_TRIGGER_PATTERNS.some((pattern) => pattern.test(prompt));
}

export function renderKoreanWritingTriggerContext() {
  return [
    "Superloopy Korean writing trigger",
    "",
    "This request appears to ask for Korean prose generation or human-sounding Korean copy. Draft the Korean text normally, then apply the humanize-korean skill as a light post-generation polish pass. This is guidance only; it does not mutate Superloopy state.",
    "",
    "- Use `humanize-korean` after drafting, not before: remove AI tells, translationese, formulaic transitions, repeated endings, and over-smoothed phrasing.",
    "- Preserve facts, claims, register, numbers, dates, URLs, product names, model names, acronyms, quoted spans, and user-provided constraints.",
    "- Keep the pass light unless the user explicitly asks for strong rewriting; avoid adding examples, metaphors, citations, or marketing claims.",
    "- Do not apply this steer to translation, exact summaries, code/test/docs generation, legal/contract text, or factual Q&A unless the user explicitly asks for Korean humanization."
  ].join("\n");
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
  if (brief.length === 0) {
    return [
      HEADER,
      "",
      orchestrate
        ? "The user woke the loop engineer in crew mode with `loopy team` but named no task."
        : "The user woke the loop engineer with `loopy` but named no task.",
      "Ask in one short question what they want built or fixed, then drive the loop yourself:",
      "",
      "- Start: `superloopy loop begin --brief \"<their answer>\" --mode light --json`.",
      "- Follow `superloopy loop guide --json` for each next command; do not ask the user to run Superloopy.",
      "- Prove every criterion with `superloopy loop prove -- <validation-command>` (real artifacts only).",
      "- Preflight `superloopy loop check`, then `superloopy loop finish --evidence \"<summary>\" --artifact .superloopy/evidence/gate.json --json`.",
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
    `- Start now: \`superloopy loop begin --brief ${shellQuote(brief)} --mode light --json\`.`,
    "- Drive each step with `superloopy loop guide --json` and act on its next command.",
    "- Prove every criterion with `superloopy loop prove -- <validation-command>`; record real artifacts only.",
    "- Preflight with `superloopy loop check`, then complete with `superloopy loop finish --evidence \"<summary>\" --artifact .superloopy/evidence/gate.json --json`.",
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
  return [
    "",
    "Superpowers coexistence (detected):",
    "- Superpowers is installed. Use its skills for the front of the loop: `brainstorming` and `writing-plans` for design and planning, and `test-driven-development` plus its code-review skills while implementing. Do not re-derive a second plan here.",
    "- Superloopy owns proof-of-done: capture the work as command-backed criteria and re-run them at `finish`. Register the TDD test command with `superloopy loop prove -- <test command>` so it re-runs deterministically at completion.",
    "- One orchestrator per task: if Superpowers is running subagent-driven development, do not also fan out the Superloopy crew on the same slices."
  ];
}

function renderComplete(status, interop) {
  const session = status.plan.sessionId === undefined ? "" : ` --session-id ${shellQuote(status.plan.sessionId)}`;
  return [
    HEADER,
    "",
    "The current Superloopy aggregate is already complete.",
    "",
    `- Inspect: \`superloopy loop status${session} --json\`.`,
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
    "- You own the plan: record a criterion pass only from a real artifact via `superloopy loop prove` or `superloopy loop evidence`, never from a worker's claim alone. Track each dispatch with `superloopy loop handoff` and run `superloopy loop fleet --json` before the final gate.",
    "- Before the final summary, run `git status --short --untracked-files=all` and `git ls-files --others --exclude-standard` so untracked evidence, scripts, and reports are not omitted.",
    "- Keep the Superloopy loop the source of truth: you still begin, prove, check, and finish through the CLI yourself with `superloopy loop finish --evidence \"<summary>\" --artifact .superloopy/evidence/gate.json --json`."
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
