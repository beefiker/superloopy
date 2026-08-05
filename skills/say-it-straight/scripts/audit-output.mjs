import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

function addRegexCandidates(candidates, text, type, expression) {
  for (const match of text.matchAll(expression)) {
    candidates.push({ type, value: match[0], start: match.index, end: match.index + match[0].length });
  }
}

function addValueCandidates(candidates, text, protectedValues) {
  for (const value of protectedValues) {
    if (typeof value !== "string" || value.length === 0) continue;
    let start = text.indexOf(value);
    while (start !== -1) {
      candidates.push({ type: "user-frozen", value, start, end: start + value.length });
      start = text.indexOf(value, start + value.length);
    }
  }
}

function addFrontmatterCandidate(candidates, text) {
  const match = /^(?:\uFEFF)?---[^\r\n]*\r?\n[\s\S]*?\r?\n---[ \t]*(?=\r?\n|$)/.exec(text);
  if (match) {
    candidates.push({ type: "frontmatter", value: match[0], start: 0, end: match[0].length });
  }
}

function collectCandidates(text, protectedValues) {
  const candidates = [];
  addFrontmatterCandidate(candidates, text);
  addRegexCandidates(candidates, text, "fenced-code", /^(?: {0,3})(```|~~~)[^\r\n]*\r?\n[\s\S]*?^(?: {0,3})\1[ \t]*$/gm);
  addRegexCandidates(candidates, text, "inline-code", /`[^`\r\n]+`/g);
  addRegexCandidates(candidates, text, "table", /^(?:\|.*\|[ \t]*)(?:\r?\n\|.*\|[ \t]*)*$/gm);
  addRegexCandidates(candidates, text, "markdown-url", /\[[^\]\r\n]*\]\((?:<[^>\r\n]+>|[^)\s\r\n]+)(?:\s+["'][^"']*["'])?\)/g);
  addRegexCandidates(candidates, text, "bare-url", /\b(?:https?|ftp):\/\/[^\s<>()\[\]{}"']+[^\s<>()\[\]{}"'.,;:!?]/g);
  addRegexCandidates(candidates, text, "path", /(?:~\/|\.\.?\/|\/)(?:[\w@%+=:.-]+\/)*[\w@%+=:.-]+/g);
  addRegexCandidates(candidates, text, "citation", /\[(?:[A-Z][\w.-]*|\d+)(?:\s+[\w.-]+)*\]/g);
  addRegexCandidates(candidates, text, "quotation", /"(?:[^"\\\r\n]|\\.)*"|“[^”\r\n]*”/g);
  addRegexCandidates(candidates, text, "number", /[+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?(?:%|[a-zA-Z]+)?/g);
  addValueCandidates(candidates, text, protectedValues);
  return candidates;
}

function acceptNonOverlapping(accepted, candidate) {
  const previous = accepted.at(-1);
  if (!previous || candidate.start >= previous.end) accepted.push(candidate);
  return accepted;
}

export function extractProtectedSpans(text, options = {}) {
  const protectedValues = Array.isArray(options.protectedValues) ? options.protectedValues : [];
  return collectCandidates(text, protectedValues)
    .sort((left, right) => left.start - right.start || right.end - left.end)
    .reduce(acceptNonOverlapping, []);
}

function countValues(spans, keyForSpan = (span) => `${span.type}\u0000${span.value}`) {
  const counts = new Map();
  for (const span of spans) {
    const key = keyForSpan(span);
    const entry = counts.get(key) ?? { value: span.value, count: 0 };
    entry.count += 1;
    counts.set(key, entry);
  }
  return counts;
}

function compareCounts(sourceSpans, finalSpans, keyForSpan) {
  const sourceCounts = countValues(sourceSpans, keyForSpan);
  const finalCounts = countValues(finalSpans, keyForSpan);
  const missing = [];
  const added = [];

  for (const [key, source] of sourceCounts) {
    const final = finalCounts.get(key);
    for (let index = final?.count ?? 0; index < source.count; index += 1) missing.push(source.value);
  }
  for (const [key, final] of finalCounts) {
    const source = sourceCounts.get(key);
    for (let index = source?.count ?? 0; index < final.count; index += 1) added.push(final.value);
  }

  return { ok: missing.length === 0 && added.length === 0, missing, added };
}

function valuesMissingEntirely(sourceSpans, finalSpans) {
  const finalCounts = countValues(finalSpans);
  const values = [];
  const seen = new Set();
  for (const span of sourceSpans) {
    const key = `${span.type}\u0000${span.value}`;
    if (!finalCounts.has(key) && !seen.has(key)) {
      seen.add(key);
      values.push(span.value);
    }
  }
  return { ok: values.length === 0, values };
}

function sourceValuesAppearInOrder(sourceSpans, finalText) {
  let previousEnd = 0;
  const positions = [];
  for (const span of sourceSpans) {
    const start = finalText.indexOf(span.value, previousEnd);
    if (start === -1) return { ok: false, positions };
    positions.push(start);
    previousEnd = start + span.value.length;
  }
  return { ok: true, positions };
}

function compareProtectedSpans(sourceSpans, finalSpans, finalText) {
  const missing = valuesMissingEntirely(sourceSpans, finalSpans);
  const count = compareCounts(sourceSpans, finalSpans);
  const order = sourceValuesAppearInOrder(sourceSpans, finalText);
  const problems = [];
  if (!missing.ok) problems.push({ check: "protected.missing", values: missing.values });
  if (!count.ok) problems.push({ check: "protected.count", missing: count.missing, added: count.added });
  if (!order.ok) problems.push({ check: "protected.order" });
  return { ok: problems.length === 0, missing, count, order, problems };
}

function compareNumberMultisets(sourceSpans, finalSpans) {
  const sourceNumbers = sourceSpans.filter((span) => span.type === "number");
  const finalNumbers = finalSpans.filter((span) => span.type === "number");
  const count = compareCounts(sourceNumbers, finalNumbers, (span) => span.value);
  const problems = [];
  if (count.missing.length > 0) problems.push({ check: "numbers.missing", values: count.missing });
  if (count.added.length > 0) problems.push({ check: "numbers.added", values: count.added });
  return { ok: count.ok, missing: count.missing, added: count.added, problems };
}

function lengthMetrics(sourceText, finalText) {
  return {
    sourceLength: sourceText.length,
    finalLength: finalText.length,
    delta: finalText.length - sourceText.length,
    ratio: sourceText.length === 0 ? null : finalText.length / sourceText.length
  };
}

export function auditTexts(sourceText, finalText, options = {}) {
  const sourceSpans = extractProtectedSpans(sourceText, options);
  const finalSpans = extractProtectedSpans(finalText, options);
  const protectedCheck = compareProtectedSpans(sourceSpans, finalSpans, finalText);
  const numbers = compareNumberMultisets(sourceSpans, finalSpans);
  const problems = [...protectedCheck.problems, ...numbers.problems];
  return {
    schemaVersion: 1,
    ok: problems.length === 0,
    checks: { protected: protectedCheck, numbers },
    metrics: lengthMetrics(sourceText, finalText),
    problems,
    warnings: []
  };
}

function optionValue(argv, flag) {
  const index = argv.indexOf(flag);
  return index === -1 ? undefined : argv[index + 1];
}

export async function runCli(argv = process.argv.slice(2)) {
  const sourcePath = optionValue(argv, "--source");
  const finalPath = optionValue(argv, "--final");
  const reportPath = optionValue(argv, "--report");
  const protectedPath = optionValue(argv, "--protected");
  if (!sourcePath || !finalPath || !reportPath) {
    throw new Error("Usage: --source <path> --final <path> --report <path> [--protected <json-path>]");
  }
  const options = protectedPath ? { protectedValues: JSON.parse(await readFile(protectedPath, "utf8")) } : {};
  const report = auditTexts(await readFile(sourcePath, "utf8"), await readFile(finalPath, "utf8"), options);
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().then((report) => {
    process.exitCode = report.ok ? 0 : 1;
  }).catch((error) => {
    console.error(error.message);
    process.exitCode = 2;
  });
}
