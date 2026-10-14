import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { SUPERLOOPY_AGENT_NAMES } from "./agent-names.js";

const POLICY = "crew-prompts-match-across-hosts";
const SNIPPET_LIMIT = 120;

// The only normalized lines allowed to differ between `agents/<name>.md` (Claude Code and Google
// Antigravity ingest it from the plugin) and `.codex/agents/<name>.toml` (Codex). Each entry must
// match exactly one line on each side; an entry that stops matching fails the check, so the list
// cannot silently outlive the drift it permits.
export const HOST_SPECIFIC_LINES = Object.freeze([
  Object.freeze({
    agent: "forge",
    claude: "- Prefer command-backed proof via the Superloopy CLI (`loop prove`/`loop capture`) when possible. On Codex and Google Antigravity invoke it as `superloopy loop prove …`; on Claude Code there is no `superloopy` wrapper, so invoke the bundled CLI directly as `node \"$CLAUDE_PLUGIN_ROOT/src/cli.js\" loop prove …`.",
    codex: "- Prefer command-backed proof with superloopy loop prove or superloopy loop capture when possible."
  })
]);

// Compares each agent's instructions across hosts after stripping the frontmatter / TOML wrapper,
// trimming and collapsing whitespace, and dropping blank lines. Reported line numbers are file lines.
export async function checkCrewPromptParity(cwd) {
  const problems = [];
  const drift = {};
  for (const agent of SUPERLOOPY_AGENT_NAMES) {
    const claudePath = `agents/${agent}.md`;
    const codexPath = `.codex/agents/${agent}.toml`;
    const claude = await loadBody(cwd, claudePath, extractMarkdownBody);
    const codex = await loadBody(cwd, codexPath, extractDeveloperInstructions);
    if (!claude.ok || !codex.ok) {
      problems.push(...[claude, codex].filter((side) => !side.ok).map((side) => side.message));
      continue;
    }
    const claudeTexts = claude.lines.map(({ text }) => text);
    const codexTexts = codex.lines.map(({ text }) => text);
    for (const [index, entry] of HOST_SPECIFIC_LINES.entries()) {
      if (entry.agent !== agent) continue;
      const claudeAt = uniqueIndex(claudeTexts, entry.claude);
      const codexAt = uniqueIndex(codexTexts, entry.codex);
      if (claudeAt === -1 || codexAt === -1) {
        problems.push(`${agent}: host-specific allowlist entry ${index} must match exactly one line in ${claudePath} and in ${codexPath}`);
        continue;
      }
      claudeTexts[claudeAt] = codexTexts[codexAt] = `\u0000host-specific:${index}`;
    }
    const diff = diffLines(claudeTexts, codexTexts);
    if (diff.claudeOnly.length === 0 && diff.codexOnly.length === 0) continue;
    drift[agent] = {
      claudeOnly: diff.claudeOnly.map((index) => claude.lines[index]),
      codexOnly: diff.codexOnly.map((index) => codex.lines[index])
    };
    problems.push(`${agent}: ${describeSide(claudePath, drift[agent].claudeOnly)}; ${describeSide(codexPath, drift[agent].codexOnly)}`);
  }
  if (problems.length > 0) {
    return { ok: false, policy: POLICY, agents: SUPERLOOPY_AGENT_NAMES, drift, message: `Crew prompt drift: ${problems.join(" | ")}.` };
  }
  return { ok: true, policy: POLICY, agents: SUPERLOOPY_AGENT_NAMES, hostSpecificLines: HOST_SPECIFIC_LINES.length };
}

async function loadBody(cwd, relativePath, extract) {
  const path = join(cwd, relativePath);
  if (!existsSync(path)) return { ok: false, message: `missing ${relativePath}` };
  const body = extract((await readFile(path, "utf8")).replace(/\r\n/gu, "\n"));
  if (body === null) return { ok: false, message: `${relativePath} has no readable instructions body` };
  return { ok: true, lines: normalizeLines(body.text, body.firstLine) };
}

function extractMarkdownBody(content) {
  const match = /^---\n[\s\S]*?\n---(?:\n|$)/u.exec(content);
  if (match === null) return null;
  return { text: content.slice(match[0].length), firstLine: lineAt(content, match[0].length) };
}

// Reads the top-level `developer_instructions = """…"""` multi-line basic string and decodes its
// TOML escapes, so the comparison sees the text Codex actually receives.
function extractDeveloperInstructions(content) {
  const match = /^developer_instructions\s*=\s*"""\n?([\s\S]*?)"""\s*$/dmu.exec(content);
  if (match === null) return null;
  const text = decodeBasicString(match[1]);
  return text === null ? null : { text, firstLine: lineAt(content, match.indices[1][0]) };
}

const SIMPLE_ESCAPES = { b: "\b", t: "\t", n: "\n", f: "\f", r: "\r", "\"": "\"", "\\": "\\" };

function decodeBasicString(raw) {
  let valid = true;
  const decoded = raw.replace(/\\(?:([btnfr"\\])|u([0-9A-Fa-f]{4})|U([0-9A-Fa-f]{8})|[ \t]*\n\s*|(.))/gu, (_, simple, short, long, invalid) => {
    if (invalid !== undefined) valid = false;
    if (simple !== undefined) return SIMPLE_ESCAPES[simple];
    if (short !== undefined || long !== undefined) return String.fromCodePoint(Number.parseInt(short ?? long, 16));
    return "";
  });
  return valid ? decoded : null;
}

function lineAt(content, offset) {
  return content.slice(0, offset).split("\n").length;
}

function normalizeLines(text, firstLine) {
  return text.split("\n")
    .map((line, index) => ({ line: firstLine + index, text: line.trim().replace(/\s+/gu, " ") }))
    .filter(({ text: normalized }) => normalized.length > 0);
}

function uniqueIndex(lines, text) {
  const index = lines.indexOf(text);
  return index !== -1 && lines.lastIndexOf(text) === index ? index : -1;
}

// Longest-common-subsequence line diff returning the unmatched indexes on each side; bodies are a
// few dozen lines, so the O(n*m) table is fine.
function diffLines(left, right) {
  const table = Array.from({ length: left.length + 1 }, () => new Array(right.length + 1).fill(0));
  for (let i = left.length - 1; i >= 0; i -= 1) {
    for (let j = right.length - 1; j >= 0; j -= 1) {
      table[i][j] = left[i] === right[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const claudeOnly = [];
  const codexOnly = [];
  let i = 0;
  let j = 0;
  while (i < left.length || j < right.length) {
    if (i < left.length && j < right.length && left[i] === right[j]) {
      i += 1;
      j += 1;
    } else if (j >= right.length || (i < left.length && table[i + 1][j] >= table[i][j + 1])) {
      claudeOnly.push(i);
      i += 1;
    } else {
      codexOnly.push(j);
      j += 1;
    }
  }
  return { claudeOnly, codexOnly };
}

function describeSide(path, lines) {
  if (lines.length === 0) return `${path} only: none`;
  return `${path} only: ${lines.map(({ line, text }) => `L${line} ${JSON.stringify(snippet(text))}`).join(", ")}`;
}

function snippet(text) {
  return text.length > SNIPPET_LIMIT ? `${text.slice(0, SNIPPET_LIMIT - 1)}…` : text;
}
