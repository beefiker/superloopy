import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import { checkComparisonSimilarity, normalizeComparisonPath } from "../src/comparison-similarity.js";
import { formatDoctor, runDoctor } from "../src/doctor.js";
import { checkWrapper, evaluateWrapperCurrency } from "../src/wrapper-check.js";
import { parseBinShimCliPath } from "../src/agents.js";

const EXPECTED_SKILLS = ["humanize-korean", "superloopy-clone", "superloopy-doctor", "superloopy-frontend", "superloopy-loop", "superloopy-research"];

function runCli(args, options = {}) {
  return spawnSync(process.execPath, [join(process.cwd(), "src/cli.js"), ...args], {
    cwd: options.cwd ?? process.cwd(),
    encoding: "utf8",
    input: options.input,
    timeout: 10_000
  });
}

async function tempRepoCopy({ initGit = true, prefix = "superloopy-doctor-" } = {}) {
  const repo = await mkdtemp(join(tmpdir(), prefix));
  const result = spawnSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr);
  for (const file of result.stdout.split("\n").filter(Boolean)) {
    const source = join(process.cwd(), file);
    if (!existsSync(source)) continue;
    const target = join(repo, file);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, await readFile(source));
  }
  if (initGit) spawnSync("git", ["init"], { cwd: repo, encoding: "utf8" });
  return repo;
}

async function tempComparisonTree(files) {
  const repo = await mkdtemp(join(tmpdir(), "superloopy-comparison-"));
  for (const [file, content] of Object.entries(files)) {
    const target = join(repo, file);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content, "utf8");
  }
  return repo;
}

function toCrLf(content) {
  return content.replace(/\r\n?/gu, "\n").replace(/\n/gu, "\r\n");
}

test("doctor --json reports Superloopy packaging, audit, and reviewability checks", () => {
  const result = runCli(["doctor", "--json"]);

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.root, process.cwd());
  assert.deepEqual(Object.keys(parsed.checks), [
    "pluginManifest",
    "hooks",
    "skills",
    "cli",
    "dependencies",
    "runtimeBoundary",
    "fileAudit",
    "gateNotes",
    "designAudit",
    "comparisonSimilarity",
    "reviewability",
    "dispatchCoherence",
    "claudeHostWiring",
    "modelPolicy",
    "claudeModelPolicy",
    "hostContract",
    "interop",
    "wrapper"
  ]);
  assert.equal(parsed.checks.pluginManifest.ok, true);
  assert.equal(parsed.checks.hooks.ok, true);
  assert.equal(parsed.checks.skills.ok, true);
  assert.deepEqual(parsed.checks.skills.skills, EXPECTED_SKILLS);
  assert.deepEqual(parsed.checks.skills.requiredSkills, EXPECTED_SKILLS);
  assert.equal(parsed.checks.cli.ok, true);
  assert.equal(parsed.checks.dependencies.ok, true);
  assert.equal(parsed.checks.dependencies.count, 0);
  assert.equal(parsed.checks.runtimeBoundary.ok, true);
  assert.equal(parsed.checks.runtimeBoundary.policy, "runtime-state-is-ignored-and-untracked");
  assert.equal(parsed.checks.fileAudit.ok, true);
  assert.equal(parsed.checks.fileAudit.auditPath, "docs/superloopy-file-audit.md");
  assert.equal(parsed.checks.fileAudit.policy, "superloopy-native-boundary");
  assert.deepEqual(parsed.checks.fileAudit.missingRows, []);
  assert.deepEqual(parsed.checks.fileAudit.incompleteRows, []);
  assert.deepEqual(parsed.checks.fileAudit.staleRows, []);
  assert.equal(parsed.checks.gateNotes.ok, true);
  assert.equal(parsed.checks.gateNotes.notesPath, "docs/superloopy-gate-notes.md");
  assert.equal(parsed.checks.designAudit.ok, true);
  assert.equal(parsed.checks.designAudit.auditPath, "docs/superloopy-design-audit.md");
  assert.equal(parsed.checks.comparisonSimilarity.ok, true);
  assert.equal(parsed.checks.comparisonSimilarity.checked, false);
  assert.equal(parsed.checks.comparisonSimilarity.policy, "optional-local-comparison-similarity-scan");
  assert.equal(parsed.checks.reviewability.ok, true);
  assert.equal(parsed.checks.reviewability.maxLines, 500);
  assert.equal(parsed.checks.reviewability.oversized.length, 0);
  assert.equal(parsed.checks.dispatchCoherence.ok, true);
  assert.ok(parsed.checks.dispatchCoherence.dispatched.includes("robin"));
  assert.equal(parsed.checks.modelPolicy.ok, true);
  assert.equal(parsed.checks.modelPolicy.policyPath, "docs/superloopy-model-policy.md");
  assert.equal(parsed.checks.modelPolicy.agents.nami.model, "gpt-5.4-mini");
  assert.equal(parsed.checks.modelPolicy.agents.zoro.model_reasoning_effort, "xhigh");
  assert.equal(parsed.checks.hostContract.ok, true);
  assert.ok(parsed.checks.hostContract.cannotVerify.length >= 3);
  assert.equal(parsed.checks.claudeHostWiring.ok, true);
  assert.equal(parsed.checks.claudeHostWiring.policy, "claude-host-wiring-present-and-namespaced");
  assert.ok(parsed.checks.claudeHostWiring.matchers.length >= 1);
  assert.equal(parsed.checks.claudeModelPolicy.ok, true);
  assert.equal(parsed.checks.claudeModelPolicy.policyPath, "docs/superloopy-model-policy-claude.md");
  assert.equal(parsed.checks.claudeModelPolicy.agents.nami, "haiku");
  assert.equal(parsed.checks.claudeModelPolicy.agents.zoro, "opus");
  // Interop is informational: it never fails and does not gate overall health.
  assert.equal(parsed.checks.interop.ok, true);
  assert.equal(parsed.checks.interop.informational, true);
  assert.equal(typeof parsed.checks.interop.installed, "boolean");
  // Wrapper currency is advisory: upgrade is a suggestion, so it never gates health.
  assert.equal(parsed.checks.wrapper.ok, true);
  assert.equal(parsed.checks.wrapper.informational, true);
});

// Build paths with node:path.join so the fake-fs keys match what the module computes on the
// host platform (win32 uses backslashes) — the earlier hardcoded POSIX literals only matched
// on non-Windows. Colon-free segments keep the linux-mode PATH split (`:`) intact.
function slPaths(root) {
  const superloopyDir = join(root, "cache", "superloopy");
  return {
    superloopyDir,
    binDir: join(root, "bin"),
    cliOf: (version) => join(superloopyDir, version, "src", "cli.js")
  };
}

test("evaluateWrapperCurrency flags a stale versioned cache but not a current or checkout one", () => {
  const { superloopyDir, cliOf } = slPaths("wrktest");
  const present = new Set([cliOf("0.7.0"), cliOf("0.7.1")]);
  const fs = {
    existsSync: (p) => present.has(p),
    readdirSync: (p) => { if (p !== superloopyDir) throw new Error("ENOENT"); return ["0.7.0", "0.7.1"]; }
  };
  const stale = evaluateWrapperCurrency(cliOf("0.7.0"), fs);
  assert.equal(stale.state, "stale");
  assert.equal(stale.wrapperVersion, "0.7.0");
  assert.equal(stale.latestVersion, "0.7.1");
  assert.equal(stale.latestCliPath, cliOf("0.7.1"));

  assert.equal(evaluateWrapperCurrency(cliOf("0.7.1"), fs).state, "current");

  // A checkout path (no parseable version dir) is not version-tracked.
  const checkout = evaluateWrapperCurrency(join("home", "dev", "loopy", "src", "cli.js"), {
    existsSync: () => true,
    readdirSync: () => { throw new Error("unused"); }
  });
  assert.equal(checkout.state, "untracked");
});

test("evaluateWrapperCurrency ignores a newer version dir with no cli.js", () => {
  const { superloopyDir, cliOf } = slPaths("wrktest");
  const present = new Set([cliOf("0.7.0")]); // 0.8.0 dir is listed but has no cli.js
  const fs = {
    existsSync: (p) => present.has(p),
    readdirSync: (p) => (p === superloopyDir ? ["0.7.0", "0.8.0"] : [])
  };
  assert.equal(evaluateWrapperCurrency(cliOf("0.7.0"), fs).state, "current");
});

function shimFor(cliPath) {
  return `#!/usr/bin/env sh\n# superloopy-generated bin shim\nexec node '${cliPath}' "$@"\n`;
}

test("parseBinShimCliPath decodes a shell-quoted path containing an apostrophe", () => {
  // What shellQuote emits for /home/o'connor/superloopy/0.7.1/src/cli.js: interior ' -> '\''.
  const shim = "#!/usr/bin/env sh\n# superloopy-generated bin shim\nexec node '/home/o'\\''connor/superloopy/0.7.1/src/cli.js' \"$@\"\n";
  assert.equal(parseBinShimCliPath(shim, "linux"), "/home/o'connor/superloopy/0.7.1/src/cli.js");
  // A plain path still round-trips unchanged.
  assert.equal(parseBinShimCliPath(shimFor("/opt/superloopy/0.7.1/src/cli.js"), "linux"), "/opt/superloopy/0.7.1/src/cli.js");
});

test("checkWrapper reports a stale wrapper as an optional suggestion", () => {
  const { superloopyDir, binDir, cliOf } = slPaths("wrktest");
  const wrapperPath = join(binDir, "superloopy");
  const files = { [wrapperPath]: shimFor(cliOf("0.7.0")), [cliOf("0.7.0")]: "x", [cliOf("0.7.1")]: "x" };
  const fs = {
    existsSync: (p) => p in files || p === superloopyDir,
    readFileSync: (p) => { if (!(p in files)) throw new Error("ENOENT"); return files[p]; },
    readdirSync: (p) => { if (p !== superloopyDir) throw new Error("ENOENT"); return ["0.7.0", "0.7.1"]; }
  };
  const result = checkWrapper({ env: { PATH: binDir }, platform: "linux", fs });
  assert.equal(result.ok, true);
  assert.equal(result.informational, true);
  assert.equal(result.stale, true);
  assert.match(result.message, /v0\.7\.1 is installed/);
  assert.match(result.message, /optional/i);
});

test("checkWrapper reports a dangling wrapper after a pruned cache", () => {
  const { binDir, cliOf } = slPaths("wrktest");
  const wrapperPath = join(binDir, "superloopy");
  const files = { [wrapperPath]: shimFor(cliOf("0.7.0")) }; // cli.js gone
  const fs = {
    existsSync: (p) => p in files,
    readFileSync: (p) => { if (!(p in files)) throw new Error("ENOENT"); return files[p]; },
    readdirSync: () => { throw new Error("ENOENT"); }
  };
  const result = checkWrapper({ env: { PATH: binDir }, platform: "linux", fs });
  assert.equal(result.ok, true);
  assert.equal(result.dangling, true);
  assert.match(result.message, /no longer exists/);
  // The broken wrapper cannot repair itself; with no live sibling, point at the bootstrap.
  assert.match(result.message, /re-approve the Modified hooks/);
  assert.doesNotMatch(result.message, /`superloopy bin install/);
});

test("checkWrapper points a dangling wrapper at a surviving sibling cli, not itself", () => {
  const { superloopyDir, binDir, cliOf } = slPaths("wrktest");
  const wrapperPath = join(binDir, "superloopy");
  const files = { [wrapperPath]: shimFor(cliOf("0.7.0")), [cliOf("0.7.1")]: "x" }; // 0.7.0 pruned, 0.7.1 live
  const fs = {
    existsSync: (p) => p in files,
    readFileSync: (p) => { if (!(p in files)) throw new Error("ENOENT"); return files[p]; },
    readdirSync: (p) => { if (p !== superloopyDir) throw new Error("ENOENT"); return ["0.7.0", "0.7.1"]; }
  };
  const result = checkWrapper({ env: { PATH: binDir }, platform: "linux", fs });
  assert.equal(result.dangling, true);
  assert.match(result.message, /node ".*0\.7\.1.*cli\.js" bin install --force/); // a runnable live CLI
  assert.doesNotMatch(result.message, /`superloopy bin install/);
});

test("checkWrapper reports the first-resolved wrapper, not a later generated shim", () => {
  const early = slPaths("earlyroot");
  const late = slPaths("lateroot");
  const earlyWrapper = join(early.binDir, "superloopy"); // a foreign shim, resolves FIRST on PATH
  const lateWrapper = join(late.binDir, "superloopy"); // our generated (stale) shim, later on PATH
  const files = {
    [earlyWrapper]: "#!/bin/sh\nexec some-other-tool \"$@\"\n",
    [lateWrapper]: shimFor(late.cliOf("0.7.0")),
    [late.cliOf("0.7.0")]: "x",
    [late.cliOf("0.7.1")]: "x"
  };
  const fs = {
    existsSync: (p) => p in files || p === late.superloopyDir,
    readFileSync: (p) => { if (!(p in files)) throw new Error("ENOENT"); return files[p]; },
    readdirSync: (p) => { if (p !== late.superloopyDir) throw new Error("ENOENT"); return ["0.7.0", "0.7.1"]; }
  };
  const result = checkWrapper({ env: { PATH: `${early.binDir}:${late.binDir}` }, platform: "linux", fs });
  assert.equal(result.ok, true);
  assert.equal(result.found, true);
  assert.equal(result.recognized, false); // the winning PATH entry is not our shim
  assert.doesNotMatch(result.message, /is installed/); // must NOT report the later shim as stale
});

test("checkWrapper stays silent when no wrapper is on PATH", () => {
  const fs = { existsSync: () => false, readFileSync: () => "", readdirSync: () => [] };
  const result = checkWrapper({ env: { PATH: "/nowhere" }, platform: "linux", fs });
  assert.equal(result.ok, true);
  assert.equal(result.found, false);
});

test("doctor CLI falls back to the CLI root outside a Superloopy checkout", async () => {
  const project = await mkdtemp(join(tmpdir(), "superloopy-doctor-project-"));
  const result = runCli(["doctor", "--json"], { cwd: project });

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.root, process.cwd());
  assert.equal(parsed.checks.pluginManifest.ok, true);
});

test("doctor CLI accepts an explicit diagnostic root", async () => {
  const repo = await tempRepoCopy();
  const result = runCli(["doctor", "--root", repo, "--json"], { cwd: tmpdir() });

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.root, repo);
  assert.deepEqual(parsed.checks.skills.skills, EXPECTED_SKILLS);
});

test("doctor model policy fails when bundled agent defaults drift", async () => {
  const repo = await tempRepoCopy();
  const agentPath = join(repo, ".codex", "agents", "nami.toml");
  const agent = await readFile(agentPath, "utf8");
  await writeFile(agentPath, agent.replace('model = "gpt-5.4-mini"', 'model = "gpt-5.5"'), "utf8");

  const result = await runDoctor(repo);

  assert.equal(result.ok, false);
  assert.equal(result.checks.modelPolicy.ok, false);
  assert.match(result.checks.modelPolicy.message, /nami\.toml model/);
});

test("doctor dispatch coherence fails when a dispatched agent is not installed", async () => {
  const repo = await tempRepoCopy();
  await rm(join(repo, ".codex", "agents", "robin.toml"), { force: true });

  const result = await runDoctor(repo);

  assert.equal(result.checks.dispatchCoherence.ok, false);
  assert.match(result.checks.dispatchCoherence.message, /robin/);
});

test("doctor ignores Codex marketplace install metadata in plugin cache", async () => {
  const repo = await tempRepoCopy();
  await writeFile(join(repo, ".codex-marketplace-install.json"), '{"source":"cache"}\n', "utf8");

  const result = await runDoctor(repo);

  assert.equal(result.ok, true);
  assert.equal(result.checks.fileAudit.ok, true);
});

test("doctor accepts installed plugin caches that are not Git repositories", async () => {
  const repo = await tempRepoCopy({ initGit: false, prefix: "superloopy-cache-" });

  const result = await runDoctor(repo);

  assert.equal(result.ok, true);
  assert.equal(result.checks.runtimeBoundary.ok, true);
  assert.equal(result.checks.fileAudit.ok, true);
  assert.equal(result.checks.reviewability.ok, true);
});

test("doctor accepts skill frontmatter after CRLF checkout", async () => {
  const repo = await tempRepoCopy();
  const skillPath = join(repo, "skills", "superloopy-loop", "SKILL.md");
  const skill = await readFile(skillPath, "utf8");
  await writeFile(skillPath, toCrLf(skill), "utf8");

  const result = await runDoctor(repo);

  assert.equal(result.ok, true);
  assert.equal(result.checks.skills.ok, true);
});

test("doctor skill check requires the bundled doctor skill", async () => {
  const repo = await tempRepoCopy();
  await rm(join(repo, "skills", "superloopy-doctor"), { recursive: true, force: true });

  const result = await runDoctor(repo);

  assert.equal(result.ok, false);
  assert.equal(result.checks.skills.ok, false);
  assert.match(result.checks.skills.message, /superloopy-doctor/);
});

test("doctor skill check requires every bundled skill", async () => {
  const repo = await tempRepoCopy();
  await rm(join(repo, "skills", "superloopy-frontend"), { recursive: true, force: true });

  const result = await runDoctor(repo);

  assert.equal(result.ok, false);
  assert.equal(result.checks.skills.ok, false);
  assert.match(result.checks.skills.message, /superloopy-frontend/);
});

test("doctor text reports whether comparison scanning was skipped", () => {
  const result = runCli(["doctor"]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /comparisonSimilarity: ok - skipped; pass `--comparison-path PATH`/);
});

test("doctor comparison scan fails on copied-looking blocks", async () => {
  const repo = await tempRepoCopy();
  const copiedBlock = [
    'const copiedAlpha = "external comparison alpha";',
    'const copiedBeta = "external comparison beta";',
    'const copiedGamma = "external comparison gamma";',
    'const copiedDelta = "external comparison delta";',
    'const copiedEpsilon = "external comparison epsilon";',
    'const copiedZeta = "external comparison zeta";',
    'const copiedEta = "external comparison eta";',
    'const copiedTheta = "external comparison theta";'
  ].join("\n");
  const comparison = await tempComparisonTree({ "src/external-loop.js": `${copiedBlock}\n` });
  const goalsPath = join(repo, "src", "goals.js");
  const goals = await readFile(goalsPath, "utf8");
  await writeFile(goalsPath, `${goals}\n${copiedBlock}\n`, "utf8");

  const result = await runDoctor(repo, { comparisonPath: comparison });

  assert.equal(result.ok, false);
  assert.equal(result.checks.comparisonSimilarity.ok, false);
  assert.equal(result.checks.comparisonSimilarity.checked, true);
  assert.equal(result.checks.comparisonSimilarity.findings[0].file, "src/goals.js");
  assert.equal(result.checks.comparisonSimilarity.findings[0].reference, "External comparison:src/external-loop.js");
  assert.match(result.checks.comparisonSimilarity.message, /Copied-looking comparison blocks found/);
});

test("comparison scan normalizes Windows reference paths in findings", () => {
  assert.equal(normalizeComparisonPath("src\\external-loop.js"), "src/external-loop.js");
});

test("comparison scan reports missing git binary without a TypeError", async () => {
  const repo = await tempComparisonTree({});
  const comparison = await tempComparisonTree({});
  const oldPath = process.env.PATH;
  process.env.PATH = "";
  try {
    const result = await checkComparisonSimilarity(repo, {
      sources: [{ key: "external", name: "External comparison", audited: "0".repeat(40) }],
      comparisonPaths: { external: comparison },
      listFiles: () => []
    });

    assert.equal(result.ok, false);
    assert.doesNotMatch(result.message, /Cannot read properties/);
    assert.match(result.message, /git|HEAD|spawn/i);
  } finally {
    process.env.PATH = oldPath;
  }
});

test("doctor file audit fails when an inventory row loses boundary evidence", async () => {
  const repo = await tempRepoCopy();
  const auditPath = join(repo, "docs", "superloopy-file-audit.md");
  const audit = await readFile(auditPath, "utf8");
  await writeFile(
    auditPath,
    audit.replace(
      /\| `src\/guide\.js` \| [^\n]+/u,
      "| `src/guide.js` | Computes next state. | |"
    ),
    "utf8"
  );

  const result = await runDoctor(repo);

  assert.equal(result.ok, false);
  assert.equal(result.checks.fileAudit.ok, false);
  assert.deepEqual(result.checks.fileAudit.incompleteRows, ["src/guide.js"]);
});

test("doctor file audit fails when an inventory row points at a deleted file", async () => {
  const repo = await tempRepoCopy();
  const auditPath = join(repo, "docs", "superloopy-file-audit.md");
  const audit = await readFile(auditPath, "utf8");
  const newline = audit.includes("\r\n") ? "\r\n" : "\n";
  await writeFile(
    auditPath,
    audit.replace(
      /(\| File \| Original Superloopy role \| Compatibility boundary \|\r?\n)/u,
      `$1| \`docs/deleted.md\` | Dead row. | No live file. |${newline}`
    ),
    "utf8"
  );

  const result = await runDoctor(repo);

  assert.equal(result.ok, false);
  assert.equal(result.checks.fileAudit.ok, false);
  assert.deepEqual(result.checks.fileAudit.staleRows, ["docs/deleted.md"]);
});

test("doctor design audit fails when a decision row loses guard evidence", async () => {
  const repo = await tempRepoCopy();
  const auditPath = join(repo, "docs", "superloopy-design-audit.md");
  const audit = await readFile(auditPath, "utf8");
  await writeFile(
    auditPath,
    audit.replace(
      /\| `native-naming` \| [^\n]+/u,
      "| `native-naming` | Names must describe Superloopy behavior. | File and test names changed. | |"
    ),
    "utf8"
  );

  const result = await runDoctor(repo);

  assert.equal(result.ok, false);
  assert.equal(result.checks.designAudit.ok, false);
  assert.deepEqual(result.checks.designAudit.incompleteRows, ["native-naming"]);
});

test("doctor text reports checked comparison scanning", async () => {
  const comparison = await tempComparisonTree({ "src/unique.js": "export const uniqueComparisonValue = 42;\n" });
  const result = await runDoctor(process.cwd(), { comparisonPath: comparison });
  const output = formatDoctor(result);

  assert.equal(result.ok, true);
  assert.match(output, /comparisonSimilarity: ok - checked; \d+ Superloopy files against 1 comparison files/);
});
