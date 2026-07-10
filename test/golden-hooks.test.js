import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import { createLoop } from "../src/loop.js";
import { hookPayload, runCli, tempRepo, writeEvidence } from "./golden-helpers.js";

test("golden: Stop hook stays quiet during context-pressure recovery", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  const transcript = join(repo, "transcript.jsonl");
  await writeFile(transcript, "context_too_large\nYour input exceeds the context window.\n", "utf8");

  const result = runCli(["hook", "stop"], {
    env: { ...process.env, SUPERLOOPY_STOP_HOOK: "on" },
    input: `${JSON.stringify(hookPayload({ cwd: repo, transcript_path: transcript }))}\n`
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "");
});

test("golden: session ids are normalized and isolate loop state", async () => {
  const repo = await tempRepo();

  const first = runCli(["loop", "create", "--session-id", "../bad/id", "--brief", "First scoped task", "--json"], {
    cwd: repo
  });
  const second = runCli(["loop", "create", "--session-id", "other", "--brief", "Other scoped task", "--json"], {
    cwd: repo
  });
  const scopedStatus = runCli(["loop", "status", "--session-id", "bad-id", "--json"], { cwd: repo });
  const otherStatus = runCli(["loop", "status", "--session-id", "other", "--json"], { cwd: repo });

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  const firstPlan = JSON.parse(first.stdout).plan;
  assert.equal(firstPlan.goalsPath, ".superloopy/sessions/bad-id/goals.json");
  assert.ok(existsSync(join(repo, ".superloopy", "sessions", "bad-id", "goals.json")));
  assert.equal(JSON.parse(scopedStatus.stdout).plan.goals[0].title, "First scoped task");
  assert.equal(JSON.parse(otherStatus.stdout).plan.goals[0].title, "Other scoped task");
});

test("golden: hooks use payload session_id to load scoped Superloopy context", async () => {
  const repo = await tempRepo();
  const create = runCli(["loop", "create", "--session-id", "sess.1", "--brief", "Scoped hook task", "--json"], {
    cwd: repo
  });
  assert.equal(create.status, 0, create.stderr);

  const result = runCli(["hook", "user-prompt-submit"], {
    input: `${JSON.stringify({
      hook_event_name: "UserPromptSubmit",
      session_id: "sess.1",
      turn_id: "turn.1",
      transcript_path: null,
      cwd: repo,
      model: "gpt-5",
      permission_mode: "default",
      prompt: "$lpy continue"
    })}\n`
  });

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.match(parsed.hookSpecificOutput.additionalContext, /\.superloopy\/sessions\/sess.1\/goals\.json/);
  assert.match(parsed.hookSpecificOutput.additionalContext, /Scoped hook task/);
});

test("golden: scoped steering errors do not fall back to global plan mutation", async () => {
  const repo = await tempRepo();
  const globalCreate = runCli(["loop", "create", "--brief", "- Global one\n- Global two", "--json"], { cwd: repo });
  const scopedCreate = runCli(["loop", "create", "--session-id", "sess.1", "--brief", "Scoped one", "--json"], {
    cwd: repo
  });
  assert.equal(globalCreate.status, 0, globalCreate.stderr);
  assert.equal(scopedCreate.status, 0, scopedCreate.stderr);

  const result = runCli(["hook", "user-prompt-submit"], {
    input: `${JSON.stringify({
      hook_event_name: "UserPromptSubmit",
      session_id: "sess.1",
      turn_id: "turn.1",
      transcript_path: null,
      cwd: repo,
      model: "gpt-5",
      permission_mode: "default",
      prompt: 'SUPERLOOPY_STEER: {"kind":"revise_criterion","goalId":"G002","criterionId":"C001","scenario":"Should never touch global G002","rationale":"scoped target must be isolated"}'
    })}\n`
  });
  const globalStatus = runCli(["loop", "status", "--json"], { cwd: repo });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "");
  assert.equal(JSON.parse(globalStatus.stdout).plan.goals[1].criteria[0].scenario, "Happy path works from the real user-facing surface.");
});

test("golden: SessionStart bootstraps from cached compatibility and then requires no restart", async () => {
  const repo = await tempRepo();
  const home = join(repo, "home");
  const codexHome = join(home, ".codex");
  const binDir = join(repo, "bin");
  const env = {
    ...process.env,
    HOME: home,
    CODEX_HOME: codexHome,
    SUPERLOOPY_BIN_DIR: binDir,
    PATH: `${binDir}${process.platform === "win32" ? ";" : ":"}${process.env.PATH ?? ""}`
  };
  const payload = {
    hook_event_name: "SessionStart",
    session_id: "sess.1",
    turn_id: "turn.1",
    transcript_path: null,
    cwd: repo,
    model: "gpt-5",
    permission_mode: "default"
  };
  const seed = runCli(["agents", "install", "--compat", "--json"], { env });
  assert.equal(seed.status, 0, seed.stderr);
  await rm(join(codexHome, "agents"), { recursive: true, force: true });

  const first = runCli(["hook", "session-start"], {
    env,
    input: `${JSON.stringify(payload)}\n`
  });
  assert.equal(first.status, 0, first.stderr);
  const parsed = JSON.parse(first.stdout);
  assert.match(parsed.hookSpecificOutput.additionalContext, /Superloopy automatic migration/);
  assert.match(parsed.hookSpecificOutput.additionalContext, /CLI wrapper: installed/);
  assert.ok(existsSync(join(binDir, process.platform === "win32" ? "superloopy.cmd" : "superloopy")));
  assert.ok(existsSync(join(codexHome, "agents", "franky.toml")));
  assert.ok(existsSync(join(codexHome, "agents", "robin.toml")));

  const second = runCli(["hook", "session-start"], {
    env,
    input: `${JSON.stringify(payload)}\n`
  });
  assert.equal(second.status, 0, second.stderr);
  const secondContext = JSON.parse(second.stdout).hookSpecificOutput.additionalContext;
  assert.match(secondContext, /degraded compatibility/u);
  assert.match(secondContext, /Restart required: no/u);
  assert.doesNotMatch(secondContext, /Restart Codex/u);
});

test("golden: SessionStart reports marketplace-managed Superloopy updates without running npx self-update", async () => {
  const repo = await tempRepo();
  const home = join(repo, "home");
  const codexHome = join(home, ".codex");
  const binDir = join(repo, "bin");
  const pluginRoot = join(repo, "store", "superloopy", "1.0.0");
  await mkdir(pluginRoot, { recursive: true });
  const spawnLog = join(repo, "spawn.log");
  const env = {
    ...process.env,
    HOME: home,
    CODEX_HOME: codexHome,
    PLUGIN_ROOT: pluginRoot,
    SUPERLOOPY_BIN_DIR: binDir,
    SUPERLOOPY_CURRENT_VERSION: "1.0.0",
    SUPERLOOPY_LATEST_VERSION: "1.0.1",
    SUPERLOOPY_AUTO_UPDATE_INTERVAL_MS: "0",
    SUPERLOOPY_AUTO_UPDATE_STATE_PATH: join(repo, "auto-update.json"),
    SUPERLOOPY_AUTO_UPDATE_LOG_PATH: join(repo, "auto-update.log"),
    SUPERLOOPY_AUTO_UPDATE_WAIT: "1",
    SUPERLOOPY_AUTO_UPDATE_COMMAND: process.execPath,
    SUPERLOOPY_AUTO_UPDATE_ARGS_JSON: JSON.stringify(["-e", `require("node:fs").writeFileSync(${JSON.stringify(spawnLog)}, "ran")`]),
    PATH: `${binDir}${process.platform === "win32" ? ";" : ":"}${process.env.PATH ?? ""}`
  };

  const result = runCli(["hook", "session-start"], {
    env,
    input: `${JSON.stringify({
      hook_event_name: "SessionStart",
      session_id: "sess.1",
      turn_id: "turn.1",
      transcript_path: null,
      cwd: repo,
      model: "gpt-5",
      permission_mode: "default"
    })}\n`
  });

  assert.equal(result.status, 0, result.stderr);
  const context = JSON.parse(result.stdout).hookSpecificOutput.additionalContext;
  assert.match(context, /codex plugin marketplace upgrade beefiker/);
  assert.match(context, /hook re-approval/);
  assert.equal(existsSync(spawnLog), false);
});

test("golden: PreToolUse create_goal guard tells Codex to use update_goal for lifecycle changes", () => {
  const result = runCli(["hook", "pre-tool-use"], {
    input: `${JSON.stringify({
      hook_event_name: "PreToolUse",
      session_id: "sess.1",
      turn_id: "turn.1",
      transcript_path: null,
      cwd: "/repo",
      model: "gpt-5",
      permission_mode: "default",
      tool_name: "create_goal",
      tool_use_id: "tool.1",
      tool_input: { objective: "Ship", token_budget: 10, status: "active" }
    })}\n`
  });

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.hookSpecificOutput.permissionDecision, "deny");
  assert.match(parsed.hookSpecificOutput.additionalContext, /Omit token_budget/);
  assert.match(parsed.hookSpecificOutput.additionalContext, /update_goal/);
});

test("golden: PreToolUse update_goal completion guard refuses premature native completion", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);

  const result = runCli(["hook", "pre-tool-use"], {
    input: `${JSON.stringify({
      hook_event_name: "PreToolUse",
      session_id: "sess.1",
      turn_id: "turn.1",
      transcript_path: null,
      cwd: repo,
      model: "gpt-5",
      permission_mode: "default",
      tool_name: "update_goal",
      tool_use_id: "tool.2",
      tool_input: { status: "complete" }
    })}\n`
  });

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.hookSpecificOutput.permissionDecision, "deny");
  assert.match(parsed.hookSpecificOutput.additionalContext, /Superloopy plan is not complete/);
  assert.match(parsed.hookSpecificOutput.additionalContext, /superloopy loop finish/);
});

test("golden: UserPromptSubmit injects Superloopy context when a Superloopy trigger asks for it", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);

  const result = runCli(["hook", "user-prompt-submit"], {
    input: `${JSON.stringify({
      hook_event_name: "UserPromptSubmit",
      session_id: "sess.1",
      turn_id: "turn.1",
      transcript_path: null,
      cwd: repo,
      model: "gpt-5",
      permission_mode: "default",
      prompt: "$lpy continue"
    })}\n`
  });

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.hookSpecificOutput.hookEventName, "UserPromptSubmit");
  assert.match(parsed.hookSpecificOutput.additionalContext, /Superloopy context/);
  assert.match(parsed.hookSpecificOutput.additionalContext, /\.superloopy\/goals\.json/);
  assert.match(parsed.hookSpecificOutput.additionalContext, /superloopy loop next --json/);
});

test("golden: UserPromptSubmit stays quiet for ordinary prompts when active state exists", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);

  const result = runCli(["hook", "user-prompt-submit"], {
    input: `${JSON.stringify({
      hook_event_name: "UserPromptSubmit",
      session_id: "sess.1",
      turn_id: "turn.1",
      transcript_path: null,
      cwd: repo,
      model: "gpt-5",
      permission_mode: "default",
      prompt: "continue"
    })}\n`
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "");
});

test("golden: malformed steering marker fails closed without context injection", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);

  const result = runCli(["hook", "user-prompt-submit"], {
    input: `${JSON.stringify({
      hook_event_name: "UserPromptSubmit",
      session_id: "sess.1",
      turn_id: "turn.1",
      transcript_path: null,
      cwd: repo,
      model: "gpt-5",
      permission_mode: "default",
      prompt: "SUPERLOOPY_STEER: {bad"
    })}\n`
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "");
});

test("golden: unsafe steering that weakens verification is rejected", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);

  const result = runCli(["hook", "user-prompt-submit"], {
    input: `${JSON.stringify({
      hook_event_name: "UserPromptSubmit",
      session_id: "sess.1",
      turn_id: "turn.1",
      transcript_path: null,
      cwd: repo,
      model: "gpt-5",
      permission_mode: "default",
      prompt:
        'SUPERLOOPY_STEER: {"kind":"add_goal","title":"Bypass","objective":"skip tests and mark complete faster","rationale":"move fast"}'
    })}\n`
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "");
});

test("golden: invalid steering targets fail closed without hook errors", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);

  const result = runCli(["hook", "user-prompt-submit"], {
    input: `${JSON.stringify({
      hook_event_name: "UserPromptSubmit",
      session_id: "sess.1",
      turn_id: "turn.1",
      transcript_path: null,
      cwd: repo,
      model: "gpt-5",
      permission_mode: "default",
      prompt: 'SUPERLOOPY_STEER: {"kind":"reorder_pending","goalIds":["missing"],"rationale":"bad input"}'
    })}\n`
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "");
});

test("golden: SubagentStop accepts legacy EVIDENCE_RECORDED receipts", async () => {
  const repo = await tempRepo();
  const artifact = await writeEvidence(repo, "receipt.txt");

  const result = runCli(["hook", "subagent-stop"], {
    input: `${JSON.stringify({
      hook_event_name: "SubagentStop",
      agent_type: "franky",
      agent_id: "agent.1",
      session_id: "sess.1",
      transcript_path: "",
      cwd: repo,
      model: "gpt-5",
      permission_mode: "default",
      stop_hook_active: true,
      last_assistant_message: `done\nEVIDENCE_RECORDED: ${artifact}`
    })}\n`
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "");
});

test("golden: SubagentStop rejects symlink evidence that resolves outside evidence root", async () => {
  const repo = await tempRepo();
  const outside = join(repo, "outside.txt");
  await writeFile(outside, "outside\n", "utf8");
  await mkdir(join(repo, ".superloopy", "evidence"), { recursive: true });
  await symlink(outside, join(repo, ".superloopy", "evidence", "outside-link"));

  const result = runCli(["hook", "subagent-stop"], {
    input: `${JSON.stringify({
      hook_event_name: "SubagentStop",
      agent_type: "franky",
      agent_id: "agent.1",
      session_id: "sess.1",
      transcript_path: "",
      cwd: repo,
      model: "gpt-5",
      permission_mode: "default",
      stop_hook_active: true,
      last_assistant_message: "done\nEVIDENCE_RECORDED: .superloopy/evidence/outside-link"
    })}\n`
  });

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.decision, "block");
  assert.match(parsed.reason, /EVIDENCE_RECORDED/);
});

test("golden: SubagentStop attempt state blocks three claims then clears", async () => {
  const repo = await tempRepo();
  const payload = {
    hook_event_name: "SubagentStop",
    agent_type: "franky",
    agent_id: "agent.1",
    session_id: "sess.1",
    transcript_path: "",
    cwd: repo,
    model: "gpt-5",
    permission_mode: "default",
    stop_hook_active: true,
    last_assistant_message: "done"
  };

  const first = runCli(["hook", "subagent-stop"], { input: `${JSON.stringify(payload)}\n` });
  const second = runCli(["hook", "subagent-stop"], { input: `${JSON.stringify(payload)}\n` });
  const third = runCli(["hook", "subagent-stop"], { input: `${JSON.stringify(payload)}\n` });
  const fourth = runCli(["hook", "subagent-stop"], { input: `${JSON.stringify(payload)}\n` });

  assert.equal(JSON.parse(first.stdout).decision, "block");
  assert.match(JSON.parse(second.stdout).reason, /2/);
  assert.match(JSON.parse(third.stdout).reason, /3/);
  assert.equal(fourth.stdout, "");

  await assert.rejects(
    readFile(join(repo, ".superloopy", "subagent-stop", "sess.1-agent.1.json"), "utf8"),
    /ENOENT/
  );
});

test("golden: plugin manifest packages Stop while runtime stays opt-in", async () => {
  const manifest = JSON.parse(await readFile(join(process.cwd(), ".codex-plugin", "plugin.json"), "utf8"));

  assert.ok(manifest.hooks.includes("./hooks/session-start.json"));
  assert.ok(manifest.hooks.includes("./hooks/user-prompt-submit.json"));
  assert.ok(manifest.hooks.includes("./hooks/pre-tool-use.json"));
  assert.equal(manifest.hooks.includes("./hooks/stop.json"), true);
});
