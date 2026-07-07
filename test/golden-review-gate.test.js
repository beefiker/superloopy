import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import { enforceAuditProvenance } from "../src/audit-gate-verify.js";
import { createLoop } from "../src/loop.js";
import { reviewStyleQualityGate, runCli, tempRepo, writeEvidence, writeGenuineAuditVerdict, writeQualityGateArtifacts } from "./golden-helpers.js";

test("golden: checkpoint accepts Superloopy review quality gate", async () => {
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
  const gatePath = join(repo, ".superloopy", "evidence", "review-gate.json");
  const gate = reviewStyleQualityGate(await writeQualityGateArtifacts(repo));
  gate.manualQa.surfaceEvidence[0].surface = ["t", "m", "u", "x"].join("");
  // Completion-time provenance now re-derives every cited audit verdict, so the gate
  // must carry a genuine verdict bound to a real criterion's re-run, not a dummy.
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
    ".superloopy/evidence/review-gate.json",
    "--json"
  ], { cwd: repo });

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.plan.aggregateCompletion.qualityGate.codeReview.recommendation, "APPROVE");
  assert.equal(parsed.plan.aggregateCompletion.qualityGate.manualQa.surfaceEvidence[0].surface, ["t", "m", "u", "x"].join(""));
});

test("golden: completion rejects a hand-written audit verdict not bound to a re-derived re-run", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  const c1 = await writeEvidence(repo, "c1.txt");
  const c2 = await writeEvidence(repo, "c2.txt");
  runCli(["loop", "evidence", "--goal-id", "G001", "--criterion-id", "C001", "--status", "pass", "--artifact", c1], { cwd: repo });
  runCli(["loop", "evidence", "--goal-id", "G001", "--criterion-id", "C002", "--status", "pass", "--artifact", c2], { cwd: repo });
  // Default helper cites a dummy {"verdict":"pass"} file — structurally resolvable, but
  // not a genuine hash-bound verdict. Completion-time provenance must reject it.
  const gate = reviewStyleQualityGate(await writeQualityGateArtifacts(repo));
  await writeFile(join(repo, ".superloopy", "evidence", "dummy-verdict-gate.json"), JSON.stringify(gate), "utf8");

  const result = runCli([
    "loop", "checkpoint", "--goal-id", "G001", "--status", "complete", "--evidence", "done",
    "--quality-gate", ".superloopy/evidence/dummy-verdict-gate.json"
  ], { cwd: repo });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /verdict|audit/i);
  const plan = JSON.parse(await readFile(join(repo, ".superloopy", "goals.json"), "utf8"));
  assert.equal(plan.aggregateCompletion, null); // never force-completed
});

test("audit provenance direct: rejects hand-written verdict artifacts", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  const c1 = await writeEvidence(repo, "c1.txt");
  const c2 = await writeEvidence(repo, "c2.txt");
  runCli(["loop", "evidence", "--goal-id", "G001", "--criterion-id", "C001", "--status", "pass", "--artifact", c1], { cwd: repo });
  runCli(["loop", "evidence", "--goal-id", "G001", "--criterion-id", "C002", "--status", "pass", "--artifact", c2], { cwd: repo });
  const gate = reviewStyleQualityGate(await writeQualityGateArtifacts(repo));

  await assert.rejects(
    enforceAuditProvenance(repo, undefined, gate.audit),
    /Audit verdict|verdict|audit/i
  );
});

test("audit provenance direct: rejects any passed command criterion whose floor no longer reproduces", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  const c1 = await writeEvidence(repo, "c1.txt");
  const c2 = await writeEvidence(repo, "c2.txt");
  runCli([
    "loop",
    "evidence",
    "--goal-id",
    "G001",
    "--criterion-id",
    "C001",
    "--status",
    "pass",
    "--artifact",
    c1,
    "--command",
    "[\"node\",\"-e\",\"process.exit(1)\"]"
  ], { cwd: repo });
  runCli(["loop", "evidence", "--goal-id", "G001", "--criterion-id", "C002", "--status", "pass", "--artifact", c2], { cwd: repo });

  await assert.rejects(
    enforceAuditProvenance(repo, undefined, undefined),
    /G001\/C001|passing floor/
  );
});

test("golden: completion re-derives EVERY passed criterion, not just cited ones (uncited failing command criterion is caught)", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  const c1 = await writeEvidence(repo, "c1.txt");
  const c2 = await writeEvidence(repo, "c2.txt");
  runCli(["loop", "evidence", "--goal-id", "G001", "--criterion-id", "C001", "--status", "pass", "--artifact", c1], { cwd: repo });
  runCli(["loop", "evidence", "--goal-id", "G001", "--criterion-id", "C002", "--status", "pass", "--artifact", c2], { cwd: repo });
  // C002 is command-backed but its command fails on re-run; the worker marked it pass
  // and cites a genuine verdict only for the OTHER (manual) criterion C001.
  const goalsPath = join(repo, ".superloopy", "goals.json");
  const plan = JSON.parse(await readFile(goalsPath, "utf8"));
  Object.assign(plan.goals[0].criteria[1], { command: ["node", "-e", "process.exit(1)"] });
  await writeFile(goalsPath, JSON.stringify(plan), "utf8");
  const gate = reviewStyleQualityGate(await writeQualityGateArtifacts(repo));
  gate.manualQa.surfaceEvidence[0].surface = ["t", "m", "u", "x"].join("");
  gate.audit.verdicts = [await writeGenuineAuditVerdict(repo, { criterion: "G001/C001", artifact: c1 })];
  await writeFile(join(repo, ".superloopy", "evidence", "partial-gate.json"), JSON.stringify(gate), "utf8");

  const result = runCli([
    "loop", "checkpoint", "--goal-id", "G001", "--status", "complete", "--evidence", "done",
    "--quality-gate", ".superloopy/evidence/partial-gate.json"
  ], { cwd: repo });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /C002|passing floor/i);
  const after = JSON.parse(await readFile(goalsPath, "utf8"));
  assert.equal(after.aggregateCompletion, null); // never force-completed
});

test("golden: review quality gate rejects weak manual QA evidence", async () => {
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
  const paths = await writeQualityGateArtifacts(repo);
  const gate = reviewStyleQualityGate(paths, {
    manualQa: {
      ...reviewStyleQualityGate(paths).manualQa,
      adversarialCases: [
        {
          id: "adv-skipped",
          criterionRef: "C002",
          scenario: "skipped adversarial probe",
          expectedBehavior: "must fail",
          verdict: "not_applicable",
          artifactRefs: ["artifact-malformed-reject"]
        }
      ]
    }
  });
  await writeFile(join(repo, ".superloopy", "evidence", "weak-gate.json"), JSON.stringify(gate), "utf8");

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
    ".superloopy/evidence/weak-gate.json"
  ], { cwd: repo });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /not_applicable|adversarialCases/);
});

test("golden: review quality gate now requires an audit section", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  const c1 = await writeEvidence(repo, "c1.txt");
  const c2 = await writeEvidence(repo, "c2.txt");
  runCli(["loop", "evidence", "--goal-id", "G001", "--criterion-id", "C001", "--status", "pass", "--artifact", c1], { cwd: repo });
  runCli(["loop", "evidence", "--goal-id", "G001", "--criterion-id", "C002", "--status", "pass", "--artifact", c2], { cwd: repo });
  const gate = reviewStyleQualityGate(await writeQualityGateArtifacts(repo));
  delete gate.audit; // a pre-audit review gate is still detected, but must now fail validation
  await writeFile(join(repo, ".superloopy", "evidence", "no-audit-gate.json"), JSON.stringify(gate), "utf8");

  const result = runCli([
    "loop", "checkpoint", "--goal-id", "G001", "--status", "complete", "--evidence", "done",
    "--quality-gate", ".superloopy/evidence/no-audit-gate.json"
  ], { cwd: repo });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /audit/i);
});
