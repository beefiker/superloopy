import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import { createLoop } from "../src/loop.js";
import { cloneJson, matrixStyleQualityGate, runCli, tempRepo, writeEvidence, writeGenuineAuditVerdict, writeMatrixGateArtifacts } from "./golden-helpers.js";

test("golden: @goal delimiters split executable stories and keep literals safe", async () => {
  const repo = await tempRepo();
  const result = runCli([
    "loop",
    "create",
    "--brief",
    [
      "Shared constraints stay in the brief, not as their own goal.",
      "",
      "@goal: Parse intake",
      "Parse CSV input.",
      "@goalish is literal text.",
      "  @goal: indented literal text",
      "",
      "@goal Export audit",
      "Export a reviewer-ready audit report."
    ].join("\n"),
    "--json"
  ], { cwd: repo });

  assert.equal(result.status, 0, result.stderr);
  const goals = JSON.parse(result.stdout).plan.goals;
  assert.equal(goals.length, 2);
  assert.equal(goals[0].title, "Parse intake");
  assert.match(goals[0].objective, /@goalish is literal text/);
  assert.equal(goals[1].title, "Export audit");
});

test("golden: @goal delimiters reject empty executable blocks", async () => {
  const repo = await tempRepo();
  const result = runCli(["loop", "create", "--brief", "@goal:\n\n", "--json"], { cwd: repo });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /empty @goal/i);
});

test("golden: checkpoint accepts matrix quality gate", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  const c1 = await writeEvidence(repo, "c1.txt");
  const c2 = await writeEvidence(repo, "c2.txt");
  runCli(["loop", "evidence", "--goal-id", "G001", "--criterion-id", "C001", "--status", "pass", "--artifact", c1], {
    cwd: repo
  });
  runCli(["loop", "evidence", "--goal-id", "G001", "--criterion-id", "C002", "--status", "pass", "--artifact", c2], {
    cwd: repo
  });
  const gatePath = join(repo, ".loopy", "evidence", "matrix-gate.json");
  const gate = matrixStyleQualityGate(await writeMatrixGateArtifacts(repo));
  gate.executorQa.surfaceEvidence[0].surface = ["t", "m", "u", "x"].join("");
  // Completion-time provenance re-derives every cited audit verdict, so the gate must
  // carry a genuine verdict bound to a real criterion's re-run, not a dummy.
  gate.audit.verdicts = [await writeGenuineAuditVerdict(repo, { criterion: "G001/C001", artifact: c1 })];
  await writeFile(gatePath, JSON.stringify(gate), "utf8");

  const result = runCli([
    "loop",
    "checkpoint",
    "--goal-id",
    "G001",
    "--status",
    "complete",
    "--evidence",
    "done",
    "--quality-gate",
    ".loopy/evidence/matrix-gate.json",
    "--json"
  ], { cwd: repo });

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.plan.aggregateCompletion.qualityGate.architectReview.recommendation, "APPROVE");
  assert.equal(parsed.plan.aggregateCompletion.qualityGate.executorQa.contractCoverage[0].status, "covered");
});

test("golden: matrix quality gate rejects inline-only executor QA proof", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  const c1 = await writeEvidence(repo, "c1.txt");
  const c2 = await writeEvidence(repo, "c2.txt");
  runCli(["loop", "evidence", "--goal-id", "G001", "--criterion-id", "C001", "--status", "pass", "--artifact", c1], {
    cwd: repo
  });
  runCli(["loop", "evidence", "--goal-id", "G001", "--criterion-id", "C002", "--status", "pass", "--artifact", c2], {
    cwd: repo
  });
  const gate = matrixStyleQualityGate(await writeMatrixGateArtifacts(repo));
  gate.executorQa.artifactRefs[0] = {
    id: "cli-run",
    kind: "cli-transcript",
    description: "Inline-only proof is not enough.",
    inlineEvidence: "The CLI allegedly passed."
  };
  await writeFile(join(repo, ".loopy", "evidence", "inline-only-gate.json"), JSON.stringify(gate), "utf8");

  const result = runCli([
    "loop",
    "checkpoint",
    "--goal-id",
    "G001",
    "--status",
    "complete",
    "--evidence",
    "done",
    "--quality-gate",
    ".loopy/evidence/inline-only-gate.json"
  ], { cwd: repo });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /inlineEvidence|artifactRefs/);
});

test("golden: matrix quality gate rejects not-applicable adversarial cases", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  const c1 = await writeEvidence(repo, "c1.txt");
  const c2 = await writeEvidence(repo, "c2.txt");
  runCli(["loop", "evidence", "--goal-id", "G001", "--criterion-id", "C001", "--status", "pass", "--artifact", c1], {
    cwd: repo
  });
  runCli(["loop", "evidence", "--goal-id", "G001", "--criterion-id", "C002", "--status", "pass", "--artifact", c2], {
    cwd: repo
  });
  const gate = cloneJson(matrixStyleQualityGate(await writeMatrixGateArtifacts(repo)));
  gate.executorQa.adversarialCases[0].status = "not_applicable";
  await writeFile(join(repo, ".loopy", "evidence", "na-adversarial-gate.json"), JSON.stringify(gate), "utf8");

  const result = runCli([
    "loop",
    "checkpoint",
    "--goal-id",
    "G001",
    "--status",
    "complete",
    "--evidence",
    "done",
    "--quality-gate",
    ".loopy/evidence/na-adversarial-gate.json"
  ], { cwd: repo });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /adversarialCases|not_applicable/);
});
