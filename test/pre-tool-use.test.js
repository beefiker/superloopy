import assert from "node:assert/strict";
import "./helpers/trust-isolate.js";
import { mkdir, mkdtemp, symlink, writeFile } from "node:fs/promises";
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

test("PreToolUse finds an incomplete canonical plan from a child directory", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  const child = join(repo, "packages", "app");
  await mkdir(child, { recursive: true });

  const output = runPreToolUseHook({
    hook_event_name: "PreToolUse",
    tool_name: "update_goal",
    cwd: child,
    tool_input: { status: "complete" }
  });

  assert.equal(JSON.parse(output).hookSpecificOutput.permissionDecision, "deny");
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

function crewWrite(repo, agentType, filePath, extra = {}) {
  return runPreToolUseHook({
    hook_event_name: "PreToolUse",
    tool_name: "Write",
    agent_type: agentType,
    cwd: repo,
    tool_input: { file_path: filePath, content: "x" },
    ...extra
  }, { host: "claude" });
}

function denial(output) {
  return output === "" ? null : JSON.parse(output).hookSpecificOutput;
}

test("Claude crew guard keeps reviewer, QA, gate, and audit lanes inside the evidence root", async () => {
  const repo = await tempRepo();
  await mkdir(join(repo, "src"), { recursive: true });
  for (const role of ["sentinel", "probe", "arbiter", "assayer"]) {
    assert.equal(crewWrite(repo, `superloopy:${role}`, join(repo, ".superloopy", "evidence", "audit", `${role}.md`)), "", role);
    const blocked = denial(crewWrite(repo, `superloopy:${role}`, join(repo, "src", "app.js")));
    assert.equal(blocked?.permissionDecision, "deny", role);
    assert.match(blocked.permissionDecisionReason, new RegExp(`${role} lane is not an implementer`));
  }
  // Prefix tricks and traversal resolve outside the root.
  assert.equal(denial(crewWrite(repo, "superloopy:sentinel", join(repo, ".superloopy", "evidence-x", "r.md")))?.permissionDecision, "deny");
  assert.equal(denial(crewWrite(repo, "superloopy:sentinel", join(repo, ".superloopy", "evidence", "..", "goals.json")))?.permissionDecision, "deny");
  // A tool call with no target path is refused rather than waved through.
  assert.equal(denial(runPreToolUseHook({ hook_event_name: "PreToolUse", tool_name: "Edit", agent_type: "superloopy:probe", cwd: repo, tool_input: {} }, { host: "claude" }))?.permissionDecision, "deny");
});

test("Claude crew guard follows the session-scoped evidence root and rejects a symlinked escape", async () => {
  const repo = await tempRepo();
  const scoped = join(repo, ".superloopy", "sessions", "sess-1", "evidence", "qa.md");
  const global = join(repo, ".superloopy", "evidence", "qa.md");
  // No scoped plan yet: receipts resolve to the global root, so only it is writable.
  assert.equal(crewWrite(repo, "superloopy:probe", global, { session_id: "sess-1" }), "");
  assert.equal(denial(crewWrite(repo, "superloopy:probe", scoped, { session_id: "sess-1" }))?.permissionDecision, "deny");
  // Once the session has its own plan, the lane is confined to that root and cannot touch the global loop.
  await createLoop(repo, ["--session-id", "sess-1", "--brief", "Scoped task"]);
  assert.equal(crewWrite(repo, "superloopy:probe", scoped, { session_id: "sess-1" }), "");
  const crossed = denial(crewWrite(repo, "superloopy:probe", global, { session_id: "sess-1" }));
  assert.equal(crossed?.permissionDecision, "deny");
  assert.match(crossed.permissionDecisionReason, /\.superloopy\/sessions\/sess-1\/evidence\//u);

  const outside = await tempRepo();
  await mkdir(join(repo, ".superloopy", "evidence"), { recursive: true });
  await symlink(outside, join(repo, ".superloopy", "evidence", "link"));
  assert.equal(denial(crewWrite(repo, "superloopy:arbiter", join(repo, ".superloopy", "evidence", "link", "gate.md")))?.permissionDecision, "deny");
});

test("Claude crew guard leaves forge, pathfinder-free roles, the parent session, and other hosts alone", async () => {
  const repo = await tempRepo();
  const product = join(repo, "src", "app.js");
  assert.equal(crewWrite(repo, "superloopy:forge", product), "");
  assert.equal(crewWrite(repo, undefined, product), "");
  assert.equal(crewWrite(repo, "general-purpose", product), "");
  // Bare names are Codex spellings; the Claude guard only trusts plugin-scoped agent types.
  assert.equal(crewWrite(repo, "sentinel", product), "");
  assert.equal(runPreToolUseHook({ hook_event_name: "PreToolUse", tool_name: "Bash", agent_type: "superloopy:sentinel", cwd: repo, tool_input: { command: "echo > src/app.js" } }, { host: "claude" }), "");
});
