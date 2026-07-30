import { readFile } from "node:fs/promises";

const SKILL_URL = new URL("../skills/i-have-adhd/SKILL.md", import.meta.url);
const STOP_PATTERN = /\b(?:stop\s+adhd\s+mode|normal\s+mode)\b/iu;
const DIRECT_ADHD_OUTPUT_REQUEST_PATTERNS = [
  /(?:^|[.;!?]\s*|,\s*)(?:(?:please|kindly)\s+)?(?:make|keep|format|write)\s+(?:this|the|your|my)?\s*(?:answer|instructions?|output|response|steps?)\b.{0,40}\badhd[-\s]?friendly\b/iu,
  /(?:^|[.;!?]\s*|,\s*)(?:(?:please|kindly)\s+)?(?:(?:could|can|would)\s+you\s+)?(?:give|show|send)\s+me\b.{0,40}\badhd[-\s]?friendly\b.{0,40}\b(?:answer|instructions?|output|response|steps?)\b/iu,
  /(?:^|[.;!?]\s*|,\s*)(?:(?:please|kindly)\s+)?adhd[-\s]?friendly\s+(?:answer|instructions?|output|response|steps?)\s+(?:for\s+me|please)\b/iu,
  /(?:^|[.!?]\s*)(?:답변|출력|응답|설명)(?:을|를)?\s*ADHD\s*친화적(?:으로)?/iu
];
const DIRECT_PRESENTATION_REQUEST_PATTERNS = [
  /(?:^|[.;!?]\s*|,\s*)(?:(?:please|kindly)\s+)?(?:keep|make|give|show|send|use|provide|write|format|break(?:\s+down)?|present|organize|lead|start|respond|answer|tell)\b.{0,80}\b(?:one\s+step\s+at\s+a\s+time|short(?:\s+numbered)?\s+steps?|steps?\s+short|one\s+action|next\s+action)\b/iu,
  /(?:^|[.;!?]\s*|,\s*)(?:(?:please|kindly)\s+)?(?:keep|make|give|show|send|use|provide|write|format|break(?:\s+down)?|present|organize|lead|start|respond|answer|tell)\b.{0,40}\b(?:answer|instructions?|output|response|steps?)\b.{0,40}\b(?:action[-\s]?first|easy\s+to\s+scan)\b/iu,
  /(?:^|[.;!?]\s*|,\s*)(?:do\s+not|don't|don’t)\s+bury\s+(?:the\s+)?(?:answer|next\s+action)\b/iu,
  /(?:^|[.!?]\s*)(?:한\s*단계씩|짧은\s*단계|핵심부터|행동부터|읽기\s*쉽게|단계별(?:로)?).{0,30}(?:알려줘|정리해줘|진행해줘|설명해줘|보여줘)/u
];
const SELF_SELECTED_DISCLOSURE_PATTERNS = [
  /(?:^|[.;!?]\s*|,\s*)(?:i\s+have|i(?:'|’)ve\s+got)\s+adhd\b(?=\s*(?:[.;!?]|$|(?:and|but)\b))/iu,
  /(?:^|[.!?]\s*)(?:저는|나는|제가)\s*ADHD(?:가\s*)?(?:있(?:어|어요|습니다)|예요|이에요|입니다|진단(?:을)?\s*받(?:았|았어요|았습니다))(?=\s*(?:[.!?]|$))/iu
];
const EXECUTION_FRICTION_PATTERNS = [
  /(?:^|[.;!?]\s*|,\s*)i\s+(?:cannot|can't|can’t|struggle\s+to)\s+(?:focus|start)\b(?=\s*(?:[.;!?]|,|$))/iu,
  /(?:^|[.;!?]\s*|,\s*)(?:this\s+task\s+is\s+overwhelming\s+me|i(?:'m| am)\s+overwhelmed)\b(?=\s*(?:[.;!?]|$))/iu,
  /(?:^|[.!?]\s*)(?:집중이\s*안\s*(?:돼|돼요|됩니다)|시작하기\s*어려|너무\s*막막(?:해요|합니다|해)?)(?=\s*(?:[.!?]|$))/u
];
const PRESENTATION_REQUEST_PATTERNS = [
  /\b(?:keep|make|give|show|send|use|provide|write|format|break(?:\s+down)?|present|organize|lead|start|respond|answer|tell|edit|add)\b.{0,80}\b(?:one\s+step\s+at\s+a\s+time|short(?:\s+numbered)?\s+steps?|steps?\s+short|one\s+action|next\s+action)\b/iu,
  /\b(?:keep|make|give|show|send|use|provide|write|format|break(?:\s+down)?|present|organize|lead|start|respond|answer|tell|edit|add)\b.{0,40}\b(?:answer|instructions?|output|response|steps?)\b.{0,40}\b(?:action[-\s]?first|easy\s+to\s+scan)\b/iu,
  /(?:한\s*단계씩|짧은\s*단계|핵심부터|행동부터|읽기\s*쉽게|단계별(?:로)?).{0,30}(?:알려줘|정리해줘|진행해줘|설명해줘|보여줘)/u
];

export function hasAdhdFriendlyOutputCue(brief) {
  if (typeof brief !== "string") return false;
  const normalized = brief.replace(/\s+/gu, " ").trim();
  if (normalized.length === 0 || STOP_PATTERN.test(normalized)) return false;
  const matchable = normalized
    .replace(/(?:^|[\s:])"[^"]*"/gu, " ")
    .replace(/(?:^|[\s:])“[^”]*”/gu, " ")
    .replace(/(?:^|[\s:])‘[^’]*’/gu, " ")
    .replace(/(?:^|[\s:])'[\s\S]*?'(?=\s|$|[.,;!?])/gu, " ");
  if (
    DIRECT_ADHD_OUTPUT_REQUEST_PATTERNS.some((pattern) => pattern.test(matchable))
    || DIRECT_PRESENTATION_REQUEST_PATTERNS.some((pattern) => pattern.test(matchable))
  ) {
    return true;
  }
  if (!PRESENTATION_REQUEST_PATTERNS.some((pattern) => pattern.test(matchable))) {
    return false;
  }
  return [...SELF_SELECTED_DISCLOSURE_PATTERNS, ...EXECUTION_FRICTION_PATTERNS]
    .some((pattern) => pattern.test(matchable));
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
