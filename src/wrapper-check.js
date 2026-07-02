// Advisory doctor check: does the installed `superloopy` bin wrapper still point at the
// current version? On Codex marketplace installs the wrapper embeds an ABSOLUTE path into a
// versioned cache dir (.../superloopy/<version>/src/cli.js), and it is only rewritten when the
// new version's SessionStart bootstrap re-runs the installer. So right after an upgrade the
// plugin list can read 0.7.1 while the wrapper still runs the 0.7.0 cache — or points at a
// pruned cache that no longer exists.
//
// This check SURFACES that as a suggestion, never a requirement: it always returns ok:true
// (informational) so `superloopy doctor`'s overall health never fails just because a newer
// version is available or the wrapper is stale. It is no-throw and dependency-injectable.

import { existsSync as fsExistsSync, readFileSync as fsReadFileSync, readdirSync as fsReaddirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { parseBinShimCliPath } from "./agents.js";
import { compareVersions, parseVersion } from "./auto-update-plan.js";

function informational(message, extra = {}) {
  return { ok: true, informational: true, message, ...extra };
}

// Returns a doctor-shaped { ok:true, informational:true, message, ... } result. Never throws.
export function checkWrapper(options = {}) {
  try {
    const env = options.env !== null && typeof options.env === "object" ? options.env : process.env;
    const platform = options.platform ?? process.platform;
    const fs = options.fs ?? { existsSync: fsExistsSync, readFileSync: fsReadFileSync, readdirSync: fsReaddirSync };

    const located = locateWrapper(env, platform, fs);
    if (located === null) {
      return informational("no Superloopy bin wrapper on PATH (Claude Code, checkout, or not installed) - wrapper currency not tracked", { found: false });
    }
    const cliPath = located.content === null ? null : parseBinShimCliPath(located.content, platform);
    if (cliPath === null) {
      // Something other than our generated shim owns the `superloopy` name that resolves first
      // on PATH (a package-manager or checkout shim). That is what the shell actually runs, so
      // report it rather than a generated shim later on PATH the user never invokes.
      return informational(`the \`superloopy\` that resolves first on PATH (${located.path}) is not a Superloopy-generated wrapper - currency not tracked`, { found: true, recognized: false });
    }
    if (!fs.existsSync(cliPath)) {
      return informational(
        `bin wrapper at ${located.path} points at ${cliPath}, which no longer exists (a marketplace upgrade likely pruned that cached version). The \`superloopy\` command will not run until re-pointed: re-approve the Modified hooks and start a new Codex session, or run \`superloopy bin install --force\` from the current version.`,
        { found: true, dangling: true, wrapperPath: located.path, cliPath }
      );
    }
    const currency = evaluateWrapperCurrency(cliPath, fs);
    if (currency.state === "stale") {
      return informational(
        `bin wrapper runs superloopy v${currency.wrapperVersion} but v${currency.latestVersion} is installed. Upgrading is optional; to run the newer version, re-approve the Modified hooks and start a new Codex session, or run \`node "${currency.latestCliPath}" bin install --force\`.`,
        { found: true, stale: true, wrapperPath: located.path, wrapperVersion: currency.wrapperVersion, latestVersion: currency.latestVersion }
      );
    }
    if (currency.state === "untracked") {
      return informational(`bin wrapper points at a local checkout (${cliPath}); version currency is not tracked for checkout installs`, { found: true });
    }
    return informational(`bin wrapper is current (superloopy v${currency.wrapperVersion})`, { found: true, wrapperVersion: currency.wrapperVersion });
  } catch {
    return informational("wrapper currency check could not complete");
  }
}

// Find the wrapper the shell would actually run: the FIRST PATH entry holding a file named
// `superloopy` (or `superloopy.cmd`), regardless of its content. Returns { path, content }
// (content is null when unreadable) or null when no such file is on PATH. The caller decides
// whether that resolved file is one of our generated shims — scanning past it to a later
// generated shim would report on a command the user never invokes.
function locateWrapper(env, platform, fs) {
  const wrapperName = platform === "win32" ? "superloopy.cmd" : "superloopy";
  const rawPath = typeof env.PATH === "string" ? env.PATH : typeof env.Path === "string" ? env.Path : "";
  const sep = platform === "win32" ? ";" : ":";
  for (const entry of rawPath.split(sep)) {
    const dir = entry.trim().replace(/^"|"$/gu, "");
    if (dir.length === 0) continue;
    const candidate = join(dir, wrapperName);
    let exists = false;
    try {
      exists = fs.existsSync(candidate);
    } catch {
      exists = false;
    }
    if (!exists) continue;
    let content = null;
    try {
      content = fs.readFileSync(candidate, "utf8");
    } catch {
      content = null;
    }
    return { path: candidate, content };
  }
  return null;
}

// Decide currency from the versioned-cache layout .../superloopy/<version>/src/cli.js: compare
// the wrapper's version dir against the newest sibling version dir that still has a cli.js.
// Returns { state: "current"|"stale"|"untracked", wrapperVersion?, latestVersion?, latestCliPath? }.
export function evaluateWrapperCurrency(cliPath, fs = { existsSync: fsExistsSync, readdirSync: fsReaddirSync }) {
  const versionRoot = dirname(dirname(cliPath)); // .../superloopy/<version>
  const container = dirname(versionRoot); // .../superloopy
  const wrapperName = basename(versionRoot);
  const wrapperVersion = parseVersion(wrapperName);
  if (wrapperVersion === null) return { state: "untracked" };
  let names;
  try {
    names = fs.readdirSync(container);
  } catch {
    return { state: "current", wrapperVersion: wrapperName };
  }
  let bestVersion = wrapperVersion;
  let bestName = wrapperName;
  for (const name of names) {
    const parsed = parseVersion(name);
    if (parsed === null) continue;
    if (!fs.existsSync(join(container, name, "src", "cli.js"))) continue;
    if (compareVersions(parsed, bestVersion) > 0) {
      bestVersion = parsed;
      bestName = name;
    }
  }
  if (compareVersions(bestVersion, wrapperVersion) > 0) {
    return { state: "stale", wrapperVersion: wrapperName, latestVersion: bestName, latestCliPath: join(container, bestName, "src", "cli.js") };
  }
  return { state: "current", wrapperVersion: wrapperName };
}
