import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { hasEngineerTrigger, hasTeamTrigger, parseInvocation } from "../src/engineer.js";
import { runUserPromptSubmitHook } from "../src/hooks.js";
import { createLoop } from "../src/loop.js";

async function tempRepo() {
  return mkdtemp(join(tmpdir(), "superloopy-engineer-"));
}

test("hasTeamTrigger fires on spaced, connected, and ultrawork escalations", () => {
  assert.equal(hasTeamTrigger("loopy team migrate the auth module"), true);
  assert.equal(hasTeamTrigger("loopy crew: refactor the parser"), true);
  // Connected one-word form.
  assert.equal(hasTeamTrigger("loopycrew migrate the auth module"), true);
  assert.equal(hasTeamTrigger("@loopycrew ship it"), true);
  // Standalone ultrawork keyword (no loopy prefix).
  assert.equal(hasTeamTrigger("ultrawork migrate the auth module"), true);
  assert.equal(hasTeamTrigger("@ultrawork ship it"), true);
  assert.equal(hasTeamTrigger("loopy ship the login fix"), false);
  // The removed `loopyteam` connected form is no longer an escalation.
  assert.equal(hasTeamTrigger("loopyteam refactor the parser"), false);
  // Word boundary: ordinary briefs that merely start with team-/crew- are not escalations.
  assert.equal(hasTeamTrigger("loopy teamwork dashboard feature"), false);
  assert.equal(hasTeamTrigger("loopy crews of workers page"), false);
  assert.equal(hasTeamTrigger("loopycrewmate dashboard"), false);
  assert.equal(hasTeamTrigger("ultraworkflow dashboard"), false);
  // The escalation only counts right after the loopy keyword.
  assert.equal(hasTeamTrigger("loopy build a team page"), false);
  assert.equal(hasTeamTrigger("team up the workers"), false);
});

test("hasEngineerTrigger wakes on connected loopycrew and standalone ultrawork", () => {
  assert.equal(hasEngineerTrigger("loopycrew migrate the auth module"), true);
  assert.equal(hasEngineerTrigger("ultrawork refactor the parser"), true);
  // The removed `loopyteam` form no longer wakes the engineer, and a connected
  // non-crew word stays inert (matches no trigger).
  assert.equal(hasEngineerTrigger("loopyteam refactor the parser"), false);
  assert.equal(hasEngineerTrigger("loopywork ship it"), false);
});

test("parseInvocation strips spaced, connected, and ultrawork keywords and reports orchestration intent", () => {
  assert.deepEqual(parseInvocation("loopy team migrate the auth module"), {
    orchestrate: true,
    brief: "migrate the auth module"
  });
  assert.deepEqual(parseInvocation("loopycrew migrate the auth module"), {
    orchestrate: true,
    brief: "migrate the auth module"
  });
  assert.deepEqual(parseInvocation("ultrawork migrate the auth module"), {
    orchestrate: true,
    brief: "migrate the auth module"
  });
  assert.deepEqual(parseInvocation("ultrawork"), { orchestrate: true, brief: "" });
  assert.deepEqual(parseInvocation("loopy add proof-backed login"), {
    orchestrate: false,
    brief: "add proof-backed login"
  });
  assert.deepEqual(parseInvocation("loopy team"), { orchestrate: true, brief: "" });
});

test("runUserPromptSubmitHook injects the crew fan-out playbook in team mode, with a clean brief", async () => {
  const repo = await tempRepo();
  const output = await runUserPromptSubmitHook({
    hook_event_name: "UserPromptSubmit",
    cwd: repo,
    prompt: "loopy team migrate the auth module"
  });
  const context = JSON.parse(output).hookSpecificOutput.additionalContext;
  assert.match(context, /Crew fan-out \(team mode\)/);
  assert.match(context, /multi_agent_v1\.spawn_agent/);
  assert.match(context, /multi_agent_v1\.wait_agent/);
  // agent_type must be set per crew role so the child loads that role's TOML.
  assert.match(context, /"agent_type": "fronk"/);
  assert.match(context, /"zyro"/);
  assert.match(context, /"usk"/);
  assert.match(context, /"jumbo"/);
  assert.match(context, /"rovyn"/);
  assert.match(context, /"nomi"/);
  assert.match(context, /requested repository path differs from `cwd`/);
  assert.match(context, /implementation worker must own a real bounded implementation slice/);
  assert.match(context, /jumbo-final-gate-report\.md/);
  assert.match(context, /\.superloopy\/evidence\/gate\.json/);
  assert.match(context, /role completion line/);
  assert.match(context, /git status --short --untracked-files=all/);
  assert.match(context, /git ls-files --others --exclude-standard/);
  assert.match(context, /run `superloopy loop fleet --json` before the final gate/);
  // The team keyword is stripped from the brief that seeds the loop.
  assert.match(context, /superloopy loop begin --brief 'migrate the auth module'/);
  assert.equal(existsSync(join(repo, ".superloopy", "goals.json")), false);
});

test("runUserPromptSubmitHook treats the connected loopycrew form as team mode with a clean brief", async () => {
  const repo = await tempRepo();
  const output = await runUserPromptSubmitHook({
    hook_event_name: "UserPromptSubmit",
    cwd: repo,
    prompt: "loopycrew migrate the auth module"
  });
  const context = JSON.parse(output).hookSpecificOutput.additionalContext;
  assert.match(context, /Crew fan-out \(team mode\)/);
  assert.match(context, /multi_agent_v1\.spawn_agent/);
  // The connected keyword is stripped from the brief that seeds the loop.
  assert.match(context, /superloopy loop begin --brief 'migrate the auth module'/);
  assert.equal(existsSync(join(repo, ".superloopy", "goals.json")), false);
});

test("runUserPromptSubmitHook treats the standalone ultrawork keyword as team mode with a clean brief", async () => {
  const repo = await tempRepo();
  const output = await runUserPromptSubmitHook({
    hook_event_name: "UserPromptSubmit",
    cwd: repo,
    prompt: "ultrawork migrate the auth module"
  });
  const context = JSON.parse(output).hookSpecificOutput.additionalContext;
  assert.match(context, /Crew fan-out \(team mode\)/);
  assert.match(context, /multi_agent_v1\.spawn_agent/);
  // The ultrawork keyword is stripped from the brief that seeds the loop.
  assert.match(context, /superloopy loop begin --brief 'migrate the auth module'/);
  assert.equal(existsSync(join(repo, ".superloopy", "goals.json")), false);
});

test("runUserPromptSubmitHook stays solo on a plain loopy task but advertises team mode", async () => {
  const repo = await tempRepo();
  const output = await runUserPromptSubmitHook({
    hook_event_name: "UserPromptSubmit",
    cwd: repo,
    prompt: "loopy add proof-backed login"
  });
  const context = JSON.parse(output).hookSpecificOutput.additionalContext;
  // Tier 1 baseline: no full playbook, but a conservative delegation line that names team mode.
  assert.doesNotMatch(context, /Crew fan-out \(team mode\)/);
  assert.match(context, /loopy team <task>/);
  assert.match(context, /genuinely independent slices/);
});

test("runUserPromptSubmitHook re-injects the crew playbook when resuming with loopy team", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);

  const output = await runUserPromptSubmitHook({
    hook_event_name: "UserPromptSubmit",
    cwd: repo,
    prompt: "loopy team keep going"
  });

  const context = JSON.parse(output).hookSpecificOutput.additionalContext;
  assert.match(context, /A loop is already in progress/);
  assert.match(context, /Crew fan-out \(team mode\)/);
  assert.match(context, /multi_agent_v1\.spawn_agent/);
  assert.match(context, /run `superloopy loop fleet --json` before the final gate/);
});
