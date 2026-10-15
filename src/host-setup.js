// Installs, updates, and checks Superloopy in each host through that host's own plugin CLI
// (`claude plugin …`, `codex plugin …`, `agy plugin …`, `omp plugin …`). Superloopy never writes
// host config files itself: the host stays the owner of what is installed, so a later
// `/plugin update`, `codex plugin marketplace upgrade`, or uninstall keeps working the way the host
// documents it.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { compareVersions, parseVersion } from "./auto-update-plan.js";

export const REPO = "beefiker/superloopy";
export const PLUGIN_ID = "superloopy@beefiker";
export const SETUP_HOSTS = ["claude", "codex", "antigravity", "omp"];
const MARKETPLACE = "beefiker";
const REPO_URL = `https://github.com/${REPO}`;
const LABELS = { claude: "Claude Code", codex: "Codex", antigravity: "Google Antigravity", omp: "omp" };
const BINARIES = { claude: "claude", codex: "codex", antigravity: "agy", omp: "omp" };
// Codex has no `plugin enable` subcommand; its plugin browser is where a plugin is switched on.
const ENABLE = {
  claude: `claude plugin enable ${PLUGIN_ID}`,
  codex: "turn superloopy on in Codex's /plugins menu",
  antigravity: "agy plugin enable superloopy",
  omp: `omp plugin enable ${PLUGIN_ID}`
};
// omp installs the Claude-format plugin from the same marketplace and loads its skills and agents;
// it does not run Claude-format hooks.json, so there is no hook approval step.
const AFTER = {
  claude: "Run /reload-plugins in open Claude Code sessions (or restart them).",
  codex: "Restart Codex and approve Modified hooks; the next session reconciles the wrapper and agents.",
  antigravity: "Start a new Antigravity session.",
  omp: "Run /reload-plugins in open omp sessions (or restart them)."
};
const QUERY_TIMEOUT_MS = 30_000;
const CHANGE_TIMEOUT_MS = 300_000; // installs clone the repository
const MIN_NODE_MAJOR = 22;

export function hostLabel(host) {
  return LABELS[host];
}

// `run(command, args, { timeoutMs })` -> { status, stdout, stderr, error }. Injected in tests.
export function defaultRun(command, args, { timeoutMs = QUERY_TIMEOUT_MS } = {}) {
  const options = { encoding: "utf8", timeout: timeoutMs, stdio: ["ignore", "pipe", "pipe"] };
  let result = spawnSync(command, args, options);
  // Windows: a native `.exe` host starts directly; an npm-installed host is a `.cmd` shim that
  // only cmd.exe can start. cmd.exe re-parses its command line, so the fallback refuses any
  // argument it would read as syntax instead of passing it through.
  if (process.platform === "win32" && result.error?.code === "ENOENT") {
    if (args.some((value) => /[&|<>^%!"()\r\n]/u.test(value))) {
      return { status: null, stdout: "", stderr: "", error: new Error(`refusing to pass ${command} arguments with cmd.exe metacharacters to a .cmd shim`) };
    }
    result = spawnSync("cmd.exe", ["/d", "/c", `${command}.cmd`, ...args], options);
  }
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "", error: result.error };
}

export function inspectHost(host, { run = defaultRun, env = process.env } = {}) {
  const bin = BINARIES[host];
  const version = run(bin, ["--version"]);
  if (version.error !== undefined || version.status !== 0) return { host, available: false };
  const base = { host, available: true, cliVersion: firstLine(version.stdout) };
  if (host === "claude") return { ...base, ...inspectClaude(run) };
  if (host === "codex") return { ...base, ...inspectCodex(run, env) };
  if (host === "omp") return { ...base, ...inspectOmp(run) };
  return { ...base, ...inspectAntigravity(run) };
}

function inspectClaude(run) {
  const listed = run("claude", ["plugin", "list", "--json"]);
  const plugins = jsonOutput(listed);
  if (!Array.isArray(plugins)) return { error: listError("claude plugin list --json", listed) };
  const entry = plugins.find((plugin) => plugin?.id === PLUGIN_ID);
  const foreign = plugins.find((plugin) => typeof plugin?.id === "string" && plugin.id.startsWith("superloopy@") && plugin.id !== PLUGIN_ID);
  const marketplaces = jsonOutput(run("claude", ["plugin", "marketplace", "list", "--json"]));
  return {
    installed: entry === undefined ? null : { version: String(entry.version ?? ""), path: entry.installPath ?? null, enabled: entry.enabled !== false, scope: entry.scope ?? "user" },
    foreign: foreign?.id ?? null,
    marketplace: Array.isArray(marketplaces) && marketplaces.some((item) => item?.name === MARKETPLACE)
  };
}

function inspectCodex(run, env) {
  const listed = run("codex", ["plugin", "list", "--json"]);
  const plugins = jsonOutput(listed);
  if (plugins === null || !Array.isArray(plugins.installed)) return { error: listError("codex plugin list --json", listed) };
  const entry = plugins.installed.find((plugin) => plugin?.pluginId === PLUGIN_ID && plugin.installed === true);
  const foreign = plugins.installed.find((plugin) => plugin?.name === "superloopy" && plugin.pluginId !== PLUGIN_ID && plugin.installed === true);
  const marketplaces = jsonOutput(run("codex", ["plugin", "marketplace", "list", "--json"]));
  const codexHome = env.CODEX_HOME?.trim() || join(homedir(), ".codex");
  const cachePath = entry === undefined ? null : join(codexHome, "plugins", "cache", MARKETPLACE, "superloopy", String(entry.version));
  return {
    installed: entry === undefined ? null : { version: String(entry.version ?? ""), path: cachePath !== null && existsSync(cachePath) ? cachePath : null, enabled: entry.enabled !== false },
    foreign: foreign?.pluginId ?? null,
    marketplace: Array.isArray(marketplaces?.marketplaces) && marketplaces.marketplaces.some((item) => item?.name === MARKETPLACE)
  };
}

function inspectAntigravity(run) {
  const listed = run("agy", ["plugin", "list", "--json"]);
  const plugins = jsonOutput(listed);
  if (!Array.isArray(plugins)) return { error: listError("agy plugin list --json", listed) };
  const entry = plugins.find((plugin) => plugin?.name === "superloopy");
  return {
    installed: entry === undefined ? null : { version: String(entry.version ?? ""), path: entry.path ?? null, enabled: entry.enabled !== false },
    foreign: null,
    marketplace: true
  };
}

// `omp plugin list --json` reports one `marketplace` item per install scope (user, project), each
// with the same plugin id and its own `entries`. Upgrading without `--scope` reinstalls every
// scope, so the oldest scope decides whether an update is due; the plugin counts as on while any
// scope has it enabled (a disabled project install does not shadow an enabled user install).
function inspectOmp(run) {
  const listed = run("omp", ["plugin", "list", "--json"]);
  const plugins = jsonOutput(listed);
  if (plugins === null || !Array.isArray(plugins.marketplace)) return { error: listError("omp plugin list --json", listed) };
  const entries = plugins.marketplace
    .filter((item) => item?.id === PLUGIN_ID && Array.isArray(item.entries))
    .flatMap((item) => item.entries)
    .filter((entry) => entry !== null && typeof entry === "object");
  const oldest = entries.reduce((found, entry) => (found === null || !isCurrent(String(entry.version ?? ""), String(found.version ?? "")) ? entry : found), null);
  const foreign = plugins.marketplace.find((item) => typeof item?.id === "string" && item.id.startsWith("superloopy@") && item.id !== PLUGIN_ID);
  // `marketplace list` prints a table even with `--json`: one `<name>  <source>` row per marketplace.
  const marketplaces = run("omp", ["plugin", "marketplace", "list"]);
  return {
    installed: oldest === null ? null : { version: String(oldest.version ?? ""), path: oldest.installPath ?? null, enabled: entries.some((entry) => entry.enabled !== false) },
    foreign: foreign?.id ?? null,
    marketplace: marketplaces.error === undefined && marketplaces.status === 0 && new RegExp(`^\\s*${MARKETPLACE}\\s`, "mu").test(String(marketplaces.stdout ?? ""))
  };
}

// Older host CLIs lack plugin commands or fail on their own config; pass their words through.
function listError(command, result) {
  const detail = String(result.stderr || result.stdout || result.error?.message || "").trim().split(/\r?\n/u).filter(Boolean).slice(0, 3).join(" ");
  return `\`${command}\` did not return a plugin list${detail ? `: ${detail.slice(0, 300)}` : "."} Update the CLI or fix the error, then rerun.`;
}

// What to do for one inspected host. `allowInstall` decides whether a host without Superloopy gets
// it; an existing install is always brought up to `target`.
export function planHost(inspection, { target, allowInstall }) {
  const { host } = inspection;
  if (!inspection.available) return { action: "unavailable", steps: [] };
  if (inspection.error !== undefined) return { action: "error", steps: [], message: inspection.error };
  if (inspection.installed === null) {
    if (inspection.foreign !== null) return { action: "foreign", steps: [], message: `${inspection.foreign} is installed from another marketplace; left alone.` };
    if (!allowInstall) return { action: "not-installed", steps: [] };
    return { action: "install", steps: installSteps(host, inspection) };
  }
  if (!isCurrent(inspection.installed.version, target)) return { action: "update", steps: updateSteps(host, inspection) };
  // Installed and current but switched off contributes no hooks, skills, or agents. Turning it
  // back on is the user's call (they may have disabled it on purpose), so report, don't enable.
  if (!inspection.installed.enabled) return { action: "disabled", steps: [], message: `Installed but disabled. Enable it with \`${ENABLE[host]}\`.` };
  return { action: "current", steps: [] };
}

function installSteps(host, inspection) {
  if (host === "claude") {
    return [
      ...(inspection.marketplace ? [] : [step("claude", ["plugin", "marketplace", "add", REPO])]),
      step("claude", ["plugin", "install", PLUGIN_ID])
    ];
  }
  if (host === "codex") {
    return [
      ...(inspection.marketplace ? [] : [step("codex", ["plugin", "marketplace", "add", REPO])]),
      step("codex", ["plugin", "add", PLUGIN_ID])
    ];
  }
  if (host === "omp") {
    return [
      ...(inspection.marketplace ? [] : [step("omp", ["plugin", "marketplace", "add", REPO])]),
      step("omp", ["plugin", "install", PLUGIN_ID])
    ];
  }
  return [step("agy", ["plugin", "install", REPO_URL])];
}

function updateSteps(host, inspection) {
  if (host === "claude") {
    const scope = inspection.installed.scope === "user" ? [] : ["--scope", inspection.installed.scope];
    return [step("claude", ["plugin", "marketplace", "update", MARKETPLACE]), step("claude", ["plugin", "update", PLUGIN_ID, ...scope])];
  }
  // A marketplace upgrade only refreshes Codex's snapshot; `plugin add` reinstalls from it.
  if (host === "codex") return [step("codex", ["plugin", "marketplace", "upgrade", MARKETPLACE]), step("codex", ["plugin", "add", PLUGIN_ID])];
  // `marketplace update` refreshes omp's catalog only; `plugin upgrade` reinstalls every scope from it.
  if (host === "omp") return [step("omp", ["plugin", "marketplace", "update", MARKETPLACE]), step("omp", ["plugin", "upgrade", PLUGIN_ID])];
  // Antigravity documents re-running the install as its update; it replaces the clone, which a
  // `git pull --ff-only` cannot do once the repository's history was rewritten.
  return [step("agy", ["plugin", "install", REPO_URL])];
}

// Host-native validation of the installed copy, used by the doctor report.
export function validateHost(inspection, { run = defaultRun } = {}) {
  const path = inspection.installed?.path;
  if (path === null || path === undefined) return null;
  if (inspection.host === "claude") {
    // The repository is both a marketplace and a plugin; validating the directory picks the
    // marketplace manifest, so point at the plugin manifest when it is there.
    const manifest = join(path, ".claude-plugin", "plugin.json");
    const target = existsSync(manifest) ? manifest : path;
    const result = run("claude", ["plugin", "validate", target, "--json"]);
    return { ok: result.status === 0 && jsonOutput(result)?.success === true, command: `claude plugin validate ${target}` };
  }
  if (inspection.host === "antigravity") {
    const result = run("agy", ["plugin", "validate", path]);
    return { ok: result.status === 0, command: `agy plugin validate ${path}` };
  }
  // Codex and omp have no plugin validator; `superloopy doctor` inside a Codex session covers Codex.
  return null;
}

// mode: "setup" installs where allowed and updates existing installs; "update" only updates;
// "doctor" changes nothing. `confirmInstall(host)` resolves whether a missing host gets Superloopy.
export async function runHostSetup({ mode, target, hosts = SETUP_HOSTS, dryRun = false, confirmInstall = async () => false, run = defaultRun, env = process.env, nodeVersion = process.versions.node } = {}) {
  // Superloopy's hooks run on the node found on PATH, so an install under an older Node would
  // leave hosts with hooks that cannot start. Check first and change nothing when it fails.
  const nodeOk = Number.parseInt(String(nodeVersion).split(".")[0], 10) >= MIN_NODE_MAJOR;
  const apply = mode !== "doctor" && !dryRun && nodeOk;
  const reports = [];
  for (const host of hosts) {
    const before = inspectHost(host, { run, env });
    const allowInstall = mode === "setup" && before.available && before.installed === null && before.foreign === null && before.error === undefined
      ? await confirmInstall(host)
      : false;
    const plan = planHost(before, { target, allowInstall });
    const report = { host, label: LABELS[host], available: before.available, cliVersion: before.cliVersion ?? null, before: before.installed?.version ?? null, action: plan.action, steps: plan.steps.map(renderStep), message: plan.message ?? null };
    if (apply && plan.steps.length > 0) {
      const failure = applySteps(plan.steps, run);
      const after = inspectHost(host, { run, env });
      report.after = after.installed?.version ?? null;
      // Success means the host reached the target, not merely that every command exited 0.
      report.ok = failure === null && report.after !== null && isCurrent(report.after, target);
      if (failure !== null) report.message = failure;
      else if (report.after !== null && !isCurrent(report.after, target)) report.message = `GitHub serves ${report.after} through the ${MARKETPLACE} marketplace; the target is ${target}. Rerun after the release reaches GitHub main.`;
      if (failure === null && report.after !== null) report.next = AFTER[host];
    } else {
      report.after = report.before;
      report.ok = plan.action !== "error" && plan.action !== "disabled";
      if (!nodeOk && mode !== "doctor" && plan.steps.length > 0) report.message = `Skipped: Node ${nodeVersion} is below ${MIN_NODE_MAJOR}; nothing was changed.`;
    }
    if (mode === "doctor") {
      report.validate = before.installed === null ? null : validateHost(before, { run });
      report.ok = doctorOk(report);
      report.next = doctorNext(report);
    }
    reports.push(report);
  }
  const anyHost = reports.some((report) => report.available);
  return {
    ok: nodeOk && anyHost && reports.every((report) => report.ok !== false),
    mode,
    dryRun,
    target,
    node: { version: String(nodeVersion), ok: nodeOk, required: `>=${MIN_NODE_MAJOR}` },
    hosts: reports
  };
}

function doctorOk(report) {
  if (!report.available || report.action === "not-installed") return true;
  if (report.action !== "current") return false;
  return report.validate === null || report.validate === undefined || report.validate.ok;
}

function doctorNext(report) {
  if (report.action === "update") return "npx superloopy@latest update";
  if (report.action === "disabled") return ENABLE[report.host];
  if (report.action === "not-installed") return `npx superloopy@latest setup --host ${report.host}`;
  if (report.validate?.ok === false) return `${report.validate.command} (then reinstall with npx superloopy@latest setup --host ${report.host})`;
  return undefined;
}

function applySteps(steps, run) {
  for (const current of steps) {
    const result = run(current.command, current.args, { timeoutMs: CHANGE_TIMEOUT_MS });
    if (result.error !== undefined || result.status !== 0) {
      const detail = errorSummary(result.stderr || result.stdout || result.error?.message);
      return `\`${renderStep(current)}\` failed${detail ? `: ${detail}` : "."}`;
    }
  }
  return null;
}

// Keep the lines that say what went wrong (`error:`, `fatal:`); otherwise the last few lines.
function errorSummary(text) {
  const lines = String(text ?? "").split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
  const flagged = lines.filter((line) => /^(?:error|fatal)\b/iu.test(line));
  return (flagged.length > 0 ? flagged : lines.slice(-3)).join(" ").slice(0, 400);
}

export function formatHostSetupResult(result) {
  const title = result.mode === "doctor" ? "Superloopy host check" : `Superloopy ${result.mode}${result.dryRun ? " (dry run)" : ""}`;
  const lines = [`${title} - target ${result.target}`, ""];
  const applied = !result.dryRun && result.mode !== "doctor" && result.node.ok;
  for (const report of result.hosts) {
    lines.push(`${report.label}: ${describe(report, applied)}`);
    if (!applied) for (const command of report.steps) lines.push(`  would run: ${command}`);
    if (report.validate) lines.push(`  ${report.validate.ok ? "validated" : "validation failed"}: ${report.validate.command}`);
    if (report.message) lines.push(`  ${report.message}`);
    if (report.next) lines.push(`  next: ${report.next}`);
  }
  lines.push("", `Node ${result.node.version}: ${result.node.ok ? "ok" : `Superloopy needs Node ${result.node.required}; its hooks run with the node on PATH.`}`);
  if (!result.hosts.some((report) => report.available)) lines.push("No supported host CLI (claude, codex, agy, omp) was found on PATH.");
  return `${lines.join("\n")}\n`;
}

function describe(report, applied) {
  if (!report.available) return "not found on PATH";
  const cli = report.cliVersion ? ` (${report.cliVersion})` : "";
  const changed = applied && report.steps.length > 0;
  switch (report.action) {
    case "current": return `${report.before} is current${cli}`;
    case "not-installed": return `Superloopy not installed${cli}`;
    case "foreign": return `another Superloopy install${cli}`;
    case "error": return `check failed${cli}`;
    case "disabled": return `${report.before} is installed but disabled${cli}`;
    case "install": return changed ? (report.ok ? `installed ${report.after}${cli}` : `install failed${cli}`) : `would install${cli}`;
    case "update": return changed ? (report.ok ? `updated ${report.before} -> ${report.after}${cli}` : `update failed${cli}`) : `${report.before} is outdated${cli}`;
    default: return report.action;
  }
}

function isCurrent(installed, target) {
  const left = parseVersion(installed);
  const right = parseVersion(target);
  if (left === null || right === null) return false;
  return compareVersions(left, right) >= 0;
}

function step(command, args) {
  return { command, args };
}

function renderStep(current) {
  return [current.command, ...current.args].join(" ");
}

function firstLine(text) {
  return String(text ?? "").trim().split(/\r?\n/u)[0] || null;
}

// Host CLIs sometimes print a notice before their JSON; parse from the first bracket.
function jsonOutput(result) {
  if (result.error !== undefined || result.status !== 0) return null;
  const text = String(result.stdout ?? "");
  const start = text.search(/[[{]/u);
  if (start === -1) return null;
  try {
    return JSON.parse(text.slice(start));
  } catch {
    return null;
  }
}
