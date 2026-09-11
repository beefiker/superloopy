// Opt-in write-time nudge for Korean calques (SUPERLOOPY_CALQUE_NUDGE=on). Runs at UserPromptSubmit,
// reads the previous assistant turn, and adds advisory context when a gating P rule matched. It
// runs one turn late by construction: a Claude Code Stop hook can reach the model only by blocking,
// and this must never block. Advisory ids (P-1b, P-3, P-5, P-6) stay silent here; they belong to the
// humanize audit's warnings, where a human reads them.
import { readTranscriptTail } from "./continuation.js";
import { formatMeasuredAdditionalContext } from "./context-cost.js";
import { CALQUE_GATING_PATTERNS, CALQUE_REPAIR_HINTS, koreanRatio, removeProtectedProseSpans } from "../skills/humanize-korean/scripts/calque-patterns.mjs";

const KOREAN_THRESHOLD = 0.2; // the humanize audit's own bar for "Korean text"
const MAX_SPANS_PER_ID = 3;
const CONTEXT_COST_TRAILER = /\n\nSuperloopy context cost: [^\n]*$/u;

export function isCalqueNudgeEnabled(env = process.env) {
  return String(env.SUPERLOOPY_CALQUE_NUDGE ?? "off").toLowerCase() === "on";
}

// Codex hands the previous turn over as `last_assistant_message`; Claude Code only points at the
// transcript. The tail read is bounded, so its first line may be a torn JSON fragment: unparsable
// lines are skipped, never fatal. Walking backwards, the trailing run of `assistant` entries is the
// previous turn; its text blocks are returned in reading order.
export function lastAssistantText(payload) {
  if (typeof payload.last_assistant_message === "string" && payload.last_assistant_message.trim().length > 0) {
    return payload.last_assistant_message;
  }
  const lines = readTranscriptTail(payload.transcript_path).split("\n");
  const blocks = [];
  let inAssistantRun = false;
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index].trim();
    if (line.length === 0) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (!entry || typeof entry !== "object") continue;
    if (entry.type !== "assistant") {
      if (inAssistantRun) break;
      continue;
    }
    inAssistantRun = true;
    const content = entry.message?.content;
    if (!Array.isArray(content)) continue;
    for (let block = content.length - 1; block >= 0; block -= 1) {
      if (content[block]?.type === "text" && typeof content[block].text === "string") blocks.push(content[block].text);
    }
  }
  return blocks.reverse().join("\n");
}

export function calqueNudgeContext(payload, env = process.env) {
  if (!isCalqueNudgeEnabled(env)) return null;
  const text = lastAssistantText(payload);
  if (text.length === 0 || koreanRatio(text) < KOREAN_THRESHOLD) return null;
  const prose = removeProtectedProseSpans(text);
  const findings = [];
  for (const [id, pattern] of CALQUE_GATING_PATTERNS) {
    const spans = [...prose.matchAll(pattern)].map((match) => match[0]).slice(0, MAX_SPANS_PER_ID);
    if (spans.length > 0) findings.push({ id, spans });
  }
  if (findings.length === 0) return null;
  return [
    "Superloopy calque nudge (advisory, not a gate): the previous reply carried English calques in Korean prose.",
    ...findings.map(({ id, spans }) => `- ${id} ${spans.map((span) => `\`${span}\``).join(", ")} — ${CALQUE_REPAIR_HINTS[id]}`),
    "Repair ladder: delete the adverb when the verb already carries it; otherwise state the observed symptom from supplied facts; never swap in a stock phrase. See skills/humanize-korean/references/quick-rules.md (P family)."
  ].join("\n");
}

// Fold the nudge into whatever the prompt hook already produced. An empty output becomes a plain
// additionalContext; an existing additionalContext gets the nudge appended below its body and is
// re-measured so the context-cost trailer stays last and single. Steering results carry no
// hookSpecificOutput and are data for the host, so they pass through untouched.
export function mergeAdditionalContext(output, hookEventName, extraText) {
  if (extraText === null) return output;
  if (output === "") return formatMeasuredAdditionalContext(hookEventName, extraText);
  let parsed;
  try {
    parsed = JSON.parse(output);
  } catch {
    return output;
  }
  const existing = parsed?.hookSpecificOutput?.additionalContext;
  if (typeof existing !== "string") return output;
  const { hookSpecificOutput, ...rest } = parsed;
  const { additionalContext: _dropped, hookEventName: _event, ...restSpecific } = hookSpecificOutput;
  const body = existing.replace(CONTEXT_COST_TRAILER, "");
  return formatMeasuredAdditionalContext(hookEventName, `${body}\n\n${extraText}`, { ...rest, hookSpecificOutput: restSpecific });
}
