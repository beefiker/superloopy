import { readFile } from "node:fs/promises";

const SKILL_URL = new URL("../skills/i-have-adhd/SKILL.md", import.meta.url);
const STOP_PATTERN = /\b(?:stop\s+adhd\s+mode|normal\s+mode)\b/iu;
const SELF_SELECTED_PATTERNS = [
  /\b(?:i\s+have|i(?:'|’)ve\s+got)\s+adhd\b/iu,
  /\b(?:make|keep|format|write)\s+(?:this|the|your|my)?\s*(?:answer|instructions?|output|response|steps?)\b.{0,40}\badhd[-\s]?friendly\b/iu,
  /\b(?:give|show|send)\s+me\b.{0,40}\badhd[-\s]?friendly\b.{0,40}\b(?:answer|instructions?|output|response|steps?)\b/iu,
  /\badhd[-\s]?friendly\s+(?:answer|instructions?|output|response|steps?)\s+(?:for\s+me|please)\b/iu,
  /(?:저는|나는|제가).{0,16}ADHD/iu,
  /(?:답변|출력|응답|설명)(?:을|를)?\s*ADHD\s*친화적(?:으로)?/iu
];
const EXECUTION_SUPPORT_PATTERNS = [
  /\b(?:i\s+)?(?:cannot|can't|can’t|struggle\s+to)\s+(?:focus|start)\b/iu,
  /\b(?:this\s+task\s+is\s+overwhelming\s+me|i(?:'m| am)\s+overwhelmed)\b/iu,
  /\b(?:one\s+step\s+at\s+a\s+time|short\s+numbered\s+steps|action[-\s]?first|easy\s+to\s+scan)\b/iu,
  /\b(?:do\s+not|don't|don’t)\s+bury\s+(?:the\s+)?(?:answer|next\s+action)\b/iu,
  /(?:집중이\s*안\s*(?:돼|돼요|됩니다)|시작하기\s*어려|너무\s*막막|한\s*단계씩|짧은\s*단계|핵심부터|행동부터)/u
];
const NON_SELF_SELECTED_CONTEXT_PATTERNS = [
  /\b(?:add|append|insert|include|remove|replace|edit|change|translate|locali[sz]e|quote|mention|use)\b.{0,80}\b(?:phrase|text|copy|string|label|help|docs?|documentation|page|settings|modal|tooltip)\b/iu,
  /\b(?:document|explain|describe|discuss|research|analy[sz]e|compare)\b.{0,100}\b(?:users?|people|customers?|adhd|focus|attention)\b/iu,
  /\b(?:users?|people|customers?|they|he|she|someone)\b.{0,40}\b(?:cannot|can't|can’t|struggle\s+to)\s+(?:focus|start)\b/iu,
  /(?:["'“‘]).{0,120}(?:\b(?:i\s+have|i\s+cannot|i\s+can't|i\s+can’t)\b|ADHD[-\s]?friendly|집중이\s*안)/iu,
  /(?:사용자|유저|고객|사람).{0,40}(?:집중이\s*안|시작하기\s*어려|너무\s*막막)/u,
  /(?:도움말|문구|문장|텍스트|카피).{0,80}(?:ADHD|집중이\s*안)/u,
  /(?:ADHD\s*친화적|집중이\s*안).{0,80}(?:문구|문장|텍스트|카피|도움말)/u
];

export function hasAdhdFriendlyOutputCue(brief) {
  if (typeof brief !== "string") return false;
  const normalized = brief.replace(/\s+/gu, " ").trim();
  if (
    normalized.length === 0
    || STOP_PATTERN.test(normalized)
    || NON_SELF_SELECTED_CONTEXT_PATTERNS.some((pattern) => pattern.test(normalized))
  ) return false;
  return [...SELF_SELECTED_PATTERNS, ...EXECUTION_SUPPORT_PATTERNS]
    .some((pattern) => pattern.test(normalized));
}

export function extractSkillBody(content) {
  if (typeof content !== "string") return "";
  const normalized = content.replace(/\r\n?/gu, "\n");
  return normalized.match(/^---\n[\s\S]*?\n---\n([\s\S]+)$/u)?.[1].trim() ?? "";
}

export async function loadAdhdFriendlyOutputOverlay(brief, options = {}) {
  if (!hasAdhdFriendlyOutputCue(brief)) return "";
  const readFileImpl = options.readFileImpl ?? readFile;
  const skillUrl = options.skillUrl ?? SKILL_URL;
  try {
    const body = extractSkillBody(await readFileImpl(skillUrl, "utf8"));
    if (body.length === 0) return "";
    return [
      "ADHD-friendly output overlay",
      "",
      "Apply this presentation overlay without inferring or asserting a diagnosis.",
      "Superloopy planning, safety, evidence, and completion requirements retain precedence.",
      "",
      body
    ].join("\n");
  } catch {
    return "";
  }
}
