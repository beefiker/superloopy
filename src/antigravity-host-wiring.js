import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { SUPERLOOPY_AGENT_NAMES } from "./agent-names.js";

function errorText(error) {
  return error instanceof Error ? error.message : String(error);
}

// Hook events that must invoke exactly one CLI subcommand. SubagentStop is handled separately
// because it fans out across agent-type matchers instead of declaring a single command.
const CLI_HOOK_EVENTS = [
  { event: "SessionStart", subcommand: "session-start" },
  { event: "UserPromptSubmit", subcommand: "user-prompt-submit" },
  { event: "Stop", subcommand: "stop" }
];

// Every command an event declares, across ALL of its entry groups. A manifest may legitimately
// split one event's hooks over several groups, so reading only the first group reports valid
// wiring as broken -- which is why the SubagentStop branch below scans every entry.
function hookCommands(entries) {
  return (Array.isArray(entries) ? entries : [])
    .filter((entry) => entry && typeof entry === "object")
    .flatMap((entry) => (Array.isArray(entry.hooks) ? entry.hooks : []))
    .map((hook) => hook?.command)
    .filter((command) => typeof command === "string");
}

// The trailing `(?:\s|$)` is what keeps `stop` from matching `subagent-stop-audit` and
// `--host antigravity` from matching `--host antigravity-typo`.
function invokesCli(command, subcommand) {
  return command.includes("${PLUGIN_ROOT}/src/cli.js")
    && new RegExp(`hook\\s+${subcommand}(?:\\s|$)`, "u").test(command)
    && /--host\s+antigravity(?:\s|$)/u.test(command);
}

export async function checkAntigravityHostWiring(cwd) {
  const problems = [];
  const manifestPaths = [
    { path: join(cwd, "plugin.json"), name: "plugin.json" },
    { path: join(cwd, ".gemini-plugin", "plugin.json"), name: ".gemini-plugin/plugin.json" },
    { path: join(cwd, "gemini-extension.json"), name: "gemini-extension.json" }
  ];

  let packageVersion = null;
  const packageJsonPath = join(cwd, "package.json");
  if (existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(await readFile(packageJsonPath, "utf8"));
      if (typeof pkg?.version === "string" && pkg.version.trim().length > 0) packageVersion = pkg.version;
    } catch {
      // An unreadable or malformed package.json is not this check's business -- checkPluginManifest
      // and checkDependencies report it. Leaving packageVersion null degrades the skew check to
      // comparing the Antigravity manifests against each other, which is still worth reporting.
    }
  }

  const manifestVersions = [];
  for (const { path, name } of manifestPaths) {
    if (!existsSync(path)) {
      problems.push(`missing ${name}`);
      continue;
    }
    try {
      const manifest = JSON.parse(await readFile(path, "utf8"));
      if (manifest?.name !== "superloopy") problems.push(`${name} name must be superloopy`);
      if (typeof manifest?.version !== "string" || manifest.version.trim().length === 0) {
        problems.push(`${name} missing valid version`);
      } else {
        manifestVersions.push({ name, version: manifest.version });
        if (packageVersion !== null && manifest.version !== packageVersion) {
          problems.push(`${name} version (${manifest.version}) does not match package.json version (${packageVersion})`);
        }
      }
    } catch (error) {
      problems.push(`${name} invalid JSON (${errorText(error)})`);
    }
  }

  if (packageVersion === null && manifestVersions.length > 1) {
    const first = manifestVersions[0];
    for (let i = 1; i < manifestVersions.length; i++) {
      if (manifestVersions[i].version !== first.version) {
        problems.push(`${manifestVersions[i].name} version (${manifestVersions[i].version}) does not match ${first.name} version (${first.version})`);
      }
    }
  }

  const hooksPath = join(cwd, "hooks.json");
  const matcherSources = [];
  if (!existsSync(hooksPath)) {
    problems.push("missing hooks.json (Antigravity hook wiring)");
  } else {
    let parsed;
    let parseFailed = false;
    try {
      parsed = JSON.parse(await readFile(hooksPath, "utf8"));
    } catch (error) {
      parseFailed = true;
      problems.push(`hooks.json invalid JSON (${errorText(error)})`);
    }
    if (!parseFailed) {
      const hookSpec = parsed?.superloopy ?? parsed?.hooks;
      if (!hookSpec || typeof hookSpec !== "object") {
        problems.push("hooks.json missing top-level hook specification");
      } else {
        for (const { event, subcommand } of CLI_HOOK_EVENTS) {
          const entries = hookSpec[event];
          if (!Array.isArray(entries) || entries.length === 0) {
            problems.push(`hooks.json missing ${event} hook`);
            continue;
          }
          if (!hookCommands(entries).some((command) => invokesCli(command, subcommand))) {
            problems.push(`hooks.json ${event} does not invoke CLI hook ${subcommand} with --host antigravity`);
          }
        }

        const rawEntries = hookSpec.SubagentStop;
        const subagentStop = Array.isArray(rawEntries)
          ? rawEntries.filter((entry) => entry && typeof entry === "object")
          : [];
        if (subagentStop.length === 0) {
          problems.push("hooks.json declares no SubagentStop hooks");
        } else {
          const entries = subagentStop.map((entry) => {
            const commands = hookCommands([entry]);
            const matcher = typeof entry.matcher === "string" ? entry.matcher : "";
            if (matcher.length > 0) matcherSources.push(matcher);
            let regex = null;
            if (matcher.length > 0) {
              try {
                regex = new RegExp(matcher, "u");
              } catch {
                problems.push(`hooks.json SubagentStop matcher is not a valid regex: ${matcher}`);
              }
            }
            const invokesWorkerCli = commands.some((command) => invokesCli(command, "subagent-stop"));
            const invokesAuditCli = commands.some((command) => invokesCli(command, "subagent-stop-audit"));
            return { matcher, regex, invokesWorkerCli, invokesAuditCli };
          });

          const uncoveredBare = SUPERLOOPY_AGENT_NAMES.filter((name) => {
            const isAuditor = name === "robin";
            return !entries.some((entry) =>
              entry.regex !== null
              && entry.regex.test(name)
              && (isAuditor ? entry.invokesAuditCli : entry.invokesWorkerCli)
            );
          });
          if (uncoveredBare.length > 0) {
            problems.push(`no CLI-invoking SubagentStop hook covers bare agent types: ${uncoveredBare.join(", ")}`);
          }

          const uncoveredNamespaced = SUPERLOOPY_AGENT_NAMES.filter((name) => {
            const isAuditor = name === "robin";
            return !entries.some((entry) =>
              entry.regex !== null
              && entry.regex.test(`superloopy:${name}`)
              && (isAuditor ? entry.invokesAuditCli : entry.invokesWorkerCli)
            );
          });
          if (uncoveredNamespaced.length > 0) {
            problems.push(`no CLI-invoking SubagentStop hook covers namespaced agents: ${uncoveredNamespaced.map((n) => `superloopy:${n}`).join(", ")}`);
          }
        }
      }
    }
  }

  if (problems.length > 0) {
    return { ok: false, policy: "antigravity-host-wiring-present-and-namespaced", message: `Antigravity host wiring: ${problems.join("; ")}.` };
  }
  return { ok: true, policy: "antigravity-host-wiring-present-and-namespaced", matchers: matcherSources };
}
