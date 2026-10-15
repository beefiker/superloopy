// `superloopy setup | update | doctor --hosts` and bare `superloopy` in a terminal. Run through
// `npx superloopy@latest` these install Superloopy into every host CLI found on PATH, bring
// existing installs up to the npm version, and report each host's state.
//
// Self-update: npx can reuse a cached older copy of the package, so a run from an npm package
// root first asks the registry for the latest version and, when newer, re-executes itself through
// `npx --yes superloopy@<latest>` once (guarded by SUPERLOOPY_SELF_UPDATED). Checkouts and plugin
// installs never self-update, and hooks never reach this path.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { hasFlag, readFlag } from "./args.js";
import { compareVersions, parseVersion, resolveLatestVersion } from "./auto-update-plan.js";
import { formatHostSetupResult, hostLabel, runHostSetup, SETUP_HOSTS } from "./host-setup.js";
import { resolveSpawnInvocation } from "./spawn-command.js";

const LATEST_TIMEOUT_MS = "5000";

export function isNpmPackageRoot(root) {
  return root.split(/[\\/]/u).includes("node_modules");
}

export function selfUpdatePlan({ root, currentVersion, latestVersion, argv, env }) {
  if (env.SUPERLOOPY_NO_SELF_UPDATE === "1" || hasFlag(argv, "--no-self-update")) return { reexec: false, reason: "disabled" };
  if (env.SUPERLOOPY_SELF_UPDATED) return { reexec: false, reason: "already-updated" };
  if (!isNpmPackageRoot(root)) return { reexec: false, reason: "not-an-npm-install" };
  const current = parseVersion(currentVersion);
  const latest = parseVersion(latestVersion);
  if (current === null || latest === null) return { reexec: false, reason: "unknown-version" };
  if (compareVersions(latest, current) <= 0) return { reexec: false, reason: "current" };
  return {
    reexec: true,
    command: "npx",
    args: ["--yes", `superloopy@${latestVersion}`, ...argv],
    env: { ...env, SUPERLOOPY_SELF_UPDATED: latestVersion }
  };
}

// mode: "setup" | "update" | "doctor". Returns the process exit code.
export async function runSetupCommand(mode, argv, { root, stdin, stdout, stderr, env = process.env, deps = {} }) {
  if (hasFlag(argv, "--help") || hasFlag(argv, "-h")) {
    stdout.write(setupHelp());
    return 0;
  }
  const hosts = parseHosts(argv);
  const json = hasFlag(argv, "--json");
  const currentVersion = readPackageVersion(root);

  const latestVersion = (deps.resolveLatestVersion ?? resolveLatestVersion)({ SUPERLOOPY_LATEST_VERSION_TIMEOUT_MS: LATEST_TIMEOUT_MS, ...env });
  const plan = selfUpdatePlan({ root, currentVersion, latestVersion, argv: [mode, ...argv], env });
  if (plan.reexec) {
    if (!json) stderr.write(`Superloopy ${currentVersion} is outdated; running ${latestVersion} through npx.\n`);
    const invocation = resolveSpawnInvocation(plan.command, plan.args);
    const result = (deps.spawnSync ?? spawnSync)(invocation.command, invocation.args, { stdio: "inherit", env: plan.env });
    if (result.error === undefined && typeof result.status === "number") return result.status;
    stderr.write(`Could not start npx (${result.error?.message ?? "unknown error"}); continuing with ${currentVersion}.\n`);
  }

  const interactive = stdin?.isTTY === true && stdout?.isTTY === true && !json;
  const yes = hasFlag(argv, "--yes") || hasFlag(argv, "-y");
  const explicitHosts = readFlag(argv, "--host") !== undefined;
  const confirmInstall = deps.confirmInstall ?? (async (host) => {
    if (yes || explicitHosts) return true;
    if (!interactive) return false;
    return await askYesNo(stdin, stdout, `Install Superloopy into ${hostLabel(host)}? [Y/n] `);
  });

  const result = await runHostSetup({
    mode,
    target: targetVersion(currentVersion, latestVersion),
    hosts,
    dryRun: hasFlag(argv, "--dry-run"),
    confirmInstall,
    run: deps.run,
    env
  });
  if (json) stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  else {
    stdout.write(formatHostSetupResult(result));
    if (mode === "setup" && result.hosts.some((report) => report.action === "not-installed")) {
      stdout.write("Hosts without Superloopy were skipped. Add one with `npx superloopy@latest setup --host <claude|codex|antigravity>` or all with `--yes`.\n");
    }
  }
  return result.ok ? 0 : 1;
}

function parseHosts(argv) {
  const raw = readFlag(argv, "--host");
  if (raw === undefined) return SETUP_HOSTS;
  const names = raw.split(",").map((value) => value.trim().toLowerCase()).filter(Boolean)
    .map((value) => (value === "agy" ? "antigravity" : value));
  const unknown = names.filter((value) => !SETUP_HOSTS.includes(value));
  if (names.length === 0 || unknown.length > 0) {
    throw new Error(`--host must list claude, codex, or antigravity (agy); received ${JSON.stringify(raw)}.`);
  }
  return SETUP_HOSTS.filter((host) => names.includes(host));
}

function readPackageVersion(root) {
  return JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
}

async function askYesNo(stdin, stdout, question) {
  const prompt = createInterface({ input: stdin, output: stdout });
  try {
    const answer = (await prompt.question(question)).trim().toLowerCase();
    return answer === "" || answer === "y" || answer === "yes";
  } finally {
    prompt.close();
  }
}

// The version hosts should reach: the newer of this copy and npm `latest` (unknown when offline).
function targetVersion(currentVersion, latestVersion) {
  const current = parseVersion(currentVersion);
  const latest = parseVersion(latestVersion);
  if (latest === null || current === null) return currentVersion;
  return compareVersions(latest, current) > 0 ? latestVersion : currentVersion;
}

export function setupHelp() {
  return [
    "Usage:",
    "  npx superloopy@latest [setup] [--host claude,codex,antigravity] [--yes] [--dry-run] [--json]",
    "  npx superloopy@latest update [--host ...] [--dry-run] [--json]",
    "  npx superloopy@latest doctor [--host ...] [--json]",
    "",
    "setup   Installs Superloopy into each host CLI found on PATH (claude, codex, agy) through the host's",
    "        own plugin commands, and updates hosts that already have it. In a terminal it asks per host;",
    "        otherwise it installs only into hosts named with --host, or all with --yes.",
    "update  Updates hosts that already have Superloopy; installs nothing new.",
    "doctor  Reports each host's installed version against the latest release and validates the",
    "        installed copy with the host's validator. Changes nothing.",
    "",
    "Run from npm, it first re-runs itself as the latest published version. Opt out with",
    "--no-self-update or SUPERLOOPY_NO_SELF_UPDATE=1.",
    ""
  ].join("\n");
}
