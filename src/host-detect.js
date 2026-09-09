import { isAntigravityHost, isClaudeHost } from "./agents.js";

// Host-owned install directories. `antigravity` is listed undotted too: the desktop app ships an
// `Antigravity` support directory alongside the dotted CLI config dir.
const ANTIGRAVITY_PATH_SEGMENTS = new Set([".gemini", ".antigravity", "antigravity"]);
const CLAUDE_PATH_SEGMENTS = new Set([".claude"]);

// Host identity comes from the runtime (env set by the host, or by our own bin shim) or from where
// the install lives -- never from which manifests the diagnosed root carries. `gemini-extension.json`
// and `.gemini-plugin/` ship in every npm tarball and every plugin install, so reading them as an
// Antigravity signal labels a Codex install "antigravity" and silently exempts it from the
// Codex-only installedPluginTruth and installedModelPolicy checks.
export function detectHost(root, env = process.env) {
  if (isAntigravityHost(env)) return "antigravity";
  if (isClaudeHost(env)) return "claude";
  return hostFromInstallPath(typeof root === "string" ? root : "");
}

// A plugin install lives under a directory the host owns (`~/.gemini/config/plugins/superloopy`,
// `~/.claude/plugins/superloopy`). Match whole path segments so a project directory that merely
// contains the word -- `~/src/antigravity-notes` -- cannot impersonate a host.
function hostFromInstallPath(root) {
  const segments = root.split(/[\\/]/u).map((segment) => segment.toLowerCase());
  if (segments.some((segment) => ANTIGRAVITY_PATH_SEGMENTS.has(segment))) return "antigravity";
  return segments.some((segment) => CLAUDE_PATH_SEGMENTS.has(segment)) ? "claude" : "codex";
}
