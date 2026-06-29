import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { auditLoop } from "../src/audit.js";
import { validateQualityGate } from "../src/artifacts.js";
import { captureLoop } from "../src/capture.js";
import { createLoop, evidenceLoop, nextLoop } from "../src/loop.js";

async function tempRepo() {
  return mkdtemp(join(tmpdir(), "loopy-audit-"));
}

async function readJson(repo, ...parts) {
  return JSON.parse(await readFile(join(repo, ...parts), "utf8"));
}

async function writeArtifact(repo, name, body = "proof\n") {
  await mkdir(join(repo, ".loopy", "evidence"), { recursive: true });
  await writeFile(join(repo, ".loopy", "evidence", name), body, "utf8");
  return `.loopy/evidence/${name}`;
}

test("auditLoop re-runs a command-backed pass criterion and records floor pass", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  await nextLoop(repo);
  await captureLoop(repo, ["--goal-id", "G001", "--criterion-id", "C001", "--", "node", "-e", "process.exit(0)"]);

  const result = await auditLoop(repo, []);
  assert.equal(result.audited, 1);
  assert.equal(result.criteria[0].floor, "pass");
  assert.ok(result.criteria[0].rerunArtifact.startsWith(".loopy/evidence/audit/"));
  assert.equal(typeof result.criteria[0].rerunArtifactHash, "string");

  const state = await readJson(repo, ".loopy", "audit-state.json");
  assert.equal(state.criteria[0].criterion, "G001/C001");
});

test("auditLoop skips an unchanged, already-passed criterion (cache hit)", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  await nextLoop(repo);
  await captureLoop(repo, ["--goal-id", "G001", "--criterion-id", "C001", "--", "node", "-e", "process.exit(0)"]);
  await auditLoop(repo, []);

  // Simulate an accepted verdict, then re-audit: the entry must be served from cache.
  const state = await readJson(repo, ".loopy", "audit-state.json");
  state.criteria[0].verdict = "pass";
  await writeFile(join(repo, ".loopy", "audit-state.json"), JSON.stringify(state), "utf8");

  const result = await auditLoop(repo, []);
  assert.equal(result.criteria[0].cached, true);
});

test("auditLoop marks a non-reproducing re-run inconclusive, never auto-fail", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  const artifact = await writeArtifact(repo, "flaky.txt");
  // Craft a passed criterion whose command now fails on re-run (flaky/non-idempotent).
  const plan = await readJson(repo, ".loopy", "goals.json");
  Object.assign(plan.goals[0].criteria[0], { status: "pass", artifact, command: ["node", "-e", "process.exit(1)"], exitCode: 0 });
  await writeFile(join(repo, ".loopy", "goals.json"), JSON.stringify(plan), "utf8");

  const result = await auditLoop(repo, ["--criterion-id", "C001"]);
  assert.equal(result.criteria[0].floor, "inconclusive");
  // The plan criterion is untouched — no silent flip to fail.
  const after = await readJson(repo, ".loopy", "goals.json");
  assert.equal(after.goals[0].criteria[0].status, "pass");
});

test("auditLoop re-validates a manual criterion and fails when the artifact is gone", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  const artifact = await writeArtifact(repo, "manual.txt");
  await nextLoop(repo);
  await evidenceLoop(repo, ["--goal-id", "G001", "--criterion-id", "C001", "--status", "pass", "--artifact", artifact]);

  const pass = await auditLoop(repo, ["--criterion-id", "C001"]);
  assert.equal(pass.criteria[0].floor, "pass");
  assert.equal(pass.criteria[0].command, null);

  await rm(join(repo, artifact));
  const gone = await auditLoop(repo, ["--criterion-id", "C001"]);
  assert.equal(gone.criteria[0].floor, "fail");
  // A deterministic floor failure flips the criterion off pass so the engine re-drives it.
  const after = await readJson(repo, ".loopy", "goals.json");
  assert.equal(after.goals[0].criteria[0].status, "fail");
});

test("default gate requires an audit section only when LOOPY_AUDIT=on", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  const proof = await writeArtifact(repo, "default-proof.txt");
  const verdict = await writeArtifact(repo, "default-verdict.json", '{"verdict":"pass"}\n');
  const bare = { status: "passed", artifacts: [proof] };
  const withAudit = { ...bare, audit: { recommendation: "APPROVE", verdicts: [verdict], blockers: [] } };

  // Off (default): the bare default gate validates unchanged.
  assert.equal(validateQualityGate(repo, bare).status, "passed");

  const previous = process.env.LOOPY_AUDIT;
  process.env.LOOPY_AUDIT = "on";
  try {
    assert.throws(() => validateQualityGate(repo, bare), /audit/i);
    assert.equal(validateQualityGate(repo, withAudit).audit.recommendation, "APPROVE");
  } finally {
    if (previous === undefined) delete process.env.LOOPY_AUDIT;
    else process.env.LOOPY_AUDIT = previous;
  }
});
