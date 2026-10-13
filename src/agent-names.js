// Shared by policy, resolution, and installation modules so model resolution can feed the
// installer without creating an agents.js -> model-resolution.js -> model-policy.js cycle.
export const SUPERLOOPY_AGENT_NAMES = [
  "forge",
  "sentinel",
  "probe",
  "arbiter",
  "assayer",
  "pathfinder"
];

// Pre-rename lane names (old -> current). Codex installs wrote `<targetDir>/<old>.toml`, so the
// installer retires provably Superloopy-owned files under these names and the legacy manifest
// keeps its historical hashes keyed by them. Nothing else may use these names.
export const RETIRED_AGENT_NAMES = Object.freeze({
  franky: "forge",
  zoro: "sentinel",
  usopp: "probe",
  jinbe: "arbiter",
  robin: "assayer",
  nami: "pathfinder"
});
