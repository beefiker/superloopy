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
  assert.equal(hasEngineerTrigger("loopycrew가 왜 켜졌지?"), false);
  assert.equal(hasEngineerTrigger("ultrawork처럼 실행해"), false);
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
  assert.match(context, /"agent_type": "franky"/);
  assert.match(context, /"zoro"/);
  assert.match(context, /"usopp"/);
  assert.match(context, /"jinbe"/);
  assert.match(context, /"robin"/);
  assert.match(context, /"nami"/);
  assert.match(context, /requested repository path differs from `cwd`/);
  assert.match(context, /implementation worker must own a real bounded implementation slice/);
  assert.match(context, /jinbe-final-gate-report\.md/);
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

test("runUserPromptSubmitHook uses plugin-root CLI fallback when available", async () => {
  const repo = await tempRepo();
  const previousPluginRoot = process.env.PLUGIN_ROOT;
  const previousClaudePluginRoot = process.env.CLAUDE_PLUGIN_ROOT;
  process.env.PLUGIN_ROOT = "C:\\Users\\me\\.codex\\plugins\\cache\\beefiker\\superloopy\\0.7.3";
  delete process.env.CLAUDE_PLUGIN_ROOT;
  try {
    const output = await runUserPromptSubmitHook({
      hook_event_name: "UserPromptSubmit",
      cwd: repo,
      prompt: "loopy add proof-backed login"
    });
    const context = JSON.parse(output).hookSpecificOutput.additionalContext;
    const expectedCli = 'node "C:\\Users\\me\\.codex\\plugins\\cache\\beefiker\\superloopy\\0.7.3\\src\\cli.js"';
    assert.ok(context.includes(`${expectedCli} loop begin --brief 'add proof-backed login'`));
    assert.ok(context.includes(`${expectedCli} loop prove -- <validation-command>`));
    assert.doesNotMatch(context, /\$\{PLUGIN_ROOT\}/u);
  } finally {
    if (previousPluginRoot === undefined) delete process.env.PLUGIN_ROOT;
    else process.env.PLUGIN_ROOT = previousPluginRoot;
    if (previousClaudePluginRoot === undefined) delete process.env.CLAUDE_PLUGIN_ROOT;
    else process.env.CLAUDE_PLUGIN_ROOT = previousClaudePluginRoot;
  }
});

test("runUserPromptSubmitHook prefers Claude plugin root over bare command", async () => {
  const repo = await tempRepo();
  const previous = process.env.CLAUDE_PLUGIN_ROOT;
  process.env.CLAUDE_PLUGIN_ROOT = "C:\\Users\\me\\.claude\\plugins\\superloopy";
  try {
    const output = await runUserPromptSubmitHook({
      hook_event_name: "UserPromptSubmit",
      cwd: repo,
      prompt: "loopy migrate the auth module"
    });
    const context = JSON.parse(output).hookSpecificOutput.additionalContext;
    const expectedCli = 'node "C:\\Users\\me\\.claude\\plugins\\superloopy\\src\\cli.js"';
    assert.ok(context.includes(`${expectedCli} loop begin --brief 'migrate the auth module'`));
    assert.ok(context.includes(`${expectedCli} loop prove -- <validation-command>`));
    assert.doesNotMatch(context, /\$\{CLAUDE_PLUGIN_ROOT\}/u);
  } finally {
    if (previous === undefined) delete process.env.CLAUDE_PLUGIN_ROOT;
    else process.env.CLAUDE_PLUGIN_ROOT = previous;
  }
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

test("runUserPromptSubmitHook does not infer specialist modes from ordinary prompts", async () => {
  const repo = await tempRepo();
  const prompts = [
    "The backend error makes the UI fail. Diagnose the root cause.",
    "Fix the API; the UI symptom is only a consequence.",
    "build a landing page hero that does not look generic",
    "AI 티 안 나게 공지 써줘",
    "루피가 왜 켜졌지?",
    "please lpy ship the feature"
  ];

  for (const prompt of prompts) {
    const output = await runUserPromptSubmitHook({
      hook_event_name: "UserPromptSubmit",
      cwd: repo,
      prompt
    });
    assert.equal(output, "", `unexpected semantic steer for: ${prompt}`);
  }
  assert.equal(existsSync(join(repo, ".superloopy", "goals.json")), false);
});

test("runUserPromptSubmitHook uses the general loop for an explicitly invoked visual task", async () => {
  const repo = await tempRepo();
  const output = await runUserPromptSubmitHook({
    hook_event_name: "UserPromptSubmit",
    cwd: repo,
    prompt: "loopy build a landing page"
  });
  const context = JSON.parse(output).hookSpecificOutput.additionalContext;
  assert.match(context, /Superloopy loop engineer/);
  assert.doesNotMatch(context, /Superloopy frontend trigger/);
});

test("the Korean alias 루피 wakes the loop engineer like loopy", () => {
  assert.equal(hasEngineerTrigger("루피 로그인 버그 고쳐줘"), true);
  assert.equal(hasEngineerTrigger("루피"), true);
  assert.equal(hasEngineerTrigger("@루피 배포 준비해줘"), true);
  assert.equal(hasEngineerTrigger("loopy ship the fix"), true); // English path preserved
  assert.equal(hasEngineerTrigger("loopy\nship the fix"), true); // multiline briefs remain valid
  assert.equal(hasEngineerTrigger("루팡 작업 시작"), false); // different word, not 루피
  assert.equal(hasEngineerTrigger("loopy가 왜 켜졌지?"), false);
  assert.equal(hasEngineerTrigger("loopy는 뭐야?"), false);
  assert.equal(hasEngineerTrigger("루피가 왜 켜졌지?"), false);
  assert.equal(hasEngineerTrigger("루피처럼 동작해"), false);
  assert.equal(hasEngineerTrigger("loopy?"), false);
  assert.equal(hasEngineerTrigger("디버깅 도와줘"), false);

  // brief is stripped clean
  assert.deepEqual(parseInvocation("루피 로그인 고쳐줘"), { orchestrate: false, brief: "로그인 고쳐줘" });
  assert.deepEqual(parseInvocation("루피가 왜 켜졌지?"), { orchestrate: false, brief: "루피가 왜 켜졌지?" });
});

test("Korean 팀/크루 escalate the alias to crew mode, but 팀워크 stays a brief", () => {
  assert.equal(hasTeamTrigger("루피 팀 인증 모듈 마이그레이션"), true);
  assert.equal(hasTeamTrigger("루피팀 대시보드"), false); // explicit token requires a separator
  assert.equal(hasTeamTrigger("루피 크루: 파서 리팩터"), true);
  assert.equal(hasTeamTrigger("루피 팀워크 페이지 만들어"), false); // 팀워크 != 팀
  assert.equal(hasTeamTrigger("루피 로그인 고쳐줘"), false);
  assert.deepEqual(parseInvocation("루피 팀 마이그레이션"), { orchestrate: true, brief: "마이그레이션" });
});
