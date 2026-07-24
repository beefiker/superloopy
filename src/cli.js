#!/usr/bin/env node
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { hasFlag, parseJson, readFlag, readStdin } from "./args.js";
import {
  bootstrapSuperloopy,
  formatAgentsInstallResult,
  formatBinInstallResult,
  formatBootstrapResult,
  installAgents,
  installBinShim,
  isClaudeHost
} from "./agents.js";
import { auditLoop } from "./audit.js";
import { runAuditorStopHook } from "./audit-hooks.js";
import { beginLoop } from "./begin.js";
import { captureLoop } from "./capture.js";
import { checkLoop, formatCheckResult } from "./check.js";
import { formatDoctor, runDoctor } from "./doctor.js";
import { queryInstalledPluginTruth } from "./installed-plugin-truth.js";
import { finishLoop } from "./finish.js";
import { formatGuideResult } from "./guide.js";
import { fleetLoop, handoffLoop } from "./fleet.js";
import { formatCrewLine } from "./crew-lines.js";
import { trustLoop } from "./plan-trust.js";
import { bindLegacyLoop, inspectRepositoryBinding } from "./repository-binding.js";
import { proveLoop } from "./prove.js";
import { reportLoop } from "./report.js";
import { isSourceCheckoutRoot } from "./source-checkout.js";
import { formatTraceResult, traceLoop } from "./trace.js";
import {
  checkpointLoop,
  createLoop,
  evidenceLoop,
  guideLoop,
  helpText,
  nextLoop,
  reviewLoop,
  statusLoop
} from "./loop.js";
import {
  runPreToolUseHook,
  runSessionStartHook,
  runStopHook,
  runSubagentStopHook,
  runUserPromptSubmitHook
} from "./hooks.js";
import { resolveWorkspaceRoot } from "./workspace-identity.js";
import { readPlanUnchecked, scopeFromSessionId } from "./store.js";

const CLI_FILE = fileURLToPath(import.meta.url);
const CLI_ROOT = dirname(dirname(CLI_FILE));

class CliUsageError extends Error {}

async function main(argv, stdin, stdout, stderr, cwd) {
  const [command, subcommand, ...rest] = argv;
  try {
    if (command === undefined || command === "help" || command === "--help" || command === "-h") {
      stdout.write(topHelp());
      return 0;
    }
    if (command === "loop") {
      return await runLoop(subcommand ?? "help", rest, stdout, cwd);
    }
    if (command === "doctor") {
      return await runDoctorCommand([subcommand, ...rest].filter((value) => value !== undefined), stdout, cwd);
    }
    if (command === "agents") {
      return await runAgents(subcommand ?? "help", rest, stdout, cwd);
    }
    if (command === "bin") {
      return await runBin(subcommand ?? "help", rest, stdout, cwd);
    }
    if (command === "install") {
      return await runInstall([subcommand, ...rest].filter((value) => value !== undefined), stdout, cwd);
    }
    if (command === "hook") {
      return await runHook(subcommand, stdin, stdout);
    }
    stderr.write(`Unknown command: ${command}\n${topHelp()}`);
    return 1;
  } catch (error) {
    stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return error instanceof CliUsageError ? 2 : 1;
  }
}

async function runAgents(subcommand, argv, stdout, cwd) {
  const json = hasFlag(argv, "--json");
  if (subcommand === "help" || subcommand === "--help" || subcommand === "-h") {
    stdout.write(agentsHelp());
    return 0;
  }
  if (subcommand !== "install") throw new Error(`Unknown agents subcommand: ${subcommand}`);
  if (hasHelpFlag(argv)) {
    stdout.write(agentsHelp());
    return 0;
  }
  const result = await installAgents(cwd, argv);
  stdout.write(json ? `${JSON.stringify(result, null, 2)}\n` : formatAgentsInstallResult(result));
  return result.ok ? 0 : 1;
}

async function runBin(subcommand, argv, stdout, cwd) {
  const json = hasFlag(argv, "--json");
  if (subcommand === "help" || subcommand === "--help" || subcommand === "-h") {
    stdout.write(binHelp());
    return 0;
  }
  if (subcommand !== "install") throw new Error(`Unknown bin subcommand: ${subcommand}`);
  if (hasHelpFlag(argv)) {
    stdout.write(binHelp());
    return 0;
  }
  const result = await installBinShim(cwd, argv);
  stdout.write(json ? `${JSON.stringify(result, null, 2)}\n` : formatBinInstallResult(result));
  return result.ok ? 0 : 1;
}

async function runInstall(argv, stdout, cwd) {
  if (hasHelpFlag(argv)) {
    stdout.write(installHelp());
    return 0;
  }
  const json = hasFlag(argv, "--json");
  const result = await bootstrapSuperloopy(cwd, argv);
  stdout.write(json ? `${JSON.stringify(result, null, 2)}\n` : formatBootstrapResult(result));
  return result.ok ? 0 : 1;
}

async function runDoctorCommand(argv, stdout, cwd) {
  if (hasHelpFlag(argv)) {
    stdout.write(doctorHelp());
    return 0;
  }
  const parsed = parseDoctorArgs(argv);
  const selection = resolveDoctorSelection(cwd, parsed);
  const result = await runDoctor(selection.root, {
    scope: selection.scope,
    comparisonPath: parsed.comparisonPath,
    queryInstalledPluginTruth,
    installedModelPolicy: {
      env: process.env,
      homeDir: homedir(),
      refreshModels: parsed.refreshModels
    }
  });
  stdout.write(parsed.json ? `${JSON.stringify(result, null, 2)}\n` : formatDoctor(result));
  return result.ok ? 0 : 1;
}

function parseDoctorArgs(argv) {
  const parsed = {
    json: false,
    refreshModels: false,
    root: undefined,
    scope: undefined,
    comparisonPath: undefined
  };
  const seen = new Set();
  let rootSelector;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--json") {
      parsed.json = true;
      continue;
    }
    if (token === "--refresh-models") {
      parsed.refreshModels = true;
      continue;
    }

    const equals = token.indexOf("=");
    const name = equals >= 0 ? token.slice(0, equals) : token;
    if (!["--root", "--plugin-root", "--scope", "--comparison-path"].includes(name)) {
      throw new CliUsageError(token.startsWith("-") ? `Unknown doctor option: ${token}.` : `Unexpected doctor argument: ${token}.`);
    }
    if (seen.has(name)) throw new CliUsageError(`Duplicate doctor option: ${name}.`);
    seen.add(name);
    const value = equals >= 0 ? token.slice(equals + 1) : argv[++index];
    if (value === undefined || value.length === 0 || (equals < 0 && value.startsWith("-"))) {
      throw new CliUsageError(`Missing ${name}.`);
    }

    if (name === "--root" || name === "--plugin-root") {
      if (rootSelector !== undefined) {
        throw new CliUsageError("Use only one of --root or --plugin-root.");
      }
      rootSelector = name;
      parsed.root = value;
    } else if (name === "--scope") {
      if (value !== "source" && value !== "installed") {
        throw new CliUsageError("--scope must be source or installed.");
      }
      parsed.scope = value;
    } else {
      parsed.comparisonPath = value;
    }
  }
  return parsed;
}

function resolveDoctorSelection(cwd, parsed) {
  const explicitRoot = parsed.root === undefined ? undefined : resolve(cwd, parsed.root);
  const recognizedCheckout = isLikelySuperloopyPluginRoot(cwd) && isSourceCheckoutRoot(cwd);
  const scope = parsed.scope ?? (explicitRoot !== undefined || recognizedCheckout ? "source" : "installed");
  const root = explicitRoot ?? (scope === "source" && recognizedCheckout ? cwd : CLI_ROOT);
  return { root, scope };
}

function isLikelySuperloopyPluginRoot(cwd) {
  // Identify a Superloopy checkout by any stable signal, never by a single file that
  // doctor itself tests. Keying on one marker (package.json name, the plugin manifest,
  // or a given file's existence) means a break in that marker silently falls back to
  // CLI_ROOT and hides the very failure doctor should surface. With any-of, a checkout
  // is only skipped when every signal is simultaneously broken -- a genuinely
  // unidentifiable directory -- while an unrelated Codex plugin (no Superloopy identity
  // and no signature files) still falls back instead of collecting false failures.
  return jsonNameIs(join(cwd, "package.json"), "superloopy")
    || jsonNameIs(join(cwd, ".codex-plugin", "plugin.json"), "superloopy")
    || hasSuperloopySignature(cwd);
}

function jsonNameIs(path, expected) {
  try {
    return JSON.parse(readFileSync(path, "utf8")).name === expected;
  } catch {
    return false;
  }
}

function hasSuperloopySignature(cwd) {
  return existsSync(join(cwd, "src", "cli.js"))
    && existsSync(join(cwd, "src", "doctor.js"))
    && existsSync(join(cwd, "skills", "superloopy-loop", "SKILL.md"));
}

async function runLoop(subcommand, argv, stdout, cwd) {
  const optionArgv = loopOptionArgv(subcommand, argv);
  const json = hasFlag(optionArgv, "--json");
  if (subcommand === "help" || subcommand === "--help" || subcommand === "-h") {
    stdout.write(helpText());
    return 0;
  }
  const result = await dispatchLoop(resolveWorkspaceRoot(cwd), subcommand, argv);
  if (json) stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  else stdout.write(formatLoopResult(subcommand, result));
  return result.ok === false ? 1 : 0;
}

async function dispatchLoop(cwd, subcommand, argv) {
  const optionArgv = loopOptionArgv(subcommand, argv);
  if (!["begin", "create", "status", "bind"].includes(subcommand)) {
    const scope = scopeFromSessionId(readFlag(optionArgv, "--session-id"));
    const plan = await readPlanUnchecked(cwd, scope);
    const binding = await inspectRepositoryBinding(cwd, plan);
    if (!binding.resumable) {
      const next = binding.next ? ` Run \`${binding.next}\`.` : "";
      throw new Error(`Superloopy repository is ${binding.status}.${next}`);
    }
  }
  switch (subcommand) {
    case "begin":
      return beginLoop(cwd, argv);
    case "create":
      return createLoop(cwd, argv);
    case "status":
      return statusLoop(cwd, argv);
    case "next":
      return nextLoop(cwd, argv);
    case "guide":
      return guideLoop(cwd, argv);
    case "trace":
      return traceLoop(cwd, argv);
    case "report":
      return reportLoop(cwd, argv);
    case "check":
      return checkLoop(cwd, argv);
    case "evidence":
      return evidenceLoop(cwd, argv);
    case "capture":
      return captureLoop(cwd, argv);
    case "prove":
      return proveLoop(cwd, argv);
    case "review":
      return reviewLoop(cwd, argv);
    case "finish":
      return finishLoop(cwd, argv);
    case "checkpoint":
      return checkpointLoop(cwd, argv);
    case "audit":
      return auditLoop(cwd, argv);
    case "trust":
      return trustLoop(cwd, argv);
    case "handoff":
      return handoffLoop(cwd, argv);
    case "fleet":
      return fleetLoop(cwd, argv);
    case "bind":
      return bindLegacyLoop(cwd, argv);
    default:
      throw new Error(`Unknown loop subcommand: ${subcommand}`);
  }
}

function loopOptionArgv(subcommand, argv) {
  if (subcommand !== "capture" && subcommand !== "prove") return argv;
  const delimiter = argv.indexOf("--");
  return delimiter === -1 ? argv : argv.slice(0, delimiter);
}

async function runHook(subcommand, stdin, stdout) {
  const payload = parseJson(await readStdin(stdin));
  const context = { host: isClaudeHost(process.env) ? "claude" : "codex" };
  if (subcommand === "session-start") {
    stdout.write(await runSessionStartHook(payload));
    return 0;
  }
  if (subcommand === "pre-tool-use") {
    stdout.write(runPreToolUseHook(payload));
    return 0;
  }
  if (subcommand === "subagent-stop") {
    stdout.write(runSubagentStopHook(payload, context));
    return 0;
  }
  if (subcommand === "subagent-stop-audit") {
    stdout.write(await runAuditorStopHook(payload, context));
    return 0;
  }
  if (subcommand === "stop") {
    stdout.write(await runStopHook(payload));
    return 0;
  }
  if (subcommand === "user-prompt-submit") {
    stdout.write(await runUserPromptSubmitHook(payload));
    return 0;
  }
  return 1;
}

function formatLoopResult(subcommand, result) {
  if (subcommand === "begin") {
    return `superloopy began: ${result.goal.id} ${result.goal.title}\n${formatGuideResult(result)}`;
  }
  if (subcommand === "create") return `superloopy plan created: ${result.plan.goals.length} goal(s)\n${formatGuideResult(result)}`;
  if (subcommand === "next") {
    if (result.done) return `superloopy: all goals complete\n${formatGuideResult(result)}`;
    return `superloopy next: ${result.goal.id} ${result.goal.title}\n${formatGuideResult(result)}`;
  }
  if (subcommand === "guide") return formatGuideResult(result);
  if (subcommand === "trace") return formatTraceResult(result);
  if (subcommand === "report") return `superloopy report: ${result.artifact.relativePath}\n${formatGuideResult(result)}`;
  if (subcommand === "check") return formatCheckResult(result);
  if (subcommand === "trust") {
    return `superloopy trust: ${result.added} command(s) newly approved, ${result.alreadyTrusted} already trusted (${result.total} in plan)\nstore: ${result.store}\n`;
  }
  if (subcommand === "evidence") {
    return `superloopy evidence: ${result.goal.id}/${result.criterion.id} -> ${result.criterion.status}\n${formatGuideResult(result)}`;
  }
  if (subcommand === "capture") {
    return `superloopy capture: ${result.goal.id}/${result.criterion.id} -> ${result.criterion.status} (${result.capture.artifact})\n${formatGuideResult(result)}`;
  }
  if (subcommand === "prove") {
    return `superloopy prove: ${result.goal.id}/${result.criterion.id} -> ${result.criterion.status} (${result.capture.artifact})\n${formatGuideResult(result)}`;
  }
  if (subcommand === "checkpoint") {
    return `superloopy checkpoint: ${result.goal.id} -> ${result.goal.status}\n${formatGuideResult(result)}`;
  }
  if (subcommand === "review") {
    return `superloopy review: ${result.artifact.relativePath}\n${formatGuideResult(result)}`;
  }
  if (subcommand === "finish") {
    return `superloopy finish: ${result.summary.aggregateComplete ? "complete" : result.goal.status}\n${formatGuideResult(result)}`;
  }
  if (subcommand === "handoff") {
    const crewLine = result.crewLine ? `${formatCrewLine(result.crewLine)}\n` : "";
    return `${crewLine}superloopy handoff: ${result.handoff.id} ${result.handoff.agent} -> ${result.handoff.status} [${result.handoff.normalizedVerdict}]\n`;
  }
  if (subcommand === "fleet") {
    const verdict = result.summary.byVerdict;
    const lines = [`superloopy fleet: ${result.summary.dispatched} dispatched (accept ${verdict.accept}, reject ${verdict.reject}, needs-context ${verdict["needs-context"]}, pending ${verdict.pending})`];
    for (const item of result.handoffs ?? []) {
      if (item.crewLine) lines.push(`- ${formatCrewLine(item.crewLine)}`);
    }
    for (const item of result.outstanding) lines.push(`- outstanding ${item.id} ${item.agent}: ${item.assignment}`);
    for (const item of result.attention ?? []) lines.push(`- attention ${item.id} ${item.agent}: ${item.normalizedVerdict} ${item.assignment}`);
    if (result.warning) lines.push(result.warning);
    return `${lines.join("\n")}\n`;
  }
  if (subcommand === "bind") {
    return `superloopy repository: ${result.alreadyBound ? "already bound" : "bound"} to ${result.plan.repositoryBinding.rootLabel}\n`;
  }
  if (subcommand === "status" && result.binding?.resumable === false) {
    const next = result.binding.next ? `\nNext action: \`${result.binding.next}\`` : "";
    return `superloopy repository: ${result.binding.status}${next}\n`;
  }
  return `superloopy status: ${result.summary.goals.complete}/${result.summary.goals.total} goals complete\n${formatGuideResult(result)}`;
}

function topHelp() {
  return [
    "Usage:",
    "  superloopy loop <subcommand> [args]",
    "  superloopy install [--bin-dir PATH] [--target PATH] [--refresh-models] [--compat] [--force] [--json]",
    "  superloopy bin install [--bin-dir PATH] [--force] [--json]",
    "  superloopy agents install [--target PATH] [--refresh-models] [--compat] [--force] [--json]",
    "  superloopy doctor [--scope source|installed] [--json] [--root PATH|--plugin-root PATH] [--comparison-path PATH] [--refresh-models]",
    "  superloopy hook session-start|pre-tool-use|stop|subagent-stop|user-prompt-submit",
    "",
    helpText()
  ].join("\n");
}

function agentsHelp() {
  return [
    "Usage:",
    "  superloopy agents install [--target PATH] [--refresh-models] [--compat] [--force] [--json]",
    "",
    "Installs bundled Superloopy custom agents into Codex's personal agents directory.",
    "Default target: $CODEX_HOME/agents when CODEX_HOME is set, otherwise ~/.codex/agents.",
    "Use --refresh-models to bypass a cached catalog result, or --compat for deterministic compatibility routing.",
    "Existing identical managed files are left unchanged. Conflicting files require --force.",
    ""
  ].join("\n");
}

function installHelp() {
  return [
    "Usage:",
    "  superloopy install [--bin-dir PATH] [--target PATH] [--refresh-models] [--compat] [--force] [--json]",
    "",
    "Installs the Superloopy command wrapper and managed Codex agents.",
    "Use --refresh-models to bypass a cached catalog result, or --compat for deterministic compatibility routing.",
    "Existing conflicting files require --force.",
    ""
  ].join("\n");
}

function doctorHelp() {
  return [
    "Usage:",
    "  superloopy doctor [--scope source|installed] [--json] [--root PATH|--plugin-root PATH] [--comparison-path PATH] [--refresh-models]",
    "",
    "Checks source or installed Superloopy health without launching workers.",
    "Default scope: source in a recognized checkout; installed elsewhere. An explicit root defaults to source.",
    "Use --refresh-models for one read-only live model comparison; no state or agent files are changed.",
    ""
  ].join("\n");
}

function hasHelpFlag(argv) {
  return hasFlag(argv, "--help") || hasFlag(argv, "-h");
}

function binHelp() {
  return [
    "Usage:",
    "  superloopy bin install [--bin-dir PATH] [--force] [--json]",
    "",
    "Installs a small superloopy command wrapper into a PATH directory.",
    "Default target: $SUPERLOOPY_BIN_DIR, then $CODEX_LOCAL_BIN_DIR, then %APPDATA%\\npm on Windows or ~/.local/bin elsewhere.",
    "Existing identical files are left unchanged. Conflicting files require --force.",
    ""
  ].join("\n");
}

if (isDirectCliInvocation()) {
  const code = await main(process.argv.slice(2), process.stdin, process.stdout, process.stderr, process.cwd());
  process.exitCode = code;
}

export { main };

function isDirectCliInvocation() {
  if (process.argv[1] === undefined) return false;
  try {
    return realpathSync(process.argv[1]) === CLI_FILE;
  } catch {
    return process.argv[1] === CLI_FILE;
  }
}
