import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { runSubagentStopHook } from "../src/hooks.js";

async function tempRepo() {
  return mkdtemp(join(tmpdir(), "superloopy-receipt-"));
}

test("runSubagentStopHook blocks fronk without receipt", async () => {
  // Isolated temp cwd: the attempt counter persists per (cwd, session, agent), so a shared dir
  // like /tmp would accumulate across runs and trip the cap intermittently.
  const repo = await tempRepo();
  const output = runSubagentStopHook({
    hook_event_name: "SubagentStop",
    agent_type: "fronk",
    cwd: repo,
    last_assistant_message: "done"
  });

  const parsed = JSON.parse(output);
  assert.equal(parsed.decision, "block");
  assert.match(parsed.reason, /SUPERLOOPY_EVIDENCE/);
  assert.match(parsed.reason, /active evidence root/);
  assert.match(parsed.reason, /EVIDENCE_RECORDED: <path-under-active-evidence-root>/);
});

test("runSubagentStopHook blocks a blank (whitespace-only) artifact receipt", async () => {
  const repo = await tempRepo();
  const evidenceDir = join(repo, ".superloopy", "evidence");
  await mkdir(evidenceDir, { recursive: true });
  await writeFile(join(evidenceDir, "blank.txt"), "   \n\t\n", "utf8");

  const output = runSubagentStopHook({
    hook_event_name: "SubagentStop",
    agent_type: "fronk",
    cwd: repo,
    last_assistant_message: "SUPERLOOPY_EVIDENCE: .superloopy/evidence/blank.txt"
  });

  // A non-empty-but-blank placeholder must not satisfy the gate.
  assert.equal(JSON.parse(output).decision, "block");
});

test("runSubagentStopHook still enforces the attempt cap when agent_id is missing", async () => {
  const repo = await tempRepo();
  const payload = {
    hook_event_name: "SubagentStop",
    agent_type: "fronk",
    cwd: repo,
    last_assistant_message: "no receipt here"
  };
  // No agent_id (and no session_id): the cap must still count down instead of looping at
  // "Attempt 1 of 3" forever. Three blocks, then a give-up that allows the stop.
  assert.equal(JSON.parse(runSubagentStopHook(payload)).decision, "block");
  assert.equal(JSON.parse(runSubagentStopHook(payload)).decision, "block");
  assert.equal(JSON.parse(runSubagentStopHook(payload)).decision, "block");
  assert.equal(runSubagentStopHook(payload), "");
});

test("runSubagentStopHook records a ledger signal when the attempt cap is exhausted", async () => {
  const repo = await tempRepo();
  const payload = {
    hook_event_name: "SubagentStop",
    agent_type: "fronk",
    session_id: "s1",
    agent_id: "a1",
    cwd: repo,
    last_assistant_message: "still no receipt"
  };
  runSubagentStopHook(payload);
  runSubagentStopHook(payload);
  runSubagentStopHook(payload);
  assert.equal(runSubagentStopHook(payload), "");
  const ledger = await readFile(join(repo, ".superloopy", "ledger.jsonl"), "utf8");
  assert.match(ledger, /subagent_attempt_exhausted/);
});
