import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { beginLoop } from "../src/begin.js";
import { captureLoop } from "../src/capture.js";
import { proveLoop } from "../src/prove.js";
import {
  createLoop,
  evidenceLoop,
  guideLoop,
  nextLoop,
  reviewLoop,
  statusLoop
} from "../src/loop.js";

async function tempRepo() {
  return mkdtemp(join(tmpdir(), "loopy-loop-"));
}

async function writeEvidence(repo, name, content = "proof\n") {
  const evidenceDir = join(repo, ".loopy", "evidence");
  await mkdir(evidenceDir, { recursive: true });
  const path = join(evidenceDir, name);
  await writeFile(path, content, "utf8");
  return `.loopy/evidence/${name}`;
}

test("createLoop creates light-mode goals with two strict evidence criteria", async () => {
  const repo = await tempRepo();

  const result = await createLoop(repo, ["--brief", "Ship a CLI loop"]);

  assert.equal(result.plan.mode, "light");
  assert.equal(result.plan.goals.length, 1);
  assert.equal(result.plan.goals[0].criteria.length, 2);
  assert.equal(result.summary.criteria.pending, 2);
  assert.equal(result.guide.state, "start_goal");
  assert.equal(result.guide.nextAction.command, "loopy loop next --json");
});

test("beginLoop creates a plan and starts the first goal in one command", async () => {
  const repo = await tempRepo();

  const result = await beginLoop(repo, ["--brief", "- Build\n- Verify", "--mode", "strict"]);

  assert.equal(result.kind, "begun");
  assert.equal(result.created.plan.goals.length, 2);
  assert.equal(result.goal.id, "G001");
  assert.equal(result.goal.status, "in_progress");
  assert.equal(result.goal.criteria.length, 3);
  assert.equal(result.guide.state, "record_evidence");
  assert.equal(result.guide.nextAction.command, "loopy loop prove -- <validation-command>");
  assert.equal(result.summary.goals.in_progress, 1);
});

test("nextLoop starts the first pending goal and records resumable status", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship a CLI loop"]);

  const first = await nextLoop(repo);
  const second = await nextLoop(repo);

  assert.equal(first.goal.status, "in_progress");
  assert.equal(first.guide.state, "record_evidence");
  assert.equal(first.guide.nextAction.command, "loopy loop prove -- <validation-command>");
  assert.equal(second.resumed, true);
  assert.equal(second.goal.id, first.goal.id);
  assert.equal(second.guide.state, "record_evidence");
  assert.equal(second.guide.nextAction.command, "loopy loop prove -- <validation-command>");
});

test("statusLoop returns the immediate guide", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship a CLI loop"]);

  const result = await statusLoop(repo);

  assert.equal(result.summary.goals.pending, 1);
  assert.equal(result.guide.state, "start_goal");
  assert.equal(result.guide.nextAction.command, "loopy loop next --json");
});

test("guideLoop points an idle plan at the exact next command", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship a CLI loop"]);

  const result = await guideLoop(repo);

  assert.equal(result.guide.state, "start_goal");
  assert.equal(result.guide.nextAction.command, "loopy loop next --json");
  assert.equal(result.guide.nextAction.reason, "No goal is active.");
  assert.equal(result.guide.evidenceRoot, ".loopy/evidence");
  assert.equal(result.guide.unresolvedCriteria[0].status, "pending");
  assert.equal(result.guide.unresolvedCriteria[0].suggestedArtifact, ".loopy/evidence/G001-C001.txt");
});

test("guideLoop ignores legacy pending criteria without artifact fields", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship a CLI loop"]);
  const path = join(repo, ".loopy", "goals.json");
  const plan = JSON.parse(await readFile(path, "utf8"));
  delete plan.goals[0].criteria[0].artifact;
  await writeFile(path, JSON.stringify(plan, null, 2), "utf8");

  const result = await guideLoop(repo);

  assert.deepEqual(result.guide.recordedEvidence, []);
});

test("guideLoop points an active goal at the next evidence artifact", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship a CLI loop"]);
  await nextLoop(repo);

  const result = await guideLoop(repo);

  assert.equal(result.guide.state, "record_evidence");
  assert.equal(result.guide.goal.id, "G001");
  assert.equal(result.guide.criterion.id, "C001");
  assert.equal(result.guide.nextAction.command, "loopy loop prove -- <validation-command>");
  assert.deepEqual(result.guide.proofTarget, { ref: "G001/C001", status: "pass", artifact: ".loopy/evidence/G001-C001.txt" });
  assert.equal(result.guide.captureTemplate.command, "loopy loop capture --goal-id G001 --criterion-id C001 --notes \"<summary>\" -- <validation-command>");
  assert.equal(result.guide.evidenceTemplate.command, "loopy loop evidence --goal-id G001 --criterion-id C001 --status pass --artifact .loopy/evidence/G001-C001.txt --notes \"<summary>\" --json");
  assert.equal(result.guide.commands.trace, "loopy loop trace --json");
  assert.equal(result.guide.commands.report, "loopy loop report --json");
  assert.equal(result.guide.commands.check, "loopy loop check --json");
  assert.deepEqual(result.guide.flow?.map((step) => [step.id, step.status, step.command]), [
    ["start_goal", "complete", "loopy loop next --json"],
    ["record_evidence", "current", "loopy loop prove -- <validation-command>"],
    ["check_evidence", "anytime", "loopy loop check --json"],
    ["finish", "pending", "loopy loop finish --evidence \"criteria passed\" --artifact .loopy/evidence/gate.json --notes \"criteria reviewed\" --json"]
  ]);
  assert.deepEqual(result.guide.unresolvedCriteria.map((item) => item.ref), ["G001/C001", "G001/C002"]);
  assert.equal(result.guide.unresolvedCriteria[0].suggestedArtifact, ".loopy/evidence/G001-C001.txt");
  assert.deepEqual(result.guide.proofPlan.map((item) => item.ref), ["G001/C001", "G001/C002"]);
  assert.equal(result.guide.proofPlan[0].captureCommand, "loopy loop capture --goal-id G001 --criterion-id C001 --notes \"<summary>\" -- <validation-command>");
  assert.equal(result.guide.proofPlan[1].evidenceCommand, "loopy loop evidence --goal-id G001 --criterion-id C002 --status pass --artifact .loopy/evidence/G001-C002.txt --notes \"<summary>\" --json");
});

test("guideLoop moves from finish to final checkpoint when the default gate exists", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship a CLI loop"]);
  const c1 = await writeEvidence(repo, "c1.txt");
  const c2 = await writeEvidence(repo, "c2.txt");
  await evidenceLoop(repo, ["--goal-id", "G001", "--criterion-id", "C001", "--status", "pass", "--artifact", c1]);
  await evidenceLoop(repo, ["--goal-id", "G001", "--criterion-id", "C002", "--status", "pass", "--artifact", c2]);

  const beforeReview = await guideLoop(repo);
  await reviewLoop(repo, ["--status", "passed", "--artifact", ".loopy/evidence/gate.json", "--notes", "reviewed"]);
  const afterReview = await guideLoop(repo);

  assert.equal(beforeReview.guide.state, "finish");
  assert.equal(beforeReview.guide.nextAction.command, "loopy loop finish --evidence \"criteria passed\" --artifact .loopy/evidence/gate.json --notes \"criteria reviewed\" --json");
  assert.deepEqual(beforeReview.guide.flow?.map((step) => [step.id, step.status]), [
    ["start_goal", "complete"],
    ["record_evidence", "complete"],
    ["check_evidence", "anytime"],
    ["finish", "current"]
  ]);
  assert.equal(afterReview.guide.state, "final_checkpoint");
  assert.equal(afterReview.guide.nextAction.command, "loopy loop checkpoint --goal-id G001 --status complete --evidence \"criteria passed\" --quality-gate .loopy/evidence/gate.json --json");
});

test("guideLoop uses scoped evidence roots and session flags", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--session-id", "sess.1", "--brief", "Scoped task"]);
  await nextLoop(repo, ["--session-id", "sess.1"]);

  const result = await guideLoop(repo, ["--session-id", "sess.1"]);

  assert.equal(result.guide.evidenceRoot, ".loopy/sessions/sess.1/evidence");
  assert.equal(result.guide.nextAction.command, "loopy loop prove --session-id sess.1 -- <validation-command>");
  assert.deepEqual(result.guide.proofTarget, { ref: "G001/C001", status: "pass", artifact: ".loopy/sessions/sess.1/evidence/G001-C001.txt" });
  assert.equal(result.guide.captureTemplate.command, "loopy loop capture --session-id sess.1 --goal-id G001 --criterion-id C001 --notes \"<summary>\" -- <validation-command>");
  assert.equal(result.guide.evidenceTemplate.command, "loopy loop evidence --session-id sess.1 --goal-id G001 --criterion-id C001 --status pass --artifact .loopy/sessions/sess.1/evidence/G001-C001.txt --notes \"<summary>\" --json");
});

test("evidenceLoop rejects pass evidence outside .loopy/evidence", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship a CLI loop"]);
  await writeFile(join(repo, "outside.txt"), "proof\n", "utf8");

  await assert.rejects(
    evidenceLoop(repo, [
      "--goal-id",
      "G001",
      "--criterion-id",
      "C001",
      "--status",
      "pass",
      "--artifact",
      "outside.txt"
    ]),
    /must live under .loopy\/evidence/
  );
});

test("evidenceLoop records pass when artifact is non-empty under .loopy/evidence", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship a CLI loop"]);
  await nextLoop(repo);
  const artifact = await writeEvidence(repo, "g001-c001.txt");

  const result = await evidenceLoop(repo, [
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

  assert.equal(result.criterion.status, "pass");
  assert.equal(result.criterion.artifact, artifact);
  assert.equal(result.criterion.notes, "manual smoke covered");
  assert.match(result.criterion.capturedAt, /^\d{4}-\d{2}-\d{2}T/);
  const ledger = await readFile(join(repo, ".loopy", "ledger.jsonl"), "utf8");
  const events = ledger.trim().split("\n").map((line) => JSON.parse(line));
  assert.equal(events.at(-1).notes, "manual smoke covered");
  assert.equal(result.guide.state, "record_evidence");
  assert.equal(result.guide.criterion.id, "C002");
  assert.equal(result.guide.nextAction.command, "loopy loop prove -- <validation-command>");
  assert.deepEqual(result.guide.recordedEvidence, [
    {
      ref: "G001/C001",
      goalId: "G001",
      criterionId: "C001",
      status: "pass",
      artifact,
      capturedAt: result.criterion.capturedAt,
      scenario: "Happy path works from the real user-facing surface.",
      notes: "manual smoke covered"
    }
  ]);
});

test("captureLoop records pass evidence with a command transcript", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship a CLI loop"]);
  await nextLoop(repo);

  const result = await captureLoop(repo, [
    "--goal-id",
    "G001",
    "--criterion-id",
    "C001",
    "--",
    process.execPath,
    "-e",
    "console.log('captured ok')"
  ]);
  const transcript = await readFile(join(repo, ".loopy", "evidence", "G001-C001-capture.txt"), "utf8");

  assert.equal(result.criterion.status, "pass");
  assert.equal(result.criterion.artifact, ".loopy/evidence/G001-C001-capture.txt");
  assert.equal(result.capture.exitCode, 0);
  assert.equal(result.guide.state, "record_evidence");
  assert.equal(result.guide.criterion.id, "C002");
  assert.match(transcript, /exitCode: 0/);
  assert.match(transcript, /\[stdout\]\ncaptured ok\n/);
});

test("captureLoop records fail evidence when the command exits nonzero", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship a CLI loop"]);

  const result = await captureLoop(repo, [
    "--goal-id",
    "G001",
    "--criterion-id",
    "C001",
    "--",
    process.execPath,
    "-e",
    "console.error('captured failure'); process.exit(7)"
  ]);
  const transcript = await readFile(join(repo, ".loopy", "evidence", "G001-C001-capture.txt"), "utf8");

  assert.equal(result.criterion.status, "fail");
  assert.equal(result.criterion.artifact, ".loopy/evidence/G001-C001-capture.txt");
  assert.equal(result.capture.exitCode, 7);
  assert.match(transcript, /exitCode: 7/);
  assert.match(transcript, /\[stderr\]\ncaptured failure\n/);
});

test("proveLoop records command evidence for the active next criterion", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship a CLI loop"]);
  await nextLoop(repo);

  const first = await proveLoop(repo, ["--", process.execPath, "-e", "console.log('proved first')"]);
  const second = await proveLoop(repo, ["--", process.execPath, "-e", "console.log('proved second')"]);
  const status = await statusLoop(repo);

  assert.equal(first.goal.id, "G001");
  assert.equal(first.criterion.id, "C001");
  assert.equal(first.criterion.status, "pass");
  assert.equal(first.criterion.artifact, ".loopy/evidence/G001-C001-capture.txt");
  assert.equal(first.guide.state, "record_evidence");
  assert.equal(first.guide.criterion.id, "C002");
  assert.equal(first.guide.nextAction.command, "loopy loop prove -- <validation-command>");
  assert.equal(second.criterion.id, "C002");
  assert.equal(second.guide.state, "finish");
  assert.equal(second.guide.nextAction.command, "loopy loop finish --evidence \"criteria passed\" --artifact .loopy/evidence/gate.json --notes \"criteria reviewed\" --json");
  assert.equal(status.summary.criteria.pass, 2);
});
