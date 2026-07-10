import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, posix as pathPosix, resolve, win32 as pathWin32 } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { hasFlag, readFlag } from "./args.js";
import { SUPERLOOPY_AGENT_NAMES } from "./agent-names.js";
import { loadLegacyAgentManifests } from "./legacy-agents.js";
import {
  commitManagedAgentFiles,
  managedFileManifest,
  manifestsMatch,
  preflightManagedAgentFiles,
  renderManagedAgentFiles,
  withManagedAgentInstallLocks
} from "./managed-agents.js";
import { prepareCodexModelResolution, resolveModelResolutionStatePath } from "./model-resolution.js";

// Worker agents (franky/zoro/usopp/jinbe) report evidence receipts; robin is the
// read-only auditor; nami is the read-only navigator (no receipt). All are installed so
// the host can dispatch them; robin was historically shipped only as un-installable skill
// metadata (the auditor-install gap). Host role-by-name routing is NOT guaranteed, so a
// dispatch must be self-contained — see docs/superloopy-host-contract.md.
export { SUPERLOOPY_AGENT_NAMES };

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CLI_PATH = join(REPO_ROOT, "src", "cli.js");

export async function installAgents(cwd, argv, options = {}) {
  const force = options.force ?? hasFlag(argv, "--force");
  const env = options.env ?? process.env;
  const homeDir = options.homeDir ?? homedir();
  const target = resolveTargetDir(cwd, argv, env, homeDir);
  const source = options.sourceDir ?? join(REPO_ROOT, ".codex", "agents");
  const statePath = options.statePath ?? resolveModelResolutionStatePath(env, homeDir);
  return withManagedAgentInstallLocks(target, statePath,
    () => installAgentsLocked({ argv, options, force, target, source, statePath }), { withFileLock: options.withFileLock });
}

async function installAgentsLocked({ argv, options, force, target, source, statePath }) {
  const resolution = await prepareCodexModelResolution({
    policyRoot: options.policyRoot ?? REPO_ROOT,
    targetDir: target,
    statePath,
    queryModelCatalog: options.queryModelCatalog,
    clock: options.clock,
    refreshModels: options.refreshModels ?? hasFlag(argv, "--refresh-models"),
    compatibility: options.compatibility ?? hasFlag(argv, "--compat")
  });
  if (!resolution.ok) {
    return failedAgentsInstall({ source, target, force, statePath, message: resolution.message });
  }

  const rendered = await renderManagedAgentFiles(source, target, resolution.state);
  if (!rendered.ok) {
    return failedAgentsInstall({ source, target, force, statePath, message: rendered.message, resolution });
  }
  const legacyManifests = options.legacyManifests ?? await loadLegacyAgentManifests(options.policyRoot ?? REPO_ROOT);
  const preflight = await preflightManagedAgentFiles(rendered.files, resolution.previousFileManifest, force, legacyManifests);
  const agents = preflight.files.map((file) => publicManagedAgent(file, resolution.state));
  const metadata = modelResolutionMetadata(resolution, statePath);
  if (!preflight.ok) {
    return {
      ok: false,
      kind: "agents_install",
      source,
      target,
      force,
      agents,
      conflicts: agents.filter(({ status }) => status === "conflict"),
      modelResolution: metadata,
      degraded: resolution.state.degraded,
      restartRequired: false,
      next: "Review conflicting personal agent files, or re-run with --force to replace them."
    };
  }

  const manifest = managedFileManifest(rendered.files);
  const state = { ...resolution.state, files: manifest };
  const allUnchanged = agents.every(({ status }) => status === "unchanged");
  const reuseExactFreshManifest = resolution.cacheStatus === "fresh"
    && allUnchanged
    && manifestsMatch(manifest, resolution.previousState?.files);
  await commitManagedAgentFiles(preflight.files, statePath, state, !reuseExactFreshManifest);
  const restartRequired = agents.some(({ status }) => status === "installed" || status === "updated");
  return {
    ok: true,
    kind: "agents_install",
    source,
    target,
    force,
    agents,
    conflicts: [],
    modelResolution: metadata,
    degraded: resolution.state.degraded,
    restartRequired,
    next: restartRequired
      ? "Restart Codex so the changed custom agent definitions are loaded."
      : resolution.state.degraded
        ? "Compatibility routing remains active; no agent files changed and no restart is required."
        : "Agent definitions are current; no restart is required."
  };
}

export function formatAgentsInstallResult(result) {
  const lines = [
    `superloopy agents install: ${result.ok ? "ok" : result.conflicts.length > 0 ? "conflict" : "failed"}`,
    `target: ${result.target}`,
    `model resolution: ${formatModelResolution(result)}`,
    ...result.agents.map((agent) => `- ${agent.name}: ${agent.status} (${agent.requestedModel} -> ${agent.resolvedModel}, ${agent.reason})`),
    `restart required: ${result.restartRequired ? "yes" : "no"}`,
    result.next
  ];
  return `${lines.join("\n")}\n`;
}

function failedAgentsInstall({ source, target, force, statePath, message, resolution }) {
  return {
    ok: false,
    kind: "agents_install",
    source,
    target,
    force,
    agents: [],
    conflicts: [],
    modelResolution: {
      ...(resolution === undefined ? { statePath } : modelResolutionMetadata(resolution, statePath)),
      error: message
    },
    degraded: resolution?.state?.degraded ?? false,
    restartRequired: false,
    next: `Fix the model-resolution or bundled-agent setup, then retry: ${message}`
  };
}

function publicManagedAgent(file, state) {
  const resolution = state.agents[file.name];
  return {
    name: file.name,
    source: file.source,
    target: file.target,
    status: file.status,
    requestedModel: resolution.requestedModel,
    resolvedModel: resolution.resolvedModel,
    reason: resolution.reason,
    checkedAt: state.checkedAt
  };
}

function modelResolutionMetadata(resolution, statePath) {
  const state = resolution.state;
  return {
    policyVersion: state.policyVersion,
    statePath,
    cacheStatus: resolution.cacheStatus,
    availabilitySource: state.availabilitySource,
    selectionReason: state.selectionReason,
    ...(state.catalogReason === undefined ? {} : { catalogReason: state.catalogReason })
  };
}

function formatModelResolution(result) {
  const metadata = result.modelResolution ?? {};
  if (metadata.error !== undefined) return `failed (${metadata.error})`;
  const degraded = result.degraded ? ", degraded compatibility" : "";
  return `${metadata.selectionReason ?? metadata.availabilitySource ?? "unknown"}${degraded}`;
}

export async function installBinShim(cwd, argv, options = {}) {
  const force = options.force ?? hasFlag(argv, "--force");
  const env = options.env ?? process.env;
  const homeDir = options.homeDir ?? homedir();
  const platform = options.platform ?? process.platform;
  const targetDir = resolveBinDir(cwd, argv, env, homeDir, platform);
  const target = join(targetDir, platform === "win32" ? "superloopy.cmd" : "superloopy");
  const content = binShimContent(CLI_PATH, platform);

  await mkdir(targetDir, { recursive: true });
  const status = await installOneTextFile(target, content, force, platform === "win32" ? undefined : 0o755, {
    replaceIf: (existing) => isGeneratedSuperloopyBinShim(existing, platform)
  });
  const onPath = pathContainsDir(pathEnvValue(env, platform), targetDir, platform);
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

// Claude Code exports CLAUDE_PLUGIN_ROOT into the plugin's hook subprocess; Codex does not.
// It is the host signal that distinguishes the two runtimes at bootstrap time.
export function isClaudeHost(env = process.env) {
  return typeof env.CLAUDE_PLUGIN_ROOT === "string" && env.CLAUDE_PLUGIN_ROOT.trim().length > 0;
}

export async function bootstrapSuperloopy(cwd, argv = [], options = {}) {
  const env = options.env ?? process.env;
  const homeDir = options.homeDir ?? homedir();
  // On Claude Code the agents (agents/*.md), hooks, and skills are plugin-bundled and the hooks
  // invoke the CLI directly via ${CLAUDE_PLUGIN_ROOT}, so there is nothing to install into
  // ~/.codex and no command wrapper to place. Skip the Codex bootstrap cleanly.
  if (isClaudeHost(env)) {
    return {
      ok: true,
      kind: "bootstrap",
      host: "claude",
      degraded: false,
      restartRequired: false,
      bin: { status: "unchanged", onPath: true, target: "(plugin-bundled)", next: "On Claude Code, Superloopy runs from the bundled plugin; no CLI wrapper is installed." },
      agents: {
        ok: true,
        target: "(plugin-bundled)",
        agents: [],
        conflicts: [],
        degraded: false,
        restartRequired: false,
        modelResolution: { availabilitySource: "plugin", selectionReason: "plugin_bundled" }
      },
      next: "Superloopy is plugin-bundled on Claude Code (skills, agents, hooks). No ~/.codex install performed."
    };
  }
  const bin = await installBinShim(cwd, argv, {
    env,
    homeDir,
    platform: options.platform,
    force: options.force ?? hasFlag(argv, "--force")
  });
  const agents = await installAgents(cwd, argv, {
    env,
    homeDir,
    sourceDir: options.sourceDir,
    policyRoot: options.policyRoot,
    statePath: options.statePath,
    queryModelCatalog: options.queryModelCatalog,
    clock: options.clock,
    refreshModels: options.refreshModels,
    compatibility: options.compatibility,
    withFileLock: options.withFileLock,
    force: options.force ?? hasFlag(argv, "--force")
  });
  const ok = bin.ok && agents.ok;
  return {
    ok,
    kind: "bootstrap",
    bin,
    agents,
    degraded: agents.degraded,
    restartRequired: agents.restartRequired,
    next: !agents.ok
      ? "Superloopy preserved conflicting custom-agent files. Review the reported conflicts before choosing whether to replace your customizations."
      : agents.restartRequired
        ? "Restart Codex so the changed custom agent definitions are loaded."
        : !bin.ok
          ? "Superloopy preserved an unrecognized command wrapper. Review it separately; agent migration did not overwrite it."
          : agents.degraded
            ? "Compatibility routing is active; no restart is required."
            : "Superloopy files are current; no restart is required."
  };
}

export function formatBootstrapResult(result) {
  const agentCounts = countAgentStatuses(result.agents.agents);
  return [
    `superloopy install: ${result.ok ? "ok" : "conflict or failure"}`,
    `bin: ${result.bin.status} ${result.bin.target}`,
    `agents: ${formatAgentCounts(agentCounts) || "none"}`,
    `model resolution: ${formatModelResolution(result.agents)}`,
    `restart required: ${result.restartRequired ? "yes" : "no"}`,
    result.next,
    result.bin.next
  ].join("\n") + "\n";
}

export function bootstrapHasUserSignal(result) {
  // Re-surface every session when the wrapper's directory is not on PATH: otherwise a user who
  // missed the one-time hint gets `superloopy: command not found` forever with no breadcrumb.
  return result.ok === false
    || result.degraded === true
    || result.restartRequired === true
    || result.bin.status !== "unchanged"
    || result.bin.onPath === false
    || result.agents.agents.some((agent) => agent.status !== "unchanged");
}

export function formatBootstrapHookContext(result) {
  return [
    "Superloopy automatic migration",
    "",
    `- CLI wrapper: ${result.bin.status} at ${result.bin.target}`,
    `- Agents: ${formatAgentCounts(countAgentStatuses(result.agents.agents))}`,
    `- Model routing: ${formatModelResolution(result.agents)}`,
    `- Restart required: ${result.restartRequired ? "yes" : "no"}`,
    `- ${result.next}`,
    `- ${result.bin.ok ? result.bin.next : "Superloopy preserved an unrecognized command wrapper; agent migration did not overwrite it."}`
  ].join("\n");
}

async function installOneTextFile(targetPath, content, force, mode, options = {}) {
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
  if (!force && !options.replaceIf?.(targetContent)) return "conflict";
  await writeFile(targetPath, content, "utf8");
  if (mode !== undefined) await chmod(targetPath, mode);
  return "updated";
}

// A marker line embedded in every shim we generate, so a shim is recognized as ours regardless of
// the install directory name (checkout/fork dirs are not named `superloopy`) and a foreign shim
// without the marker is never overwritten.
const BIN_SHIM_MARKER = "superloopy-generated bin shim";

function isGeneratedSuperloopyBinShim(content, platform) {
  const normalized = content.replace(/\r\n/gu, "\n");
  // Marked shims (this version onward) are ours in any directory.
  if (normalized.includes(BIN_SHIM_MARKER)) return true;
  // Legacy (pre-marker) shims are recognized by their generated structure with a `superloopy` path
  // segment, so existing marketplace installs still upgrade in place without --force.
  if (platform === "win32") {
    return /^@echo off\nnode "[^"\n]*[\\/]superloopy(?:[\\/][^"\n]*)?[\\/]src[\\/]cli\.js" %\*\n?$/iu.test(normalized);
  }
  return /^#!\/usr\/bin\/env sh\nexec node .*[\\/]superloopy(?:[\\/][^'"\n ]*)?[\\/]src[\\/]cli\.js'? "\$@"\n?$/u.test(normalized);
}

function resolveBinDir(cwd, argv, env, homeDir, platform = process.platform) {
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
  if (platform === "win32") return resolveWindowsBinDir(env, homeDir);
  return join(homeDir, ".local", "bin");
}

function binShimContent(cliPath, platform) {
  if (platform === "win32") {
    const resolver = cmdDoubleQuote(shimCliResolverSource());
    return [
      "@echo off",
      `@rem ${BIN_SHIM_MARKER}`,
      "setlocal",
      `set "SUPERLOOPY_SHIM_CLI=${cmdSetValue(cliPath)}"`,
      `for /f "usebackq delims=" %%I in (\`node -e "${resolver}"\`) do set "SUPERLOOPY_CLI=%%I"`,
      "if not exist \"%SUPERLOOPY_CLI%\" (",
      "  echo Superloopy CLI target not found: %SUPERLOOPY_SHIM_CLI% 1>&2",
      "  exit /b 1",
      ")",
      "node \"%SUPERLOOPY_CLI%\" %*",
      ""
    ].join("\r\n");
  }
  return [
    "#!/usr/bin/env sh",
    `# ${BIN_SHIM_MARKER}`,
    `SUPERLOOPY_SHIM_CLI=${shellQuote(cliPath)}`,
    `SUPERLOOPY_CLI=$(SUPERLOOPY_SHIM_CLI="$SUPERLOOPY_SHIM_CLI" node -e ${shellQuote(shimCliResolverSource())}) || exit $?`,
    "if [ ! -f \"$SUPERLOOPY_CLI\" ]; then",
    "  echo \"Superloopy CLI target not found: $SUPERLOOPY_SHIM_CLI\" >&2",
    "  exit 1",
    "fi",
    "exec node \"$SUPERLOOPY_CLI\" \"$@\"",
    ""
  ].join("\n");
}

// Extract the cli.js path a generated Superloopy shim executes, or null when the content is
// not one of our shims. Recognizes both the marked form and the legacy structure, so doctor
// can read where an installed wrapper actually points (e.g. a stale versioned cache path).
export function parseBinShimCliPath(content, platform = process.platform) {
  if (typeof content !== "string" || !isGeneratedSuperloopyBinShim(content, platform)) return null;
  const normalized = content.replace(/\r\n/gu, "\n");
  if (platform === "win32") {
    const envMatch = /^set "SUPERLOOPY_SHIM_CLI=([^"\n]*)"/mu.exec(normalized);
    if (envMatch !== null) return cmdUnsetValue(envMatch[1]);
    const match = /^node "([^"\n]+)" %\*/mu.exec(normalized);
    return match === null ? null : match[1];
  }
  const envMatch = /^SUPERLOOPY_SHIM_CLI=(?:'((?:[^']|'\\'')*)'|(\S+))/mu.exec(normalized);
  if (envMatch !== null) return envMatch[1] === undefined ? envMatch[2] : envMatch[1].replaceAll("'\\''", "'");
  // Reverse shellQuote: a single-quoted token whose interior apostrophes are encoded as the
  // 4-char sequence '\'' — so the quoted branch must treat '\'' as content, not a close-quote,
  // or a path like /home/o'connor falls through to the raw \S+ token and never resolves.
  const match = /^exec node (?:'((?:[^']|'\\'')*)'|(\S+)) "\$@"/mu.exec(normalized);
  if (match === null) return null;
  return match[1] === undefined ? match[2] : match[1].replaceAll("'\\''", "'");
}

export function binShimSupportsSiblingFallback(content, platform = process.platform) {
  if (typeof content !== "string" || !isGeneratedSuperloopyBinShim(content, platform)) return false;
  const normalized = content.replace(/\r\n/gu, "\n");
  return normalized.includes("SUPERLOOPY_SHIM_CLI") && normalized.includes("fs.readdirSync");
}

function shimCliResolverSource() {
  return [
    "const fs=require('node:fs')",
    "const path=require('node:path')",
    "const start=process.env.SUPERLOOPY_SHIM_CLI||''",
    "function live(p){try{return p.length>0&&fs.existsSync(p)}catch{return false}}",
    "function parse(v){const m=/^(\\d+)\\.(\\d+)\\.(\\d+)(?:-([^+]+))?/.exec(v);return m&&{major:+m[1],minor:+m[2],patch:+m[3],pre:m[4]}}",
    "function cmp(a,b){for(const k of ['major','minor','patch']){if(a[k]>b[k])return 1;if(a[k]<b[k])return -1}if(a.pre===undefined&&b.pre!==undefined)return 1;if(a.pre!==undefined&&b.pre===undefined)return -1;if(a.pre!==undefined&&b.pre!==undefined)return String(a.pre).localeCompare(String(b.pre));return 0}",
    "let target=start",
    "if(!live(target)){let best=null,bv=null;try{const root=path.dirname(path.dirname(path.dirname(start)));for(const name of fs.readdirSync(root)){const v=parse(name);if(!v)continue;const cli=path.join(root,name,'src','cli.js');if(!live(cli))continue;if(!bv||cmp(v,bv)>0){bv=v;best=cli}}}catch{}target=best||start}",
    "process.stdout.write(target)"
  ].join(";");
}

function shellQuote(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function cmdDoubleQuote(value) {
  return String(value).replaceAll("\"", "\\\"");
}

function cmdSetValue(value) {
  return String(value)
    .replaceAll("^", "^^")
    .replaceAll("%", "%%")
    .replaceAll("&", "^&")
    .replaceAll("<", "^<")
    .replaceAll(">", "^>")
    .replaceAll("|", "^|");
}

function cmdUnsetValue(value) {
  return String(value)
    .replaceAll("^^", "^")
    .replaceAll("%%", "%")
    .replaceAll("^&", "&")
    .replaceAll("^<", "<")
    .replaceAll("^>", ">")
    .replaceAll("^|", "|");
}

function resolveWindowsBinDir(env, homeDir) {
  const appData = env.APPDATA?.trim();
  if (appData) return join(appData, "npm");
  return join(homeDir, "AppData", "Roaming", "npm");
}

function pathEnvValue(env, platform = process.platform) {
  if (platform === "win32" && typeof env.Path === "string" && env.Path.trim().length > 0) return env.Path;
  return env.PATH;
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
