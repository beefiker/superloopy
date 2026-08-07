import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  hasEngineerTrigger,
  hasTeamTrigger,
  parseInvocation,
  runEngineerTriggerHook
} from "../src/engineer.js";
import { runUserPromptSubmitHook } from "../src/hooks.js";
import { createLoop } from "../src/loop.js";
import { updateSayItStraightOutput } from "../src/loop-output-style.js";

async function tempRepo() { return mkdtemp(join(tmpdir(), "superloopy-engineer-")); }

async function submitPrompt(prompt, cwd) {
  return runUserPromptSubmitHook({ hook_event_name: "UserPromptSubmit", cwd: cwd ?? await tempRepo(), prompt });
}

async function promptContext(prompt, cwd) {
  return JSON.parse(await submitPrompt(prompt, cwd)).hookSpecificOutput.additionalContext;
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

test("hasEngineerTrigger separates CLI references from explicit loop tasks", () => {
  for (const prompt of ["loopy loop status?", "loopy loop status.", "loopy loop status)", "loopy loop status --json"]) {
    assert.equal(hasEngineerTrigger(prompt), false, prompt);
  }
  assert.equal(hasEngineerTrigger("loopy loop review feedback until clean"), true);
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
  const context = await promptContext("loopy team migrate the auth module", repo);
  assert.match(context, /Crew fan-out \(team mode\)/);
  assert.match(context, /native subagent controls exposed by the current host/);
  assert.doesNotMatch(context, /multi_agent_v1|fork_context|run_in_background/);
  assert.match(context, /configured name when named selection is available/);
  assert.match(context, /model_unverified/);
  assert.match(context, /role_unverified/);
  assert.match(context, /franky/);
  assert.match(context, /zoro/);
  assert.match(context, /usopp/);
  assert.match(context, /jinbe/);
  assert.match(context, /robin/);
  assert.match(context, /nami/);
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
  const context = await promptContext("loopycrew migrate the auth module", repo);
  assert.match(context, /Crew fan-out \(team mode\)/);
  assert.match(context, /native subagent controls exposed by the current host/);
  // The connected keyword is stripped from the brief that seeds the loop.
  assert.match(context, /superloopy loop begin --brief 'migrate the auth module'/);
  assert.equal(existsSync(join(repo, ".superloopy", "goals.json")), false);
});

test("runUserPromptSubmitHook treats the standalone ultrawork keyword as team mode with a clean brief", async () => {
  const repo = await tempRepo();
  const context = await promptContext("ultrawork migrate the auth module", repo);
  assert.match(context, /Crew fan-out \(team mode\)/);
  assert.match(context, /native subagent controls exposed by the current host/);
  // The ultrawork keyword is stripped from the brief that seeds the loop.
  assert.match(context, /superloopy loop begin --brief 'migrate the auth module'/);
  assert.equal(existsSync(join(repo, ".superloopy", "goals.json")), false);
});

test("runUserPromptSubmitHook stays solo on a plain loopy task but advertises team mode", async () => {
  const repo = await tempRepo();
  const context = await promptContext("loopy add proof-backed login", repo);
  // Tier 1 baseline: no full playbook, but a conservative delegation line that names team mode.
  assert.doesNotMatch(context, /Crew fan-out \(team mode\)/);
  assert.match(context, /loopy team <task>/);
  assert.match(context, /genuinely independent slices/);
});

test("every full loop trigger receives say-it-straight output by default", async () => {
  for (const prompt of [
    "loopy ship login",
    "루피 로그인 배포",
    "loopy team ship login",
    "루피 크루 로그인 배포",
    "loopycrew ship login",
    "ultrawork ship login"
  ]) {
    const context = await promptContext(prompt);
    assert.match(context, /^Say It Straight loop output overlay$/m, prompt);
    assert.equal(context.match(/^Say It Straight loop output overlay$/gm)?.length, 1, prompt);
  }
});

test("active loops honor disable and re-enable without duplicate overlays", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  await updateSayItStraightOutput(repo, undefined, false);
  const disabled = await promptContext("loopy continue", repo);
  assert.doesNotMatch(disabled, /Say It Straight loop output overlay/u);

  await updateSayItStraightOutput(repo, undefined, true);
  const enabled = await promptContext("loopy continue", repo);
  assert.equal(enabled.match(/^Say It Straight loop output overlay$/gm)?.length, 1);
});

test("ADHD structure precedes say-it-straight wording", async () => {
  const context = await promptContext("loopy I have ADHD; keep this one step at a time");
  assert.ok(context.indexOf("ADHD-friendly output overlay") < context.indexOf("Say It Straight loop output overlay"));
  assert.match(context, /ADHD-friendly output.*owns structure/is);
});

test("runUserPromptSubmitHook uses plugin-root CLI fallback when available", async () => {
  const repo = await tempRepo();
  const previousPluginRoot = process.env.PLUGIN_ROOT;
  const previousClaudePluginRoot = process.env.CLAUDE_PLUGIN_ROOT;
  process.env.PLUGIN_ROOT = "C:\\Users\\me\\.codex\\plugins\\cache\\beefiker\\superloopy\\0.7.3";
  delete process.env.CLAUDE_PLUGIN_ROOT;
  try {
    const context = await promptContext("loopy add proof-backed login", repo);
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
    const context = await promptContext("loopy migrate the auth module", repo);
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
  const context = await promptContext("loopy team keep going", repo);
  assert.match(context, /A loop is already in progress/);
  assert.match(context, /Crew fan-out \(team mode\)/);
  assert.match(context, /native subagent controls exposed by the current host/);
  assert.doesNotMatch(context, /multi_agent_v1|fork_context|run_in_background/);
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
    const output = await submitPrompt(prompt, repo);
    assert.equal(output, "", `unexpected semantic steer for: ${prompt}`);
  }
  assert.equal(existsSync(join(repo, ".superloopy", "goals.json")), false);
});

test("runUserPromptSubmitHook uses the general loop for an explicitly invoked visual task", async () => {
  const repo = await tempRepo();
  const context = await promptContext("loopy build a landing page", repo);
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

test("loopy hook injects ADHD-friendly output only for qualifying cleaned briefs", async () => {
  for (const prompt of [
    "loopy I have ADHD; add login one step at a time",
    "루피 너무 막막해요. 한 단계씩 로그인 기능을 추가해줘",
    "loopy team I cannot focus; keep the migration action-first"
  ]) {
    const repo = await tempRepo();
    const output = await runUserPromptSubmitHook({
      hook_event_name: "UserPromptSubmit",
      cwd: repo,
      prompt
    });
    const context = JSON.parse(output).hookSpecificOutput.additionalContext;
    assert.match(context, /Superloopy loop engineer/);
    assert.match(context, /^ADHD-friendly output overlay$/m);
    assert.match(context, /never infer or assert.*diagnos/is);
    assert.equal(existsSync(join(repo, ".superloopy", "goals.json")), false);
  }
});

test("loopy hook leaves ordinary tasks and domain discussion on normal output", async () => {
  for (const prompt of [
    "loopy add proof-backed login",
    "loopy add ADHD accessibility copy to settings",
    "loopy fix the focus ring",
    "loopy URGENT!!! ship auth NOW",
    "loopy stop adhd mode",
    "loopy normal mode"
  ]) {
    const repo = await tempRepo();
    const output = await runUserPromptSubmitHook({
      hook_event_name: "UserPromptSubmit",
      cwd: repo,
      prompt
    });
    const context = JSON.parse(output).hookSpecificOutput.additionalContext;
    assert.match(context, /Superloopy loop engineer/);
    assert.doesNotMatch(context, /ADHD-friendly output overlay/);
  }
});

test("non-loopy ADHD-friendly requests do not activate the loop route", async () => {
  const repo = await tempRepo();
  const output = await runUserPromptSubmitHook({
    hook_event_name: "UserPromptSubmit",
    cwd: repo,
    prompt: "I have ADHD; keep this one step at a time"
  });

  assert.equal(output, "");
});

test("engineer hook preserves start guidance when the overlay loader returns empty", async () => {
  const context = await runEngineerTriggerHook({
    hook_event_name: "UserPromptSubmit",
    cwd: await tempRepo(),
    prompt: "loopy I have ADHD; use short steps"
  }, {
    statusForPayload: async () => { throw new Error("no plan"); },
    guideForPayload: () => { throw new Error("unused"); },
    renderSuperloopyContext: () => "",
    formatAdditionalContext: (_event, additionalContext) => additionalContext,
    loadAdhdFriendlyOutputOverlay: async () => ""
  });

  assert.match(context, /Superloopy loop engineer/);
  assert.match(context, /loop begin --brief/);
  assert.doesNotMatch(context, /ADHD-friendly output overlay/);
});

test("connected crew aliases retain normal guidance without loading the ADHD overlay", async () => {
  for (const prompt of [
    "loopycrew I have ADHD; keep this one step at a time",
    "ultrawork I have ADHD; keep this one step at a time"
  ]) {
    const payload = {
      hook_event_name: "UserPromptSubmit",
      cwd: await tempRepo(),
      prompt
    };
    const baseline = await runEngineerTriggerHook(payload, {
      statusForPayload: async () => { throw new Error("no plan"); },
      guideForPayload: () => { throw new Error("unused"); },
      renderSuperloopyContext: () => "",
      formatAdditionalContext: (_event, additionalContext) => additionalContext,
      loadAdhdFriendlyOutputOverlay: async () => ""
    });
    let loaderCalls = 0;
    const context = await runEngineerTriggerHook(payload, {
      statusForPayload: async () => { throw new Error("no plan"); },
      guideForPayload: () => { throw new Error("unused"); },
      renderSuperloopyContext: () => "",
      formatAdditionalContext: (_event, additionalContext) => additionalContext,
      loadAdhdFriendlyOutputOverlay: async () => {
        loaderCalls += 1;
        return "ADHD-friendly output overlay";
      }
    });

    assert.equal(loaderCalls, 0, prompt);
    assert.equal(context, baseline, prompt);
    assert.match(context, /Crew fan-out \(team mode\)/);
    assert.doesNotMatch(context, /ADHD-friendly output overlay/);
  }
});

test("qualifying loopy prompts append the overlay when resuming", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);

  const output = await runUserPromptSubmitHook({
    hook_event_name: "UserPromptSubmit",
    cwd: repo,
    prompt: "loopy I have ADHD; keep this one step at a time"
  });
  const context = JSON.parse(output).hookSpecificOutput.additionalContext;

  assert.match(context, /A loop is already in progress/);
  assert.match(context, /^ADHD-friendly output overlay$/m);
});

test("binding-blocked engineer guidance does not load or append the ADHD overlay", async () => {
  let loaderCalls = 0;
  const context = await runEngineerTriggerHook({
    hook_event_name: "UserPromptSubmit",
    cwd: await tempRepo(),
    prompt: "loopy I have ADHD; keep this one step at a time"
  }, {
    statusForPayload: async () => ({ binding: { resumable: false, status: "mismatch", next: null } }),
    guideForPayload: () => { throw new Error("unused"); },
    renderSuperloopyContext: () => "",
    formatAdditionalContext: (_event, additionalContext) => additionalContext,
    loadAdhdFriendlyOutputOverlay: async () => {
      loaderCalls += 1;
      return "ADHD-friendly output overlay";
    }
  });

  assert.equal(loaderCalls, 0);
  assert.equal(context, [
    "Superloopy loop engineer",
    "",
    "The repo-local Superloopy plan cannot resume here because its repository binding is mismatch.",
    "Do not mutate or resume this copied state. Return to the repository where the plan was created, or start a separate loop here."
  ].join("\n"));
});

test("aggregate-complete engineer guidance does not load or append the ADHD overlay", async () => {
  let loaderCalls = 0;
  const context = await runEngineerTriggerHook({
    hook_event_name: "UserPromptSubmit",
    cwd: await tempRepo(),
    prompt: "loopy I have ADHD; keep this one step at a time"
  }, {
    statusForPayload: async () => ({
      binding: { resumable: true },
      summary: { aggregateComplete: true },
      plan: {}
    }),
    guideForPayload: () => { throw new Error("unused"); },
    renderSuperloopyContext: () => "",
    formatAdditionalContext: (_event, additionalContext) => additionalContext,
    loadAdhdFriendlyOutputOverlay: async () => {
      loaderCalls += 1;
      return "ADHD-friendly output overlay";
    }
  });

  assert.equal(loaderCalls, 0);
  assert.match(context, /The current Superloopy aggregate is already complete/);
  assert.doesNotMatch(context, /ADHD-friendly output overlay/);
});

test("approved standalone support cues append the overlay on start with a cleaned brief", async () => {
  for (const { prompt, brief } of [
    {
      prompt: "loopy I have ADHD. Migrate the auth module",
      brief: "I have ADHD. Migrate the auth module"
    },
    {
      prompt: "루피 I cannot focus. Migrate the auth module",
      brief: "I cannot focus. Migrate the auth module"
    },
    {
      prompt: "loopy This task is overwhelming me. Add login",
      brief: "This task is overwhelming me. Add login"
    }
  ]) {
    const output = await runUserPromptSubmitHook({
      hook_event_name: "UserPromptSubmit",
      cwd: await tempRepo(),
      prompt
    });
    const context = JSON.parse(output).hookSpecificOutput.additionalContext;

    assert.deepEqual(parseInvocation(prompt), { orchestrate: false, brief });
    assert.match(context, /Superloopy loop engineer/);
    assert.ok(context.includes(`- Brief: ${brief}`));
    assert.match(context, /^ADHD-friendly output overlay$/m);
  }
});

test("approved direct presentation cues append the overlay on resume from a cleaned brief", async () => {
  for (const { prompt, brief } of [
    {
      prompt: "루피 Please fix this one step at a time",
      brief: "Please fix this one step at a time"
    },
    {
      prompt: "loopy Migrate auth one step at a time",
      brief: "Migrate auth one step at a time"
    },
    {
      prompt: "루피 한 단계씩 로그인 기능을 추가해줘",
      brief: "한 단계씩 로그인 기능을 추가해줘"
    }
  ]) {
    const repo = await tempRepo();
    await createLoop(repo, ["--brief", "Ship"]);
    const output = await runUserPromptSubmitHook({
      hook_event_name: "UserPromptSubmit",
      cwd: repo,
      prompt
    });
    const context = JSON.parse(output).hookSpecificOutput.additionalContext;

    assert.deepEqual(parseInvocation(prompt), { orchestrate: false, brief });
    assert.match(context, /A loop is already in progress/);
    assert.match(context, /^ADHD-friendly output overlay$/m);
  }
});

test("post-status fallback preserves a disabled loop output style", async () => {
  const context = await runEngineerTriggerHook({
    hook_event_name: "UserPromptSubmit",
    cwd: await tempRepo(),
    prompt: "loopy add login"
  }, {
    statusForPayload: async () => ({
      binding: { resumable: true },
      summary: { aggregateComplete: false },
      plan: { outputStyle: { sayItStraight: false } }
    }),
    guideForPayload: () => { throw new Error("guide unavailable"); },
    renderSuperloopyContext: () => "",
    formatAdditionalContext: (_event, additionalContext) => additionalContext,
    loadAdhdFriendlyOutputOverlay: async () => ""
  });

  assert.match(context, /Start now/);
  assert.doesNotMatch(context, /Say It Straight loop output overlay/u);
});

test("malformed successful status falls back to normal start guidance", async () => {
  const context = await runEngineerTriggerHook({
    hook_event_name: "UserPromptSubmit",
    cwd: await tempRepo(),
    prompt: "loopy add login"
  }, {
    statusForPayload: async () => ({}),
    guideForPayload: () => { throw new Error("unused"); },
    renderSuperloopyContext: () => "",
    formatAdditionalContext: (_event, additionalContext) => additionalContext,
    loadAdhdFriendlyOutputOverlay: async () => ""
  });

  assert.match(context, /Superloopy loop engineer/);
  assert.match(context, /Start now/);
  assert.match(context, /- Brief: add login/);
  assert.doesNotMatch(context, /A loop is already in progress/);
});
