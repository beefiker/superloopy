import { readFile, writeFile } from "node:fs/promises";

const PATTERNS = {
  "PC-1-safety": /(?<![가-힣])안전(?:하게|하고\s*정확하게)\s*(?:처리|진행)(?:했습니다|합니다|됩니다)|안심하고\s*(?:계속\s*)?사용하세요/gu,
  "PC-1-accuracy": /(?<![가-힣])정확(?:하게|하고\s*안전하게)\s*(?:계산|처리|진행)(?:했습니다|합니다|됩니다)/gu,
  "PC-2-vague-failure": /(?:저장|적용|처리)에\s*실패해도\s*[^\r\n]*?안전하게\s*남습니다|저장에\s*실패해도\s*데이터는\s*안전합니다/gu,
  "PC-3-negative-capability": /[가-힣A-Za-z0-9]+하지\s*않습니다|전송되지\s*않습니다/gu,
  "PC-2-failure": /(?:실패|오류)/gu
};

function normalize(text) {
  return text.replace(/\r\n?/gu, "\n");
}

function countMatches(text, expression) {
  return [...text.matchAll(expression)].length;
}

function patternCounts(text) {
  return Object.fromEntries(Object.entries(PATTERNS).map(([id, expression]) => [id, countMatches(text, expression)]));
}

function collectProtectedTokens(text) {
  const candidates = [];
  const add = (type, expression) => {
    for (const match of text.matchAll(expression)) candidates.push({ type, value: match[0], start: match.index, end: match.index + match[0].length });
  };
  add("code", /`[^`\r\n]+`/gu);
  add("url", /\bhttps?:\/\/[^\s<>()\[\]{}"']+[^\s<>()\[\]{}"'.,;:!?]/gu);
  add("path", /(?:\.?\.?\/|\/)[^\s<>:"|?*]+|[A-Za-z]:\\[^\s<>:"|?*]+/gu);
  add("quote", /"[^"\r\n]+"|“[^”\r\n]+”|‘[^’\r\n]+’|「[^」\r\n]+」|『[^』\r\n]+』/gu);
  add("legal", /(?:제\s*\d+\s*조|Article\s+\d+)/giu);
  add("number", /(?<![\p{L}\p{N}_])[+-]?(?:\d+(?:[.,]\d+)?)(?:%|[A-Za-z가-힣]+)?/gu);
  return candidates
    .sort((left, right) => left.start - right.start || right.end - left.end)
    .reduce((accepted, candidate) => {
      const previous = accepted.at(-1);
      if (!previous || candidate.start >= previous.end) accepted.push(candidate);
      return accepted;
    }, []);
}

function missingProtectedTokens(sourceText, finalText) {
  const remaining = new Map();
  for (const token of collectProtectedTokens(finalText)) {
    const key = `${token.type}\u0000${token.value}`;
    remaining.set(key, (remaining.get(key) ?? 0) + 1);
  }
  const missing = [];
  for (const token of collectProtectedTokens(sourceText)) {
    const key = `${token.type}\u0000${token.value}`;
    const count = remaining.get(key) ?? 0;
    if (count === 0) missing.push(token.value);
    else remaining.set(key, count - 1);
  }
  return missing;
}

function levenshtein(left, right) {
  if (left.length < right.length) [left, right] = [right, left];
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= right.length; column += 1) {
      current[column] = Math.min(current[column - 1] + 1, previous[column] + 1, previous[column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1));
    }
    previous = current;
  }
  return previous[right.length];
}

function createErrorReport(id, message) {
  return {
    schemaVersion: 1,
    ok: false,
    problems: [{ id, message }],
    manualReview: [],
    patterns: { before: patternCounts(""), after: patternCounts("") },
    protected: { ok: false, missing: [] },
    changeRate: null
  };
}

export function auditTexts(source, final) {
  const sourceText = normalize(source);
  const finalText = normalize(final);
  const before = patternCounts(sourceText);
  const after = patternCounts(finalText);
  const problems = [];
  const manualReview = [];
  const missing = missingProtectedTokens(sourceText, finalText);
  const changeRate = levenshtein(sourceText, finalText) / Math.max(sourceText.length, finalText.length, 1);

  if (missing.length > 0) problems.push({ id: "protected-token", message: "Protected source tokens are missing", values: missing });
  if (after["PC-1-safety"] > 0) problems.push({ id: "PC-1-safety", message: "Vague safety reassurance remains" });
  if (after["PC-1-accuracy"] > 0) problems.push({ id: "PC-1-accuracy", message: "Vague accuracy reassurance remains" });
  if (after["PC-2-vague-failure"] > 0) problems.push({ id: "PC-2-vague-failure", message: "Failure copy states reassurance without a concrete outcome or action" });
  if (after["PC-3-negative-capability"] > 0) manualReview.push({ id: "PC-3-negative-capability", message: "Confirm whether this is a privacy, legal, or operational commitment" });
  if (after["PC-2-failure"] > 0 && after["PC-2-vague-failure"] === 0) manualReview.push({ id: "PC-2-failure", message: "Confirm the message states the supported outcome, fallback, or next action" });
  if (changeRate > 0.5) manualReview.push({ id: "large-rewrite", message: "Review the large rewrite for unsupported product claims" });

  return {
    schemaVersion: 1,
    ok: problems.length === 0,
    problems,
    manualReview,
    patterns: { before, after },
    protected: { ok: missing.length === 0, missing },
    changeRate
  };
}

function parseArguments(argumentsList) {
  const values = {};
  for (let index = 0; index < argumentsList.length; index += 2) {
    const flag = argumentsList[index];
    const value = argumentsList[index + 1];
    if (!["--source", "--final", "--report"].includes(flag) || !value || value.startsWith("--") || values[flag]) throw new Error("Expected one each of --source, --final, and --report");
    values[flag] = value;
  }
  if (!values["--source"] || !values["--final"] || !values["--report"]) throw new Error("Expected one each of --source, --final, and --report");
  return { source: values["--source"], final: values["--final"], report: values["--report"] };
}

function reportPathFrom(argumentsList) {
  const index = argumentsList.indexOf("--report");
  return index >= 0 && argumentsList[index + 1] && !argumentsList[index + 1].startsWith("--") ? argumentsList[index + 1] : null;
}

async function writeReport(path, report) {
  if (path) await writeFile(path, `${JSON.stringify(report, null, 2)}\n`);
}

async function main() {
  const reportPath = reportPathFrom(process.argv.slice(2));
  try {
    const paths = parseArguments(process.argv.slice(2));
    const [source, final] = await Promise.all([readFile(paths.source, "utf8"), readFile(paths.final, "utf8")]);
    const report = auditTexts(source, final);
    await writeReport(paths.report, report);
    process.exitCode = report.ok ? 0 : 1;
  } catch (error) {
    const id = error.message === "Expected one each of --source, --final, and --report" ? "arguments" : "input";
    const report = createErrorReport(id, error.message);
    await writeReport(reportPath, report);
    process.stderr.write(`${report.problems[0].message}\n`);
    process.exitCode = 1;
  }
}

if (import.meta.url === new URL(process.argv[1], "file:").href) await main();
