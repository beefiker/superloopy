import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { checkDesignAudit } from "./design-audit.js";
import { checkFileAudit } from "./file-audit.js";
import { checkComparisonSimilarity } from "./comparison-similarity.js";
import { SUPERLOOPY_AGENT_NAMES } from "./agents.js";
import { checkSkills } from "./doctor-skills.js";
import { checkClaudeModelPolicy, checkModelPolicy } from "./model-policy.js";
import { isSourceCheckoutRoot } from "./source-checkout.js";
import { checkInterop } from "./interop.js";
import { checkWrapper } from "./wrapper-check.js";

const FILE_AUDIT_PATH = "docs/superloopy-file-audit.md";
const GATE_NOTES_PATH = "docs/superloopy-gate-notes.md";
const DESIGN_AUDIT_PATH = "docs/superloopy-design-audit.md";
const GATE_NOTE_SECTIONS = ["Gate Compatibility", "Golden Scenarios", "Host Contract"];
const GATE_GOLDEN_TESTS = ["test/golden-hooks.test.js", "test/golden-review-gate.test.js", "test/golden-matrix-gate.test.js"];
const MAX_REVIEWABLE_LINES = 500;
const RUNTIME_IGNORE_SAMPLES = [
  ".superloopy/goals.json",
  ".superloopy/evidence/report.md",
  ".DS_Store",
  "docs/.DS_Store",
  "node_modules/example/index.js",
  "coverage/index.html",
  "superloopy.log"
];
const GENERATED_INSTALL_FILES = new Set([
  ".codex-marketplace-install.json"
]);

export async function runDoctor(cwd, options = {}) {
  const pluginManifest = await checkPluginManifest(cwd);
  const hooks = pluginManifest.ok ? await checkHooks(cwd, pluginManifest.manifest.hooks) : fail("Plugin manifest missing.");
  const skills = await checkSkills(cwd);
  const cli = checkCli(cwd);
  const dependencies = await checkDependencies(cwd);
  const runtimeBoundary = checkRuntimeBoundary(cwd);
  const fileAudit = await checkFileAudit(cwd, { auditPath: FILE_AUDIT_PATH, policy: "superloopy-native-boundary", listFiles: listGitVisibleFiles, sourceCheckout: isSourceCheckoutRoot(cwd) });
  const gateNotes = await checkGateNotes(cwd);
  const designAudit = await checkDesignAudit(cwd, {
    auditPath: DESIGN_AUDIT_PATH
  });
  const comparisonSimilarity = await checkComparisonSimilarity(cwd, {
    sources: [{ key: "external", name: "External comparison", audited: null }],
    comparisonPaths: options.comparisonPath === undefined ? {} : { external: options.comparisonPath },
    comparisonPathCommits: options.comparisonPathCommits,
    listFiles: listGitVisibleFiles
  });
  const reviewability = await checkReviewability(cwd);
  const dispatchCoherence = await checkDispatchCoherence(cwd);
  const claudeHostWiring = await checkClaudeHostWiring(cwd);
  const modelPolicy = await checkModelPolicy(cwd);
  const claudeModelPolicy = await checkClaudeModelPolicy(cwd);
  const checks = { pluginManifest, hooks, skills, cli, dependencies, runtimeBoundary, fileAudit, gateNotes, designAudit, comparisonSimilarity, reviewability, dispatchCoherence, claudeHostWiring, modelPolicy, claudeModelPolicy, hostContract: checkHostContract(), interop: checkInterop(options), wrapper: checkWrapper(options) };
  return {
    ok: Object.values(checks).every((check) => check.ok),
    root: cwd,
    checks
  };
}

export function formatDoctor(result) {
  const lines = ["Superloopy doctor"];
  for (const [name, check] of Object.entries(result.checks)) {
    lines.push(`- ${name}: ${check.ok ? "ok" : "fail"}${doctorDetail(name, check)}`);
  }
  lines.push(`overall: ${result.ok ? "ok" : "fail"}`);
  return `${lines.join("\n")}\n`;
}

function doctorDetail(name, check) {
  if (name === "comparisonSimilarity") return ` - ${comparisonSimilarityDetail(check)}`;
  return check.message === undefined ? "" : ` - ${check.message}`;
}

function comparisonSimilarityDetail(check) {
  if (check.checked === false) return "skipped; pass `--comparison-path PATH` to compare copied code-shaped blocks";
  if (check.message !== undefined) return check.message;
  return `checked; ${check.scanned} Superloopy files against ${check.checkedReferenceFiles} comparison files`;
}

async function checkPluginManifest(cwd) {
  const path = join(cwd, ".codex-plugin", "plugin.json");
  if (!existsSync(path)) return fail("Missing .codex-plugin/plugin.json.");
  try {
    const manifest = JSON.parse(await readFile(path, "utf8"));
    if (manifest.name !== "superloopy") return fail("Plugin name must be superloopy.");
    if (manifest.skills !== "./skills/") return fail("Plugin manifest must expose ./skills/.");
    if (!Array.isArray(manifest.hooks) || manifest.hooks.length === 0) return fail("Plugin manifest must list hooks.");
    return { ok: true, manifest };
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function checkHooks(cwd, hooks) {
  const missing = [];
  const invalid = [];
  for (const hookPath of hooks) {
    const absolute = join(cwd, hookPath);
    if (!existsSync(absolute)) {
      missing.push(hookPath);
      continue;
    }
    try {
      const parsed = JSON.parse(await readFile(absolute, "utf8"));
      const commands = collectCommands(parsed);
      const hasLoopyHook = commands.some((command) => command.startsWith('node "${PLUGIN_ROOT}/src/cli.js" hook '));
      if (!hasLoopyHook) {
        invalid.push(hookPath);
      }
    } catch {
      invalid.push(hookPath);
    }
  }
  if (missing.length > 0) return fail(`Missing hook files: ${missing.join(", ")}.`);
  if (invalid.length > 0) return fail(`Invalid hook files: ${invalid.join(", ")}.`);
  return { ok: true, count: hooks.length };
}

function checkCli(cwd) {
  const path = join(cwd, "src", "cli.js");
  if (!existsSync(path)) return fail("Missing src/cli.js.");
  const stat = statSync(path);
  if (!stat.isFile()) return fail("src/cli.js is not a file.");
  return { ok: true };
}

async function checkDependencies(cwd) {
  const path = join(cwd, "package.json");
  try {
    const pkg = JSON.parse(await readFile(path, "utf8"));
    const groups = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"];
    const count = groups.reduce((total, group) => total + Object.keys(pkg[group] ?? {}).length, 0);
    if (count > 0) return fail(`Expected zero package dependencies, found ${count}.`);
    return { ok: true, count };
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

function checkRuntimeBoundary(cwd) {
  try {
    const trackedRuntimeFiles = listGitTrackedFiles(cwd).filter(isRuntimeFile);
    const ignored = listIgnoredSamples(cwd, RUNTIME_IGNORE_SAMPLES);
    const unignoredRuntimeSamples = RUNTIME_IGNORE_SAMPLES.filter((file) => !ignored.has(file));
    if (trackedRuntimeFiles.length > 0) {
      return fail(`Runtime files are tracked: ${trackedRuntimeFiles.join(", ")}.`);
    }
    if (unignoredRuntimeSamples.length > 0) {
      return fail(`Runtime samples are not ignored: ${unignoredRuntimeSamples.join(", ")}.`);
    }
    return {
      ok: true,
      policy: "runtime-state-is-ignored-and-untracked",
      trackedRuntimeFiles,
      unignoredRuntimeSamples,
      ignoredSamples: RUNTIME_IGNORE_SAMPLES
    };
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function checkGateNotes(cwd) {
  const path = join(cwd, GATE_NOTES_PATH);
  if (!existsSync(path)) return fail(`Missing ${GATE_NOTES_PATH}.`);
  try {
    const notes = await readFile(path, "utf8");
    const missing = [];
    for (const section of GATE_NOTE_SECTIONS) {
      if (!notes.includes(`## ${section}`)) missing.push(section);
    }
    for (const testPath of GATE_GOLDEN_TESTS) {
      if (!notes.includes(`\`${testPath}\``)) missing.push(testPath);
    }
    if (missing.length > 0) return fail(`Gate notes missing evidence: ${missing.join(", ")}.`);
    return {
      ok: true,
      notesPath: GATE_NOTES_PATH,
      sections: GATE_NOTE_SECTIONS,
      goldenTests: GATE_GOLDEN_TESTS
    };
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function checkReviewability(cwd) {
  try {
    const files = listGitVisibleFiles(cwd).filter((file) => /\.(js|md|json|yaml)$/u.test(file));
    const measured = await Promise.all(files.map(async (file) => ({
      file,
      lines: countLines(await readFile(join(cwd, file), "utf8"))
    })));
    const oversized = measured.filter((item) => item.lines > MAX_REVIEWABLE_LINES);
    if (oversized.length > 0) {
      return fail(`Files exceed ${MAX_REVIEWABLE_LINES} lines: ${oversized.map((item) => `${item.file}:${item.lines}`).join(", ")}.`);
    }
    return {
      ok: true,
      maxLines: MAX_REVIEWABLE_LINES,
      scanned: measured.length,
      oversized,
      largest: measured.toSorted((left, right) => right.lines - left.lines)[0] ?? null
    };
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

function countLines(content) {
  return content.split("\n").length - 1;
}

function listGitVisibleFiles(cwd) {
  if (!isSourceCheckoutRoot(cwd)) return listFilesystemVisibleFiles(cwd);
  const result = spawnSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
    cwd,
    encoding: "utf8"
  });
  if (result.status !== 0) {
    if (isNotGitRepository(result)) return listFilesystemVisibleFiles(cwd);
    throw new Error(result.stderr.trim() || "Unable to list Git-visible files.");
  }
  return result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((file) => existsSync(join(cwd, file)))
    .filter((file) => !GENERATED_INSTALL_FILES.has(file))
    .sort();
}

function listGitTrackedFiles(cwd) {
  // Same enclosing-repo hazard as listGitVisibleFiles: a parent repo must never answer for an installed/packed root.
  if (!isSourceCheckoutRoot(cwd)) return [];
  const result = spawnSync("git", ["ls-files", "--cached"], {
    cwd,
    encoding: "utf8"
  });
  if (result.status !== 0) {
    if (isNotGitRepository(result)) return [];
    throw new Error(result.stderr.trim() || "Unable to list Git-tracked files.");
  }
  return result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .sort();
}

function listIgnoredSamples(cwd, samples) {
  // Same enclosing-repo hazard: a parent repo's ignore rules say nothing about an install
  // root, so non-checkout roots behave like a non-repo (samples count as ignored). Tracked
  // monorepo subdirectories keep real check-ignore semantics via the checkout's .gitignore.
  if (!isSourceCheckoutRoot(cwd)) return new Set(samples);
  const result = spawnSync("git", ["check-ignore", "--stdin"], {
    cwd,
    encoding: "utf8",
    input: `${samples.join("\n")}\n`
  });
  if (result.status !== 0 && result.status !== 1) {
    if (isNotGitRepository(result)) return new Set(samples);
    throw new Error(result.stderr.trim() || "Unable to check ignored runtime files.");
  }
  return new Set(result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean));
}

function listFilesystemVisibleFiles(cwd) {
  const files = [];
  walkVisibleFiles(cwd, "", files);
  return files
    .filter((file) => !GENERATED_INSTALL_FILES.has(file))
    .filter((file) => !isRuntimeFile(file))
    .sort();
}

function walkVisibleFiles(cwd, prefix, files) {
  for (const entry of readdirSync(join(cwd, prefix), { withFileTypes: true })) {
    const file = prefix.length === 0 ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isDirectory()) {
      if (!SKIP_FILESYSTEM_DIRS.has(entry.name)) walkVisibleFiles(cwd, file, files);
      continue;
    }
    if (entry.isFile()) files.push(file);
  }
}

const SKIP_FILESYSTEM_DIRS = new Set([".git", ".superloopy", "coverage", "dist", "node_modules", "vendor"]);

function isNotGitRepository(result) {
  // The `git` binary itself is missing (spawn failed: error set / status null / no stderr) OR the cwd
  // is not a repo. Either way, degrade to a filesystem walk rather than throwing — a Claude
  // marketplace install may have neither git nor a .git directory.
  if (result.error !== undefined || result.status === null) return true;
  return /not a git repository/u.test(result.stderr ?? "");
}

function isRuntimeFile(file) {
  return file === ".DS_Store"
    || file.endsWith("/.DS_Store")
    || file.startsWith(".superloopy/")
    || file.startsWith("node_modules/")
    || file.startsWith("coverage/")
    || file.endsWith(".log");
}

function collectCommands(value) {
  if (Array.isArray(value)) return value.flatMap((item) => collectCommands(item));
  if (value === null || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, nested]) => {
    if (key === "command" && typeof nested === "string") return [nested];
    return collectCommands(nested);
  });
}

// Coherence between the agents Superloopy dispatches, the agents it installs, and the hook
// matchers that gate them. Catches the auditor-install gap class of bug: an agent named
// in a task() dispatch directive that is never installed or never matched by a hook.
async function checkDispatchCoherence(cwd) {
  try {
    const agentsDir = join(cwd, ".codex", "agents");
    const matchers = await collectSubagentStopMatchers(cwd);
    const matched = (name) => matchers.some((re) => re.test(name));
    const hasToml = (name) => existsSync(join(agentsDir, `${name}.toml`));

    const missingToml = SUPERLOOPY_AGENT_NAMES.filter((name) => !hasToml(name));
    const unmatched = SUPERLOOPY_AGENT_NAMES.filter((name) => !matched(name));
    const dispatched = await collectDispatchedAgentTypes(cwd);
    const undispatchable = dispatched.filter((name) => !SUPERLOOPY_AGENT_NAMES.includes(name) || !hasToml(name) || !matched(name));

    const problems = [];
    if (missingToml.length > 0) problems.push(`installable agents missing .codex/agents/<name>.toml: ${missingToml.join(", ")}`);
    if (unmatched.length > 0) problems.push(`installable agents with no SubagentStop matcher: ${unmatched.join(", ")}`);
    if (undispatchable.length > 0) problems.push(`dispatched subagent_type not installable/matched: ${undispatchable.join(", ")}`);
    if (problems.length > 0) {
      return { ok: false, policy: "dispatched-agents-are-installable-and-matched", agents: SUPERLOOPY_AGENT_NAMES, dispatched, message: `Dispatch coherence: ${problems.join("; ")}.` };
    }
    return { ok: true, policy: "dispatched-agents-are-installable-and-matched", agents: SUPERLOOPY_AGENT_NAMES, dispatched };
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function collectSubagentStopMatchers(cwd) {
  const matchers = [];
  for (const rel of ["hooks/subagent-stop.json", "hooks/subagent-stop-audit.json"]) {
    const absolute = join(cwd, rel);
    if (!existsSync(absolute)) continue;
    const parsed = JSON.parse(await readFile(absolute, "utf8"));
    for (const entry of parsed.hooks?.SubagentStop ?? []) {
      if (typeof entry.matcher === "string") matchers.push(new RegExp(entry.matcher));
    }
  }
  return matchers;
}

// Scan only the files that carry real dispatch directives (the audit dispatch builder and
// the user-facing flow docs), not every source file — a `subagent_type=` mention inside a
// comment or example elsewhere is not a dispatch and must not be treated as one.
async function collectDispatchedAgentTypes(cwd) {
  const names = new Set();
  for (const rel of ["src/audit.js", "skills/superloopy-loop/SKILL.md", "README.md"]) {
    const absolute = join(cwd, rel);
    if (!existsSync(absolute)) continue;
    const content = await readFile(absolute, "utf8");
    const pattern = /subagent_type\s*=\s*["']([a-z0-9-]+)["']/giu;
    let match;
    while ((match = pattern.exec(content)) !== null) names.add(match[1]);
  }
  return [...names];
}

// Validate the Claude Code wiring that lives OUTSIDE the Codex plugin manifest: the pure-metadata
// `.claude-plugin/plugin.json`, and `hooks/hooks.json` (auto-loaded by Claude). The Codex checks
// above never touch these, so without this a broken Claude install would still show doctor green.
// The key guarantee is that the SubagentStop matchers fire on Claude's PLUGIN-NAMESPACED agent
// types (`superloopy:franky`), not just the bare Codex names.
export async function checkClaudeHostWiring(cwd) {
  const problems = [];
  const manifestPath = join(cwd, ".claude-plugin", "plugin.json");
  if (!existsSync(manifestPath)) {
    problems.push("missing .claude-plugin/plugin.json");
  } else {
    try {
      const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
      if (manifest?.name !== "superloopy") problems.push(".claude-plugin/plugin.json name must be superloopy");
    } catch (error) {
      problems.push(`.claude-plugin/plugin.json invalid JSON (${errorText(error)})`);
    }
  }

  const hooksPath = join(cwd, "hooks", "hooks.json");
  const matcherSources = [];
  if (!existsSync(hooksPath)) {
    problems.push("missing hooks/hooks.json (Claude hook wiring)");
  } else {
    let parsed;
    let parseFailed = false;
    try {
      parsed = JSON.parse(await readFile(hooksPath, "utf8"));
    } catch (error) {
      parseFailed = true;
      problems.push(`hooks/hooks.json invalid JSON (${errorText(error)})`);
    }
    if (!parseFailed) {
      // `parsed` may legitimately be null / a non-object here; optional chaining keeps this safe and
      // falls through to the "declares no SubagentStop hooks" problem below.
      const rawEntries = parsed?.hooks?.SubagentStop;
      const subagentStop = Array.isArray(rawEntries) ? rawEntries.filter((entry) => entry && typeof entry === "object") : [];
      if (subagentStop.length === 0) {
        problems.push("hooks/hooks.json declares no SubagentStop hooks");
      } else {
        // Coverage requires the SAME entry to BOTH match an agent AND invoke the CLI, so a broken
        // command on one entry can't be masked by a healthy sibling, and a CLI entry that matches
        // nothing real can't be propped up by a non-CLI entry that does. Matchers are compiled
        // defensively (an invalid pattern is a reported problem, not a doctor crash) and tested with
        // a FULL (anchored) match against the namespace Claude sends (`superloopy:<name>`), so a bare
        // Codex-style matcher that only substring-matches is rejected. Claude treats a missing/empty
        // matcher as match-all.
        const entries = subagentStop.map((entry) => {
          const commands = (Array.isArray(entry.hooks) ? entry.hooks : [])
            .map((hook) => hook?.command)
            .filter((command) => typeof command === "string");
          const invokesCli = commands.some(
            (command) => command.includes("${CLAUDE_PLUGIN_ROOT}/src/cli.js") && command.includes(" hook ")
          );
          const matcher = typeof entry.matcher === "string" ? entry.matcher : "";
          if (matcher.length > 0) matcherSources.push(matcher);
          let regex;
          if (matcher.length === 0) {
            regex = /.*/u;
          } else {
            try {
              regex = new RegExp(`^(?:${matcher})$`, "u");
            } catch {
              regex = null;
              problems.push(`hooks/hooks.json SubagentStop matcher is not a valid regex: ${matcher}`);
            }
          }
          return { regex, invokesCli };
        });

        const uncovered = SUPERLOOPY_AGENT_NAMES.filter(
          (name) => !entries.some((entry) => entry.invokesCli && entry.regex !== null && entry.regex.test(`superloopy:${name}`))
        );
        if (uncovered.length > 0) {
          problems.push(`no CLI-invoking SubagentStop hook covers plugin-namespaced agents: ${uncovered.map((n) => `superloopy:${n}`).join(", ")}`);
        }
      }
    }
  }

  if (problems.length > 0) {
    return { ok: false, policy: "claude-host-wiring-present-and-namespaced", message: `Claude host wiring: ${problems.join("; ")}.` };
  }
  return { ok: true, policy: "claude-host-wiring-present-and-namespaced", matchers: matcherSources };
}

function errorText(error) {
  return error instanceof Error ? error.message : String(error);
}

// Advisory (always ok): state plainly the host behaviors Superloopy's hook-layer gates depend on
// but cannot verify from inside a hook. The deterministic completion floor (loop.js ->
// audit-gate-verify.js) does NOT depend on any of these and gates completion even if every
// hook is inert — so absent host support the gates degrade to advisory, not unsafe.
function checkHostContract() {
  return {
    ok: true,
    policy: "hook-gates-are-advisory-completion-floor-is-authoritative",
    cannotVerify: [
      "the host spawns custom agents from ~/.codex/agents by subagent_type",
      "the host emits SubagentStop with agent_type and agent_id populated",
      "the host honors a subagent hook returning a block decision by re-prompting it"
    ],
    message: "hook gates are advisory; if the host ignores them the deterministic completion floor still gates completion"
  };
}

function fail(message) {
  return { ok: false, message };
}
