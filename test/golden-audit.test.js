import assert from "node:assert/strict";
import "./helpers/trust-isolate.js";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { auditLoop } from "../src/audit.js";
import { resolveEvidenceOutputPath, validateQualityGate, writeEvidenceOutputFile } from "../src/artifacts.js";
import { captureLoop } from "../src/capture.js";
import { createLoop, evidenceLoop, nextLoop } from "../src/loop.js";
import { isTrustedCommand, recordTrustedCommand, trustLoop } from "../src/plan-trust.js";

async function tempRepo() {
  return mkdtemp(join(tmpdir(), "superloopy-audit-"));
}

async function readJson(repo, ...parts) {
  return JSON.parse(await readFile(join(repo, ...parts), "utf8"));
}

async function writeArtifact(repo, name, body = "proof\n") {
  await mkdir(join(repo, ".superloopy", "evidence"), { recursive: true });
  await writeFile(join(repo, ".superloopy", "evidence", name), body, "utf8");
  return `.superloopy/evidence/${name}`;
}

test("auditLoop re-runs a command-backed pass criterion and records floor pass", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  await nextLoop(repo);
  await captureLoop(repo, ["--goal-id", "G001", "--criterion-id", "C001", "--", "node", "-e", "process.exit(0)"]);

  const result = await auditLoop(repo, []);
  assert.equal(result.audited, 1);
  assert.equal(result.criteria[0].floor, "pass");
  assert.ok(result.criteria[0].rerunArtifact.startsWith(".superloopy/evidence/audit/"));
  assert.equal(typeof result.criteria[0].rerunArtifactHash, "string");

  const state = await readJson(repo, ".superloopy", "audit-state.json");
  assert.equal(state.criteria[0].criterion, "G001/C001");
});

test("auditLoop skips an unchanged, already-passed criterion (cache hit)", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  await nextLoop(repo);
  await captureLoop(repo, ["--goal-id", "G001", "--criterion-id", "C001", "--", "node", "-e", "process.exit(0)"]);
  await auditLoop(repo, []);

  // Simulate an accepted verdict, then re-audit: the entry must be served from cache.
  const state = await readJson(repo, ".superloopy", "audit-state.json");
  state.criteria[0].verdict = "pass";
  await writeFile(join(repo, ".superloopy", "audit-state.json"), JSON.stringify(state), "utf8");

  const result = await auditLoop(repo, []);
  assert.equal(result.criteria[0].cached, true);
});

test("auditLoop marks a non-reproducing re-run inconclusive, never auto-fail", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  const artifact = await writeArtifact(repo, "flaky.txt");
  // Craft a passed criterion whose command now fails on re-run (flaky/non-idempotent).
  const plan = await readJson(repo, ".superloopy", "goals.json");
  Object.assign(plan.goals[0].criteria[0], { status: "pass", artifact, command: ["node", "-e", "process.exit(1)"], exitCode: 0 });
  await writeFile(join(repo, ".superloopy", "goals.json"), JSON.stringify(plan), "utf8");
  // Audit re-runs only trusted commands; this flaky command was captured locally in the real flow.
  await recordTrustedCommand(repo, ["node", "-e", "process.exit(1)"]);

  const result = await auditLoop(repo, ["--criterion-id", "C001"]);
  assert.equal(result.criteria[0].floor, "inconclusive");
  // The plan criterion is untouched — no silent flip to fail.
  const after = await readJson(repo, ".superloopy", "goals.json");
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
  const after = await readJson(repo, ".superloopy", "goals.json");
  assert.equal(after.goals[0].criteria[0].status, "fail");
});

test("default gate requires an audit section only when SUPERLOOPY_AUDIT=on", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  const proof = await writeArtifact(repo, "default-proof.txt");
  const verdict = await writeArtifact(repo, "default-verdict.json", '{"verdict":"pass"}\n');
  const bare = { status: "passed", artifacts: [proof] };
  const withAudit = { ...bare, audit: { recommendation: "APPROVE", verdicts: [verdict], blockers: [] } };

  // Off (default): the bare default gate validates unchanged.
  assert.equal(validateQualityGate(repo, bare).status, "passed");

  const previous = process.env.SUPERLOOPY_AUDIT;
  process.env.SUPERLOOPY_AUDIT = "on";
  try {
    assert.throws(() => validateQualityGate(repo, bare), /audit/i);
    assert.equal(validateQualityGate(repo, withAudit).audit.recommendation, "APPROVE");
  } finally {
    if (previous === undefined) delete process.env.SUPERLOOPY_AUDIT;
    else process.env.SUPERLOOPY_AUDIT = previous;
  }
});

test("SECURITY: audit refuses to execute an untrusted plan command (repo poisoning)", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  const artifact = await writeArtifact(repo, "poison.txt");
  const marker = join(repo, "pwned.txt");
  // A cloned repo ships a passed criterion whose command would run attacker code.
  const plan = await readJson(repo, ".superloopy", "goals.json");
  Object.assign(plan.goals[0].criteria[0], {
    status: "pass",
    artifact,
    command: ["node", "-e", `require("node:fs").writeFileSync(${JSON.stringify(marker)}, "pwned")`],
    exitCode: 0
  });
  await writeFile(join(repo, ".superloopy", "goals.json"), JSON.stringify(plan), "utf8");

  // NOTE: no recordTrustedCommand / loop trust — the command was never seen locally.
  const result = await auditLoop(repo, ["--criterion-id", "C001"]);

  assert.equal(result.criteria[0].rerunStatus, "untrusted-command");
  assert.equal(result.criteria[0].floor, "fail");
  await assert.rejects(readFile(marker, "utf8"), { code: "ENOENT" }, "attacker command must NOT have executed");

  // After explicit approval via `loop trust`, the same command is allowed to re-run.
  // (The failed floor above flipped the criterion off "pass"; restore it as a re-prove would.)
  await trustLoop(repo, []);
  const replan = await readJson(repo, ".superloopy", "goals.json");
  replan.goals[0].criteria[0].status = "pass";
  await writeFile(join(repo, ".superloopy", "goals.json"), JSON.stringify(replan), "utf8");
  const afterTrust = await auditLoop(repo, ["--criterion-id", "C001"]);
  assert.notEqual(afterTrust.criteria[0].rerunStatus, "untrusted-command");
  assert.equal(await readFile(marker, "utf8"), "pwned");
});

test("SECURITY: command trust does not carry into a replaced checkout at the same path", async () => {
  const root = await mkdtemp(join(tmpdir(), "superloopy-trust-reuse-"));
  const repo = join(root, "app");
  const command = ["npm", "test"];
  await mkdir(join(repo, ".git"), { recursive: true });

  await recordTrustedCommand(repo, command);
  assert.equal(await isTrustedCommand(repo, command), true);

  await rm(repo, { recursive: true, force: true });
  await mkdir(join(repo, ".git"), { recursive: true });

  assert.equal(await isTrustedCommand(repo, command), false);
});

test("SECURITY: evidence output path rejects a symlink escaping the evidence root", async () => {
  const { symlink, mkdir: mkdirp } = await import("node:fs/promises");
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  const evidenceRoot = join(repo, ".superloopy", "evidence");
  await mkdirp(join(evidenceRoot, "audit"), { recursive: true });
  const outsideTarget = join(repo, "outside-secret.txt");
  await writeFile(outsideTarget, "original\n", "utf8");
  // Malicious repo pre-creates the capture path as a symlink pointing outside evidence.
  const linkPath = join(evidenceRoot, "audit", "G001-C001-rerun.txt");
  try {
    await symlink(outsideTarget, linkPath);
  } catch {
    return; // symlink unsupported (e.g. unprivileged Windows) — skip
  }
  const { resolveEvidenceOutputPath } = await import("../src/artifacts.js");
  assert.throws(
    () => resolveEvidenceOutputPath(repo, ".superloopy/evidence/audit/G001-C001-rerun.txt", undefined),
    /symlink|resolve under/i
  );
  assert.equal(await readFile(outsideTarget, "utf8"), "original\n", "target outside evidence must be untouched");
});

test("SECURITY: evidence output write rejects a symlink swapped in after path resolution", async () => {
  const { symlink, mkdir: mkdirp } = await import("node:fs/promises");
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  const evidenceRoot = join(repo, ".superloopy", "evidence");
  await mkdirp(evidenceRoot, { recursive: true });
  const output = resolveEvidenceOutputPath(repo, ".superloopy/evidence/race.txt", undefined);
  const outsideTarget = join(repo, "outside-race.txt");
  await writeFile(outsideTarget, "original\n", "utf8");
  try {
    await symlink(outsideTarget, output.absolutePath);
  } catch {
    return;
  }

  await assert.rejects(
    writeEvidenceOutputFile(output, "replacement\n"),
    /symlink|ELOOP|not follow/i
  );
  assert.equal(await readFile(outsideTarget, "utf8"), "original\n");
});

test("SECURITY: evidence output path rejects a symlinked evidence root", async () => {
  const { symlink, mkdir: mkdirp } = await import("node:fs/promises");
  const repo = await tempRepo();
  await mkdirp(join(repo, ".superloopy"), { recursive: true });
  const outsideEvidence = await mkdtemp(join(tmpdir(), "superloopy-outside-evidence-"));
  try {
    await symlink(outsideEvidence, join(repo, ".superloopy", "evidence"), "dir");
  } catch {
    return; // symlink unsupported (e.g. unprivileged Windows) — skip
  }

  assert.throws(
    () => resolveEvidenceOutputPath(repo, ".superloopy/evidence/root-symlink.txt", undefined),
    /symlink/i
  );
});

test("evidence output path allows a symlinked checkout path", async () => {
  const { symlink, mkdir: mkdirp } = await import("node:fs/promises");
  const repo = await tempRepo();
  await mkdirp(join(repo, ".superloopy", "evidence"), { recursive: true });
  const link = `${repo}-link`;
  try {
    await symlink(repo, link, "dir");
  } catch {
    return; // symlink unsupported (e.g. unprivileged Windows) — skip
  }

  const output = resolveEvidenceOutputPath(link, ".superloopy/evidence/through-link.txt", undefined);
  assert.equal(output.absolutePath, join(link, ".superloopy", "evidence", "through-link.txt"));
});
