import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { SUPERLOOPY_AGENT_NAMES } from "./agent-names.js";

function errorText(error) {
  return error instanceof Error ? error.message : String(error);
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
    } catch {}
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
        const sessionStart = hookSpec.SessionStart;
        if (!Array.isArray(sessionStart) || sessionStart.length === 0) {
          problems.push("hooks.json missing SessionStart hook");
        } else {
          const sessionStartCommands = (Array.isArray(sessionStart[0]?.hooks) ? sessionStart[0].hooks : [])
            .map((h) => h?.command)
            .filter((c) => typeof c === "string");
          const sessionStartCli = sessionStartCommands.some(
            (c) => c.includes("${PLUGIN_ROOT}/src/cli.js") && /hook\s+session-start(?:\s|$)/u.test(c) && /--host\s+antigravity(?:\s|$)/u.test(c)
          );
          if (!sessionStartCli) problems.push("hooks.json SessionStart does not invoke CLI hook session-start with --host antigravity");
        }

        const userPromptSubmit = hookSpec.UserPromptSubmit;
        if (!Array.isArray(userPromptSubmit) || userPromptSubmit.length === 0) {
          problems.push("hooks.json missing UserPromptSubmit hook");
        } else {
          const promptCommands = (Array.isArray(userPromptSubmit[0]?.hooks) ? userPromptSubmit[0].hooks : [])
            .map((h) => h?.command)
            .filter((c) => typeof c === "string");
          const promptCli = promptCommands.some(
            (c) => c.includes("${PLUGIN_ROOT}/src/cli.js") && /hook\s+user-prompt-submit(?:\s|$)/u.test(c) && /--host\s+antigravity(?:\s|$)/u.test(c)
          );
          if (!promptCli) problems.push("hooks.json UserPromptSubmit does not invoke CLI hook user-prompt-submit with --host antigravity");
        }

        const stopHook = hookSpec.Stop;
        if (!Array.isArray(stopHook) || stopHook.length === 0) {
          problems.push("hooks.json missing Stop hook");
        } else {
          const stopCommands = (Array.isArray(stopHook[0]?.hooks) ? stopHook[0].hooks : [])
            .map((h) => h?.command)
            .filter((c) => typeof c === "string");
          const stopCli = stopCommands.some(
            (c) => c.includes("${PLUGIN_ROOT}/src/cli.js") && /hook\s+stop(?:\s|$)/u.test(c) && /--host\s+antigravity(?:\s|$)/u.test(c)
          );
          if (!stopCli) problems.push("hooks.json Stop does not invoke CLI hook stop with --host antigravity");
        }

        const rawEntries = hookSpec.SubagentStop;
        const subagentStop = Array.isArray(rawEntries)
          ? rawEntries.filter((entry) => entry && typeof entry === "object")
          : [];
        if (subagentStop.length === 0) {
          problems.push("hooks.json declares no SubagentStop hooks");
        } else {
          const entries = subagentStop.map((entry) => {
            const commands = (Array.isArray(entry.hooks) ? entry.hooks : [])
              .map((hook) => hook?.command)
              .filter((command) => typeof command === "string");
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
            const invokesWorkerCli = commands.some(
              (command) => command.includes("${PLUGIN_ROOT}/src/cli.js")
                && /hook\s+subagent-stop(?:\s|$)/u.test(command)
                && /--host\s+antigravity(?:\s|$)/u.test(command)
            );
            const invokesAuditCli = commands.some(
              (command) => command.includes("${PLUGIN_ROOT}/src/cli.js")
                && /hook\s+subagent-stop-audit(?:\s|$)/u.test(command)
                && /--host\s+antigravity(?:\s|$)/u.test(command)
            );
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
