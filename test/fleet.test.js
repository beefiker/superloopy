import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { fleetLoop, handoffLoop, normalizeVerdict } from "../src/fleet.js";

async function tempRepo() {
  return mkdtemp(join(tmpdir(), "loopy-fleet-"));
}

async function writeEvidence(repo, name, content = "proof\n", sessionId = null) {
  const relativeDir = sessionId === null ? join(".loopy", "evidence") : join(".loopy", "sessions", sessionId, "evidence");
  const evidenceDir = join(repo, relativeDir);
  await mkdir(evidenceDir, { recursive: true });
  const path = join(evidenceDir, name);
  await writeFile(path, content, "utf8");
  return `${relativeDir.split("\\").join("/")}/${name}`;
}

test("normalizeVerdict maps the three worker vocabularies onto one enum", () => {
  assert.equal(normalizeVerdict("APPROVE"), "accept");
  assert.equal(normalizeVerdict("PASS"), "accept");
  assert.equal(normalizeVerdict("CHANGES_REQUESTED"), "reject");
  assert.equal(normalizeVerdict("FAIL"), "reject");
  assert.equal(normalizeVerdict("REJECT"), "reject");
  assert.equal(normalizeVerdict("NEEDS_CONTEXT"), "needs-context");
  assert.equal(normalizeVerdict(undefined), "pending");
  assert.equal(normalizeVerdict("anything-else"), "pending");
});

test("normalizeVerdict treats lifecycle verdicts safely (inconclusive is never accept)", () => {
  assert.equal(normalizeVerdict("inconclusive"), "needs-context");
  assert.equal(normalizeVerdict("TIMEOUT"), "needs-context");
  assert.equal(normalizeVerdict("ack_only"), "needs-context");
  assert.equal(normalizeVerdict("working"), "pending");
  assert.equal(normalizeVerdict("in_progress"), "pending");
  assert.equal(normalizeVerdict("running"), "pending");
});

test("fleetLoop drops an inconclusive worker from outstanding and never counts it as accept", async () => {
  const repo = await tempRepo();
  await handoffLoop(repo, ["--agent", "franky", "--assignment", "impl", "--verdict", "PASS", "--artifact", await writeEvidence(repo, "impl.txt")]);
  await handoffLoop(repo, ["--agent", "nami", "--assignment", "navigate", "--verdict", "inconclusive"]);

  const fleet = await fleetLoop(repo, []);
  assert.equal(fleet.summary.dispatched, 2);
  assert.equal(fleet.summary.byVerdict.accept, 1);
  assert.equal(fleet.summary.byVerdict["needs-context"], 1);
  assert.equal(fleet.summary.byVerdict.pending, 0);
  assert.deepEqual(fleet.outstanding.map((item) => item.agent), []);
  assert.deepEqual(fleet.attention.map((item) => item.agent), ["nami"]);
});

test("handoffLoop records a worker handoff with a normalized verdict", async () => {
  const repo = await tempRepo();
  const artifact = await writeEvidence(repo, "done.txt");
  const result = await handoffLoop(repo, ["--agent", "franky", "--assignment", "G001/C001 implement", "--status", "done", "--verdict", "DONE", "--artifact", artifact]);
  assert.equal(result.handoff.id, "H001");
  assert.equal(result.handoff.agent, "franky");
  assert.equal(result.handoff.normalizedVerdict, "accept");
  assert.equal(result.handoff.artifact, artifact);
  assert.equal(result.crewLine.speaker, "Franky");
  assert.equal(result.handoff.crewLine.line, "Parts fit. The build holds.");
  const state = JSON.parse(await readFile(join(repo, ".loopy", "handoffs.json"), "utf8"));
  assert.equal(state.handoffs.length, 1);
  assert.equal(state.handoffs[0].crewLine, undefined);
});

test("handoffLoop rejects accepted verdicts without evidence artifacts", async () => {
  const repo = await tempRepo();
  await assert.rejects(
    handoffLoop(repo, ["--agent", "franky", "--assignment", "impl", "--verdict", "PASS"]),
    /Accepted handoffs require/
  );
});

test("fleetLoop reconciles dispatched workers and lists outstanding ones", async () => {
  const repo = await tempRepo();
  await handoffLoop(repo, ["--agent", "franky", "--assignment", "impl", "--verdict", "PASS", "--artifact", await writeEvidence(repo, "impl.txt")]);
  await handoffLoop(repo, ["--agent", "zoro", "--assignment", "review", "--verdict", "CHANGES_REQUESTED"]);
  await handoffLoop(repo, ["--agent", "usopp", "--assignment", "qa"]);

  const fleet = await fleetLoop(repo, []);
  assert.equal(fleet.summary.dispatched, 3);
  assert.equal(fleet.summary.byVerdict.accept, 1);
  assert.equal(fleet.summary.byVerdict.reject, 1);
  assert.equal(fleet.summary.byVerdict.pending, 1);
  assert.equal(fleet.handoffs.find((item) => item.agent === "franky").crewLine.speaker, "Franky");
  assert.equal(fleet.attention[0].crewLine.speaker, "Zoro");
  assert.deepEqual(fleet.outstanding.map((item) => item.agent), ["usopp"]);
  assert.deepEqual(fleet.attention.map((item) => item.agent), ["zoro"]);
});

test("fleetLoop decorates handoffs in the scoped brief language", async () => {
  const repo = await tempRepo();
  await mkdir(join(repo, ".loopy", "sessions", "ko-user"), { recursive: true });
  await writeFile(join(repo, ".loopy", "sessions", "ko-user", "brief.md"), "사용자는 한국어로 작업을 요청했다.\n", "utf8");
  await handoffLoop(repo, ["--session-id", "ko-user", "--agent", "robin", "--assignment", "audit", "--verdict", "PASS", "--artifact", await writeEvidence(repo, "audit.txt", "proof\n", "ko-user")]);

  const fleet = await fleetLoop(repo, ["--session-id", "ko-user"]);

  assert.equal(fleet.handoffs[0].crewLine.speaker, "로빈");
  assert.equal(fleet.handoffs[0].crewLine.language, "ko");
  assert.equal(fleet.handoffs[0].crewLine.line, "기록 확인. 증거와 결론이 일치한다.");
});

test("handoffLoop updates an existing handoff by id", async () => {
  const repo = await tempRepo();
  await handoffLoop(repo, ["--agent", "usopp", "--assignment", "qa"]);
  const updated = await handoffLoop(repo, ["--id", "H001", "--agent", "usopp", "--assignment", "qa", "--status", "done", "--verdict", "PASS", "--artifact", await writeEvidence(repo, "qa.txt")]);
  assert.equal(updated.handoff.normalizedVerdict, "accept");
  const fleet = await fleetLoop(repo, []);
  assert.equal(fleet.summary.dispatched, 1);
  assert.equal(fleet.summary.byVerdict.accept, 1);
  assert.equal(fleet.outstanding.length, 0);
});

test("handoffLoop --id update merges: omitted flags are preserved, not wiped", async () => {
  const repo = await tempRepo();
  await handoffLoop(repo, ["--agent", "usopp", "--assignment", "qa run", "--status", "dispatched"]);
  // Update with ONLY --status and --verdict; agent and assignment must survive.
  const artifact = await writeEvidence(repo, "qa.txt");
  const updated = await handoffLoop(repo, ["--id", "H001", "--status", "done", "--verdict", "PASS", "--artifact", artifact]);
  assert.equal(updated.handoff.agent, "usopp");
  assert.equal(updated.handoff.assignment, "qa run");
  assert.equal(updated.handoff.status, "done");
  assert.equal(updated.handoff.normalizedVerdict, "accept");
  assert.equal(updated.handoff.artifact, artifact);
  const statusOnly = await handoffLoop(repo, ["--id", "H001", "--status", "archived"]);
  assert.equal(statusOnly.handoff.artifact, artifact);
});

test("handoffLoop --id update ignores an empty --agent and preserves identity", async () => {
  const repo = await tempRepo();
  await handoffLoop(repo, ["--agent", "franky", "--assignment", "build"]);
  const updated = await handoffLoop(repo, ["--id", "H001", "--agent", "", "--status", "done"]);
  assert.equal(updated.handoff.agent, "franky");
  assert.equal(updated.handoff.status, "done");
});

test("fleetLoop warns when outstanding handoffs exceed LOOPY_MAX_PARALLEL", async () => {
  const repo = await tempRepo();
  await handoffLoop(repo, ["--agent", "franky", "--assignment", "a"]);
  await handoffLoop(repo, ["--agent", "zoro", "--assignment", "b"]);
  const prev = process.env.LOOPY_MAX_PARALLEL;
  process.env.LOOPY_MAX_PARALLEL = "1";
  try {
    const fleet = await fleetLoop(repo, []);
    assert.match(fleet.warning, /exceed LOOPY_MAX_PARALLEL=1/);
  } finally {
    if (prev === undefined) delete process.env.LOOPY_MAX_PARALLEL;
    else process.env.LOOPY_MAX_PARALLEL = prev;
  }
});
