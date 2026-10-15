// Claude Code exports CLAUDE_PLUGIN_ROOT into the plugin's hook subprocess; Codex does not.
// It is the host signal that distinguishes the two runtimes at bootstrap time.
export function isClaudeHost(env = process.env) {
  return typeof env.CLAUDE_PLUGIN_ROOT === "string" && env.CLAUDE_PLUGIN_ROOT.trim().length > 0;
}

export function isAntigravityHost(env = process.env) {
  if (env.SUPERLOOPY_HOST === "antigravity") return true;
  if (env.SUPERLOOPY_HOST === "codex" || env.SUPERLOOPY_HOST === "claude") return false;
  const isSet = (k) => typeof env[k] === "string" && env[k].trim().length > 0;
  return isSet("ANTIGRAVITY_PLUGIN_ROOT") || isSet("GEMINI_PLUGIN_ROOT");
}

// The only host identities Superloopy resolves. Anything else is a broken declaration, not a
// fourth host: `canonicalAgentType` returns null for an unknown host, so every receipt lookup
// misses and the evidence gate silently stops gating. Callers that accept a host from outside
// (a `--host` flag, a `SUPERLOOPY_HOST` env value) must reject unknown values instead.
export const SUPERLOOPY_HOSTS = ["codex", "claude", "antigravity"];
const KNOWN_HOSTS = new Set(SUPERLOOPY_HOSTS);

export function isKnownHost(value) {
  return typeof value === "string" && KNOWN_HOSTS.has(value);
}

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
  return hostFromEnv(env) ?? hostFromInstallPath(typeof root === "string" ? root : "");
}

// The host the runtime declares, or null when env carries no host signal. A recognized
// `SUPERLOOPY_HOST` is the host's (or our shim's) own declaration, so it outranks the plugin-root
// signals (and, in `detectHost`, the install path). Without that order only "antigravity" was
// honored: `isAntigravityHost` reads the value, while "claude" still needed `CLAUDE_PLUGIN_ROOT`
// and fell through to "codex" -- which pointed the Codex-only installedPluginTruth and
// installedModelPolicy checks at a Claude install -- and "codex" lost to a `.gemini` path segment.
// Unknown values are ignored rather than trusted here; the CLI rejects them at its entry points.
export function hostFromEnv(env = process.env) {
  if (isKnownHost(env.SUPERLOOPY_HOST)) return env.SUPERLOOPY_HOST;
  if (isAntigravityHost(env)) return "antigravity";
  if (isClaudeHost(env)) return "claude";
  return null;
}

// A plugin install lives under a directory the host owns (`~/.gemini/config/plugins/superloopy`,
// `~/.claude/plugins/superloopy`). Match whole path segments so a project directory that merely
// contains the word -- `~/src/antigravity-notes` -- cannot impersonate a host.
function hostFromInstallPath(root) {
  const segments = root.split(/[\\/]/u).map((segment) => segment.toLowerCase());
  if (segments.some((segment) => ANTIGRAVITY_PATH_SEGMENTS.has(segment))) return "antigravity";
  return segments.some((segment) => CLAUDE_PATH_SEGMENTS.has(segment)) ? "claude" : "codex";
}
