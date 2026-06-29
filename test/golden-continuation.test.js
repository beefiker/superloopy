import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { decideContinuation, evaluateProgress, loopControlLimits, readLoopControl } from "../src/continuation.js";
import { createLoop, evidenceLoop, nextLoop } from "../src/loop.js";
import { appendLedger, loopControlPath, readLedger, scopeFromSessionId } from "../src/store.js";

async function tempRepo() {
  return mkdtemp(join(tmpdir(), "loopy-engine-"));
}

// Real deps wired without depending on hooks.js internals.
function deps(env) {
  return {
    statusForPayload: (payload) => {
      const argv = payload.session_id ? ["--session-id", payload.session_id] : [];
      return import("../src/loop.js").then((m) => m.statusLoop(payload.cwd, argv));
    },
    guideForPayload: (_payload, plan) => ({ plan }),
    renderContinuationDirective: () => "Loopy continuation",
    scopeFromPayload: (payload) => scopeFromSessionId(payload.session_id),
    appendLedger,
    contextPressureMarkers: ["context compacted"],
    env
  };
}

const stop = (repo, extra = {}) => ({ hook_event_name: "Stop", cwd: repo, ...extra });

test("engine blocks with an unresolved plan and records an iteration", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);

  const out = await decideContinuation(stop(repo, { stop_hook_active: true }), deps({}));
  assert.equal(JSON.parse(out).decision, "block");
  assert.match(JSON.parse(out).reason, /Loop iteration: 1 of 50/);

  const control = await readLoopControl(repo);
  assert.equal(control.iteration, 1);
  assert.equal(control.status, "active");
  const ledger = await readLedger(repo);
  assert.ok(ledger.some((entry) => entry.kind === "loop_iteration" && entry.iteration === 1));
});

test("max-iterations cap marks blocked and never completes", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  const d = deps({ LOOPY_MAX_ITERATIONS: "1" });

  assert.equal(JSON.parse(await decideContinuation(stop(repo), d)).decision, "block"); // iteration 1
  assert.equal(await decideContinuation(stop(repo), d), ""); // iteration 2 > 1 -> blocked

  const control = await readLoopControl(repo);
  assert.equal(control.status, "blocked");
  assert.equal(control.blockedReason, "max-iterations");
  const plan = JSON.parse(await readFile(join(repo, ".loopy", "goals.json"), "utf8"));
  assert.equal(plan.aggregateCompletion, null);
});

test("no-progress guard blocks a stalled loop using a high-water mark", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  const d = deps({ LOOPY_MAX_STALLED: "2" });

  assert.equal(JSON.parse(await decideContinuation(stop(repo), d)).decision, "block"); // iter1 advance (highWater 0)
  assert.equal(JSON.parse(await decideContinuation(stop(repo), d)).decision, "block"); // iter2 stalled 1
  assert.equal(await decideContinuation(stop(repo), d), ""); // iter3 stalled 2 -> blocked

  const control = await readLoopControl(repo);
  assert.equal(control.blockedReason, "no-progress");
});

test("a corrupt plan surfaces as a block, never a silent stop (fail-closed)", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  await writeFile(join(repo, ".loopy", "goals.json"), "{ not valid json", "utf8");
  const out = await decideContinuation(stop(repo), deps({}));
  assert.notEqual(out, "");
  assert.equal(JSON.parse(out).decision, "block");
  assert.match(JSON.parse(out).reason, /could not read the plan|goals\.json/i);
});

test("no plan at all still allows the stop (returns empty)", async () => {
  const repo = await tempRepo(); // no createLoop -> no goals.json
  assert.equal(await decideContinuation(stop(repo), deps({})), "");
});

test("uncapped iterations + an absurd max-stalled still hit the no-progress floor (cannot disable both backstops)", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  // The footgun combo: hard cap off, stall tolerance set absurdly high.
  const d = deps({ LOOPY_MAX_ITERATIONS: "0", LOOPY_MAX_STALLED: "2000000000" });

  let blocked = false;
  for (let i = 0; i < 60 && !blocked; i += 1) {
    if ((await decideContinuation(stop(repo), d)) === "") blocked = true;
  }
  assert.ok(blocked, "the no-progress guard must engage within the ceiling even with an unlimited cap");
  const control = await readLoopControl(repo);
  assert.equal(control.status, "blocked");
  assert.equal(control.blockedReason, "no-progress");
  const plan = JSON.parse(await readFile(join(repo, ".loopy", "goals.json"), "utf8"));
  assert.equal(plan.aggregateCompletion, null);
});

test("recorded proof resets the stall counter and keeps the loop going", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  await nextLoop(repo);
  const d = deps({ LOOPY_MAX_STALLED: "2" });

  await decideContinuation(stop(repo), d); // iter1
  await decideContinuation(stop(repo), d); // iter2 stalled 1
  // Record real artifact-backed proof so the high-water mark advances.
  await writeFile(join(repo, ".loopy", "evidence", "G001-C001.txt"), "proof\n", "utf8");
  await evidenceLoop(repo, ["--goal-id", "G001", "--criterion-id", "C001", "--status", "pass", "--artifact", ".loopy/evidence/G001-C001.txt"]);

  const out = await decideContinuation(stop(repo), d); // progress -> stalled resets, still blocks (work remains)
  assert.equal(JSON.parse(out).decision, "block");
  assert.equal((await readLoopControl(repo)).stalledCount, 0);
});

test("context-pressure pauses without incrementing or clearing", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  await decideContinuation(stop(repo), deps({})); // iteration 1
  const transcript = join(repo, "transcript.txt");
  await writeFile(transcript, "... context compacted ...\n", "utf8");

  const out = await decideContinuation(stop(repo, { transcript_path: transcript }), deps({}));
  assert.equal(out, "");
  assert.equal((await readLoopControl(repo)).iteration, 1); // unchanged
});

test("a quota limit pauses the loop (resumable) without incrementing, recorded once", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  await decideContinuation(stop(repo), deps({})); // iteration 1
  const transcript = join(repo, "transcript.txt");
  await writeFile(transcript, "... rate limit exceeded ...\n", "utf8");

  assert.equal(await decideContinuation(stop(repo, { transcript_path: transcript }), deps({})), "");
  assert.equal(await decideContinuation(stop(repo, { transcript_path: transcript }), deps({})), "");

  const control = await readLoopControl(repo);
  assert.equal(control.iteration, 1); // counter not burned by the quota stall
  assert.equal(control.status, "paused");
  assert.equal(control.pausedReason, "quota");
  const paused = (await readLedger(repo)).filter((entry) => entry.kind === "loop_paused");
  assert.equal(paused.length, 1); // idempotent across repeated quota-limited stops
});

test("LOOPY_QUOTA_MARKERS extends the quota marker set", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  const transcript = join(repo, "transcript.txt");
  await writeFile(transcript, "... please retry after your weekly cap ...\n", "utf8");

  const out = await decideContinuation(stop(repo, { transcript_path: transcript }), deps({ LOOPY_QUOTA_MARKERS: "weekly cap, something-else" }));
  assert.equal(out, "");
  assert.equal((await readLoopControl(repo)).status, "paused");
});

test("the loop resumes after a quota pause once the marker clears", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  await decideContinuation(stop(repo), deps({})); // iteration 1
  const transcript = join(repo, "transcript.txt");
  await writeFile(transcript, "... quota exceeded ...\n", "utf8");
  await decideContinuation(stop(repo, { transcript_path: transcript }), deps({})); // -> paused
  assert.equal((await readLoopControl(repo)).status, "paused");

  await writeFile(transcript, "... back to productive work ...\n", "utf8"); // marker gone
  const out = await decideContinuation(stop(repo, { transcript_path: transcript }), deps({}));

  assert.equal(JSON.parse(out).decision, "block"); // continuing again
  const control = await readLoopControl(repo);
  assert.equal(control.status, "active");
  assert.equal(control.pausedReason, null);
  assert.ok((await readLedger(repo)).some((entry) => entry.kind === "loop_resumed"));
});

test("aggregate completion stops the loop and clears control state", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  await decideContinuation(stop(repo), deps({})); // create control file
  assert.ok(existsSync(loopControlPath(repo)));

  // Force aggregate completion directly on the plan.
  const planPath = join(repo, ".loopy", "goals.json");
  const plan = JSON.parse(await readFile(planPath, "utf8"));
  plan.aggregateCompletion = { status: "complete", completedAt: "2026-06-24T00:00:00.000Z" };
  await writeFile(planPath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");

  assert.equal(await decideContinuation(stop(repo), deps({})), "");
  assert.equal(existsSync(loopControlPath(repo)), false);
});

test("scoped sessions keep their own loop-control state", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship", "--session-id", "sess.1"]);
  await decideContinuation(stop(repo, { session_id: "sess.1" }), deps({}));

  assert.ok(existsSync(join(repo, ".loopy", "sessions", "sess.1", "loop-control.json")));
  assert.equal(existsSync(join(repo, ".loopy", "loop-control.json")), false);
});

test("LOOPY_CONTINUATION=off restores the legacy single-continuation brake", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  const d = deps({ LOOPY_CONTINUATION: "off" });

  assert.equal(await decideContinuation(stop(repo, { stop_hook_active: true }), d), ""); // brake honored
  assert.equal(JSON.parse(await decideContinuation(stop(repo, { stop_hook_active: false }), d)).decision, "block"); // one continuation
  assert.equal(existsSync(loopControlPath(repo)), false); // legacy path never writes control state
});

test("evaluateProgress only advances above the high-water mark", () => {
  const first = evaluateProgress({ highWater: -1, stalledCount: 0 }, { criteria: { pass: 0 }, goals: { complete: 0 } });
  assert.deepEqual(first, { advanced: true, highWater: 0, stalledCount: 0 });
  const stalled = evaluateProgress({ highWater: 2, stalledCount: 0 }, { criteria: { pass: 1 }, goals: { complete: 1 } });
  assert.equal(stalled.advanced, false); // regress-then-recover back to 2 does not exceed high-water
  assert.equal(stalled.stalledCount, 1);
  const advanced = evaluateProgress({ highWater: 2, stalledCount: 5 }, { criteria: { pass: 2 }, goals: { complete: 1 } });
  assert.deepEqual(advanced, { advanced: true, highWater: 3, stalledCount: 0 });
});

test("evaluateProgress counts the monotonic audited term as progress", () => {
  // High-water is 2; a flip dropped the live pass/complete sum to 1, so without
  // the audited term the re-prove cycle reads as a stall...
  assert.equal(evaluateProgress({ highWater: 2, stalledCount: 1 }, { criteria: { pass: 1 }, goals: { complete: 0 } }, 0).advanced, false);
  // ...but a fresh accepted audit (monotonic) pushes the score past the high-water.
  const advanced = evaluateProgress({ highWater: 2, stalledCount: 1 }, { criteria: { pass: 1 }, goals: { complete: 0 } }, 2);
  assert.equal(advanced.advanced, true);
  assert.equal(advanced.stalledCount, 0);
});

test("decideContinuation stops re-driving when only blocked criteria remain", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  const planPath = join(repo, ".loopy", "goals.json");
  const plan = JSON.parse(await readFile(planPath, "utf8"));
  plan.goals[0].criteria[0].status = "blocked";
  plan.goals[0].criteria[1].status = "pass"; // nothing pending/fail -> not re-drivable
  await writeFile(planPath, JSON.stringify(plan), "utf8");

  assert.equal(await decideContinuation(stop(repo), deps({})), "");
});

test("loopControlLimits parses env with loose defaults", () => {
  assert.deepEqual(loopControlLimits({}), { enabled: true, maxIterations: 50, maxStalled: 3 });
  assert.deepEqual(loopControlLimits({ LOOPY_MAX_ITERATIONS: "0", LOOPY_CONTINUATION: "off" }), { enabled: false, maxIterations: 0, maxStalled: 3 });
  assert.equal(loopControlLimits({ LOOPY_MAX_ITERATIONS: "bogus" }).maxIterations, 50); // invalid -> default
});
