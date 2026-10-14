import assert from "node:assert/strict";
import "./helpers/trust-isolate.js";
import { Buffer } from "node:buffer";
import { appendFile, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { beginLoop } from "../src/begin.js";
import { captureLoop, runCaptured } from "../src/capture.js";
import { proveLoop } from "../src/prove.js";
import { traceLoop } from "../src/trace.js";
import {

  createLoop,
  evidenceLoop,
  guideLoop,
  nextLoop,
  reviewLoop,
  statusLoop
} from "../src/loop.js";

async function tempRepo() {
  return mkdtemp(join(tmpdir(), "superloopy-loop-"));
}

async function writeEvidence(repo, name, content = "proof\n") {
  const evidenceDir = join(repo, ".superloopy", "evidence");
  await mkdir(evidenceDir, { recursive: true });
  const path = join(evidenceDir, name);
  await writeFile(path, content, "utf8");
  return `.superloopy/evidence/${name}`;
}

test("createLoop creates light-mode goals with two strict evidence criteria", async () => {
  const repo = await tempRepo();

  const result = await createLoop(repo, ["--brief", "Ship a CLI loop"]);

  assert.equal(result.plan.mode, "light");
  assert.equal(result.plan.goals.length, 1);
  assert.equal(result.plan.goals[0].criteria.length, 2);
  assert.equal(result.summary.criteria.pending, 2);
  assert.equal(result.guide.state, "start_goal");
  assert.equal(result.guide.nextAction.command, "superloopy loop next --json");
});

test("createLoop accepts a brief value that starts with --", async () => {
  const repo = await tempRepo();

  const result = await createLoop(repo, ["--brief", "--fix the parser"]);

  assert.equal(result.plan.goals[0].objective, "--fix the parser");
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
  assert.equal(result.guide.nextAction.command, "superloopy loop prove -- <validation-command>");
  assert.equal(result.summary.goals.in_progress, 1);
});

test("nextLoop starts the first pending goal and records resumable status", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship a CLI loop"]);

  const first = await nextLoop(repo);
  const second = await nextLoop(repo);

  assert.equal(first.goal.status, "in_progress");
  assert.equal(first.guide.state, "record_evidence");
  assert.equal(first.guide.nextAction.command, "superloopy loop prove -- <validation-command>");
  assert.equal(second.resumed, true);
  assert.equal(second.goal.id, first.goal.id);
  assert.equal(second.guide.state, "record_evidence");
  assert.equal(second.guide.nextAction.command, "superloopy loop prove -- <validation-command>");
});

test("statusLoop returns the immediate guide", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship a CLI loop"]);

  const result = await statusLoop(repo);

  assert.equal(result.summary.goals.pending, 1);
  assert.equal(result.guide.state, "start_goal");
  assert.equal(result.guide.nextAction.command, "superloopy loop next --json");
});

test("statusLoop rejects malformed plan shape with a clear error", async () => {
  const repo = await tempRepo();
  await mkdir(join(repo, ".superloopy"), { recursive: true });
  await writeFile(join(repo, ".superloopy", "goals.json"), "{\"version\":1}\n", "utf8");

  await assert.rejects(statusLoop(repo), /Invalid Superloopy plan: goals must be an array/);
});

test("guideLoop points an idle plan at the exact next command", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship a CLI loop"]);

  const result = await guideLoop(repo);

  assert.equal(result.guide.state, "start_goal");
  assert.equal(result.guide.nextAction.command, "superloopy loop next --json");
  assert.equal(result.guide.nextAction.reason, "No goal is active.");
  assert.equal(result.guide.evidenceRoot, ".superloopy/evidence");
  assert.equal(result.guide.unresolvedCriteria[0].status, "pending");
  assert.equal(result.guide.unresolvedCriteria[0].suggestedArtifact, ".superloopy/evidence/G001-C001.txt");
});

test("guideLoop ignores legacy pending criteria without artifact fields", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship a CLI loop"]);
  const path = join(repo, ".superloopy", "goals.json");
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
  assert.equal(result.guide.nextAction.command, "superloopy loop prove -- <validation-command>");
  assert.deepEqual(result.guide.proofTarget, { ref: "G001/C001", status: "pass", artifact: ".superloopy/evidence/G001-C001.txt" });
  assert.equal(result.guide.captureTemplate.command, "superloopy loop capture --goal-id G001 --criterion-id C001 --notes \"<summary>\" -- <validation-command>");
  assert.equal(result.guide.evidenceTemplate.command, "superloopy loop evidence --goal-id G001 --criterion-id C001 --status pass --artifact .superloopy/evidence/G001-C001.txt --notes \"<summary>\" --json");
  assert.equal(result.guide.commands.trace, "superloopy loop trace --json");
  assert.equal(result.guide.commands.report, "superloopy loop report --json");
  assert.equal(result.guide.commands.check, "superloopy loop check --json");
  assert.deepEqual(result.guide.flow?.map((step) => [step.id, step.status, step.command]), [
    ["start_goal", "complete", "superloopy loop next --json"],
    ["record_evidence", "current", "superloopy loop prove -- <validation-command>"],
    ["check_evidence", "anytime", "superloopy loop check --json"],
    ["finish", "pending", "superloopy loop finish --evidence \"criteria passed\" --artifact .superloopy/evidence/gate.json --notes \"criteria reviewed\" --json"]
  ]);
  assert.deepEqual(result.guide.unresolvedCriteria.map((item) => item.ref), ["G001/C001", "G001/C002"]);
  assert.equal(result.guide.unresolvedCriteria[0].suggestedArtifact, ".superloopy/evidence/G001-C001.txt");
  assert.deepEqual(result.guide.proofPlan.map((item) => item.ref), ["G001/C001", "G001/C002"]);
  assert.equal(result.guide.proofPlan[0].captureCommand, "superloopy loop capture --goal-id G001 --criterion-id C001 --notes \"<summary>\" -- <validation-command>");
  assert.equal(result.guide.proofPlan[1].evidenceCommand, "superloopy loop evidence --goal-id G001 --criterion-id C002 --status pass --artifact .superloopy/evidence/G001-C002.txt --notes \"<summary>\" --json");
});

test("store relative paths stay POSIX when absolute operations use Windows path joins", async () => {
  const source = await readFile(join(process.cwd(), "src", "store.js"), "utf8");
  const transformed = source.replace(
    /import \{[^}]+\} from "node:path";/u,
    'import { posix, win32 as pathWin32 } from "node:path"; const { basename, dirname } = pathWin32; const join = pathWin32.join;'
  );
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(transformed).toString("base64")}#${Date.now()}`;
  const store = await import(moduleUrl);
  const scope = { sessionId: "sess.1" };

  assert.equal(store.superloopyRelativeDir(scope), ".superloopy/sessions/sess.1");
  assert.equal(store.evidenceRelativeDir(scope), ".superloopy/sessions/sess.1/evidence");
  assert.equal(store.goalsRelativePath(scope), ".superloopy/sessions/sess.1/goals.json");
  assert.equal(store.auditStateRelativePath(scope), ".superloopy/sessions/sess.1/audit-state.json");
});

test("guideLoop moves from finish to final checkpoint when the default gate exists", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship a CLI loop"]);
  const c1 = await writeEvidence(repo, "c1.txt");
  const c2 = await writeEvidence(repo, "c2.txt");
  await evidenceLoop(repo, ["--goal-id", "G001", "--criterion-id", "C001", "--status", "pass", "--artifact", c1]);
  await evidenceLoop(repo, ["--goal-id", "G001", "--criterion-id", "C002", "--status", "pass", "--artifact", c2]);

  const beforeReview = await guideLoop(repo);
  await reviewLoop(repo, ["--status", "passed", "--artifact", ".superloopy/evidence/gate.json", "--notes", "reviewed"]);
  const afterReview = await guideLoop(repo);

  assert.equal(beforeReview.guide.state, "finish");
  assert.equal(beforeReview.guide.nextAction.command, "superloopy loop finish --evidence \"criteria passed\" --artifact .superloopy/evidence/gate.json --notes \"criteria reviewed\" --json");
  assert.deepEqual(beforeReview.guide.flow?.map((step) => [step.id, step.status]), [
    ["start_goal", "complete"],
    ["record_evidence", "complete"],
    ["check_evidence", "anytime"],
    ["finish", "current"]
  ]);
  assert.equal(afterReview.guide.state, "final_checkpoint");
  assert.equal(afterReview.guide.nextAction.command, "superloopy loop checkpoint --goal-id G001 --status complete --evidence \"criteria passed\" --quality-gate .superloopy/evidence/gate.json --json");
});

test("guideLoop uses scoped evidence roots and session flags", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--session-id", "sess.1", "--brief", "Scoped task"]);
  await nextLoop(repo, ["--session-id", "sess.1"]);

  const result = await guideLoop(repo, ["--session-id", "sess.1"]);

  assert.equal(result.guide.evidenceRoot, ".superloopy/sessions/sess.1/evidence");
  assert.equal(result.guide.nextAction.command, "superloopy loop prove --session-id sess.1 -- <validation-command>");
  assert.deepEqual(result.guide.proofTarget, { ref: "G001/C001", status: "pass", artifact: ".superloopy/sessions/sess.1/evidence/G001-C001.txt" });
  assert.equal(result.guide.captureTemplate.command, "superloopy loop capture --session-id sess.1 --goal-id G001 --criterion-id C001 --notes \"<summary>\" -- <validation-command>");
  assert.equal(result.guide.evidenceTemplate.command, "superloopy loop evidence --session-id sess.1 --goal-id G001 --criterion-id C001 --status pass --artifact .superloopy/sessions/sess.1/evidence/G001-C001.txt --notes \"<summary>\" --json");
});

test("evidenceLoop rejects pass evidence outside .superloopy/evidence", async () => {
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
    /must live under .superloopy\/evidence/
  );
});

test("evidenceLoop records pass when artifact is non-empty under .superloopy/evidence", async () => {
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
  const ledger = await readFile(join(repo, ".superloopy", "ledger.jsonl"), "utf8");
  const events = ledger.trim().split("\n").map((line) => JSON.parse(line));
  assert.equal(events.at(-1).notes, "manual smoke covered");
  assert.equal(result.guide.state, "record_evidence");
  assert.equal(result.guide.criterion.id, "C002");
  assert.equal(result.guide.nextAction.command, "superloopy loop prove -- <validation-command>");
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
  const transcript = await readFile(join(repo, ".superloopy", "evidence", "G001-C001-capture.txt"), "utf8");

  assert.equal(result.criterion.status, "pass");
  assert.equal(result.criterion.artifact, ".superloopy/evidence/G001-C001-capture.txt");
  assert.equal(result.capture.exitCode, 0);
  assert.equal(result.guide.state, "record_evidence");
  assert.equal(result.guide.criterion.id, "C002");
  assert.match(transcript, /exitCode: 0/);
  assert.match(transcript, /\[stdout\]\ncaptured ok\n/);
});

test("runCaptured does not fail a successful command because stdout exceeds 10MB", async () => {
  const repo = await tempRepo();
  const artifact = {
    absolutePath: join(repo, ".superloopy", "evidence", "large-output.txt"),
    relativePath: ".superloopy/evidence/large-output.txt"
  };

  const capture = await runCaptured(repo, [
    process.execPath,
    "-e",
    "process.stdout.write('x'.repeat(11 * 1024 * 1024))"
  ], artifact);
  const transcript = await readFile(artifact.absolutePath, "utf8");

  assert.equal(capture.status, "pass");
  assert.equal(capture.exitCode, 0);
  assert.match(transcript, /stdout truncated after \d+ bytes/);
});

test("runCaptured signs the real end of a failing output longer than the 10MB transcript", async () => {
  const repo = await tempRepo();
  // One fixed command; only the final error (read from failure.txt) changes between runs.
  const failWithLongLog = async (finalError) => {
    await writeFile(join(repo, "failure.txt"), finalError, "utf8");
    return runCaptured(repo, [
      process.execPath,
      "-e",
      "process.stdout.write('build log\\n'.repeat(1.2 * 1024 * 1024)); process.stdout.write(require('fs').readFileSync('failure.txt', 'utf8')); process.exitCode = 1"
    ], {
      absolutePath: join(repo, ".superloopy", "evidence", "long-fail.txt"),
      relativePath: ".superloopy/evidence/long-fail.txt"
    });
  };

  const first = await failWithLongLog("error: missing symbol foo\n");
  const second = await failWithLongLog("error: type mismatch in bar\n");
  const third = await failWithLongLog("error: type mismatch in bar\n");
  const transcript = await readFile(join(repo, ".superloopy", "evidence", "long-fail.txt"), "utf8");

  assert.equal(first.status, "fail");
  assert.match(transcript, /stdout truncated after \d+ bytes/);
  assert.doesNotMatch(transcript, /type mismatch/, "the final error is past the transcript cut");
  assert.notEqual(first.failureSignature, second.failureSignature, "different final errors past the transcript cut");
  assert.equal(second.failureSignature, third.failureSignature);
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
  const transcript = await readFile(join(repo, ".superloopy", "evidence", "G001-C001-capture.txt"), "utf8");

  assert.equal(result.criterion.status, "fail");
  assert.equal(result.criterion.artifact, ".superloopy/evidence/G001-C001-capture.txt");
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
  assert.equal(first.criterion.artifact, ".superloopy/evidence/G001-C001-capture.txt");
  assert.equal(first.guide.state, "record_evidence");
  assert.equal(first.guide.criterion.id, "C002");
  assert.equal(first.guide.nextAction.command, "superloopy loop prove -- <validation-command>");
  assert.equal(second.criterion.id, "C002");
  assert.equal(second.guide.state, "finish");
  assert.equal(second.guide.nextAction.command, "superloopy loop finish --evidence \"criteria passed\" --artifact .superloopy/evidence/gate.json --notes \"criteria reviewed\" --json");
  assert.equal(status.summary.criteria.pass, 2);
});

// One fixed command whose failure text comes from `failure.txt`, so a test can move the
// failure between runs without changing the command.
const FAIL_WITH_FILE = "console.error(require('fs').readFileSync('failure.txt', 'utf8')); process.exit(1)";

function proveFailing(repo, script = FAIL_WITH_FILE) {
  return proveLoop(repo, ["--", process.execPath, "-e", script]);
}

function streakWarnings(warnings) {
  return warnings.filter((warning) => warning.kind === "repeated-failing-proof");
}

test("proveLoop flags repeated-failing-proof on the third identical failure despite run-to-run noise", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship a CLI loop"]);
  await nextLoop(repo);
  const noisy = "console.error(`${new Date().toISOString()} pid=${process.pid} boom (${performance.now().toFixed(3)}ms)`); process.exit(1)";

  const first = await proveFailing(repo, noisy);
  const second = await proveFailing(repo, noisy);
  const third = await proveFailing(repo, noisy);

  assert.deepEqual(first.warnings, []);
  assert.deepEqual(second.warnings, []);
  assert.equal(third.warnings.length, 1);
  assert.equal(third.warnings[0].kind, "repeated-failing-proof");
  assert.equal(third.warnings[0].ref, "G001/C001");
  assert.equal(third.warnings[0].count, 3);
  assert.equal(third.warnings[0].artifact, ".superloopy/evidence/G001-C001-capture.txt");
  assert.deepEqual(streakWarnings((await traceLoop(repo)).warnings).map((warning) => warning.ref), ["G001/C001"]);
});

test("a moved failure or a pass resets the repeated-failing-proof streak", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship a CLI loop"]);
  await nextLoop(repo);
  const failure = join(repo, "failure.txt");

  await writeFile(failure, "expected 3, received 4\n", "utf8");
  await proveFailing(repo);
  await proveFailing(repo);
  await writeFile(failure, "expected 5, received 4\n", "utf8");
  const moved = await proveFailing(repo);
  assert.deepEqual(moved.warnings, [], "same command, different assertion value: not the same failure");

  await proveFailing(repo);
  const repeated = await proveFailing(repo);
  assert.equal(repeated.warnings.length, 1);
  assert.equal(repeated.warnings[0].count, 3);

  const passed = await proveLoop(repo, ["--", process.execPath, "-e", "console.log('ok')"]);
  assert.equal(passed.criterion.status, "pass");
  assert.deepEqual(passed.warnings, []);
  assert.deepEqual(streakWarnings((await traceLoop(repo)).warnings), []);
});

test("loop create --force starts repeated-failing-proof streaks over for reused criterion ids", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship a CLI loop"]);
  await nextLoop(repo);
  await writeFile(join(repo, "failure.txt"), "expected 3, received 4\n", "utf8");
  await proveFailing(repo);
  await proveFailing(repo);

  await createLoop(repo, ["--brief", "Ship a CLI loop again", "--force"]);
  await nextLoop(repo);
  const afterReplace = await proveFailing(repo);

  assert.equal(afterReplace.criterion.id, "C001");
  assert.deepEqual(afterReplace.warnings, []);
  assert.deepEqual(streakWarnings((await traceLoop(repo)).warnings), []);
});

test("a torn ledger record is skipped and surfaced, and the next append is not swallowed", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship a CLI loop"]);
  const ledgerFile = join(repo, ".superloopy", "ledger.jsonl");
  await appendFile(ledgerFile, '{"at":"2026-10-14T00:00:00Z","kind":"goal_sta', "utf8"); // process died mid-append

  await nextLoop(repo);
  const trace = await traceLoop(repo);

  assert.deepEqual(trace.timeline.map((entry) => entry.kind), ["plan_created", "goal_started"]);
  const malformed = trace.warnings.filter((warning) => warning.kind === "ledger-malformed-lines");
  assert.equal(malformed.length, 1);
  assert.match(malformed[0].message, /line 2\)/);
});

test("a torn ledger line ends repeated-failing-proof streaks, since it may have been a plan reset", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship a CLI loop"]);
  await nextLoop(repo);
  await writeFile(join(repo, "failure.txt"), "expected 3, received 4\n", "utf8");
  await proveFailing(repo);
  await proveFailing(repo);
  await appendFile(join(repo, ".superloopy", "ledger.jsonl"), '{"at":"2026-10-14T00:00:00Z","kind":"plan_cre', "utf8");

  const afterTear = await proveFailing(repo);

  assert.deepEqual(afterTear.warnings, []);
  assert.deepEqual(streakWarnings((await traceLoop(repo)).warnings), []);
});
