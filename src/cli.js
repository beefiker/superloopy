#!/usr/bin/env node
import { existsSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { hasFlag, parseJson, readFlag, readStdin } from "./args.js";
import {
  bootstrapSuperloopy,
  formatAgentsInstallResult,
  formatBinInstallResult,
  formatBootstrapResult,
  installAgents,
  installBinShim
} from "./agents.js";
import { auditLoop } from "./audit.js";
import { runAuditorStopHook } from "./audit-hooks.js";
import { beginLoop } from "./begin.js";
import { captureLoop } from "./capture.js";
import { checkLoop, formatCheckResult } from "./check.js";
import { formatDoctor, runDoctor } from "./doctor.js";
import { finishLoop } from "./finish.js";
import { formatGuideResult } from "./guide.js";
import { fleetLoop, handoffLoop } from "./fleet.js";
import { formatCrewLine } from "./crew-lines.js";
import { proveLoop } from "./prove.js";
import { reportLoop } from "./report.js";
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

const CLI_FILE = fileURLToPath(import.meta.url);
const CLI_ROOT = dirname(dirname(CLI_FILE));

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
    return 1;
  }
}

async function runAgents(subcommand, argv, stdout, cwd) {
  const json = hasFlag(argv, "--json");
  if (subcommand === "help" || subcommand === "--help" || subcommand === "-h") {
    stdout.write(agentsHelp());
    return 0;
  }
  if (subcommand !== "install") throw new Error(`Unknown agents subcommand: ${subcommand}`);
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
  const result = await installBinShim(cwd, argv);
  stdout.write(json ? `${JSON.stringify(result, null, 2)}\n` : formatBinInstallResult(result));
  return result.ok ? 0 : 1;
}

async function runInstall(argv, stdout, cwd) {
  const json = hasFlag(argv, "--json");
  const result = await bootstrapSuperloopy(cwd, argv);
  stdout.write(json ? `${JSON.stringify(result, null, 2)}\n` : formatBootstrapResult(result));
  return result.ok ? 0 : 1;
}

async function runDoctorCommand(argv, stdout, cwd) {
  const json = hasFlag(argv, "--json");
  const comparisonPath = readFlag(argv, "--comparison-path");
  const result = await runDoctor(resolveDoctorRoot(cwd, argv), { comparisonPath });
  stdout.write(json ? `${JSON.stringify(result, null, 2)}\n` : formatDoctor(result));
  return result.ok ? 0 : 1;
}

function resolveDoctorRoot(cwd, argv) {
  const explicit = readFlag(argv, "--root") ?? readFlag(argv, "--plugin-root");
  if (explicit !== undefined) return resolve(cwd, explicit);
  return isLikelySuperloopyPluginRoot(cwd) ? cwd : CLI_ROOT;
}

function isLikelySuperloopyPluginRoot(cwd) {
  return existsSync(join(cwd, ".codex-plugin")) && existsSync(join(cwd, "src", "cli.js"));
}

async function runLoop(subcommand, argv, stdout, cwd) {
  const json = hasFlag(argv, "--json");
  if (subcommand === "help" || subcommand === "--help" || subcommand === "-h") {
    stdout.write(helpText());
    return 0;
  }
  const result = await dispatchLoop(cwd, subcommand, argv);
  if (json) stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  else stdout.write(formatLoopResult(subcommand, result));
  return result.ok === false ? 1 : 0;
}

async function dispatchLoop(cwd, subcommand, argv) {
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
    case "handoff":
      return handoffLoop(cwd, argv);
    case "fleet":
      return fleetLoop(cwd, argv);
    default:
      throw new Error(`Unknown loop subcommand: ${subcommand}`);
  }
}

async function runHook(subcommand, stdin, stdout) {
  const payload = parseJson(await readStdin(stdin));
  if (subcommand === "session-start") {
    stdout.write(await runSessionStartHook(payload));
    return 0;
  }
  if (subcommand === "pre-tool-use") {
    stdout.write(runPreToolUseHook(payload));
    return 0;
  }
  if (subcommand === "subagent-stop") {
    stdout.write(runSubagentStopHook(payload));
    return 0;
  }
  if (subcommand === "subagent-stop-audit") {
    stdout.write(await runAuditorStopHook(payload));
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
  return `superloopy status: ${result.summary.goals.complete}/${result.summary.goals.total} goals complete\n${formatGuideResult(result)}`;
}

function topHelp() {
  return [
    "Usage:",
    "  superloopy loop <subcommand> [args]",
    "  superloopy install [--bin-dir PATH] [--target PATH] [--force] [--json]",
    "  superloopy bin install [--bin-dir PATH] [--force] [--json]",
    "  superloopy agents install [--target PATH] [--force] [--json]",
    "  superloopy doctor [--json] [--root PATH] [--comparison-path PATH]",
    "  superloopy hook session-start|pre-tool-use|stop|subagent-stop|user-prompt-submit",
    "",
    helpText()
  ].join("\n");
}

function agentsHelp() {
  return [
    "Usage:",
    "  superloopy agents install [--target PATH] [--force] [--json]",
    "",
    "Installs bundled Superloopy custom agents into Codex's personal agents directory.",
    "Default target: $CODEX_HOME/agents when CODEX_HOME is set, otherwise ~/.codex/agents.",
    "Existing identical files are left unchanged. Conflicting files require --force.",
    ""
  ].join("\n");
}

function binHelp() {
  return [
    "Usage:",
    "  superloopy bin install [--bin-dir PATH] [--force] [--json]",
    "",
    "Installs a small superloopy command wrapper into a PATH directory.",
    "Default target: $SUPERLOOPY_BIN_DIR, then $CODEX_LOCAL_BIN_DIR, then ~/.local/bin.",
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
