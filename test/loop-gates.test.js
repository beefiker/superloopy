import assert from "node:assert/strict";
import "./helpers/trust-isolate.js";
import { mkdir, mkdtemp, readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { checkLoop } from "../src/check.js";
import { finishLoop } from "../src/finish.js";
import { reportLoop } from "../src/report.js";
import { traceLoop } from "../src/trace.js";
import { checkpointLoop, createLoop, evidenceLoop, reviewLoop, statusLoop } from "../src/loop.js";
import { recordTrustedCommand } from "../src/plan-trust.js";


async function tempRepo() {
  return mkdtemp(join(tmpdir(), "superloopy-loop-gates-"));
}

async function writeEvidence(repo, name, content = "proof\n") {
  const evidenceDir = join(repo, ".superloopy", "evidence");
  await mkdir(evidenceDir, { recursive: true });
  const path = join(evidenceDir, name);
  await writeFile(path, content, "utf8");
  return `.superloopy/evidence/${name}`;
}

test("traceLoop summarizes evidence artifacts, missing criteria, and ledger timeline", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship a CLI loop"]);
  const artifact = await writeEvidence(repo, "g001-c001.txt");
  await evidenceLoop(repo, [
    "--goal-id",
    "G001",
    "--criterion-id",
    "C001",
    "--status",
    "pass",
    "--artifact",
    artifact,
    "--notes",
    "manual smoke covered"
  ]);

  const result = await traceLoop(repo);

  assert.equal(result.kind, "trace");
  assert.deepEqual(result.evidenceSummary, {
    artifactBackedCriteria: 1,
    missingProof: 1,
    timelineEvents: 2
  });
  assert.deepEqual(result.artifacts.map((item) => item.ref), ["G001/C001"]);
  assert.equal(result.artifacts[0].artifact, artifact);
  assert.equal(result.artifacts[0].notes, "manual smoke covered");
  assert.match(result.artifacts[0].capturedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.deepEqual(result.missingCriteria.map((item) => item.ref), ["G001/C002"]);
  assert.equal(result.missingCriteria[0].suggestedArtifact, ".superloopy/evidence/G001-C002.txt");
  assert.deepEqual(result.timeline.map((item) => item.kind), ["plan_created", "evidence_passed"]);
  assert.equal(result.timeline[1].notes, "manual smoke covered");
  assert.equal(result.guide.state, "start_goal");
  assert.equal(result.guide.nextAction.command, "superloopy loop next --json");
});

test("reportLoop writes a portable evidence report under the evidence root", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship a CLI loop"]);
  const artifact = await writeEvidence(repo, "g001-c001.txt");
  await evidenceLoop(repo, ["--goal-id", "G001", "--criterion-id", "C001", "--status", "pass", "--artifact", artifact]);

  const result = await reportLoop(repo);
  const report = await readFile(join(repo, ".superloopy", "evidence", "report.md"), "utf8");
  const ledger = await readFile(join(repo, ".superloopy", "ledger.jsonl"), "utf8");

  assert.equal(result.kind, "report");
  assert.equal(result.artifact.relativePath, ".superloopy/evidence/report.md");
  assert.equal(result.guide.state, "start_goal");
  assert.equal(result.guide.nextAction.command, "superloopy loop next --json");
  assert.match(report, /# Superloopy Evidence Report/);
  assert.match(report, /## Evidence Summary\n- 1 artifact-backed criteria\n- 1 missing proof\n- 2 timeline events/);
  assert.match(report, /## Evidence Artifacts\n- G001\/C001 pass at \d{4}-\d{2}-\d{2}T.* `.superloopy\/evidence\/g001-c001.txt`/);
  assert.match(report, /G001\/C002 pending -> `.superloopy\/evidence\/G001-C002.txt`/);
  assert.match(report, /1\. \d{4}-\d{2}-\d{2}T.* plan_created/);
  assert.match(report, /2\. \d{4}-\d{2}-\d{2}T.* evidence_passed G001\/C001/);
  assert.match(ledger, /evidence_report_written/);
});

test("checkLoop reports missing proof and stale pass artifacts", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship a CLI loop"]);
  const artifact = await writeEvidence(repo, "g001-c001.txt");
  await evidenceLoop(repo, ["--goal-id", "G001", "--criterion-id", "C001", "--status", "pass", "--artifact", artifact]);
  await unlink(join(repo, ".superloopy", "evidence", "g001-c001.txt"));

  const result = await checkLoop(repo);

  assert.equal(result.ok, false);
  assert.deepEqual(result.unresolvedCriteria.map((item) => item.ref), ["G001/C002"]);
  assert.equal(result.unresolvedCriteria[0].suggestedArtifact, ".superloopy/evidence/G001-C002.txt");
  assert.deepEqual(result.invalidArtifacts.map((item) => item.ref), ["G001/C001"]);
  assert.match(result.invalidArtifacts[0].error, /does not exist/);
  assert.deepEqual(result.repairCommands.map((item) => item.ref), ["G001/C002", "G001/C001"]);
  assert.equal(result.repairCommands[0].captureCommand, "superloopy loop capture --goal-id G001 --criterion-id C002 --notes \"<summary>\" -- <validation-command>");
  assert.equal(result.repairCommands[1].evidenceCommand, "superloopy loop evidence --goal-id G001 --criterion-id C001 --status pass --artifact .superloopy/evidence/g001-c001.txt --notes \"<summary>\" --json");
  assert.deepEqual(result.repairPlan.map((item) => ({
    step: item.step,
    ref: item.ref,
    reason: item.reason,
    artifact: item.artifact
  })), [
    { step: 1, ref: "G001/C002", reason: "missing-proof", artifact: ".superloopy/evidence/G001-C002.txt" },
    { step: 2, ref: "G001/C001", reason: "invalid-artifact", artifact: ".superloopy/evidence/g001-c001.txt" }
  ]);
  assert.equal(result.repairPlan[0].instruction, "Record artifact-backed pass proof for G001/C002.");
  assert.equal(result.repairPlan[0].primaryCommand, result.repairCommands[0].captureCommand);
  assert.equal(result.repairPlan[0].alternativeCommand, result.repairCommands[0].evidenceCommand);
  assert.equal(result.repairPlan[1].instruction, "Replace or recapture the stale pass artifact for G001/C001.");
  assert.equal(result.repairPlan[1].primaryCommand, result.repairCommands[1].captureCommand);
  assert.equal(result.repairPlan[1].alternativeCommand, result.repairCommands[1].evidenceCommand);
  assert.equal(result.guide.state, "start_goal");
  assert.equal(result.guide.nextAction.command, "superloopy loop next --json");
});

test("checkLoop passes when every criterion has live artifact-backed proof", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship a CLI loop"]);
  await evidenceLoop(repo, ["--goal-id", "G001", "--criterion-id", "C001", "--status", "pass", "--artifact", await writeEvidence(repo, "c1.txt")]);
  await evidenceLoop(repo, ["--goal-id", "G001", "--criterion-id", "C002", "--status", "pass", "--artifact", await writeEvidence(repo, "c2.txt")]);

  const result = await checkLoop(repo);

  assert.equal(result.ok, true);
  assert.equal(result.invalidArtifacts.length, 0);
  assert.equal(result.unresolvedCriteria.length, 0);
  assert.deepEqual(result.warnings.map((item) => item.kind), ["manual-proof", "manual-proof"]);
  assert.equal(result.guide.state, "finish");
  assert.equal(result.guide.nextAction.command, "superloopy loop finish --evidence \"criteria passed\" --artifact .superloopy/evidence/gate.json --notes \"criteria reviewed\" --json");
});

test("checkpointLoop blocks final completion without quality gate", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship a CLI loop"]);
  await evidenceLoop(repo, ["--goal-id", "G001", "--criterion-id", "C001", "--status", "pass", "--artifact", await writeEvidence(repo, "c1.txt")]);
  await evidenceLoop(repo, ["--goal-id", "G001", "--criterion-id", "C002", "--status", "pass", "--artifact", await writeEvidence(repo, "c2.txt")]);

  await assert.rejects(
    checkpointLoop(repo, ["--goal-id", "G001", "--status", "complete", "--evidence", "done"]),
    /Missing --quality-gate/
  );
});

test("checkpointLoop returns the immediate guide after a non-final checkpoint", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "- Build\n- Verify"]);
  await evidenceLoop(repo, ["--goal-id", "G001", "--criterion-id", "C001", "--status", "pass", "--artifact", await writeEvidence(repo, "g1-c1.txt")]);
  await evidenceLoop(repo, ["--goal-id", "G001", "--criterion-id", "C002", "--status", "pass", "--artifact", await writeEvidence(repo, "g1-c2.txt")]);

  const result = await checkpointLoop(repo, [
    "--goal-id",
    "G001",
    "--status",
    "complete",
    "--evidence",
    "criteria passed"
  ]);

  assert.equal(result.guide.state, "start_goal");
  assert.equal(result.guide.nextAction.command, "superloopy loop next --json");
});

test("reviewLoop rejects a passed gate while criteria are unresolved", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship a CLI loop"]);
  await evidenceLoop(repo, ["--goal-id", "G001", "--criterion-id", "C001", "--status", "pass", "--artifact", await writeEvidence(repo, "c1.txt")]);

  await assert.rejects(
    reviewLoop(repo, ["--status", "passed", "--artifact", ".superloopy/evidence/gate.json", "--notes", "reviewed"]),
    /unresolved criteria/
  );
});

test("reviewLoop writes an artifact-backed quality gate", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship a CLI loop"]);
  const c1 = await writeEvidence(repo, "c1.txt");
  const c2 = await writeEvidence(repo, "c2.txt");
  await evidenceLoop(repo, ["--goal-id", "G001", "--criterion-id", "C001", "--status", "pass", "--artifact", c1]);
  await evidenceLoop(repo, ["--goal-id", "G001", "--criterion-id", "C002", "--status", "pass", "--artifact", c2]);

  const review = await reviewLoop(repo, [
    "--status",
    "passed",
    "--artifact",
    ".superloopy/evidence/gate.json",
    "--notes",
    "reviewed"
  ]);
  const gate = JSON.parse(await readFile(join(repo, ".superloopy", "evidence", "gate.json"), "utf8"));

  assert.equal(review.artifact.relativePath, ".superloopy/evidence/gate.json");
  assert.equal(review.guide.state, "final_checkpoint");
  assert.equal(review.guide.nextAction.command, "superloopy loop checkpoint --goal-id G001 --status complete --evidence \"criteria passed\" --quality-gate .superloopy/evidence/gate.json --json");
  assert.equal(gate.status, "passed");
  assert.deepEqual(gate.artifacts, [c1, c2]);
  await checkpointLoop(repo, [
    "--goal-id",
    "G001",
    "--status",
    "complete",
    "--evidence",
    "done",
    "--quality-gate",
    review.artifact.relativePath
  ]);
  const persisted = await statusLoop(repo);
  assert.equal(persisted.summary.aggregateComplete, true);
});

test("finishLoop creates the gate and completes aggregate in one command", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship a CLI loop"]);
  const c1 = await writeEvidence(repo, "c1.txt");
  const c2 = await writeEvidence(repo, "c2.txt");
  await evidenceLoop(repo, ["--goal-id", "G001", "--criterion-id", "C001", "--status", "pass", "--artifact", c1]);
  await evidenceLoop(repo, ["--goal-id", "G001", "--criterion-id", "C002", "--status", "pass", "--artifact", c2]);

  const result = await finishLoop(repo, ["--evidence", "criteria passed", "--artifact", ".superloopy/evidence/gate.json", "--notes", "reviewed"]);
  const gate = JSON.parse(await readFile(join(repo, ".superloopy", "evidence", "gate.json"), "utf8"));

  assert.equal(result.kind, "finished");
  assert.equal(result.plan.aggregateCompletion.status, "complete");
  assert.equal(result.plan.goals[0].status, "complete");
  assert.equal(result.review.artifact.relativePath, ".superloopy/evidence/gate.json");
  assert.equal(result.report.artifact.relativePath, ".superloopy/evidence/report.md");
  assert.equal(result.guide.state, "complete");
  assert.equal(result.guide.nextAction.command, "superloopy loop status --json");
  assert.deepEqual(gate.artifacts, [c1, c2]);
  assert.match(await readFile(join(repo, ".superloopy", "evidence", "report.md"), "utf8"), /# Superloopy Evidence Report/);
});

test("checkpointLoop completes aggregate with artifact-backed quality gate", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship a CLI loop"]);
  const c1 = await writeEvidence(repo, "c1.txt");
  const c2 = await writeEvidence(repo, "c2.txt");
  await evidenceLoop(repo, ["--goal-id", "G001", "--criterion-id", "C001", "--status", "pass", "--artifact", c1]);
  await evidenceLoop(repo, ["--goal-id", "G001", "--criterion-id", "C002", "--status", "pass", "--artifact", c2]);
  await writeFile(join(repo, ".superloopy", "evidence", "gate.json"), JSON.stringify({ status: "passed", artifacts: [c1, c2] }), "utf8");

  const result = await checkpointLoop(repo, [
    "--goal-id",
    "G001",
    "--status",
    "complete",
    "--evidence",
    "done",
    "--quality-gate",
    ".superloopy/evidence/gate.json"
  ]);
  const persisted = await statusLoop(repo);
  const ledger = await readFile(join(repo, ".superloopy", "ledger.jsonl"), "utf8");

  assert.equal(result.plan.aggregateCompletion.status, "complete");
  assert.equal(result.guide.state, "complete");
  assert.equal(result.guide.nextAction.command, "superloopy loop status --json");
  assert.equal(persisted.summary.aggregateComplete, true);
  assert.match(ledger, /aggregate_completed/);
});

test("default gate re-derives the floor and blocks completion when a command no longer reproduces (P0.1)", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship a CLI loop"]);
  const c1 = await writeEvidence(repo, "c1.txt");
  const c2 = await writeEvidence(repo, "c2.txt");
  // C001 is recorded as pass, but its command now exits non-zero. With SUPERLOOPY_AUDIT unset
  // (the default gate), completion must STILL re-run it in-process and refuse the stale pass.
  await evidenceLoop(repo, ["--goal-id", "G001", "--criterion-id", "C001", "--status", "pass", "--artifact", c1, "--command", '["node","-e","process.exit(1)"]']);
  await evidenceLoop(repo, ["--goal-id", "G001", "--criterion-id", "C002", "--status", "pass", "--artifact", c2]);

  await assert.rejects(
    reviewLoop(repo, ["--status", "passed", "--artifact", ".superloopy/evidence/gate.json", "--notes", "reviewed"]),
    /did not re-derive to a passing floor/
  );
});

test("default gate completes when a command-backed criterion still reproduces (P0.1)", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship a CLI loop"]);
  const c1 = await writeEvidence(repo, "c1.txt");
  const c2 = await writeEvidence(repo, "c2.txt");
  await evidenceLoop(repo, ["--goal-id", "G001", "--criterion-id", "C001", "--status", "pass", "--artifact", c1, "--command", '["node","-e","process.exit(0)"]']);
  await evidenceLoop(repo, ["--goal-id", "G001", "--criterion-id", "C002", "--status", "pass", "--artifact", c2]);
  // The gate re-runs only trusted commands; this one stands in for a locally-captured command.
  await recordTrustedCommand(repo, ["node", "-e", "process.exit(0)"]);

  const review = await reviewLoop(repo, ["--status", "passed", "--artifact", ".superloopy/evidence/gate.json", "--notes", "reviewed"]);
  assert.equal(review.gate.status, "passed");
  const result = await checkpointLoop(repo, ["--goal-id", "G001", "--status", "complete", "--evidence", "done", "--quality-gate", ".superloopy/evidence/gate.json"]);
  assert.equal(result.plan.aggregateCompletion.status, "complete");
});

test("evidence rejects a present-but-malformed --command instead of silently downgrading to manual", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship a CLI loop"]);
  const c1 = await writeEvidence(repo, "c1.txt");

  // Unparseable JSON payload.
  await assert.rejects(
    evidenceLoop(repo, ["--goal-id", "G001", "--criterion-id", "C001", "--status", "pass", "--artifact", c1, "--command", "node -e process.exit(0)"]),
    /--command must be a JSON array of strings/
  );
  // Well-formed JSON but wrong shape (empty array / non-string element).
  await assert.rejects(
    evidenceLoop(repo, ["--goal-id", "G001", "--criterion-id", "C001", "--status", "pass", "--artifact", c1, "--command", "[]"]),
    /--command must be a non-empty JSON array of strings/
  );
  await assert.rejects(
    evidenceLoop(repo, ["--goal-id", "G001", "--criterion-id", "C001", "--status", "pass", "--artifact", c1, "--command", '["node", 1]']),
    /--command must be a non-empty JSON array of strings/
  );
});
