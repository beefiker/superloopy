import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import { checkComparisonSimilarity, normalizeComparisonPath } from "../src/comparison-similarity.js";
import {
  countPhysicalLines,
  doctorOverallOk,
  formatDoctor,
  isReviewableTextFile,
  runDoctor
} from "../src/doctor.js";

const EXPECTED_SKILLS = ["humanize-korean", "superloopy-clone", "superloopy-doctor", "superloopy-frontend", "superloopy-loop", "superloopy-research", "superloopy-slides"];

test("reviewability counts physical lines and recognizes supported script/config extensions", () => {
  assert.equal(countPhysicalLines(""), 0);
  assert.equal(countPhysicalLines("one"), 1);
  assert.equal(countPhysicalLines("one\n"), 1);
  assert.equal(countPhysicalLines("one\r\ntwo"), 2);
  assert.equal(countPhysicalLines("one\rtwo\r"), 2);

  for (const file of ["a.js", "a.mjs", "a.cjs", "a.md", "a.json", "a.yaml", "a.yml"]) {
    assert.equal(isReviewableTextFile(file), true, file);
  }
  assert.equal(isReviewableTextFile("package-lock.json"), false);
});

test("doctor scope aggregation separates source health from machine-local installation health", () => {
  const checks = {
    sourceCheck: { ok: true },
    installedModelPolicy: { ok: false },
    installedPluginTruth: { ok: false, informational: true, state: "version_mismatch" },
    wrapper: { ok: false }
  };
  assert.equal(doctorOverallOk(checks, "source"), true);
  assert.equal(doctorOverallOk(checks, "installed"), false);
  assert.equal(doctorOverallOk({ ...checks, sourceCheck: { ok: false } }, "source"), false);
});

function runCli(args, options = {}) {
  return spawnSync(process.execPath, [join(process.cwd(), "src/cli.js"), ...args], {
    cwd: options.cwd ?? process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      CODEX_HOME: join(tmpdir(), `superloopy-doctor-empty-${process.pid}`),
      ...options.env
    },
    input: options.input,
    timeout: 10_000
  });
}

function assertDoctorExitMatchesResult(result) {
  const parsed = JSON.parse(result.stdout);
  assert.equal(result.status, parsed.ok ? 0 : 1, result.stderr);
  return parsed;
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
  assert.equal(parsed.scope, "source");
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
    "installedModelPolicy",
    "installedPluginTruth",
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
  assert.equal(parsed.checks.reviewability.maxLines, 550);
  assert.equal(parsed.checks.reviewability.oversized.length, 0);
  assert.equal(parsed.checks.dispatchCoherence.ok, true);
  assert.ok(parsed.checks.dispatchCoherence.dispatched.includes("robin"));
  assert.equal(parsed.checks.modelPolicy.ok, true);
  assert.equal(parsed.checks.modelPolicy.policyPath, "docs/superloopy-model-policy.md");
  assert.equal(parsed.checks.modelPolicy.policyDataPath, "model-policy.json");
  assert.equal(parsed.checks.modelPolicy.policyDataVersion, "2026-07-10");
  assert.equal(parsed.checks.modelPolicy.compatibilityModel, "gpt-5.5");
  assert.equal(parsed.checks.modelPolicy.agents.nami.profile, "fast");
  assert.equal(parsed.checks.modelPolicy.profiles.standard.candidates[0].model, "gpt-5.6-terra");
  assert.equal(parsed.checks.modelPolicy.agents.nami.model, "gpt-5.6-luna");
  assert.equal(parsed.checks.modelPolicy.agents.zoro.model, "gpt-5.6-sol");
  assert.equal(parsed.checks.modelPolicy.agents.zoro.model_reasoning_effort, "xhigh");
  assert.equal(parsed.checks.hostContract.ok, true);
  assert.ok(parsed.checks.hostContract.cannotVerify.length >= 3);
  assert.ok(parsed.checks.hostContract.cannotVerify.some((item) => /resolved model/u.test(item)));
  assert.equal(parsed.checks.hostContract.modelRoutingVerification, "unverified");
  assert.equal(parsed.checks.hostContract.unverifiedStatus, "model_unverified");
  assert.doesNotMatch(JSON.stringify(parsed.checks.hostContract), /multi_agent_v1|fork_context|run_in_background|subagent_type/);
  assert.equal(parsed.checks.claudeHostWiring.ok, true);
  assert.equal(parsed.checks.claudeHostWiring.policy, "claude-host-wiring-present-and-namespaced");
  assert.ok(parsed.checks.claudeHostWiring.matchers.length >= 1);
  assert.equal(parsed.checks.claudeModelPolicy.ok, true);
  assert.equal(parsed.checks.claudeModelPolicy.policyPath, "docs/superloopy-model-policy-claude.md");
  assert.equal(parsed.checks.claudeModelPolicy.policyDataPath, "model-policy.json");
  assert.equal(parsed.checks.claudeModelPolicy.policyDataVersion, "2026-07-10");
  assert.equal(parsed.checks.claudeModelPolicy.agents.nami, "haiku");
  assert.equal(parsed.checks.claudeModelPolicy.agents.zoro, "opus");
  assert.deepEqual(
    {
      ok: parsed.checks.installedModelPolicy.ok,
      installed: parsed.checks.installedModelPolicy.installed,
      degraded: parsed.checks.installedModelPolicy.degraded,
      restartRequired: parsed.checks.installedModelPolicy.restartRequired
    },
    { ok: true, installed: false, degraded: false, restartRequired: false }
  );
  assert.equal(parsed.checks.installedPluginTruth.state, "authority_unavailable");
  // Interop is informational: it never fails and does not gate overall health.
  assert.equal(parsed.checks.interop.ok, true);
  assert.equal(parsed.checks.interop.informational, true);
  assert.equal(typeof parsed.checks.interop.installed, "boolean");
  // Wrapper currency is advisory: upgrade is a suggestion, so it never gates health.
  assert.equal(parsed.checks.wrapper.ok, true);
  assert.equal(parsed.checks.wrapper.informational, true);
});

test("doctor CLI falls back to the CLI root outside a Superloopy checkout", async () => {
  const project = await mkdtemp(join(tmpdir(), "superloopy-doctor-project-"));
  const result = runCli(["doctor", "--json"], { cwd: project });

  const parsed = assertDoctorExitMatchesResult(result);
  assert.equal(parsed.scope, "installed");
  assert.equal(parsed.root, process.cwd());
  assert.equal(parsed.checks.pluginManifest.ok, true);
});

test("doctor CLI defaults a non-Git package root to installed scope", async () => {
  const repo = await tempRepoCopy({ initGit: false, prefix: "superloopy-cli-cache-" });
  const result = spawnSync(process.execPath, [join(repo, "src", "cli.js"), "doctor", "--json"], {
    cwd: repo,
    encoding: "utf8",
    env: { ...process.env, CODEX_HOME: join(tmpdir(), `superloopy-doctor-empty-cache-${process.pid}`) },
    timeout: 10_000
  });

  const parsed = assertDoctorExitMatchesResult(result);
  assert.equal(parsed.scope, "installed");
  assert.equal(await realpath(parsed.root), await realpath(repo));
});

test("doctor CLI accepts an explicit diagnostic root", async () => {
  const repo = await tempRepoCopy();
  const result = runCli(["doctor", "--root", repo, "--json"], { cwd: tmpdir() });

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.scope, "source");
  assert.equal(parsed.root, repo);
  assert.deepEqual(parsed.checks.skills.skills, EXPECTED_SKILLS);
});

test("doctor CLI supports explicit scope and equals-form selectors", () => {
  const installed = runCli(["doctor", "--scope=installed", "--json"]);
  assert.equal(assertDoctorExitMatchesResult(installed).scope, "installed");

  const source = runCli(["doctor", `--root=${process.cwd()}`, "--scope=source", "--json"], { cwd: tmpdir() });
  assert.equal(source.status, 0, source.stderr);
  assert.equal(JSON.parse(source.stdout).scope, "source");
});

test("doctor CLI rejects ambiguous or malformed selectors before running checks", () => {
  const invalid = [
    ["doctor", "--unknown"],
    ["doctor", "source"],
    ["doctor", "--root"],
    ["doctor", "--scope", "other"],
    ["doctor", "--root", process.cwd(), "--root", process.cwd()],
    ["doctor", "--root", process.cwd(), "--plugin-root", process.cwd()],
    ["doctor", "--comparison-path="]
  ];

  for (const args of invalid) {
    const result = runCli(args);
    assert.equal(result.status, 2, `${args.join(" ")}\n${result.stderr}`);
    assert.notEqual(result.stderr.trim(), "");
  }

  const help = runCli(["doctor", "--help", "--unknown"]);
  assert.equal(help.status, 0, help.stderr);
});

test("doctor model policy fails when bundled agent defaults drift", async () => {
  const repo = await tempRepoCopy();
  const agentPath = join(repo, ".codex", "agents", "nami.toml");
  const agent = await readFile(agentPath, "utf8");
  await writeFile(agentPath, agent.replace('model = "gpt-5.6-luna"', 'model = "gpt-5.5"'), "utf8");

  const result = await runDoctor(repo);

  assert.equal(result.ok, false);
  assert.equal(result.checks.modelPolicy.ok, false);
  assert.match(result.checks.modelPolicy.message, /nami\.toml model/);
});

test("doctor model policy resolves bundled defaults from the model policy data", async () => {
  const repo = await tempRepoCopy();
  const policyDataPath = join(repo, "model-policy.json");
  const policyData = JSON.parse(await readFile(policyDataPath, "utf8"));
  assert.ok(Array.isArray(policyData.codex.profiles.fast.candidates), "fast profile must expose ordered candidates");
  policyData.codex.profiles.fast.candidates[0].model = "gpt-5.5";
  await writeFile(policyDataPath, `${JSON.stringify(policyData, null, 2)}\n`, "utf8");

  const result = await runDoctor(repo);

  assert.equal(result.ok, false);
  assert.equal(result.checks.modelPolicy.ok, false);
  assert.match(result.checks.modelPolicy.message, /nami\.toml model must be gpt-5\.5/);
});

test("doctor model policy reports invalid model policy data entries", async () => {
  const repo = await tempRepoCopy();
  const policyDataPath = join(repo, "model-policy.json");
  const policyData = JSON.parse(await readFile(policyDataPath, "utf8"));
  delete policyData.codex.agents.nami;
  await writeFile(policyDataPath, `${JSON.stringify(policyData, null, 2)}\n`, "utf8");

  const result = await runDoctor(repo);

  assert.equal(result.ok, false);
  assert.equal(result.checks.modelPolicy.ok, false);
  assert.match(result.checks.modelPolicy.message, /model policy data\.codex\.agents\.nami/);
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

test("doctor text renders advisory warning checks as warn", () => {
  const output = formatDoctor({
    ok: true,
    checks: {
      wrapper: { ok: true, warning: true, message: "wrapper/plugin split-brain" },
      hostContract: { ok: true, message: "configured routing" }
    }
  });

  assert.match(output, /- wrapper: warn - wrapper\/plugin split-brain/u);
  assert.match(output, /- hostContract: ok - configured routing/u);
  assert.match(output, /overall: ok/u);
});

test("doctor renders a source-only installed mismatch as info", () => {
  const output = formatDoctor({
    ok: true,
    scope: "source",
    checks: {
      installedPluginTruth: {
        ok: false,
        informational: true,
        state: "version_mismatch",
        message: "confirmed mismatch"
      }
    }
  });
  assert.match(output, /- installedPluginTruth: info - confirmed mismatch/u);
  assert.match(output, /overall: ok/u);
});

test("runDoctor accepts an injected installed-plugin probe without reading live machine state", async () => {
  const unavailable = await runDoctor(process.cwd());
  assert.equal(unavailable.checks.installedPluginTruth.state, "authority_unavailable");

  const mismatch = await runDoctor(process.cwd(), {
    scope: "installed",
    queryInstalledPluginTruth: () => ({
      ok: false,
      informational: true,
      state: "version_mismatch",
      executingVersion: "0.12.4",
      installedVersion: "0.12.3",
      message: "confirmed mismatch"
    })
  });
  assert.equal(mismatch.ok, false);
  assert.equal(mismatch.checks.installedPluginTruth.state, "version_mismatch");
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
