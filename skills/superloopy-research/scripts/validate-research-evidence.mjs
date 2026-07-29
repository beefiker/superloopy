#!/usr/bin/env node
// Mechanical gate for a Superloopy research session: the claim ledger and the synthesis
// are checked against the Phase 3b rules instead of trusting that the rules were followed.
// Prose rules only bind when something fails closed on them, so this exits non-zero.
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const LEDGER_COLUMNS = [
  "id",
  "claim",
  "risk",
  "cost",
  "observations",
  "counter",
  "primary",
  "observed",
  "as-of",
  "depends-on",
  "status"
];
const STATUSES = new Set(["verified", "unresolved", "refuted", "deferred"]);
const RISKS = new Set(["high", "normal"]);
// Surface labels are a closed vocabulary so that "two independent surfaces" is checkable.
// A free-text label lets one observation be relabelled into two.
export const SURFACES = new Set([
  "rendered",
  "api",
  "repo",
  "registry",
  "standard",
  "filing",
  "legal",
  "dataset",
  "survey",
  "press",
  "community",
  "runtime"
]);
// Surfaces produced by the system or authority itself rather than by commentary about it.
// A high-risk claim standing only on press and community text has no primary footing.
export const PRIMARY_SURFACES = new Set([
  "api",
  "repo",
  "registry",
  "standard",
  "filing",
  "legal",
  "dataset",
  "runtime"
]);
const BLOCKED_COLUMNS = ["url", "tiers", "reason", "substitute", "status"];
const BLOCKED_STATUSES = new Set(["substituted", "gap", "open"]);
const LADDER_TIERS = new Set(["api", "plain", "tls", "headless"]);
// Reasons that make later ladder tiers pointless: no client trick defeats a login or a takedown.
const TERMINAL_REASONS = new Set(["auth-required", "paywall", "removed", "legal"]);
const EMPTY_VALUES = new Set(["", "-", "none", "n/a", "na", "tbd", "unknown"]);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u;
const REQUIRED_SYNTHESIS_SECTIONS = [
  "Executive answer",
  "Sources",
  "Verified claims",
  "Contradictions",
  "Gaps"
];

const args = parseArgs(process.argv.slice(2));
if (isDirectRun()) {
  if (args.help || args.root === undefined) {
    process.stdout.write(
      "Usage: validate-research-evidence.mjs --root <evidence-root> [--json] [--report <path>]\n"
    );
    process.exit(args.help ? 0 : 2);
  }

  let report;
  try {
    report = await validate(args.root);
  } catch (error) {
    report = {
      ok: false,
      root: args.root,
      problems: [error instanceof Error ? error.message : String(error)],
      ledger: null,
      synthesis: null
    };
  }

  if (args.report !== undefined) await writeFile(args.report, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(args.json ? `${JSON.stringify(report, null, 2)}\n` : `${formatReport(report)}\n`);
  process.exit(report.ok ? 0 : 1);
}

function isDirectRun() {
  return process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
}

export async function validate(root) {
  const problems = [];
  const ledgerText = await readOptional(join(root, "claim-ledger.md"));
  if (ledgerText === null) {
    return {
      ok: false,
      root,
      problems: ["Missing claim-ledger.md: the synthesis has no allowlist to draw from."],
      ledger: null,
      synthesis: null
    };
  }

  const ledger = parseLedger(ledgerText);
  problems.push(...ledger.problems);
  problems.push(...checkRows(ledger.rows));
  problems.push(...checkDependencies(ledger.rows));

  const synthesisText = await readOptional(join(root, "SYNTHESIS.md"));
  const synthesis = synthesisText === null ? null : checkSynthesis(synthesisText, ledger.rows);
  if (synthesis === null) {
    problems.push("Missing SYNTHESIS.md: research is not complete without the cited deliverable.");
  } else {
    problems.push(...synthesis.problems);
  }

  // A blocked source is only allowed to leave the run once the ladder is exhausted and the
  // outcome is recorded: silently dropped sources are the coverage gap nobody sees.
  const blockedText = await readOptional(join(root, "blocked-sources.md"));
  const blocked = blockedText === null ? null : parseBlockedSources(blockedText);
  if (blocked !== null) {
    problems.push(...blocked.problems);
    problems.push(...checkBlockedSources(blocked.rows, synthesisText ?? ""));
  }

  return {
    ok: problems.length === 0,
    root,
    problems,
    ledger: {
      rows: ledger.rows.length,
      verified: ledger.rows.filter((row) => row.status === "verified").length,
      unresolved: ledger.rows.filter((row) => row.status === "unresolved").length,
      refuted: ledger.rows.filter((row) => row.status === "refuted").length,
      deferred: ledger.rows.filter((row) => row.status === "deferred").length
    },
    blocked: blocked === null
      ? null
      : {
          rows: blocked.rows.length,
          substituted: blocked.rows.filter((row) => row.status === "substituted").length,
          gap: blocked.rows.filter((row) => row.status === "gap").length,
          open: blocked.rows.filter((row) => row.status === "open").length
        },
    synthesis: synthesis === null ? null : { sources: synthesis.sources, citations: synthesis.citations }
  };
}

export function parseBlockedSources(text) {
  const problems = [];
  const rows = [];
  const tableLines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|"));
  const headerIndex = tableLines.findIndex((line) => cells(line)[0]?.toLowerCase() === "url");
  if (headerIndex === -1) {
    return { rows, problems: ["blocked-sources.md has no table header starting with `url`."] };
  }
  const header = cells(tableLines[headerIndex]).map((cell) => cell.toLowerCase());
  const missing = BLOCKED_COLUMNS.filter((column) => !header.includes(column));
  if (missing.length > 0) problems.push(`blocked-sources.md header missing columns: ${missing.join(", ")}.`);

  for (const line of tableLines.slice(headerIndex + 1)) {
    const values = cells(line);
    if (values.length === 0 || values.every((value) => /^:?-{1,}:?$/u.test(value))) continue;
    if (values.length !== header.length) {
      problems.push(`blocked-sources.md row has ${values.length} cells, header has ${header.length}: ${values[0] ?? line}`);
      continue;
    }
    const row = {};
    header.forEach((column, index) => {
      row[column] = values[index];
    });
    row.status = (row.status ?? "").toLowerCase();
    rows.push(row);
  }
  return { rows, problems };
}

function checkBlockedSources(rows, synthesisText) {
  const problems = [];
  const gaps = section(synthesisText, "Gaps");
  for (const row of rows) {
    const url = isBlank(row.url) ? "<blank url>" : row.url;
    if (isBlank(row.url)) problems.push("blocked-sources.md row has no URL.");
    if (!BLOCKED_STATUSES.has(row.status)) {
      problems.push(`${url}: status must be substituted, gap, or open, found "${row.status}".`);
      continue;
    }
    if (row.status === "open") {
      problems.push(`${url}: still open — the ladder is unfinished, so coverage is unproven.`);
      continue;
    }

    const tiers = tokens(row.tiers).filter((tier) => LADDER_TIERS.has(tier));
    const unknownTiers = tokens(row.tiers).filter((tier) => !LADDER_TIERS.has(tier));
    if (unknownTiers.length > 0) {
      problems.push(`${url}: unknown ladder tier(s) ${unknownTiers.join(", ")}; use ${[...LADDER_TIERS].join(", ")}.`);
    }
    const terminal = tokens(row.reason).some((word) => TERMINAL_REASONS.has(word));
    if (!terminal && tiers.length < LADDER_TIERS.size) {
      problems.push(
        `${url}: only ${tiers.length}/${LADDER_TIERS.size} ladder tiers tried and no terminal reason (${[...TERMINAL_REASONS].join(", ")}) — not exhausted.`
      );
    }
    if (isBlank(row.reason)) problems.push(`${url}: no terminal reason recorded.`);
    if (row.status === "substituted" && isBlank(row.substitute)) {
      problems.push(`${url}: marked substituted with no substitute source.`);
    }
    if (row.status === "gap" && !gaps.includes(row.url)) {
      problems.push(`${url}: recorded as a gap but the synthesis Gaps section never names it.`);
    }
  }
  return problems;
}

export function tokens(value) {
  if (isBlank(value)) return [];
  return value
    .toLowerCase()
    .split(/[\s,;·/]+/u)
    .map((token) => token.trim())
    .filter((token) => token !== "");
}

async function readOptional(path) {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
    throw error;
  }
}

export function parseLedger(text) {
  const problems = [];
  const rows = [];
  const tableLines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|"));
  const headerIndex = tableLines.findIndex((line) => cells(line)[0]?.toLowerCase() === "id");
  if (headerIndex === -1) {
    return { rows, problems: ["claim-ledger.md has no ledger table header starting with `id`."] };
  }

  const header = cells(tableLines[headerIndex]).map((cell) => cell.toLowerCase());
  const missing = LEDGER_COLUMNS.filter((column) => !header.includes(column));
  if (missing.length > 0) problems.push(`Ledger header missing columns: ${missing.join(", ")}.`);

  const seen = new Set();
  for (const line of tableLines.slice(headerIndex + 1)) {
    const values = cells(line);
    if (values.length === 0 || values.every((value) => /^:?-{1,}:?$/u.test(value))) continue;
    if (values.length !== header.length) {
      problems.push(`Ledger row has ${values.length} cells, header has ${header.length}: ${values[0] ?? line}`);
      continue;
    }
    const row = {};
    header.forEach((column, index) => {
      row[column] = values[index];
    });
    row.status = (row.status ?? "").toLowerCase();
    row.risk = (row.risk ?? "").toLowerCase();
    if (seen.has(row.id)) problems.push(`Duplicate ledger id: ${row.id}`);
    seen.add(row.id);
    rows.push(row);
  }
  if (rows.length === 0) problems.push("claim-ledger.md has a header but no claim rows.");
  return { rows, problems };
}

function checkRows(rows) {
  const problems = [];
  for (const row of rows) {
    const id = row.id === "" ? "<blank id>" : row.id;
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(row.id)) problems.push(`${id}: id must be a plain token.`);
    if (isBlank(row.claim)) problems.push(`${id}: claim text is empty.`);
    if (!RISKS.has(row.risk)) problems.push(`${id}: risk must be high or normal, found "${row.risk}".`);
    if (!STATUSES.has(row.status)) {
      problems.push(`${id}: status must be verified, unresolved, refuted, or deferred, found "${row.status}".`);
      continue;
    }
    if (isBlank(row.cost)) problems.push(`${id}: error cost is unpriced, so verify-or-defer was never decided.`);
    if (row.status !== "verified") continue;

    const surfaces = observationSurfaces(row.observations);
    if (surfaces.length < 2) {
      problems.push(
        `${id}: verified needs 2+ observations on distinct surfaces, found ${surfaces.length} (${row.observations}).`
      );
    }
    const unknown = surfaces.filter((surface) => !SURFACES.has(surface));
    if (unknown.length > 0) {
      problems.push(
        `${id}: unknown surface label(s) ${unknown.join(", ")}; use one of ${[...SURFACES].join(", ")}.`
      );
    }
    if (row.risk === "high" && !surfaces.some((surface) => PRIMARY_SURFACES.has(surface))) {
      problems.push(
        `${id}: a high-risk verified claim needs at least one primary surface (${[...PRIMARY_SURFACES].join(", ")}), found ${surfaces.join(", ") || "none"}.`
      );
    }
    if (isBlank(row.counter)) problems.push(`${id}: verified without a counter-search result.`);
    if (isBlank(row.primary)) problems.push(`${id}: verified without a primary source.`);
    if (!ISO_DATE.test(row.observed)) problems.push(`${id}: observed must be an ISO date, found "${row.observed}".`);
    if (row.risk === "high" && !ISO_DATE.test(row["as-of"])) {
      problems.push(`${id}: a high-risk verified claim needs an ISO as-of date, found "${row["as-of"]}".`);
    }
  }
  return problems;
}

// Two URLs on the same surface agree by construction, so the gate counts distinct surface
// labels rather than distinct links.
export function observationSurfaces(value) {
  if (isBlank(value)) return [];
  const labels = new Set();
  for (const entry of value.split(/[·|;]/u)) {
    const text = entry.trim();
    if (text === "") continue;
    // Split on the first colon that is not a URL scheme, so a bare link contributes no surface
    // label: two unlabelled URLs must not read as two independent surfaces.
    let separator = -1;
    for (let index = text.indexOf(":"); index !== -1; index = text.indexOf(":", index + 1)) {
      if (text.slice(index + 1, index + 3) === "//") continue;
      separator = index;
      break;
    }
    if (separator === -1) continue;
    const label = text.slice(0, separator).trim().toLowerCase();
    const target = text.slice(separator + 1).trim();
    if (label === "" || target === "" || label.includes("/")) continue;
    labels.add(label);
  }
  return [...labels];
}

function checkDependencies(rows) {
  const problems = [];
  const byId = new Map(rows.map((row) => [row.id, row]));
  for (const row of rows) {
    for (const dependency of dependencyIds(row["depends-on"])) {
      const target = byId.get(dependency);
      if (target === undefined) {
        problems.push(`${row.id}: depends-on references unknown id ${dependency}.`);
        continue;
      }
      if (target.id === row.id) problems.push(`${row.id}: depends on itself.`);
      if (row.status === "verified" && (target.status === "refuted" || target.status === "unresolved")) {
        problems.push(`${row.id}: verified while dependency ${dependency} is ${target.status}.`);
      }
    }
  }
  problems.push(...findCycles(rows));
  return problems;
}

export function dependencyIds(value) {
  if (isBlank(value)) return [];
  return value
    .split(/[,·;]/u)
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "");
}

function findCycles(rows) {
  const graph = new Map(rows.map((row) => [row.id, dependencyIds(row["depends-on"])]));
  const state = new Map();
  const problems = [];
  const walk = (id, path) => {
    if (state.get(id) === "done") return;
    if (state.get(id) === "open") {
      problems.push(`Dependency cycle: ${[...path, id].join(" -> ")}`);
      return;
    }
    state.set(id, "open");
    for (const next of graph.get(id) ?? []) {
      if (graph.has(next)) walk(next, [...path, id]);
    }
    state.set(id, "done");
  };
  for (const id of graph.keys()) walk(id, []);
  return problems;
}

function checkSynthesis(text, rows) {
  const problems = [];
  for (const section of REQUIRED_SYNTHESIS_SECTIONS) {
    if (!new RegExp(`^##\\s+${section}`, "mu").test(text)) problems.push(`SYNTHESIS.md missing "## ${section}" section.`);
  }

  const sources = new Set();
  for (const match of text.matchAll(/^\s*(?:[-*]\s*)?\[?Source\s+(\d+)\]?[.:)]?\s+\S/gimu)) {
    sources.add(Number(match[1]));
  }
  const citations = new Set();
  for (const match of text.matchAll(/\[Source\s+(\d+)\]/giu)) citations.add(Number(match[1]));
  const dangling = [...citations].filter((number) => !sources.has(number)).sort((a, b) => a - b);
  if (dangling.length > 0) {
    problems.push(`SYNTHESIS.md cites sources with no numbered entry: ${dangling.map((n) => `[Source ${n}]`).join(", ")}.`);
  }
  if (citations.size === 0) problems.push("SYNTHESIS.md carries no [Source N] citations.");

  // Only cleared rows may be asserted: an id in the deliverable that the ledger did not verify
  // means the gate was bypassed rather than passed.
  const verified = new Set(rows.filter((row) => row.status === "verified").map((row) => row.id));
  const blocked = rows.filter((row) => row.status !== "verified" && row.risk === "high");
  const verifiedSection = section(text, "Verified claims");
  for (const row of blocked) {
    if (new RegExp(`(^|[^A-Za-z0-9._-])${escapeId(row.id)}([^A-Za-z0-9._-]|$)`, "u").test(verifiedSection)) {
      problems.push(`SYNTHESIS.md lists ${row.id} as verified but the ledger says ${row.status}.`);
    }
  }
  for (const match of verifiedSection.matchAll(/(^|[^A-Za-z0-9._-])(C\d+)(?=[^A-Za-z0-9._-]|$)/gu)) {
    const id = match[2];
    if (!verified.has(id) && !rows.some((row) => row.id === id)) {
      problems.push(`SYNTHESIS.md verified claims reference ${id}, which is not in the ledger.`);
    }
  }
  return { problems, sources: sources.size, citations: citations.size };
}

function section(text, heading) {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => new RegExp(`^##\\s+${heading}`, "u").test(line));
  if (start === -1) return "";
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^##\s+/u.test(line));
  return (end === -1 ? rest : rest.slice(0, end)).join("\n");
}

function escapeId(id) {
  return id.replace(/[.*+?^${}()|[\]\\-]/gu, "\\$&");
}

function cells(line) {
  return line
    .replace(/^\|/u, "")
    .replace(/\|$/u, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isBlank(value) {
  return value === undefined || EMPTY_VALUES.has(value.trim().toLowerCase());
}

function formatReport(report) {
  const lines = [`Superloopy research evidence: ${report.ok ? "pass" : "fail"}`, `root: ${report.root}`];
  if (report.ledger !== null) {
    lines.push(
      `ledger: ${report.ledger.rows} rows (verified ${report.ledger.verified}, unresolved ${report.ledger.unresolved}, refuted ${report.ledger.refuted}, deferred ${report.ledger.deferred})`
    );
  }
  if (report.synthesis !== null) {
    lines.push(`synthesis: ${report.synthesis.sources} numbered sources, ${report.synthesis.citations} cited`);
  }
  if (report.blocked !== null && report.blocked !== undefined) {
    lines.push(
      `blocked sources: ${report.blocked.rows} (substituted ${report.blocked.substituted}, gap ${report.blocked.gap}, open ${report.blocked.open})`
    );
  }
  for (const problem of report.problems) lines.push(`- ${problem}`);
  return lines.join("\n");
}

function parseArgs(argv) {
  const args = { json: false, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--json") args.json = true;
    else if (token === "--help" || token === "-h") args.help = true;
    else if (token === "--root") args.root = argv[index += 1];
    else if (token === "--report") args.report = argv[index += 1];
    else if (args.root === undefined) args.root = token;
  }
  return args;
}
