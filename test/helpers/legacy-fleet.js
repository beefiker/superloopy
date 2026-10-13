// Rebuilds the exact pre-managed Codex fleets pinned by legacy-agent-manifests.json from the
// pre-rename templates in test/fixtures/legacy-codex-agents/ (the shipped templates were renamed,
// so they no longer hash to any published release).
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { RETIRED_AGENT_NAMES } from "../../src/agent-names.js";

const FIXTURE_DIR = join(dirname(dirname(fileURLToPath(import.meta.url))), "fixtures", "legacy-codex-agents");

export const LEGACY_AGENT_NAMES = Object.keys(RETIRED_AGENT_NAMES);

// Models the 0.12.3 release shipped; together with the fixtures they reproduce its manifest hashes.
export const LEGACY_MODELS = Object.freeze({
  franky: "gpt-5.5",
  zoro: "gpt-5.5",
  usopp: "gpt-5.5",
  jinbe: "gpt-5.5",
  robin: "gpt-5.5",
  nami: "gpt-5.4-mini"
});

export async function legacyAgentContent(name) {
  const template = await readFile(join(FIXTURE_DIR, `${name}.toml`), "utf8");
  return template.replace(/^model = ".+"$/mu, `model = "${LEGACY_MODELS[name]}"`);
}

export async function writeLegacyFleet(targetDir) {
  for (const name of LEGACY_AGENT_NAMES) {
    await writeFile(join(targetDir, `${name}.toml`), await legacyAgentContent(name), "utf8");
  }
}

// The manual removal command Superloopy prints for a kept retired regular file on this platform.
export function expectedRemoveCommand(path) {
  return process.platform === "win32" ? `Remove-Item -LiteralPath '${path}'` : `rm -f -- '${path}'`;
}
