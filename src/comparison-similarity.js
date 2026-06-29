import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const POLICY = "optional-local-comparison-similarity-scan";
const MIN_SHARED_BLOCK_LINES = 8;
const MAX_FINDINGS = 25;
const SKIPPED_DIRS = new Set([".git", ".superloopy", "coverage", "dist", "node_modules", "vendor"]);
const COMPARISON_CODE_EXTENSIONS = /\.(cjs|js|json|mjs|py|rb|rs|sh|ts|tsx|ya?ml)$/u;

export async function checkComparisonSimilarity(cwd, options = {}) {
  const sources = sourceSummaries(options.sources ?? [], options.comparisonPaths ?? {});
  const activeSources = sources.filter((source) => source.path !== null);
  if (activeSources.length === 0) {
    return {
      ok: true,
      policy: POLICY,
      checked: false,
      minSharedBlockLines: MIN_SHARED_BLOCK_LINES,
      sources,
      findings: []
    };
  }

  const missing = activeSources.filter((source) => !existsSync(source.path));
  if (missing.length > 0) {
    return fail(`Comparison paths missing: ${missing.map((source) => `${source.name} ${source.path}`).join(", ")}.`, sources);
  }

  try {
    attachLocalCommits(activeSources, options.comparisonPathCommits ?? {});
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error), sources);
  }

  const stale = activeSources.filter((source) => source.current === false);
  if (stale.length > 0) {
    return fail(`Local reference checkouts are stale: ${stale.map((source) => source.name).join(", ")}.`, sources);
  }

  const loopyFiles = options.listFiles(cwd).filter(isSuperloopyCodeFile);
  const comparisonBlocks = await buildComparisonBlockIndex(activeSources);
  const findings = await findCopiedBlocks(cwd, loopyFiles, comparisonBlocks);
  const checkedComparisonFiles = activeSources.reduce((total, source) => total + source.files, 0);
  const base = {
    policy: POLICY,
    checked: true,
    minSharedBlockLines: MIN_SHARED_BLOCK_LINES,
    scanned: loopyFiles.length,
    checkedReferenceFiles: checkedComparisonFiles,
    sources,
    findings
  };

  if (findings.length > 0) {
    return {
      ok: false,
      ...base,
      message: `Copied-looking comparison blocks found: ${findings.map((item) => `${item.file}:${item.lines[0]} ${item.reference}`).join(", ")}.`
    };
  }
  return { ok: true, ...base };
}

function sourceSummaries(references, paths) {
  return references.map((reference) => ({
    key: reference.key,
    name: reference.name,
    audited: reference.audited ?? null,
    path: paths[reference.key] ?? null,
    localCommit: null,
    current: null,
    files: 0
  }));
}

function attachLocalCommits(sources, commits) {
  for (const source of sources) {
    if (source.audited === null) {
      source.localCommit = null;
      source.current = null;
      continue;
    }
    source.localCommit = commits[source.key] ?? readGitHead(source.path, source.name);
    source.current = source.localCommit === source.audited;
  }
}

function readGitHead(path, name) {
  const result = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: path,
    encoding: "utf8",
    timeout: 10_000
  });
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `Unable to read ${name} checkout HEAD.`);
  }
  const head = result.stdout.trim();
  if (!/^[0-9a-f]{40}$/u.test(head)) {
    throw new Error(`Unable to parse ${name} checkout HEAD.`);
  }
  return head;
}

async function buildComparisonBlockIndex(sources) {
  const blocks = new Map();
  for (const source of sources) {
    const files = await listComparisonFiles(source.path);
    source.files = files.length;
    for (const file of files) {
      const lines = normalizedLines(await readFile(join(source.path, file), "utf8"));
      const referenceFile = normalizeComparisonPath(file);
      for (const block of lineBlocks(lines)) {
        if (!blocks.has(block.key)) {
          blocks.set(block.key, {
            reference: `${source.name}:${referenceFile}`,
            lines: block.lines
          });
        }
      }
    }
  }
  return blocks;
}

async function findCopiedBlocks(cwd, files, referenceBlocks) {
  const findings = [];
  const seen = new Set();
  for (const file of files) {
    const lines = normalizedLines(await readFile(join(cwd, file), "utf8"));
    for (const block of lineBlocks(lines)) {
      const reference = referenceBlocks.get(block.key);
      if (reference === undefined) continue;
      const key = `${file}:${block.lines[0]}:${reference.reference}`;
      if (seen.has(key)) continue;
      seen.add(key);
      findings.push({
        file,
        lines: block.lines,
        reference: reference.reference,
        referenceLines: reference.lines
      });
      if (findings.length >= MAX_FINDINGS) return findings;
    }
  }
  return findings;
}

async function listComparisonFiles(root) {
  const files = [];
  await walkComparisonFiles(root, "", files);
  return files.sort();
}

async function walkComparisonFiles(root, prefix, files) {
  for (const entry of await readdir(join(root, prefix), { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRS.has(entry.name)) await walkComparisonFiles(root, join(prefix, entry.name), files);
      continue;
    }
    if (!entry.isFile()) continue;
    const file = join(prefix, entry.name);
    if (!COMPARISON_CODE_EXTENSIONS.test(file)) continue;
    const info = await stat(join(root, file));
    if (info.size > 250_000) continue;
    files.push(normalizeComparisonPath(file));
  }
}

export function normalizeComparisonPath(path) {
  return path.split("\\").join("/");
}

function lineBlocks(lines) {
  const blocks = [];
  for (let index = 0; index <= lines.length - MIN_SHARED_BLOCK_LINES; index += 1) {
    const slice = lines.slice(index, index + MIN_SHARED_BLOCK_LINES);
    blocks.push({
      key: slice.map((line) => line.text).join("\n"),
      lines: [slice[0].line, slice[slice.length - 1].line]
    });
  }
  return blocks;
}

function normalizedLines(content) {
  return content
    .split("\n")
    .map((line, index) => ({ line: index + 1, text: normalizeLine(line) }))
    .filter((line) => line.text !== null);
}

function normalizeLine(raw) {
  const line = raw.trim();
  if (line === "" || line.startsWith("//") || line.startsWith("#") || line.startsWith("*")) return null;
  if (/^[()[\]{},;]+$/u.test(line)) return null;
  const normalized = line.replace(/\s+/gu, " ");
  return normalized.length < 18 ? null : normalized;
}

function isSuperloopyCodeFile(file) {
  return (file.startsWith("src/") && file.endsWith(".js"))
    || (file.startsWith("hooks/") && file.endsWith(".json"))
    || file === ".codex-plugin/plugin.json"
    || file === "package.json"
    || file.endsWith(".yaml");
}

function fail(message, sources) {
  return {
    ok: false,
    policy: POLICY,
    checked: true,
    minSharedBlockLines: MIN_SHARED_BLOCK_LINES,
    sources,
    findings: [],
    message
  };
}
