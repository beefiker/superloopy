import assert from "node:assert/strict";
import { appendFile, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { buildGuide } from "../src/guide.js";
import { runStopHook, runSubagentStopHook, runUserPromptSubmitHook } from "../src/hooks.js";
import { createLoop, evidenceLoop, nextLoop } from "../src/loop.js";
import { readLedger, readPlan } from "../src/store.js";
import { proveLoop } from "../src/prove.js";

async function tempRepo() { return mkdtemp(join(tmpdir(), "superloopy-stop-engagement-")); }

async function withStopHookEnv(value, fn) {
  const previous = process.env.SUPERLOOPY_STOP_HOOK;
  if (value === undefined) delete process.env.SUPERLOOPY_STOP_HOOK;
  else process.env.SUPERLOOPY_STOP_HOOK = value;
  try {
    return await fn();
  } finally {
    if (previous === undefined) delete process.env.SUPERLOOPY_STOP_HOOK;
    else process.env.SUPERLOOPY_STOP_HOOK = previous;
  }
}

const prompt = (cwd, session_id, text) => runUserPromptSubmitHook({ hook_event_name: "UserPromptSubmit", cwd, session_id, prompt: text });

async function stopReason(cwd, session_id) {
  const output = await runStopHook({ hook_event_name: "Stop", cwd, session_id, stop_hook_active: false });
  return output === "" ? null : JSON.parse(output).reason;
}

async function blockCriterion(repo, criterionId) {
  await mkdir(join(repo, ".superloopy", "evidence"), { recursive: true });
  await writeFile(join(repo, ".superloopy", "evidence", "question.md"), "Which API key should staging use?\n", "utf8");
  await evidenceLoop(repo, ["--goal-id", "G001", "--criterion-id", criterionId, "--status", "blocked", "--artifact", ".superloopy/evidence/question.md"]);
}

const exhaustProbe = (repo, agent_id) => {
  const worker = { hook_event_name: "SubagentStop", cwd: repo, agent_type: "probe", agent_id, last_assistant_message: "done" };
  for (let attempt = 1; attempt <= 4; attempt += 1) runSubagentStopHook(worker);
};

test("by default Stop continues only the session that started the loop, until its user sends a plain prompt", () => withStopHookEnv(undefined, async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);

  assert.equal(await stopReason(repo, "s1"), null, "no loop trigger yet: the session is left alone");

  await prompt(repo, "s1", "loopy resume the plan");
  const reason = await stopReason(repo, "s1");
  assert.match(reason, /Superloopy continuation/u);
  assert.equal(await stopReason(repo, "s2"), null, "another session in the same repo is unaffected");

  // Codex replays the block reason as a user prompt; steering also keeps the loop going.
  await prompt(repo, "s1", reason);
  assert.notEqual(await stopReason(repo, "s1"), null);
  await prompt(repo, "s1", 'SUPERLOOPY_STEER: {"kind":"annotate","evidence":"seen","rationale":"note"}');
  assert.notEqual(await stopReason(repo, "s1"), null);

  await prompt(repo, "s1", "what does this function do?");
  assert.equal(await stopReason(repo, "s1"), null, "a plain prompt hands the wheel back to the user");
}));

test("SUPERLOOPY_STOP_HOOK=off silences an engaged session and =on drives any session", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  await withStopHookEnv(undefined, () => prompt(repo, "s1", "loopy resume"));

  assert.equal(await withStopHookEnv("off", () => stopReason(repo, "s1")), null);
  assert.notEqual(await withStopHookEnv("on", () => stopReason(repo, "never-engaged")), null);
});

test("a worker that exhausts its receipt attempts is reported to the parent once", () => withStopHookEnv("on", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  const worker = { hook_event_name: "SubagentStop", cwd: repo, agent_type: "probe", agent_id: "w1", last_assistant_message: "All tests pass." };
  for (let attempt = 1; attempt <= 3; attempt += 1) assert.match(runSubagentStopHook(worker), /Attempt \d of 3/u);
  assert.equal(runSubagentStopHook(worker), "", "after the cap the worker is allowed to stop");

  const first = await stopReason(repo);
  assert.match(first, /Workers that stopped without proof:\n- probe \(w1\) returned after 3 attempts with no valid SUPERLOOPY_EVIDENCE receipt/u);
  assert.doesNotMatch(await stopReason(repo), /Workers that stopped without proof/u);
  assert.equal((await readLedger(repo)).filter((entry) => entry.kind === "worker_exhaustion_reported").length, 1);
}));

test("a worker exhausted under a replaced plan is not reported against the new one", () => withStopHookEnv("on", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Old plan"]);
  const worker = { hook_event_name: "SubagentStop", cwd: repo, agent_type: "probe", agent_id: "w1", last_assistant_message: "done" };
  for (let attempt = 1; attempt <= 4; attempt += 1) runSubagentStopHook(worker);
  await createLoop(repo, ["--brief", "New plan", "--force"]);

  assert.doesNotMatch(await stopReason(repo), /Workers that stopped without proof/u);
}));

test("the continuation points at an open criterion, not one blocked on the user", () => withStopHookEnv("on", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  await nextLoop(repo);
  await blockCriterion(repo, "C001");

  const reason = await stopReason(repo);
  assert.match(reason, /- Next criterion: C002 /u);
  assert.match(reason, /- Proof target: G001\/C002 pass/u);
  assert.doesNotMatch(reason, /Proof target: G001\/C001/u);

  // `loop prove`, the directive's next action, must capture against that same open criterion.
  const proved = await proveLoop(repo, ["--", process.execPath, "-e", "console.log('ok')"]);
  assert.equal(proved.criterion.id, "C002");
  assert.equal(proved.goal.criteria.find((criterion) => criterion.id === "C001").status, "blocked");
}));

test("a goal whose open criteria are all blocked is checkpointed blocked, never proved", () => withStopHookEnv("on", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  await nextLoop(repo);
  await blockCriterion(repo, "C001");
  await blockCriterion(repo, "C002");

  const guide = buildGuide(await readPlan(repo), { cwd: repo });
  assert.match(guide.nextAction.command, /checkpoint --goal-id G001 --status blocked/u);
  assert.equal(guide.proofTarget, null);
  await assert.rejects(proveLoop(repo, ["--", process.execPath, "-e", ""]), /Every open criterion in G001 is blocked on the user/u);
}));

test("guidance-only triggers neither engage nor release; a real prompt releases even under context pressure", () => withStopHookEnv(undefined, async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  await prompt(repo, "s1", "lpy what is next");
  assert.equal(await stopReason(repo, "s1"), null, "lpy is guidance-only");

  await prompt(repo, "s1", "loopy resume");
  await prompt(repo, "s1", "$lpy remind me of the gate");
  assert.notEqual(await stopReason(repo, "s1"), null, "guidance keeps an engaged session");

  const transcript = join(repo, "transcript.jsonl");
  await writeFile(transcript, `${JSON.stringify({ type: "system", text: "Context compacted" })}\n`, "utf8");
  await runUserPromptSubmitHook({ hook_event_name: "UserPromptSubmit", cwd: repo, session_id: "s1", prompt: "never mind, show me the diff", transcript_path: transcript });
  assert.equal(await stopReason(repo, "s1"), null);
}));

test("Codex replaying the unreadable-plan reason keeps the session engaged", () => withStopHookEnv(undefined, async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  await prompt(repo, "s1", "loopy resume");
  const goals = join(repo, ".superloopy", "goals.json");
  await writeFile(goals, "{ torn", "utf8");

  const reason = await stopReason(repo, "s1");
  assert.match(reason, /could not read the plan/u);
  await prompt(repo, "s1", reason);
  await createLoop(repo, ["--brief", "Ship", "--force"]);
  assert.notEqual(await stopReason(repo, "s1"), null);
}));

test("an exhaustion recorded while another Stop was reporting is still reported", () => withStopHookEnv("on", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  exhaustProbe(repo, "late");
  // A concurrent Stop read the ledger before `late` landed, then appended its report line.
  const ledger = await readLedger(repo);
  const before = ledger.findIndex((entry) => entry.kind === "subagent_attempt_exhausted");
  await appendFile(join(repo, ".superloopy", "ledger.jsonl"), `${JSON.stringify({ at: "2026-10-15T00:00:00.000Z", kind: "worker_exhaustion_reported", count: 0, through: before })}\n`, "utf8");

  assert.match(await stopReason(repo), /- probe \(late\) returned/u);
}));

test("a worker that gave up is shown to the user when the loop stops on its iteration cap", () => withStopHookEnv("on", async () => {
  const previous = process.env.SUPERLOOPY_MAX_ITERATIONS;
  process.env.SUPERLOOPY_MAX_ITERATIONS = "1";
  try {
    const repo = await tempRepo();
    await createLoop(repo, ["--brief", "Ship"]);
    assert.notEqual(await stopReason(repo), null, "iteration 1 continues");
    exhaustProbe(repo, "w9");

    const output = JSON.parse(await runStopHook({ hook_event_name: "Stop", cwd: repo, stop_hook_active: false }));
    assert.equal(output.decision, undefined, "the cap still lets the agent stop");
    assert.match(output.systemMessage, /Superloopy stopped the loop[\s\S]*- probe \(w9\) returned after 3 attempts/u);
  } finally {
    if (previous === undefined) delete process.env.SUPERLOOPY_MAX_ITERATIONS;
    else process.env.SUPERLOOPY_MAX_ITERATIONS = previous;
  }
}));
