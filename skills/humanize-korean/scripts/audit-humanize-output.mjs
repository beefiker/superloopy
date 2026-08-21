#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";

const PATTERNS = [
  ["A-2", /를 통해|을 통해|통하여/gu],
  ["A-3", /에 있어서|에 있어/gu],
  ["A-7", /가지고 있다|가지고 있습니다|가졌다/gu],
  ["A-8", /되어진다|되어집니다|되어졌다/gu],
  ["A-10", /할 수 있다|할 수 있을|할 수 있습니다/gu],
  ["C-11", /(고|며|지만|아서|어서),/gu],
  ["D-1", /결론적으로|따라서|요약하면|정리하면/gu],
  ["D-2", /시사하는 바가 크다|시사하는 바가 큽니다|주목할 만하다|주목할 만합니다/gu],
  ["H-1", /(^|\n|[.!?]\s)\s*(또한|따라서|즉|나아가|아울러|게다가|더욱이)/gu],
  ["I-1", /인 것이다|인 것입니다|한 것이다|한 것입니다|는 것입니다/gu],
  ["J-2", /"[^"]{1,40}"/gu],
  ["K-1", /멱등(?:성)?/gu],
  ["L-1", /안전(?:하게|합니다|하며|하고|한|성)|안심(?:하|할|시)/gu],
  ["L-2", /정확(?:하게|히)\s?(?:계산|처리|수행|동작|작동|반영|분석|파악|진행)|정확하고|정확합니다/gu],
  ["L-3", /(?:삭제|변경|수정|덮어쓰|전송|업로드|공유|수집|저장|실행)(?:하지|되지)\s?않(?:습니다|는다|아요)/gu],
  ["M-1", /[—–]/gu]
];
const REQUIRED_S1_PATTERN_IDS = ["A-2", "A-3", "A-7", "A-8", "C-11", "D-1", "D-2", "H-1", "I-1", "K-1", "L-1", "M-1"];
// L-2/L-3 warn and cap the grade instead of hard-failing: precision specs and
// legally required negative claims can legitimately keep these shapes.
const REASSURANCE_WARNING_IDS = ["L-2", "L-3"];
// Quoted spans are protected byte-for-byte, so the rewriter cannot repair J-2;
// it stays informational and is excluded from grading.
const GRADE_EXEMPT_IDS = ["J-2"];
const PROSE_SPAN_FILTERED_IDS = new Set(["K-1", "L-1", "L-2", "L-3", "M-1"]);
// Issue #44 targets product copy. In these declared genres, safety vocabulary is
// usually content (news topics, narrative, advice), so L-1 demotes from a hard
// failure to a warning that caps the grade at C. The default (no --genre, or
// 제품 문구, or an unknown value) stays strict so existing callers keep issue-#44
// enforcement unless they explicitly declare a non-product genre.
const RELAXED_L1_GENRES = new Set(["공적", "리포트", "블로그", "칼럼", "대화체"]);
// The 안전 allowance requires both a real failure and a concrete recovery or
// fallback outcome. A failure alone does not make vague reassurance useful.
const FAILURE_CONDITION_PATTERN =
  /(?:실패|오류|에러|장애|충돌|손상|망가|유실)[가-힣 ]{0,4}?(?:해도|하면|하더라도|했|한 경우|나도|나면|났|난 경우|생겨도|생기면|생겼|발생 시|발생해도|발생하면|발생했|돼도|되면|되어도|됐|된 경우|져도|지면|졌| 시 )/u;
const CONCRETE_RECOVERY_PATTERNS = [
  /안전한\s+(?:기존|이전|백업)\s+[^.!?\n]{1,40}?(?:계속\s+사용|사용을\s+계속|로\s+전환|에서\s+재개)/u,
  /(?:임시|백업|복구된|원본)\s+[^.!?\n]{0,30}?안전하게\s+(?:보관(?:되|하)|복구|복원|되돌)/u
];
const KOREAN_NAME_STOPLIST = new Set([
  "광고",
  "계획",
  "고객",
  "공지",
  "과정",
  "기능",
  "기록",
  "검증",
  "댓글",
  "도구",
  "메일",
  "문구",
  "문서",
  "문장",
  "방해",
  "사용자",
  "사람",
  "서비스",
  "성능",
  "소개글",
  "안내문",
  "업데이트",
  "요소",
  "이메일",
  "작업",
  "제품",
  "증거",
  "파일"
]);

const args = parseArgs(process.argv.slice(2));
if (!args.source || !args.final || !args.report) {
  fail("Usage: audit-humanize-output.mjs --source SOURCE --final FINAL --report REPORT");
}

let report;
try {
  report = await audit(args);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  await writeFailureReport(args.report, message);
  fail(message);
}

await writeFile(args.report, `${JSON.stringify(report, null, 2)}\n`);
if (!report.ok) fail(report.problems.join("; "));

async function audit(args) {
  const source = await readInputFile("source", args.source);
  const final = await readInputFile("final", args.final);
  const genre = args.genre ?? null;
  const strictL1 = !RELAXED_L1_GENRES.has(genre ?? "");
  const requiredIds = strictL1 ? REQUIRED_S1_PATTERN_IDS : REQUIRED_S1_PATTERN_IDS.filter((id) => id !== "L-1");
  const reassuranceIds = strictL1 ? REASSURANCE_WARNING_IDS : [...REASSURANCE_WARNING_IDS, "L-1"];
  const sourceRatio = koreanRatio(source);
  const finalRatio = koreanRatio(final);
  const protectedTokens = collectProtectedTokens(source);
  const missing = [...protectedTokens].filter((token) => !final.includes(token));
  const before = countPatterns(source);
  const after = countPatterns(final);
  const changeRate = levenshtein(source, final) / Math.max(source.length, final.length, 1);
  const problems = [];
  if (sourceRatio < 0.2) problems.push("Korean source text required");
  if (missing.length > 0) problems.push("Protected tokens changed");
  if (finalRatio < 0.2) problems.push("Final text is not Korean enough");
  if (changeRate > 0.5) problems.push("Change rate exceeds 50%");
  if (requiredS1Count(before, requiredIds) > 0 && requiredS1Count(after, requiredIds) >= requiredS1Count(before, requiredIds)) {
    problems.push("S1 AI-tell count not reduced");
  }
  if ((after["K-1"] ?? 0) > 0) problems.push("Unnecessary technical jargon remains");
  if ((after["M-1"] ?? 0) > 0) problems.push("Em dash remains in Korean prose");

  const warnings = [];
  if ((after["L-1"] ?? 0) > 0) {
    if (strictL1) problems.push("Safety-flaunting copy remains");
    else warnings.push("Safety-flaunting copy remains; delete the boast or state the concrete behavior");
  }
  if (changeRate > 0.3 && changeRate <= 0.5) warnings.push("Change rate exceeds 30%");
  if ((after["L-2"] ?? 0) > 0) warnings.push("Accuracy-flaunting copy remains; state the concrete behavior or a measurable spec instead");
  if ((after["L-3"] ?? 0) > 0) warnings.push("Negative-capability reassurance remains; say what the user should do instead");
  return {
    ok: problems.length === 0,
    grade: grade({ after, changeRate, missing, problems, requiredIds, reassuranceIds }),
    genre,
    sourceChars: source.length,
    finalChars: final.length,
    changeRate: Number(changeRate.toFixed(4)),
    koreanRatio: {
      source: Number(sourceRatio.toFixed(4)),
      final: Number(finalRatio.toFixed(4))
    },
    protectedTokens: { total: protectedTokens.size, missing },
    patterns: { before, after },
    warnings,
    problems
  };
}

async function readInputFile(label, path) {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    const reason = error instanceof Error && "code" in error ? error.code : error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to read ${label} file: ${path} (${reason})`);
  }
}

async function writeFailureReport(path, message) {
  const report = {
    ok: false,
    grade: "D",
    genre: null,
    sourceChars: 0,
    finalChars: 0,
    changeRate: 0,
    koreanRatio: { source: 0, final: 0 },
    protectedTokens: { total: 0, missing: [] },
    patterns: { before: {}, after: {} },
    warnings: [],
    problems: [message]
  };
  await writeFile(path, `${JSON.stringify(report, null, 2)}\n`);
}

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 2) {
    parsed[values[index].replace(/^--/u, "")] = values[index + 1];
  }
  return parsed;
}

function koreanRatio(text) {
  const hangul = text.match(/[\u3131-\u318E\uAC00-\uD7A3]/gu)?.length ?? 0;
  const letters = text.match(/[\p{L}]/gu)?.length ?? 0;
  return letters === 0 ? 0 : hangul / letters;
}

function collectProtectedTokens(text) {
  const patterns = [
    /https?:\/\/\S+/gu,
    /`[^`]+`/gu,
    /"[^"]+"/gu,
    /\b[A-Z][A-Za-z0-9.-]*\b/gu,
    /\b[A-Z]{2,}\b/gu,
    /\b\d+(?:\.\d+){1,}\b/gu,
    /\d{4}년\s*\d{1,2}월\s*\d{1,2}일/gu,
    /\d+(?:\.\d+)?\s?(?:%|MB|GB|KB|ms|초|분|시간|원|달러)/gu
  ];
  return new Set([
    ...patterns.flatMap((pattern) => text.match(pattern) ?? []).filter(Boolean),
    ...collectKoreanProductNameCandidates(text)
  ]);
}

function countPatterns(text) {
  return Object.fromEntries(PATTERNS.map(([id, pattern]) => {
    let input = PROSE_SPAN_FILTERED_IDS.has(id) ? removeProtectedProseSpans(text) : text;
    // Imperatives are the repair shape issue #44 asks for ("~하세요"), so they
    // are never counted as reassurance.
    if (id === "L-1" || id === "L-3") input = removeImperativeSentences(input);
    if (id === "L-1") input = removeConcreteFailureRecoverySentences(input);
    // A conditional negative ("지금 나가면 저장되지 않습니다") is a warning to the
    // reader, not capability reassurance.
    if (id === "L-3") input = removeConditionalSentences(input);
    return [id, [...input.matchAll(pattern)].length];
  }));
}

function removeProtectedProseSpans(text) {
  return text.replace(/`[^`]+`|"[^"]+"/gu, "");
}

function splitSentences(text) {
  return text.split(/(?<=[.!?])\s+|\n+/u);
}

function removeImperativeSentences(text) {
  return splitSentences(text)
    .filter((sentence) => !/(?:세요|십시오|시기 바랍니다|시길 바랍니다)[.!?"'」』]*\s*$/u.test(sentence))
    .join(" ");
}

// Issue #44: safety wording is allowed only when a stated failure is paired
// with a concrete recovery action or fallback state. The failure may be in the
// same sentence or the sentence immediately before the outcome.
function removeConcreteFailureRecoverySentences(text) {
  const sentences = splitSentences(text);
  return sentences
    .filter((sentence, index) => {
      if (!CONCRETE_RECOVERY_PATTERNS.some((pattern) => pattern.test(sentence))) return true;
      const failureContext = `${sentences[index - 1] ?? ""} ${sentence}`;
      return !FAILURE_CONDITION_PATTERN.test(failureContext);
    })
    .join(" ");
}

function removeConditionalSentences(text) {
  return splitSentences(text)
    .filter((sentence) => !/[가-힣]면[\s,]/u.test(sentence))
    .join(" ");
}

function collectKoreanProductNameCandidates(text) {
  const patterns = [
    /(?:^|[\n.!?]\s*)([\uAC00-\uD7A3][\uAC00-\uD7A3A-Za-z0-9.+-]{1,30})(?=은|는|이|가)/gu,
    /([\uAC00-\uD7A3][\uAC00-\uD7A3A-Za-z0-9.+-]{1,30})(?=\s*(?:앱|서비스|플랫폼|도구|브라우저|메신저|뷰어|에디터))/gu
  ];
  return patterns
    .flatMap((pattern) => [...text.matchAll(pattern)].map((match) => match[1]))
    .filter((token) => token.length >= 3 && !KOREAN_NAME_STOPLIST.has(token));
}

function requiredS1Count(counts, requiredIds = REQUIRED_S1_PATTERN_IDS) {
  return requiredIds.reduce((total, id) => total + (counts[id] ?? 0), 0);
}

function levenshtein(left, right) {
  let start = 0;
  while (start < left.length && start < right.length && left[start] === right[start]) start += 1;

  let leftEnd = left.length;
  let rightEnd = right.length;
  while (leftEnd > start && rightEnd > start && left[leftEnd - 1] === right[rightEnd - 1]) {
    leftEnd -= 1;
    rightEnd -= 1;
  }

  left = left.slice(start, leftEnd);
  right = right.slice(start, rightEnd);
  if (left.length === 0) return right.length;
  if (right.length === 0) return left.length;
  if (right.length > left.length) [left, right] = [right, left];

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  let current = Array.from({ length: right.length + 1 }, () => 0);
  for (let i = 1; i <= left.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
    }
    [previous, current] = [current, previous];
  }
  return previous[right.length];
}

function grade({ after, changeRate, missing, problems, requiredIds, reassuranceIds }) {
  if (problems.length > 0 || missing.length > 0 || changeRate > 0.5) return "D";
  const s1After = requiredS1Count(after, requiredIds) + reassuranceIds.reduce((total, id) => total + (after[id] ?? 0), 0);
  const s2After = Object.entries(after)
    .filter(([id]) => ![...requiredIds, ...reassuranceIds, ...GRADE_EXEMPT_IDS].includes(id))
    .reduce((total, [, count]) => total + count, 0);
  if (s1After === 0 && changeRate >= 0.1 && changeRate <= 0.3) return "A";
  if (s1After === 0 && s2After <= 4) return "B";
  return "C";
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
