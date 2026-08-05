import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const PLACEHOLDER_PATTERN = /⟦SIS:[A-Za-z0-9_-]+:[a-z-]+:\d+⟧/gu;

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

function compareSignatures(source, final) {
  return { ok: JSON.stringify(source) === JSON.stringify(final), source, final };
}

function frontmatterBlocks(text) {
  const match = /^(?:\uFEFF)?---[^\r\n]*\r?\n[\s\S]*?\r?\n---[ \t]*(?=\r?\n|$)/.exec(text);
  return match ? [match[0]] : [];
}

function headingSignatures(text) {
  const headings = [];
  for (const match of text.matchAll(/^(#{1,6})[ \t]+(.+?)[ \t]*$/gmu)) {
    headings.push({ level: match[1].length, text: match[2].replace(/[ \t]+#+$/, "") });
  }
  return headings;
}

function fenceSignatures(text) {
  const fences = [];
  for (const match of text.matchAll(/^(?: {0,3})(`{3,}|~{3,})([^\r\n]*)\r?\n[\s\S]*?^(?: {0,3})\1[ \t]*$/gmu)) {
    const info = match[2].trim();
    fences.push({ language: info.split(/[ \t]+/u)[0] || "", value: match[0] });
  }
  return fences;
}

function tableSignatures(text) {
  const tables = [];
  for (const match of text.matchAll(/^(?:\|.*\|[ \t]*)(?:\r?\n\|.*\|[ \t]*)*$/gmu)) {
    const rowColumns = match[0].split(/\r?\n/u).map((line) => line.trim().slice(1, -1).split("|").length);
    tables.push({ rows: rowColumns.length, rowColumns });
  }
  return tables;
}

function structureCheck(sourceText, finalText) {
  const frontmatter = compareSignatures(frontmatterBlocks(sourceText), frontmatterBlocks(finalText));
  const headings = compareSignatures(headingSignatures(sourceText), headingSignatures(finalText));
  const fences = compareSignatures(fenceSignatures(sourceText), fenceSignatures(finalText));
  const tables = compareSignatures(tableSignatures(sourceText), tableSignatures(finalText));
  const checks = { frontmatter, headings, fences, tables };
  const problems = Object.entries(checks)
    .filter(([, check]) => !check.ok)
    .map(([name, check]) => ({ check: `structure.${name}`, source: check.source, final: check.final }));
  return { ok: problems.length === 0, ...checks, problems };
}

function placeholderMatches(text) {
  return Array.from(text.matchAll(PLACEHOLDER_PATTERN), (match) => match[0]);
}

function placeholderCheck(sourceText, finalText) {
  const sourceCollisions = placeholderMatches(sourceText);
  const unresolved = placeholderMatches(finalText);
  const problems = [];
  if (sourceCollisions.length > 0) problems.push({ check: "placeholders.collision", values: sourceCollisions, message: "Source contains placeholder-shaped text; choose a different run tag." });
  if (unresolved.length > 0) problems.push({ check: "placeholders.unresolved", values: unresolved });
  return { ok: problems.length === 0, sourceCollisions, unresolved, problems };
}

function lengthMetrics(sourceText, finalText) {
  const sourceCharacters = sourceText.length;
  const finalCharacters = finalText.length;
  const lengthDeltaRate = sourceCharacters === 0 ? null : (finalCharacters - sourceCharacters) / sourceCharacters;
  return {
    sourceCharacters,
    finalCharacters,
    lengthDeltaRate,
    shrinkageRate: lengthDeltaRate === null ? null : Math.max(0, -lengthDeltaRate)
  };
}

function lengthWarnings(metrics) {
  const warnings = [];
  if (metrics.shrinkageRate !== null && metrics.shrinkageRate > 0.35) {
    warnings.push({ check: "metrics.shrinkage", value: metrics.shrinkageRate, threshold: 0.35 });
  }
  if (metrics.lengthDeltaRate !== null && metrics.lengthDeltaRate > 0.5) {
    warnings.push({ check: "metrics.expansion", value: metrics.lengthDeltaRate, threshold: 0.5 });
  }
  return warnings;
}

export function auditTexts(sourceText, finalText, options = {}) {
  const sourceSpans = extractProtectedSpans(sourceText, options);
  const finalSpans = extractProtectedSpans(finalText, options);
  const protectedCheck = compareProtectedSpans(sourceSpans, finalSpans, finalText);
  const numbers = compareNumberMultisets(sourceSpans, finalSpans);
  const structure = structureCheck(sourceText, finalText);
  const placeholders = placeholderCheck(sourceText, finalText);
  const metrics = lengthMetrics(sourceText, finalText);
  const problems = [...protectedCheck.problems, ...numbers.problems, ...structure.problems, ...placeholders.problems];
  return {
    schemaVersion: 1,
    ok: problems.length === 0,
    checks: { protected: protectedCheck, numbers, structure, placeholders },
    metrics,
    problems,
    warnings: lengthWarnings(metrics)
  };
}

class CliArgumentError extends Error {}

class CliReadableError extends Error {
  constructor(check, message) {
    super(message);
    this.check = check;
  }
}

function usageError() {
  return new CliArgumentError("Usage: --source <path> --final <path> --report <path> [--protected <json-path>]");
}

function parseArguments(argv) {
  const values = {};
  const flags = new Set(["--source", "--final", "--report", "--protected"]);
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flags.has(flag) || !value || value.startsWith("--") || values[flag] !== undefined) throw usageError();
    values[flag] = value;
  }
  if (!values["--source"] || !values["--final"] || !values["--report"]) throw usageError();
  return values;
}

async function readCliInput(path, check) {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    throw new CliReadableError(check, `${check} failed: ${error.message}`);
  }
}

async function readProtectedValues(path) {
  const text = await readCliInput(path, "cli.protected.read");
  let manifest;
  try {
    manifest = JSON.parse(text);
  } catch (error) {
    throw new CliReadableError("cli.protected-manifest", `cli.protected-manifest failed: ${error.message}`);
  }
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest) || Object.keys(manifest).length !== 1 || !Object.hasOwn(manifest, "values") || !Array.isArray(manifest.values) || !manifest.values.every((value) => typeof value === "string")) {
    throw new CliReadableError("cli.protected-manifest", "cli.protected-manifest failed: expected { values: [\"exact text\"] }");
  }
  return manifest.values;
}

function emptyStructureCheck() {
  const empty = { ok: true, source: [], final: [] };
  return { ok: true, frontmatter: empty, headings: empty, fences: empty, tables: empty, problems: [] };
}

function cliFailureReport(error) {
  return {
    schemaVersion: 1,
    ok: false,
    checks: {
      protected: { ok: true, missing: { ok: true, values: [] }, count: { ok: true, missing: [], added: [] }, order: { ok: true, positions: [] }, problems: [] },
      numbers: { ok: true, missing: [], added: [], problems: [] },
      structure: emptyStructureCheck(),
      placeholders: { ok: true, sourceCollisions: [], unresolved: [], problems: [] }
    },
    metrics: { sourceCharacters: null, finalCharacters: null, lengthDeltaRate: null, shrinkageRate: null },
    problems: [{ check: error.check, message: error.message }],
    warnings: []
  };
}

export async function runCli(argv = process.argv.slice(2)) {
  const args = parseArguments(argv);
  let report;
  try {
    const protectedValues = args["--protected"] ? await readProtectedValues(args["--protected"]) : [];
    const sourceText = await readCliInput(args["--source"], "cli.source.read");
    const finalText = await readCliInput(args["--final"], "cli.final.read");
    report = auditTexts(sourceText, finalText, { protectedValues });
  } catch (error) {
    if (!(error instanceof CliReadableError)) throw error;
    report = cliFailureReport(error);
  }
  await writeFile(args["--report"], `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().then((report) => {
    process.exitCode = report.ok ? 0 : 1;
  }).catch((error) => {
    console.error(error.message);
    process.exitCode = error instanceof CliArgumentError ? 2 : 1;
  });
}
