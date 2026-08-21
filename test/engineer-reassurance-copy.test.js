import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { runUserPromptSubmitHook } from "../src/hooks.js";
import { createLoop } from "../src/loop.js";

async function tempRepo() { return mkdtemp(join(tmpdir(), "superloopy-engineer-reassurance-")); }
async function promptContext(prompt, cwd) {
  const output = await runUserPromptSubmitHook({ hook_event_name: "UserPromptSubmit", cwd, prompt });
  return JSON.parse(output).hookSpecificOutput.additionalContext;
}

test("every Loopy engineer context carries the conditional reassurance-copy gate", async () => {
  const activeRepo = await tempRepo();
  await createLoop(activeRepo, ["--brief", "Ship"]);

  for (const [label, prompt, cwd] of [
    ["start", "loopy add a status message", await tempRepo()],
    ["empty start", "loopy", await tempRepo()],
    ["resume", "loopy continue", activeRepo],
    ["crew start", "loopy team add a status message", await tempRepo()]
  ]) {
    const context = await promptContext(prompt, cwd);
    assert.match(context, /user-visible Korean product copy/iu, label);
    assert.match(context, /RC-1[\s\S]*RC-4/u, label);
    assert.match(context, /affected artifact/iu, label);
    assert.match(context, /humanize-korean/iu, label);
    assert.doesNotMatch(context, /classify.*안전|keyword trigger/iu, label);
  }
});
