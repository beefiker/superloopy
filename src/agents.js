import { chmod, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, posix as pathPosix, resolve, win32 as pathWin32 } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { hasFlag, readFlag } from "./args.js";

// Worker agents (fronk/zyro/usk/jumbo) report evidence receipts; rovyn is the
// read-only auditor; nomi is the read-only navigator (no receipt). All are installed so
// the host can dispatch them; rovyn was historically shipped only as un-installable skill
// metadata (the auditor-install gap). Host role-by-name routing is NOT guaranteed, so a
// dispatch must be self-contained — see docs/superloopy-host-contract.md.
export const SUPERLOOPY_AGENT_NAMES = [
  "fronk",
  "zyro",
  "usk",
  "jumbo",
  "rovyn",
  "nomi"
];

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CLI_PATH = join(REPO_ROOT, "src", "cli.js");

export async function installAgents(cwd, argv, options = {}) {
  const force = hasFlag(argv, "--force");
  const target = resolveTargetDir(cwd, argv, options.env ?? process.env, options.homeDir ?? homedir());
  const source = options.sourceDir ?? join(REPO_ROOT, ".codex", "agents");
  await mkdir(target, { recursive: true });

  const agents = [];
  for (const name of SUPERLOOPY_AGENT_NAMES) {
    const file = `${name}.toml`;
    const sourcePath = join(source, file);
    const targetPath = join(target, file);
    if (!existsSync(sourcePath)) throw new Error(`Missing bundled agent: ${sourcePath}`);
    const status = await installOneAgent(sourcePath, targetPath, force);
    agents.push({ name, source: sourcePath, target: targetPath, status });
  }

  const conflicts = agents.filter((agent) => agent.status === "conflict");
  return {
    ok: conflicts.length === 0,
    kind: "agents_install",
    source,
    target,
    force,
    agents,
    conflicts,
    next: conflicts.length === 0
      ? "Restart Codex so the installed custom agents are loaded."
      : "Re-run with --force to replace conflicting personal agent files."
  };
}

export function formatAgentsInstallResult(result) {
  const lines = [
    `superloopy agents install: ${result.ok ? "ok" : "conflict"}`,
    `target: ${result.target}`,
    ...result.agents.map((agent) => `- ${agent.name}: ${agent.status}`)
  ];
  if (!result.ok) lines.push(result.next);
  else lines.push(result.next);
  return `${lines.join("\n")}\n`;
}

export async function installBinShim(cwd, argv, options = {}) {
  const force = options.force ?? hasFlag(argv, "--force");
  const env = options.env ?? process.env;
  const homeDir = options.homeDir ?? homedir();
  const platform = options.platform ?? process.platform;
  const targetDir = resolveBinDir(cwd, argv, env, homeDir);
  const target = join(targetDir, platform === "win32" ? "superloopy.cmd" : "superloopy");
  const content = binShimContent(CLI_PATH, platform);

  await mkdir(targetDir, { recursive: true });
  const status = await installOneTextFile(target, content, force, platform === "win32" ? undefined : 0o755);
  const onPath = pathContainsDir(env.PATH, targetDir, platform);
  return {
    ok: status !== "conflict",
    kind: "bin_install",
    target,
    targetDir,
    status,
    onPath,
    pathHint: pathExportHint(targetDir, platform),
    next: status === "conflict"
      ? "Re-run with --force to replace the existing superloopy command."
      : onPath
        ? "Run `superloopy --help` after restarting Codex or your shell."
        : `Add ${targetDir} to PATH (\`${pathExportHint(targetDir, platform)}\`), or run ${target} directly.`
  };
}

function pathExportHint(targetDir, platform) {
  return platform === "win32"
    ? powerShellPathAppendHint(targetDir)
    : `export PATH="${targetDir}:$PATH"`;
}

function powerShellPathAppendHint(targetDir) {
  return [
    `$d='${powerShellSingleQuote(targetDir)}'`,
    "$p=([string][Environment]::GetEnvironmentVariable('Path','User')).TrimEnd(';')",
    'if ($p) { $p="$p;$d" } else { $p=$d }',
    "[Environment]::SetEnvironmentVariable('Path',$p,'User')"
  ].join("; ");
}

export function formatBinInstallResult(result) {
  return [
    `superloopy bin install: ${result.ok ? "ok" : "conflict"}`,
    `target: ${result.target}`,
    `status: ${result.status}`,
    result.next
  ].join("\n") + "\n";
}

export async function bootstrapSuperloopy(cwd, argv = [], options = {}) {
  const env = options.env ?? process.env;
  const homeDir = options.homeDir ?? homedir();
  const bin = await installBinShim(cwd, argv, {
    env,
    homeDir,
    platform: options.platform,
    force: options.force ?? hasFlag(argv, "--force")
  });
  const agents = await installAgents(cwd, argv, {
    env,
    homeDir,
    sourceDir: options.sourceDir
  });
  return {
    ok: bin.ok && agents.ok,
    kind: "bootstrap",
    bin,
    agents,
    next: bin.ok && agents.ok
      ? "Restart Codex so Superloopy hooks, skills, CLI wrapper, and custom agents are loaded."
      : "Resolve conflicts, or re-run with --force if replacing local Superloopy files is intended."
  };
}

export function formatBootstrapResult(result) {
  const agentCounts = countAgentStatuses(result.agents.agents);
  return [
    `superloopy install: ${result.ok ? "ok" : "conflict"}`,
    `bin: ${result.bin.status} ${result.bin.target}`,
    `agents: ${formatAgentCounts(agentCounts)}`,
    result.next,
    result.bin.next
  ].join("\n") + "\n";
}

export function bootstrapHasUserSignal(result) {
  // Re-surface every session when the wrapper's directory is not on PATH: otherwise a user who
  // missed the one-time hint gets `superloopy: command not found` forever with no breadcrumb.
  return result.bin.status !== "unchanged"
    || result.bin.onPath === false
    || result.agents.agents.some((agent) => agent.status !== "unchanged");
}

export function formatBootstrapHookContext(result) {
  return [
    "Superloopy bootstrap",
    "",
    `- CLI wrapper: ${result.bin.status} at ${result.bin.target}`,
    `- Agents: ${formatAgentCounts(countAgentStatuses(result.agents.agents))}`,
    `- ${result.next}`,
    `- ${result.bin.next}`
  ].join("\n");
}

async function installOneAgent(sourcePath, targetPath, force) {
  if (!existsSync(targetPath)) {
    await copyFile(sourcePath, targetPath);
    return "installed";
  }
  const [sourceContent, targetContent] = await Promise.all([
    readFile(sourcePath, "utf8"),
    readFile(targetPath, "utf8")
  ]);
  if (sourceContent === targetContent) return "unchanged";
  if (!force) return "conflict";
  await copyFile(sourcePath, targetPath);
  return "updated";
}

async function installOneTextFile(targetPath, content, force, mode) {
  if (!existsSync(targetPath)) {
    await writeFile(targetPath, content, "utf8");
    if (mode !== undefined) await chmod(targetPath, mode);
    return "installed";
  }
  const targetContent = await readFile(targetPath, "utf8");
  if (targetContent === content) {
    if (mode !== undefined) await chmod(targetPath, mode);
    return "unchanged";
  }
  if (!force) return "conflict";
  await writeFile(targetPath, content, "utf8");
  if (mode !== undefined) await chmod(targetPath, mode);
  return "updated";
}

function resolveBinDir(cwd, argv, env, homeDir) {
  const explicit = readFlag(argv, "--bin-dir");
  if (explicit !== undefined) return resolveUserPath(cwd, explicit, homeDir);
  const superloopyBinDir = env.SUPERLOOPY_BIN_DIR;
  if (typeof superloopyBinDir === "string" && superloopyBinDir.trim().length > 0) {
    return resolveUserPath(cwd, superloopyBinDir, homeDir);
  }
  const codexLocalBinDir = env.CODEX_LOCAL_BIN_DIR;
  if (typeof codexLocalBinDir === "string" && codexLocalBinDir.trim().length > 0) {
    return resolveUserPath(cwd, codexLocalBinDir, homeDir);
  }
  return join(homeDir, ".local", "bin");
}

function binShimContent(cliPath, platform) {
  if (platform === "win32") {
    return `@echo off\r\nnode "${cliPath}" %*\r\n`;
  }
  return `#!/usr/bin/env sh\nexec node ${shellQuote(cliPath)} "$@"\n`;
}

function shellQuote(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function pathContainsDir(pathValue, dir, platform = process.platform) {
  if (typeof pathValue !== "string") return false;
  const pathApi = platform === "win32" ? pathWin32 : pathPosix;
  const delimiter = platform === "win32" ? ";" : ":";
  const expected = comparablePath(pathApi, dir, platform);
  return pathValue
    .split(delimiter)
    .map(cleanPathEntry)
    .filter((entry) => entry.length > 0)
    .some((entry) => comparablePath(pathApi, entry, platform) === expected);
}

function comparablePath(pathApi, value, platform) {
  const normalized = pathApi.normalize(pathApi.resolve(value));
  const withoutTrailingSep = normalized.length > pathApi.parse(normalized).root.length && normalized.endsWith(pathApi.sep)
    ? normalized.slice(0, -1)
    : normalized;
  return platform === "win32" ? withoutTrailingSep.toLowerCase() : withoutTrailingSep;
}

function cleanPathEntry(value) {
  const trimmed = value.trim();
  return trimmed.startsWith("\"") && trimmed.endsWith("\"") ? trimmed.slice(1, -1) : trimmed;
}

function powerShellSingleQuote(value) {
  return String(value).replaceAll("'", "''");
}

function countAgentStatuses(agents) {
  return agents.reduce((counts, agent) => {
    counts[agent.status] = (counts[agent.status] ?? 0) + 1;
    return counts;
  }, {});
}

function formatAgentCounts(counts) {
  return Object.entries(counts)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([status, count]) => `${count} ${status}`)
    .join(", ");
}

function resolveTargetDir(cwd, argv, env, homeDir) {
  const explicit = readFlag(argv, "--target");
  if (explicit !== undefined) return resolveUserPath(cwd, explicit, homeDir);
  const codexHome = env.CODEX_HOME;
  if (typeof codexHome === "string" && codexHome.trim().length > 0) {
    return resolveUserPath(cwd, join(codexHome, "agents"), homeDir);
  }
  return join(homeDir, ".codex", "agents");
}

function resolveUserPath(cwd, value, homeDir) {
  if (value === "~") return homeDir;
  if (value.startsWith("~/")) return join(homeDir, value.slice(2));
  return resolve(cwd, value);
}
