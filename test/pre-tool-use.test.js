import assert from "node:assert/strict";
import "./helpers/trust-isolate.js";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { runPreToolUseHook } from "../src/pre-tool-use.js";
import { finishLoop } from "../src/finish.js";
import { createLoop, evidenceLoop } from "../src/loop.js";


async function tempRepo() {
  return mkdtemp(join(tmpdir(), "superloopy-pre-tool-"));
}

async function writeEvidence(repo, name, content = "proof\n") {
  const evidenceDir = join(repo, ".superloopy", "evidence");
  await mkdir(evidenceDir, { recursive: true });
  const path = join(evidenceDir, name);
  await writeFile(path, content, "utf8");
  return `.superloopy/evidence/${name}`;
}

test("PreToolUse blocks native update_goal completion while Superloopy is incomplete", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);

  const output = runPreToolUseHook({
    hook_event_name: "PreToolUse",
    tool_name: "update_goal",
    cwd: repo,
    tool_input: { status: "complete" }
  });

  const parsed = JSON.parse(output);
  assert.equal(parsed.hookSpecificOutput.permissionDecision, "deny");
  assert.match(parsed.hookSpecificOutput.additionalContext, /Superloopy plan is not complete/);
  assert.match(parsed.hookSpecificOutput.additionalContext, /superloopy loop finish/);
});

test("PreToolUse allows native update_goal completion after Superloopy aggregate completion", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  await evidenceLoop(repo, ["--goal-id", "G001", "--criterion-id", "C001", "--status", "pass", "--artifact", await writeEvidence(repo, "c1.txt")]);
  await evidenceLoop(repo, ["--goal-id", "G001", "--criterion-id", "C002", "--status", "pass", "--artifact", await writeEvidence(repo, "c2.txt")]);
  await finishLoop(repo, ["--evidence", "criteria passed", "--artifact", ".superloopy/evidence/gate.json"]);

  const output = runPreToolUseHook({
    hook_event_name: "PreToolUse",
    tool_name: "update_goal",
    cwd: repo,
    tool_input: { status: "complete" }
  });

  assert.equal(output, "");
});

test("PreToolUse update_goal guard is quiet without a Superloopy plan or for non-complete status", async () => {
  const repo = await tempRepo();
  const noPlan = runPreToolUseHook({
    hook_event_name: "PreToolUse",
    tool_name: "update_goal",
    cwd: repo,
    tool_input: { status: "complete" }
  });
  await createLoop(repo, ["--brief", "Ship"]);
  const blocked = runPreToolUseHook({
    hook_event_name: "PreToolUse",
    tool_name: "update_goal",
    cwd: repo,
    tool_input: { status: "blocked" }
  });

  assert.equal(noPlan, "");
  assert.equal(blocked, "");
});

test("PreToolUse refuses completion when Superloopy state is unreadable", async () => {
  const repo = await tempRepo();
  await mkdir(join(repo, ".superloopy"), { recursive: true });
  await writeFile(join(repo, ".superloopy", "goals.json"), "{bad-json", "utf8");

  const output = runPreToolUseHook({
    hook_event_name: "PreToolUse",
    tool_name: "update_goal",
    cwd: repo,
    tool_input: { status: "complete" }
  });

  assert.match(JSON.parse(output).hookSpecificOutput.additionalContext, /could not be read/);
});
