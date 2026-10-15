import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { runStopHook, runSubagentStopHook, runUserPromptSubmitHook } from "../src/hooks.js";
import { createLoop } from "../src/loop.js";
import { readLedger } from "../src/store.js";

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
