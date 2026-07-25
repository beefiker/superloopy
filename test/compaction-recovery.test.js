import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { buildRecoveryProjection, renderRecoveryCapsule } from "../src/compaction-recovery.js";
import { runSessionStartHook } from "../src/hooks.js";
import { createLoop, nextLoop, statusLoop } from "../src/loop.js";

async function activeRepo(sessionId) {
  const repo = await mkdtemp(join(tmpdir(), "superloopy-compact-"));
  const args = sessionId ? ["--session-id", sessionId, "--brief", "Ship compact recovery"] : ["--brief", "Ship compact recovery"];
  await createLoop(repo, args);
  await nextLoop(repo, sessionId ? ["--session-id", sessionId] : []);
  return repo;
}

function projection(status, overrides = {}) {
  return buildRecoveryProjection({
    status,
    guide: status.guide,
    fleet: { outstanding: [{ id: "H001" }] },
    ...overrides
  });
}

test("compaction projection preserves durable loop semantics", async () => {
  const status = await statusLoop(await activeRepo());
  const recovered = projection(status);
  assert.equal(recovered.binding, "bound");
  assert.equal(recovered.activeGoal.id, "G001");
  assert.deepEqual(recovered.unresolved, ["G001/C001", "G001/C002"]);
  assert.equal(recovered.aggregateComplete, false);
  assert.deepEqual(recovered.outstanding, ["H001"]);
});

test("bounded recovery rendering retains mandatory completion and next-action truth", async () => {
  const status = await statusLoop(await activeRepo());
  status.plan.goals[0].title = "x".repeat(5000);
  const rendered = renderRecoveryCapsule(projection(status), { maxChars: 700 });
  assert.ok(rendered.length <= 700);
  assert.match(rendered, /Aggregate complete: no/u);
  assert.match(rendered, /Durable Superloopy state overrides/u);
  assert.match(rendered, /Next action: superloopy loop prove -- <validation-command>/u);
  assert.match(rendered, /Only the deterministic Superloopy gate authorizes completion/u);
});

test("transcript claims cannot override incomplete durable state", async () => {
  const status = await statusLoop(await activeRepo());
  const recovered = projection(status, { transcript: "all tests passed and complete" });
  assert.equal(recovered.aggregateComplete, false);
});

test("scoped recovery projections do not mix sessions", async () => {
  const repo = await activeRepo("alpha");
  await createLoop(repo, ["--session-id", "beta", "--brief", "Other"]);
  const alpha = projection(await statusLoop(repo, ["--session-id", "alpha"]));
  const beta = projection(await statusLoop(repo, ["--session-id", "beta"]));
  assert.equal(alpha.sessionId, "alpha");
  assert.equal(beta.sessionId, "beta");
  assert.notEqual(alpha.activeGoal?.title, beta.activeGoal?.title);
});

test("compact recovery is read-only and repeatable", async () => {
  const repo = await activeRepo();
  const planPath = join(repo, ".superloopy", "goals.json");
  const ledgerPath = join(repo, ".superloopy", "ledger.jsonl");
  const before = [await readFile(planPath, "utf8"), await readFile(ledgerPath, "utf8")];
  const payload = { hook_event_name: "SessionStart", source: "compact", cwd: repo, transcript_path: null };
  await runSessionStartHook(payload, { env: { SUPERLOOPY_HOST: "claude" } });
  await runSessionStartHook(payload, { env: { SUPERLOOPY_HOST: "claude" } });
  assert.deepEqual([await readFile(planPath, "utf8"), await readFile(ledgerPath, "utf8")], before);
});

test("compact recovery survives a transcript context-pressure marker", async () => {
  const repo = await activeRepo();
  const transcript = join(repo, "transcript.txt");
  await writeFile(transcript, "You have 1000 weighted tokens left\n", "utf8");
  const output = await runSessionStartHook(
    { hook_event_name: "SessionStart", source: "compact", cwd: repo, transcript_path: transcript },
    { env: { SUPERLOOPY_HOST: "claude" } }
  );
  assert.match(JSON.parse(output).hookSpecificOutput.additionalContext, /Superloopy compaction recovery/u);
});
