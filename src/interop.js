// Coexistence detection for other installed plugins. Superloopy stays a good
// citizen next to complementary tools: when the Superpowers methodology plugin is
// present, the loop engineer's injected guidance routes design/plan/TDD to
// Superpowers and keeps Superloopy as the outer command-backed evidence gate.
//
// Detection is advisory only. It never fails a hook, never mutates state, and is
// fully overridable with SUPERLOOPY_SUPERPOWERS=on|off|auto. A plugin's on-disk
// install layout is not a stable contract, so this is best-effort by design: a miss
// just means Superloopy runs solo, and a false positive only adds a few guidance
// lines the agent can ignore.

import { existsSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";

const OVERRIDE_ENV = "SUPERLOOPY_SUPERPOWERS";
// Deep enough to reach real host cache layouts with margin: the Codex cache nests the
// signature skill at ~6 levels under the plugins root (marketplace/plugin/hash/skills/
// using-superpowers), so a couple of spare levels absorb layout drift. MAX_WALK_ENTRIES
// is the real safety bound for the 5s hook timeout, so extra depth is nearly free.
const MAX_WALK_DEPTH = 8;
const MAX_WALK_ENTRIES = 5000;
const SKIP_DIRS = new Set([".git", "node_modules", ".DS_Store"]);
// A directory looks like an installed plugin (not a bare marketplace clone) when it
// carries one of these markers.
const PLUGIN_MARKERS = [".claude-plugin", ".codex-plugin", "plugin.json", "skills", "commands"];
// The intro skill ships inside the Superpowers plugin itself, so its presence is a
// strong "installed" signal that survives host-specific directory naming.
const SIGNATURE_SKILL_DIRS = new Set(["using-superpowers"]);

// Returns { installed, source, path? }. `source` is "env-override" or "filesystem".
// The no-throw contract is load-bearing: the UserPromptSubmit hook and doctor both call
// this (doctor forwards arbitrary options), so every path must return a value, never
// raise. The outer try/catch is the backstop; the helpers also guard their inputs.
export function detectSuperpowers(env = process.env, homeDir = homedir()) {
  try {
    const safeEnv = env !== null && typeof env === "object" ? env : {};
    const safeHome = typeof homeDir === "string" && homeDir.length > 0 ? homeDir : homedir();
    const override = readOverride(safeEnv);
    if (override !== null) {
      return { installed: override, source: "env-override" };
    }
    for (const root of candidateRoots(safeEnv, safeHome)) {
      const match = findSuperpowersMarker(root);
      if (match !== null) return { installed: true, source: "filesystem", path: match };
    }
    return { installed: false, source: "filesystem" };
  } catch {
    return { installed: false, source: "filesystem" };
  }
}

// on/1/true/yes -> true, off/0/false/no -> false, ""/auto/unknown -> null (auto-detect).
function readOverride(env) {
  const raw = env[OVERRIDE_ENV];
  if (typeof raw !== "string") return null;
  const value = raw.trim().toLowerCase();
  if (value === "" || value === "auto") return null;
  if (["on", "1", "true", "yes", "installed", "enabled"].includes(value)) return true;
  if (["off", "0", "false", "no", "disabled"].includes(value)) return false;
  return null;
}

// Plugin roots for both hosts: Claude Code exposes CLAUDE_PLUGIN_ROOT (Superloopy's
// own root) whose nearest `plugins` ancestor holds sibling plugins; Codex keeps
// plugins under CODEX_HOME/plugins. Home-relative defaults cover both.
function candidateRoots(env, homeDir) {
  const roots = [];
  const add = (path) => {
    if (typeof path === "string" && path.trim().length > 0) roots.push(path);
  };
  // Read env values through a string guard so a malformed var (non-string) is ignored
  // rather than throwing out of join() and skipping the home-based candidates.
  const envDir = (key) => (typeof env[key] === "string" && env[key].trim().length > 0 ? env[key] : undefined);
  add(nearestPluginsDir(envDir("CLAUDE_PLUGIN_ROOT")));
  const claudeConfig = envDir("CLAUDE_CONFIG_DIR");
  add(claudeConfig ? join(claudeConfig, "plugins") : undefined);
  add(join(homeDir, ".claude", "plugins"));
  const codexHome = envDir("CODEX_HOME");
  add(codexHome ? join(codexHome, "plugins") : undefined);
  add(join(homeDir, ".codex", "plugins"));

  const seen = new Set();
  return roots.filter((root) => {
    if (seen.has(root)) return false;
    seen.add(root);
    try {
      return statSync(root).isDirectory();
    } catch {
      return false;
    }
  });
}

function nearestPluginsDir(pluginRoot) {
  if (typeof pluginRoot !== "string" || pluginRoot.trim().length === 0) return undefined;
  let current = pluginRoot;
  for (let i = 0; i < 12; i += 1) {
    if (basename(current) === "plugins") return current;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return undefined;
}

// Bounded depth-first scan. Returns the matched directory path, or null. Stays cheap
// enough for the 5s hook timeout via a depth cap, an entry budget, and skip dirs.
function findSuperpowersMarker(root) {
  let budget = MAX_WALK_ENTRIES;
  const stack = [{ dir: root, depth: 0 }];
  while (stack.length > 0) {
    const { dir, depth } = stack.pop();
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (budget-- <= 0) return null;
      if (!entry.isDirectory() || SKIP_DIRS.has(entry.name)) continue;
      const name = entry.name.toLowerCase();
      const full = join(dir, entry.name);
      // Require the signature skill to actually be a skill dir (carry SKILL.md), so a
      // stray directory that merely shares the name is not mistaken for an install.
      if (SIGNATURE_SKILL_DIRS.has(name) && existsSync(join(full, "SKILL.md"))) return full;
      if (name === "superpowers" && isPluginDir(full)) return full;
      if (depth < MAX_WALK_DEPTH) stack.push({ dir: full, depth: depth + 1 });
    }
  }
  return null;
}

function isPluginDir(dir) {
  return PLUGIN_MARKERS.some((marker) => existsSync(join(dir, marker)));
}

// Informational doctor check: reports whether the Superpowers methodology plugin is
// present so operators can see coexistence guidance is active. Always ok:true — a
// neighbor plugin's absence must never fail Superloopy's own health.
export function checkInterop(options = {}) {
  // Honor the module-wide no-throw contract for any caller: hostile/null options or a
  // throwing getter on env/homeDir must still yield a well-formed, non-failing result.
  let detection;
  try {
    const opts = options !== null && typeof options === "object" ? options : {};
    detection = detectSuperpowers(opts.env, opts.homeDir);
  } catch {
    detection = { installed: false, source: "filesystem" };
  }
  const message = detection.installed
    ? `superpowers detected (${detection.source}) - coexistence guidance active`
    : `superpowers not detected (${detection.source}) - Superloopy runs solo`;
  return { ok: true, informational: true, installed: detection.installed, source: detection.source, message };
}
