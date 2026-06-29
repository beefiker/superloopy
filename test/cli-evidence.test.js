import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createLoop, evidenceLoop } from "../src/loop.js";

async function tempRepo() {
  return mkdtemp(join(tmpdir(), "loopy-cli-evidence-"));
}

function runCli(args, options = {}) {
  return spawnSync(process.execPath, [join(process.cwd(), "src/cli.js"), ...args], {
    cwd: options.cwd ?? process.cwd(),
    encoding: "utf8",
    input: options.input,
    timeout: 10_000
  });
}

async function writeEvidence(repo, name, content = "proof\n") {
  const evidenceDir = join(repo, ".loopy", "evidence");
  await mkdir(evidenceDir, { recursive: true });
  const path = join(evidenceDir, name);
  await writeFile(path, content, "utf8");
  return `.loopy/evidence/${name}`;
}

test("CLI loop capture records a transcript from command args after --", async () => {
  const repo = await tempRepo();
  await mkdir(repo, { recursive: true });
  await createLoop(repo, ["--brief", "Ship"]);
  runCli(["loop", "next", "--json"], { cwd: repo });

  const result = runCli([
    "loop",
    "capture",
    "--goal-id",
    "G001",
    "--criterion-id",
    "C001",
    "--json",
    "--",
    process.execPath,
    "-e",
    "console.log('cli captured')"
  ], { cwd: repo });

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.capture.exitCode, 0);
  assert.equal(parsed.criterion.status, "pass");
  assert.equal(parsed.criterion.artifact, ".loopy/evidence/G001-C001-capture.txt");
  assert.equal(parsed.guide.state, "record_evidence");
  assert.equal(parsed.guide.criterion.id, "C002");
});

test("CLI loop evidence text shows the immediate next guide", async () => {
  const repo = await tempRepo();
  await mkdir(repo, { recursive: true });
  await createLoop(repo, ["--brief", "Ship"]);
  runCli(["loop", "next", "--json"], { cwd: repo });

  const result = runCli([
    "loop",
    "evidence",
    "--goal-id",
    "G001",
    "--criterion-id",
    "C001",
    "--status",
    "pass",
    "--artifact",
    await writeEvidence(repo, "g001-c001.txt")
  ], { cwd: repo });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /loopy evidence: G001\/C001 -> pass/);
  assert.match(result.stdout, /Criterion: C002/);
  assert.match(result.stdout, /Next action: `loopy loop prove -- <validation-command>`/);
});

test("CLI loop capture text shows the immediate next guide", async () => {
  const repo = await tempRepo();
  await mkdir(repo, { recursive: true });
  await createLoop(repo, ["--brief", "Ship"]);
  runCli(["loop", "next", "--json"], { cwd: repo });

  const result = runCli([
    "loop",
    "capture",
    "--goal-id",
    "G001",
    "--criterion-id",
    "C001",
    "--",
    process.execPath,
    "-e",
    "console.log('cli captured text')"
  ], { cwd: repo });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /loopy capture: G001\/C001 -> pass \(.loopy\/evidence\/G001-C001-capture.txt\)/);
  assert.match(result.stdout, /Criterion: C002/);
  assert.match(result.stdout, /Next action: `loopy loop prove -- <validation-command>`/);
});

test("CLI loop prove records the active next criterion without ids", async () => {
  const repo = await tempRepo();
  await mkdir(repo, { recursive: true });
  await createLoop(repo, ["--brief", "Ship"]);
  runCli(["loop", "next", "--json"], { cwd: repo });

  const result = runCli([
    "loop",
    "prove",
    "--json",
    "--",
    process.execPath,
    "-e",
    "console.log('proved from cli')"
  ], { cwd: repo });

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.criterion.id, "C001");
  assert.equal(parsed.criterion.status, "pass");
  assert.equal(parsed.criterion.artifact, ".loopy/evidence/G001-C001-capture.txt");
  assert.equal(parsed.guide.state, "record_evidence");
  assert.equal(parsed.guide.criterion.id, "C002");
  assert.equal(parsed.guide.nextAction.command, "loopy loop prove -- <validation-command>");
});

test("CLI loop prove text shows the immediate next guide", async () => {
  const repo = await tempRepo();
  await mkdir(repo, { recursive: true });
  await createLoop(repo, ["--brief", "Ship"]);
  runCli(["loop", "next", "--json"], { cwd: repo });

  const result = runCli([
    "loop",
    "prove",
    "--",
    process.execPath,
    "-e",
    "console.log('proved from cli text')"
  ], { cwd: repo });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /loopy prove: G001\/C001 -> pass \(.loopy\/evidence\/G001-C001-capture.txt\)/);
  assert.match(result.stdout, /State: record_evidence/);
  assert.match(result.stdout, /Criterion: C002/);
  assert.match(result.stdout, /Next action: `loopy loop prove -- <validation-command>`/);
  assert.match(result.stdout, /Recorded evidence:/);
  assert.match(result.stdout, /G001\/C001 pass at \d{4}-\d{2}-\d{2}T.* -> `.loopy\/evidence\/G001-C001-capture.txt`/);
});

test("CLI loop trace text shows evidence trail and missing proof", async () => {
  const repo = await tempRepo();
  await mkdir(repo, { recursive: true });
  await createLoop(repo, ["--brief", "Ship"]);
  await evidenceLoop(repo, [
    "--goal-id",
    "G001",
    "--criterion-id",
    "C001",
    "--status",
    "pass",
    "--artifact",
    await writeEvidence(repo, "g001-c001.txt"),
    "--notes",
    "manual smoke covered"
  ]);

  const result = runCli(["loop", "trace"], { cwd: repo });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Loopy trace/);
  assert.match(result.stdout, /Evidence summary: 1 artifact-backed criteria, 1 missing proof, 2 timeline events/);
  assert.match(result.stdout, /Evidence artifacts:\n- G001\/C001 pass at \d{4}-\d{2}-\d{2}T.* `.loopy\/evidence\/g001-c001.txt` - notes: manual smoke covered\n\nMissing proof:/);
  assert.match(result.stdout, /Missing proof:/);
  assert.match(result.stdout, /G001\/C002 pending -> `.loopy\/evidence\/G001-C002.txt`/);
  assert.match(result.stdout, /Timeline:/);
  assert.match(result.stdout, /2\. \d{4}-\d{2}-\d{2}T.* evidence_passed G001\/C001 pass `.loopy\/evidence\/g001-c001.txt` notes: manual smoke covered/);
  assert.match(result.stdout, /State: start_goal/);
  assert.match(result.stdout, /Next action: `loopy loop next --json`/);
});

test("CLI loop report writes a shareable evidence artifact", async () => {
  const repo = await tempRepo();
  await mkdir(repo, { recursive: true });
  await createLoop(repo, ["--brief", "Ship"]);
  await evidenceLoop(repo, [
    "--goal-id",
    "G001",
    "--criterion-id",
    "C001",
    "--status",
    "pass",
    "--artifact",
    await writeEvidence(repo, "g001-c001.txt")
  ]);

  const result = runCli(["loop", "report"], { cwd: repo });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /loopy report: .loopy\/evidence\/report.md/);
  assert.match(result.stdout, /State: start_goal/);
  assert.match(result.stdout, /Next action: `loopy loop next --json`/);
});

test("CLI loop check exits nonzero while proof is missing", async () => {
  const repo = await tempRepo();
  await mkdir(repo, { recursive: true });
  await createLoop(repo, ["--brief", "Ship"]);

  const result = runCli(["loop", "check"], { cwd: repo });

  assert.equal(result.status, 1);
  assert.match(result.stdout, /loopy check: blocked/);
  assert.match(result.stdout, /Evidence summary: 0 artifact-backed criteria, 2 unresolved, 0 invalid/);
  assert.match(result.stdout, /G001\/C001 pending -> `.loopy\/evidence\/G001-C001.txt`/);
  assert.match(result.stdout, /Repair plan:\n1\. G001\/C001 missing-proof -> `.loopy\/evidence\/G001-C001.txt`\n   capture: `loopy loop capture --goal-id G001 --criterion-id C001 --notes "<summary>" -- <validation-command>`\n   evidence: `loopy loop evidence --goal-id G001 --criterion-id C001 --status pass --artifact .loopy\/evidence\/G001-C001.txt --notes "<summary>" --json`/);
  assert.match(result.stdout, /Repair commands:/);
  assert.match(result.stdout, /G001\/C001 missing-proof capture `loopy loop capture --goal-id G001 --criterion-id C001 --notes "<summary>" -- <validation-command>`/);
  assert.match(result.stdout, /Next action: `loopy loop next --json`/);
});

test("CLI loop check text shows finish action when preflight is clean", async () => {
  const repo = await tempRepo();
  await mkdir(repo, { recursive: true });
  await createLoop(repo, ["--brief", "Ship"]);
  await evidenceLoop(repo, ["--goal-id", "G001", "--criterion-id", "C001", "--status", "pass", "--artifact", await writeEvidence(repo, "c1.txt")]);
  await evidenceLoop(repo, ["--goal-id", "G001", "--criterion-id", "C002", "--status", "pass", "--artifact", await writeEvidence(repo, "c2.txt")]);

  const result = runCli(["loop", "check"], { cwd: repo });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /loopy check: ok/);
  assert.match(result.stdout, /Evidence summary: 2 artifact-backed criteria, 0 unresolved, 0 invalid/);
  assert.match(result.stdout, /State: finish/);
  assert.match(result.stdout, /Next action: `loopy loop finish --evidence "criteria passed" --artifact .loopy\/evidence\/gate.json --notes "criteria reviewed" --json`/);
});

test("CLI loop review writes a gate artifact from passed criteria", async () => {
  const repo = await tempRepo();
  await mkdir(repo, { recursive: true });
  await createLoop(repo, ["--brief", "Ship"]);
  await evidenceLoop(repo, ["--goal-id", "G001", "--criterion-id", "C001", "--status", "pass", "--artifact", await writeEvidence(repo, "c1.txt")]);
  await evidenceLoop(repo, ["--goal-id", "G001", "--criterion-id", "C002", "--status", "pass", "--artifact", await writeEvidence(repo, "c2.txt")]);

  const result = runCli(["loop", "review", "--status", "passed", "--artifact", ".loopy/evidence/gate.json", "--json"], {
    cwd: repo
  });

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.kind, "quality_gate_passed");
  assert.equal(parsed.artifact.relativePath, ".loopy/evidence/gate.json");
  assert.equal(parsed.guide.state, "final_checkpoint");
  assert.equal(parsed.guide.nextAction.command, "loopy loop checkpoint --goal-id G001 --status complete --evidence \"criteria passed\" --quality-gate .loopy/evidence/gate.json --json");
});

test("CLI loop review text shows the final checkpoint guide", async () => {
  const repo = await tempRepo();
  await mkdir(repo, { recursive: true });
  await createLoop(repo, ["--brief", "Ship"]);
  await evidenceLoop(repo, ["--goal-id", "G001", "--criterion-id", "C001", "--status", "pass", "--artifact", await writeEvidence(repo, "c1.txt")]);
  await evidenceLoop(repo, ["--goal-id", "G001", "--criterion-id", "C002", "--status", "pass", "--artifact", await writeEvidence(repo, "c2.txt")]);

  const result = runCli(["loop", "review", "--status", "passed", "--artifact", ".loopy/evidence/gate.json"], {
    cwd: repo
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /loopy review: .loopy\/evidence\/gate.json/);
  assert.match(result.stdout, /State: final_checkpoint/);
  assert.match(result.stdout, /Next action: `loopy loop checkpoint --goal-id G001 --status complete --evidence "criteria passed" --quality-gate .loopy\/evidence\/gate.json --json`/);
});

test("CLI loop checkpoint text shows the immediate next guide", async () => {
  const repo = await tempRepo();
  await mkdir(repo, { recursive: true });
  await createLoop(repo, ["--brief", "- Build\n- Verify"]);
  await evidenceLoop(repo, ["--goal-id", "G001", "--criterion-id", "C001", "--status", "pass", "--artifact", await writeEvidence(repo, "g1-c1.txt")]);
  await evidenceLoop(repo, ["--goal-id", "G001", "--criterion-id", "C002", "--status", "pass", "--artifact", await writeEvidence(repo, "g1-c2.txt")]);

  const result = runCli(["loop", "checkpoint", "--goal-id", "G001", "--status", "complete", "--evidence", "criteria passed"], {
    cwd: repo
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /loopy checkpoint: G001 -> complete/);
  assert.match(result.stdout, /State: start_goal/);
  assert.match(result.stdout, /Next action: `loopy loop next --json`/);
});

test("CLI loop finish creates a gate and completes the loop", async () => {
  const repo = await tempRepo();
  await mkdir(repo, { recursive: true });
  await createLoop(repo, ["--brief", "Ship"]);
  await evidenceLoop(repo, ["--goal-id", "G001", "--criterion-id", "C001", "--status", "pass", "--artifact", await writeEvidence(repo, "c1.txt")]);
  await evidenceLoop(repo, ["--goal-id", "G001", "--criterion-id", "C002", "--status", "pass", "--artifact", await writeEvidence(repo, "c2.txt")]);

  const result = runCli(["loop", "finish", "--evidence", "criteria passed", "--json"], { cwd: repo });

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.kind, "finished");
  assert.equal(parsed.plan.aggregateCompletion.status, "complete");
  assert.equal(parsed.review.artifact.relativePath, ".loopy/evidence/gate.json");
  assert.equal(parsed.report.artifact.relativePath, ".loopy/evidence/report.md");
  assert.equal(parsed.guide.state, "complete");
  assert.equal(parsed.guide.nextAction.command, "loopy loop status --json");
});

test("CLI loop finish rejects markdown paths for the quality gate artifact", async () => {
  const repo = await tempRepo();
  await mkdir(repo, { recursive: true });
  await createLoop(repo, ["--brief", "Ship"]);
  await evidenceLoop(repo, ["--goal-id", "G001", "--criterion-id", "C001", "--status", "pass", "--artifact", await writeEvidence(repo, "c1.txt")]);
  await evidenceLoop(repo, ["--goal-id", "G001", "--criterion-id", "C002", "--status", "pass", "--artifact", await writeEvidence(repo, "c2.txt")]);

  const result = runCli([
    "loop",
    "finish",
    "--evidence",
    "criteria passed",
    "--artifact",
    ".loopy/evidence/jinbe-final-gate.md"
  ], { cwd: repo });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Quality gate artifact must use a \.json path/);
  assert.equal(existsSync(join(repo, ".loopy", "evidence", "jinbe-final-gate.md")), false);
});

test("CLI loop finish text shows the complete guide", async () => {
  const repo = await tempRepo();
  await mkdir(repo, { recursive: true });
  await createLoop(repo, ["--brief", "Ship"]);
  await evidenceLoop(repo, ["--goal-id", "G001", "--criterion-id", "C001", "--status", "pass", "--artifact", await writeEvidence(repo, "c1.txt")]);
  await evidenceLoop(repo, ["--goal-id", "G001", "--criterion-id", "C002", "--status", "pass", "--artifact", await writeEvidence(repo, "c2.txt")]);

  const result = runCli(["loop", "finish", "--evidence", "criteria passed"], { cwd: repo });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /loopy finish: complete/);
  assert.match(result.stdout, /State: complete/);
  assert.match(result.stdout, /Next action: `loopy loop status --json`/);
});
