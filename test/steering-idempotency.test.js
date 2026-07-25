import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { runUserPromptSubmitHook } from "../src/hooks.js";
import { createLoop, statusLoop } from "../src/loop.js";

test("the same structured steering request mutates a plan once", async () => {
  const repo = await mkdtemp(join(tmpdir(), "superloopy-steering-"));
  await createLoop(repo, ["--brief", "First"]);
  const payload = {
    hook_event_name: "UserPromptSubmit",
    cwd: repo,
    session_id: "thread-1",
    turn_id: "turn-1",
    prompt: 'SUPERLOOPY_STEER: {"kind":"add_goal","title":"Second","objective":"Ship second","rationale":"required","requestId":"req-1"}'
  };
  const first = JSON.parse(await runUserPromptSubmitHook(payload));
  const second = JSON.parse(await runUserPromptSubmitHook(payload));
  const status = await statusLoop(repo);
  assert.equal(first.deduplicated, false);
  assert.equal(second.deduplicated, true);
  assert.equal(status.plan.goals.length, 2);
});
