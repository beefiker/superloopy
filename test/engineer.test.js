import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { hasEngineerTrigger, hasFrontendTrigger, hasKoreanWritingTrigger, hasTeamTrigger, parseInvocation, renderFrontendTriggerContext } from "../src/engineer.js";
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

test("hasFrontendTrigger fires on UI/visual intent and stays quiet on backend work", () => {
  assert.equal(hasFrontendTrigger("build a landing page for the product"), true);
  assert.equal(hasFrontendTrigger("the UI looks generic, make it look professional"), true);
  assert.equal(hasFrontendTrigger("redesign the navbar with a dark mode"), true);
  assert.equal(hasFrontendTrigger("style this component with Tailwind"), true);
  assert.equal(hasFrontendTrigger("set up a design system and color palette"), true);

  assert.equal(hasFrontendTrigger("design the database schema for orders"), false);
  assert.equal(hasFrontendTrigger("fix the memory layout of the buffer"), false);
  assert.equal(hasFrontendTrigger("add a retry to the payment API"), false);
  assert.equal(hasFrontendTrigger(""), false);
  assert.equal(hasFrontendTrigger(null), false);
});

test("hasFrontendTrigger excludes systems vocabulary that shares UI keywords", () => {
  // "responsive" as reactivity/latency, not responsive design.
  assert.equal(hasFrontendTrigger("make the server responsive to incoming signals"), false);
  assert.equal(hasFrontendTrigger("the payment API endpoint is unresponsive under load"), false);
  assert.equal(hasFrontendTrigger("keep the worker responsive to backpressure requests"), false);
  // "UI thread" as concurrency, not the user-interface surface.
  assert.equal(hasFrontendTrigger("fix the UI thread deadlock in the native runtime"), false);
  // Genuine responsive-design intent still fires despite the shared word.
  assert.equal(hasFrontendTrigger("make the landing page responsive on mobile"), true);
  assert.equal(hasFrontendTrigger("the layout is not responsive at 768px"), true);
  // "responsive to <visual target>" is real responsive design — a named visual target
  // overrides the responsive-to systems guard (PR #11 reviewer case).
  assert.equal(hasFrontendTrigger("make the landing page responsive to different screen sizes"), true);
  assert.equal(hasFrontendTrigger("make the pricing page responsive to mobile breakpoints"), true);
  assert.equal(hasFrontendTrigger("the component should be responsive to the viewport width"), true);
  // An explicit frontend trigger wins over a non-systems "responsive to" object: only
  // adjacent backend/systems vocabulary suppresses (PR #11 second-round reviewer case).
  assert.equal(hasFrontendTrigger("make the UI responsive to touch input"), true);
  assert.equal(hasFrontendTrigger("make the UI responsive to dark mode changes"), true);
  // A mixed backend+UI prompt: an unambiguous visual trigger wins over a systems phrase
  // elsewhere — the exclusion only gates the ambiguous shared tokens (PR #11 third-round case).
  assert.equal(hasFrontendTrigger("fix the API endpoint that is unresponsive and redesign the navbar"), true);
  assert.equal(hasFrontendTrigger("the worker queue is unresponsive; also restyle the pricing page"), true);
  // Mixed prompt where the UI half uses ONLY ambiguous tokens: the systems clause must not
  // veto the separate UI clause (PR #11 fourth-round case). Clause-local exclusion.
  assert.equal(hasFrontendTrigger("fix the unresponsive API and make the UI responsive"), true);
  assert.equal(hasFrontendTrigger("the server is unresponsive and the ui feels sluggish"), true);
  // Same clause, both a systems noun and a real UI token: the systems match disqualifies
  // only itself, so the standalone "ui" token still fires.
  assert.equal(hasFrontendTrigger("make the API dashboard ui responsive"), true);
  // But a single systems clause with no separate UI ask stays excluded.
  assert.equal(hasFrontendTrigger("make the server responsive to incoming signals"), false);
  assert.equal(hasFrontendTrigger("make the API endpoint responsive under load"), false);
  assert.equal(hasFrontendTrigger("restart the api and drain the worker queue"), false);
});

test("runUserPromptSubmitHook steers UI prompts to the frontend skill without mutating state", async () => {
  const repo = await tempRepo();
  const output = await runUserPromptSubmitHook({
    hook_event_name: "UserPromptSubmit",
    cwd: repo,
    prompt: "build a landing page hero that does not look generic"
  });
  const parsed = JSON.parse(output);
  assert.equal(parsed.hookSpecificOutput.hookEventName, "UserPromptSubmit");
  assert.match(parsed.hookSpecificOutput.additionalContext, /Superloopy frontend trigger/);
  assert.match(parsed.hookSpecificOutput.additionalContext, /DESIGN\.md/);
  assert.match(parsed.hookSpecificOutput.additionalContext, /\.superloopy\/evidence\/frontend\//);
  assert.equal(existsSync(join(repo, ".superloopy", "goals.json")), false);
});

test("runUserPromptSubmitHook suppresses the frontend steer when SUPERLOOPY_FRONTEND_STEER=off", async () => {
  const repo = await tempRepo();
  const previous = process.env.SUPERLOOPY_FRONTEND_STEER;
  process.env.SUPERLOOPY_FRONTEND_STEER = "off";
  try {
    const output = await runUserPromptSubmitHook({
      hook_event_name: "UserPromptSubmit",
      cwd: repo,
      prompt: "build a landing page hero that does not look generic"
    });
    assert.equal(output, "");
    assert.equal(existsSync(join(repo, ".superloopy", "goals.json")), false);
  } finally {
    if (previous === undefined) delete process.env.SUPERLOOPY_FRONTEND_STEER;
    else process.env.SUPERLOOPY_FRONTEND_STEER = previous;
  }
});

test("renderFrontendTriggerContext adds Superpowers coexistence routing only when detected", () => {
  const withSuperpowers = renderFrontendTriggerContext({ installed: true, source: "env-override" });
  assert.match(withSuperpowers, /Superloopy frontend trigger/);
  assert.match(withSuperpowers, /Superpowers coexistence/);
  assert.match(withSuperpowers, /one orchestrator/i);

  const solo = renderFrontendTriggerContext({ installed: false, source: "filesystem" });
  assert.match(solo, /Superloopy frontend trigger/);
  assert.doesNotMatch(solo, /Superpowers coexistence/);
});

test("runUserPromptSubmitHook frontend steer honors the Superpowers override env", async () => {
  const repo = await tempRepo();
  const previous = process.env.SUPERLOOPY_SUPERPOWERS;
  const prompt = "build a landing page hero that does not look generic";
  try {
    process.env.SUPERLOOPY_SUPERPOWERS = "on";
    const on = JSON.parse(await runUserPromptSubmitHook({ hook_event_name: "UserPromptSubmit", cwd: repo, prompt }));
    assert.match(on.hookSpecificOutput.additionalContext, /Superpowers coexistence/);

    process.env.SUPERLOOPY_SUPERPOWERS = "off";
    const off = JSON.parse(await runUserPromptSubmitHook({ hook_event_name: "UserPromptSubmit", cwd: repo, prompt }));
    assert.match(off.hookSpecificOutput.additionalContext, /Superloopy frontend trigger/);
    assert.doesNotMatch(off.hookSpecificOutput.additionalContext, /Superpowers coexistence/);
  } finally {
    if (previous === undefined) delete process.env.SUPERLOOPY_SUPERPOWERS;
    else process.env.SUPERLOOPY_SUPERPOWERS = previous;
  }
});

test("runUserPromptSubmitHook lets the loop engineer trigger win over the frontend steer", async () => {
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

test("hasKoreanWritingTrigger steers Korean prose generation without broad Korean prompts", () => {
  assert.equal(hasKoreanWritingTrigger("AI 티 안 나게 공지 써줘"), true);
  assert.equal(hasKoreanWritingTrigger("사람이 쓴 것처럼 소개글 써줘"), true);
  assert.equal(hasKoreanWritingTrigger("한국어로 글 써줘"), true);
  assert.equal(hasKoreanWritingTrigger("고객에게 보낼 이메일 작성해줘"), true);
  assert.equal(hasKoreanWritingTrigger("댓글 답변 써줘"), true);
  assert.equal(hasKoreanWritingTrigger("글써줘"), true);
  assert.equal(hasKoreanWritingTrigger("메일 문장 자연스럽게 다듬어줘"), true);

  assert.equal(hasKoreanWritingTrigger("번역해줘"), false);
  assert.equal(hasKoreanWritingTrigger("요약해줘"), false);
  assert.equal(hasKoreanWritingTrigger("영어로 글써줘"), false);
  assert.equal(hasKoreanWritingTrigger("일본어로 소개글 써줘"), false);
  assert.equal(hasKoreanWritingTrigger("코드 작성해줘"), false);
  assert.equal(hasKoreanWritingTrigger("코드 다듬어줘"), false);
  assert.equal(hasKoreanWritingTrigger("README 작성해줘"), false);
  assert.equal(hasKoreanWritingTrigger("README 문장 다듬어줘"), false);
  assert.equal(hasKoreanWritingTrigger("계약서 작성해줘"), false);
  assert.equal(hasKoreanWritingTrigger("애니메이션 자연스럽게 만들어줘"), false);
  assert.equal(hasKoreanWritingTrigger("UI 다듬어줘"), false);
  assert.equal(hasKoreanWritingTrigger("이 에러가 뭐야?"), false);
  assert.equal(hasKoreanWritingTrigger(""), false);
  assert.equal(hasKoreanWritingTrigger(null), false);
});

test("runUserPromptSubmitHook steers Korean writing prompts to post-generation humanization", async () => {
  const repo = await tempRepo();
  const output = await runUserPromptSubmitHook({
    hook_event_name: "UserPromptSubmit",
    cwd: repo,
    prompt: "고객에게 보낼 안내문 글써줘"
  });
  const parsed = JSON.parse(output);
  assert.equal(parsed.hookSpecificOutput.hookEventName, "UserPromptSubmit");
  assert.match(parsed.hookSpecificOutput.additionalContext, /Superloopy Korean writing trigger/);
  assert.match(parsed.hookSpecificOutput.additionalContext, /humanize-korean/);
  assert.match(parsed.hookSpecificOutput.additionalContext, /post-generation/);
  assert.equal(existsSync(join(repo, ".superloopy", "goals.json")), false);
});

test("runUserPromptSubmitHook stays quiet for explicit non-Korean writing targets", async () => {
  const repo = await tempRepo();
  const output = await runUserPromptSubmitHook({
    hook_event_name: "UserPromptSubmit",
    cwd: repo,
    prompt: "영어로 글써줘"
  });

  assert.equal(output, "");
  assert.equal(existsSync(join(repo, ".superloopy", "goals.json")), false);
});

test("runUserPromptSubmitHook keeps explicit loop and frontend triggers ahead of Korean writing steer", async () => {
  const repo = await tempRepo();
  const loopOutput = await runUserPromptSubmitHook({
    hook_event_name: "UserPromptSubmit",
    cwd: repo,
    prompt: "loopy 한국어로 글 써줘"
  });
  const loopContext = JSON.parse(loopOutput).hookSpecificOutput.additionalContext;
  assert.match(loopContext, /Superloopy loop engineer/);
  assert.doesNotMatch(loopContext, /Superloopy Korean writing trigger/);

  const frontendOutput = await runUserPromptSubmitHook({
    hook_event_name: "UserPromptSubmit",
    cwd: repo,
    prompt: "landing page hero 문구 써줘"
  });
  const frontendContext = JSON.parse(frontendOutput).hookSpecificOutput.additionalContext;
  assert.match(frontendContext, /Superloopy frontend trigger/);
  assert.doesNotMatch(frontendContext, /Superloopy Korean writing trigger/);
});

test("the Korean alias 루피 wakes the loop engineer like loopy", () => {
  assert.equal(hasEngineerTrigger("루피 로그인 버그 고쳐줘"), true);
  assert.equal(hasEngineerTrigger("루피"), true);
  assert.equal(hasEngineerTrigger("@루피 배포 준비해줘"), true);
  assert.equal(hasEngineerTrigger("loopy ship the fix"), true); // English path preserved
  assert.equal(hasEngineerTrigger("루팡 작업 시작"), false); // different word, not 루피
  assert.equal(hasEngineerTrigger("디버깅 도와줘"), false);

  // brief is stripped clean
  assert.deepEqual(parseInvocation("루피 로그인 고쳐줘"), { orchestrate: false, brief: "로그인 고쳐줘" });
});

test("Korean 팀/크루 escalate the alias to crew mode, but 팀워크 stays a brief", () => {
  assert.equal(hasTeamTrigger("루피 팀 인증 모듈 마이그레이션"), true);
  assert.equal(hasTeamTrigger("루피팀 대시보드"), true); // connected form
  assert.equal(hasTeamTrigger("루피 크루: 파서 리팩터"), true);
  assert.equal(hasTeamTrigger("루피 팀워크 페이지 만들어"), false); // 팀워크 != 팀
  assert.equal(hasTeamTrigger("루피 로그인 고쳐줘"), false);
  assert.deepEqual(parseInvocation("루피 팀 마이그레이션"), { orchestrate: true, brief: "마이그레이션" });
});
