# Say It Straight Loopy Default Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `say-it-straight` the default style for user-facing progress and final responses throughout every full Loopy run, with a durable current-loop-only off/on control.

**Architecture:** Add one dependency-free `loop-output-style` module that owns the default, exact command parsing, effective-value fallback, atomic plan mutation, and compact overlay text. Persist the setting in each loop plan, then consume it from the prompt hook, loop engineer, Stop continuation, and compaction recovery without granting authority to rewrite task artifacts.

**Tech Stack:** Node.js 22+, ECMAScript modules, built-in `node:test`, existing Superloopy JSON state/ledger/atomic-lock helpers; no new dependencies.

## Global Constraints

- New global and scoped loops default to `outputStyle.sayItStraight: true`.
- Legacy plans without `outputStyle` read as enabled without a migration write.
- The default affects only user-facing progress reports and the final answer; it never silently rewrites code, documentation, evidence, comments, quotations, or user source text.
- Exact controls are `say-it-straight off`, `직설 모드 끄기`, `say-it-straight on`, and `직설 모드 켜기`, with surrounding whitespace and one optional terminal punctuation mark accepted.
- Controls mutate only an existing resumable, incomplete loop and are scoped by `session_id` when present.
- A new loop or intentional `--force` replacement resets the default to enabled.
- `i-have-adhd` owns structure; `say-it-straight` owns wording inside that structure; `humanize-korean` retains authority over Korean task-artifact rewriting.
- System, developer, user, safety, task, evidence, validation, and completion requirements outrank the output overlay.
- Preserve the existing humanize-korean changes in the primary checkout and do not add dependencies.

---

### Task 1: Add durable loop output-style state

**Files:**
- Create: `src/loop-output-style.js`
- Create: `test/loop-output-style.test.js`
- Modify: `src/loop.js:1-75`

**Interfaces:**
- Produces: `defaultLoopOutputStyle(): { sayItStraight: true }`.
- Produces: `isSayItStraightEnabled(plan: object): boolean`; only an exact stored `false` disables the default.
- Produces: `parseLoopOutputStyleControl(prompt: unknown): null | { enabled: boolean, command: string }`.
- Produces: `renderSayItStraightLoopOverlay(enabled: boolean): string`; disabled returns an empty string.
- Produces: `updateSayItStraightOutput(cwd: string, scope: { sessionId: string } | undefined, enabled: boolean): Promise<{ enabled: boolean, plan: object }>`.
- Consumes: `readPlan`, `writePlan`, `goalsPath`, `withFileLock`, `appendLedger`, and `nowIso` from `src/store.js`.

- [ ] **Step 1: Write failing state and parser tests**

Create `test/loop-output-style.test.js` with real temporary repositories. Cover the public interfaces and persisted plan state:

```js
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  defaultLoopOutputStyle,
  isSayItStraightEnabled,
  parseLoopOutputStyleControl,
  renderSayItStraightLoopOverlay,
  updateSayItStraightOutput
} from "../src/loop-output-style.js";
import { createLoop, statusLoop } from "../src/loop.js";

const tempRepo = () => mkdtemp(join(tmpdir(), "superloopy-output-style-"));

test("new global and scoped loops default say-it-straight on", async () => {
  const repo = await tempRepo();
  const global = await createLoop(repo, ["--brief", "Ship"]);
  const scoped = await createLoop(repo, ["--session-id", "beta", "--brief", "Verify"]);
  assert.deepEqual(global.plan.outputStyle, { sayItStraight: true });
  assert.deepEqual(scoped.plan.outputStyle, { sayItStraight: true });
});

test("legacy plans without outputStyle read as enabled", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Legacy"]);
  const path = join(repo, ".superloopy", "goals.json");
  const plan = JSON.parse(await readFile(path, "utf8"));
  delete plan.outputStyle;
  await writeFile(path, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
  const before = await readFile(path, "utf8");
  assert.equal(isSayItStraightEnabled((await statusLoop(repo)).plan), true);
  assert.equal(await readFile(path, "utf8"), before);
  assert.equal(isSayItStraightEnabled({ outputStyle: { sayItStraight: false } }), false);
});

test("force replacement resets a disabled loop to enabled", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "First"]);
  await updateSayItStraightOutput(repo, undefined, false);
  const replacement = await createLoop(repo, ["--force", "--brief", "Second"]);
  assert.equal(isSayItStraightEnabled(replacement.plan), true);
});

test("manual controls accept only exact standalone English and Korean commands", () => {
  for (const prompt of ["say-it-straight off", "say-it-straight off.", "직설 모드 끄기", "직설 모드 끄기!"]) {
    assert.equal(parseLoopOutputStyleControl(prompt)?.enabled, false, prompt);
  }
  for (const prompt of ["say-it-straight on", "직설 모드 켜기?"]) {
    assert.equal(parseLoopOutputStyleControl(prompt)?.enabled, true, prompt);
  }
  for (const prompt of ["please say-it-straight off", "quote 'say-it-straight off'", "say-it-straight off now", "직설 모드 끄기를 문서화해줘"]) {
    assert.equal(parseLoopOutputStyleControl(prompt), null, prompt);
  }
});

test("a scoped update changes only that loop and appends a ledger event", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Global"]);
  await createLoop(repo, ["--session-id", "beta", "--brief", "Scoped"]);
  await updateSayItStraightOutput(repo, { sessionId: "beta" }, false);
  assert.equal(isSayItStraightEnabled((await statusLoop(repo)).plan), true);
  assert.equal(isSayItStraightEnabled((await statusLoop(repo, ["--session-id", "beta"])).plan), false);
  const ledger = await readFile(join(repo, ".superloopy", "sessions", "beta", "ledger.jsonl"), "utf8");
  assert.match(ledger, /"kind":"output_style_changed"/u);
  assert.match(ledger, /"sayItStraight":false/u);
});

test("the compact overlay preserves authority and artifact isolation", () => {
  const overlay = renderSayItStraightLoopOverlay(true);
  assert.match(overlay, /user-facing progress reports and final answers/u);
  assert.match(overlay, /Do not silently rewrite task artifacts/u);
  assert.match(overlay, /evidence, validation, and completion requirements/u);
  assert.equal(renderSayItStraightLoopOverlay(false), "");
  assert.deepEqual(defaultLoopOutputStyle(), { sayItStraight: true });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test test/loop-output-style.test.js`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/loop-output-style.js`.

- [ ] **Step 3: Implement the minimal output-style module**

Create `src/loop-output-style.js` with these behaviors:

```js
import {
  appendLedger,
  goalsPath,
  nowIso,
  readPlan,
  withFileLock,
  writePlan
} from "./store.js";

const CONTROL_PATTERN = /^(?:say-it-straight\s+(off|on)|(직설\s+모드\s+(끄기|켜기)))[.!?。！？]?$/iu;

export function defaultLoopOutputStyle() {
  return { sayItStraight: true };
}

export function isSayItStraightEnabled(plan) {
  return plan?.outputStyle?.sayItStraight !== false;
}

export function parseLoopOutputStyleControl(prompt) {
  if (typeof prompt !== "string") return null;
  const command = prompt.trim();
  const match = CONTROL_PATTERN.exec(command);
  if (!match) return null;
  return {
    enabled: String(match[1] ?? match[3]).toLowerCase() === "on" || match[3] === "켜기",
    command
  };
}

export function renderSayItStraightLoopOverlay(enabled) {
  if (!enabled) return "";
  return [
    "Say It Straight loop output overlay",
    "",
    "Apply this wording style only to user-facing progress reports and final answers.",
    "Lead with the result, progress, blocker, or next required action.",
    "Include only context needed to use the update correctly.",
    "Keep required caveats, commands, evidence, validation, and completion requirements intact.",
    "Do not silently rewrite task artifacts, code, documentation, comments, evidence, quotations, or user source text.",
    "When ADHD-friendly output also applies, it owns structure and this overlay improves wording inside that structure.",
    "Stop when the update or final answer is complete."
  ].join("\n");
}

export async function updateSayItStraightOutput(cwd, scope, enabled) {
  if (typeof enabled !== "boolean") throw new Error("say-it-straight state must be boolean.");
  return withFileLock(goalsPath(cwd, scope), async () => {
    const plan = await readPlan(cwd, scope);
    if (plan.aggregateCompletion?.status === "complete") {
      throw new Error("The current Superloopy loop is already complete.");
    }
    const now = nowIso();
    plan.outputStyle = { ...(plan.outputStyle ?? {}), sayItStraight: enabled };
    plan.updatedAt = now;
    await writePlan(cwd, plan, scope);
    await appendLedger(cwd, { at: now, kind: "output_style_changed", sayItStraight: enabled }, scope);
    return { enabled, plan };
  });
}
```

Modify `createLoop` in `src/loop.js` to add `outputStyle: defaultLoopOutputStyle()` to every new plan, after `ledgerPath` and before `goals`.

- [ ] **Step 4: Run state tests and verify GREEN**

Run: `node --test test/loop-output-style.test.js test/loop.test.js`

Expected: all tests pass with no warnings.

- [ ] **Step 5: Commit the state slice**

```bash
git add src/loop-output-style.js src/loop.js test/loop-output-style.test.js
git commit -m "feat: persist Loopy output style"
```

---

### Task 2: Add exact current-loop off/on prompt controls

**Files:**
- Modify: `src/hooks.js:1-110,420-510`
- Modify: `test/hooks.test.js:1-430`

**Interfaces:**
- Consumes: `parseLoopOutputStyleControl`, `updateSayItStraightOutput`, `isSayItStraightEnabled`, and `renderSayItStraightLoopOverlay` from Task 1.
- Produces: `runUserPromptSubmitHook(payload, options = {}): Promise<string>` with optional `options.updateSayItStraightOutput` dependency injection for the write-failure test.
- Produces: `runOutputStyleControlHook(payload, control, updateOutputStyle): Promise<string>` as a private hook helper.
- Preserves: structured `SUPERLOOPY_STEER`, full-loop triggers, guidance-only aliases, and opt-in auto-context routing.

- [ ] **Step 1: Write failing prompt-control integration tests**

Add tests to `test/hooks.test.js` that call the real `runUserPromptSubmitHook` and inspect persisted state:

```js
test("exact output-style controls disable and re-enable only the current loop", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  const off = await runUserPromptSubmitHook({
    hook_event_name: "UserPromptSubmit",
    cwd: repo,
    prompt: "직설 모드 끄기"
  });
  assert.match(JSON.parse(off).hookSpecificOutput.additionalContext, /disabled for the current loop/u);
  assert.equal((await statusLoop(repo)).plan.outputStyle.sayItStraight, false);

  const on = await runUserPromptSubmitHook({
    hook_event_name: "UserPromptSubmit",
    cwd: repo,
    prompt: "say-it-straight on"
  });
  assert.match(JSON.parse(on).hookSpecificOutput.additionalContext, /enabled for the current loop/u);
  assert.equal((await statusLoop(repo)).plan.outputStyle.sayItStraight, true);
});

test("a scoped control leaves the global loop unchanged", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Global"]);
  await createLoop(repo, ["--session-id", "beta", "--brief", "Scoped"]);
  await runUserPromptSubmitHook({
    hook_event_name: "UserPromptSubmit",
    cwd: repo,
    session_id: "beta",
    prompt: "say-it-straight off"
  });
  assert.equal((await statusLoop(repo)).plan.outputStyle.sayItStraight, true);
  assert.equal((await statusLoop(repo, ["--session-id", "beta"])).plan.outputStyle.sayItStraight, false);
});

test("near matches and quoted controls remain inert", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  for (const prompt of ["please say-it-straight off", "quote 'say-it-straight off'", "직설 모드 끄기를 문서화해줘"]) {
    assert.equal(await runUserPromptSubmitHook({ hook_event_name: "UserPromptSubmit", cwd: repo, prompt }), "");
  }
  assert.equal((await statusLoop(repo)).plan.outputStyle.sayItStraight, true);
});

test("a control without an active loop reports no mutation", async () => {
  const output = await runUserPromptSubmitHook({
    hook_event_name: "UserPromptSubmit",
    cwd: await tempRepo(),
    prompt: "say-it-straight off"
  });
  assert.match(JSON.parse(output).hookSpecificOutput.additionalContext, /No active Superloopy loop/u);
});
```

Add these completed, binding-blocked, and write-failure cases:

```js
test("completed loops refuse output-style mutation", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  const path = join(repo, ".superloopy", "goals.json");
  const plan = JSON.parse(await readFile(path, "utf8"));
  plan.aggregateCompletion = { status: "complete", completedAt: "2026-08-06T00:00:00.000Z" };
  await writeFile(path, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
  const before = await readFile(path, "utf8");
  const output = await runUserPromptSubmitHook({
    hook_event_name: "UserPromptSubmit",
    cwd: repo,
    prompt: "say-it-straight off"
  });
  assert.match(JSON.parse(output).hookSpecificOutput.additionalContext, /already complete/u);
  assert.equal(await readFile(path, "utf8"), before);
});

test("mismatched repository binding refuses output-style mutation", async () => {
  const source = await tempRepo();
  const target = await tempRepo();
  await createLoop(source, ["--brief", "Source"]);
  await mkdir(join(target, ".superloopy"), { recursive: true });
  const copied = await readFile(join(source, ".superloopy", "goals.json"));
  const targetPlan = join(target, ".superloopy", "goals.json");
  await writeFile(targetPlan, copied);
  const output = await runUserPromptSubmitHook({
    hook_event_name: "UserPromptSubmit",
    cwd: target,
    prompt: "say-it-straight off"
  });
  assert.match(JSON.parse(output).hookSpecificOutput.additionalContext, /binding is mismatch/u);
  assert.deepEqual(await readFile(targetPlan), copied);
});

test("write failure keeps the prior output style authoritative", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  const output = await runUserPromptSubmitHook({
    hook_event_name: "UserPromptSubmit",
    cwd: repo,
    prompt: "say-it-straight off"
  }, {
    updateSayItStraightOutput: async () => { throw new Error("locked write"); }
  });
  assert.match(JSON.parse(output).hookSpecificOutput.additionalContext, /prior loop setting remains authoritative/u);
  assert.equal((await statusLoop(repo)).plan.outputStyle.sayItStraight, true);
});
```

- [ ] **Step 2: Run the hook tests and verify RED**

Run: `node --test test/hooks.test.js`

Expected: FAIL because control prompts currently return an empty string and state remains enabled.

- [ ] **Step 3: Route exact controls before steering and ordinary trigger checks**

Change `runUserPromptSubmitHook` to accept `options = {}`. Parse the control immediately after payload validation and context-pressure checks. When present, pass `options.updateSayItStraightOutput ?? updateSayItStraightOutput` to a private helper that:

1. obtains `statusForPayload(payload)`;
2. rejects `binding.resumable === false` and aggregate-complete plans without mutation;
3. derives the authoritative scope with `scopeFromSessionId(status.plan.sessionId)`;
4. calls `updateSayItStraightOutput(payload.cwd, scope, control.enabled)`;
5. returns measured `UserPromptSubmit` context confirming `enabled` or `disabled` and `current loop only`;
6. appends the compact overlay to the enable confirmation but not the disable confirmation;
7. returns `No active Superloopy loop; no output style changed.` when no plan exists;
8. returns `Superloopy could not change the output style; the prior loop setting remains authoritative.` for locked-write or validation failure.

Do not add a CLI command or global configuration surface.

- [ ] **Step 4: Run prompt-control and regression tests**

Run: `node --test test/hooks.test.js test/steering-idempotency.test.js test/repository-binding.test.js`

Expected: all tests pass; steering and repository binding behavior remains unchanged.

- [ ] **Step 5: Commit the prompt-control slice**

```bash
git add src/hooks.js test/hooks.test.js
git commit -m "feat: control direct output per loop"
```

---

### Task 3: Inject the default into every full-loop response path

**Files:**
- Modify: `src/engineer.js:10-175`
- Modify: `src/hooks.js:245-420`
- Modify: `test/engineer.test.js:1-520`
- Modify: `test/hooks.test.js:400-540`

**Interfaces:**
- Consumes: `isSayItStraightEnabled(plan)` and `renderSayItStraightLoopOverlay(enabled)` from Task 1.
- Produces: one default overlay on fresh starts and one effective-state overlay on active/resumed/completed loop context.
- Produces: `renderSuperloopyContext(status, guide, options = { includeOutputStyle: true }): string`; the engineer passes `{ includeOutputStyle: false }` and composes overlays itself to prevent duplication.
- Preserves: `loadAdhdFriendlyOutputOverlay(brief)` and its qualifying-cue behavior.

- [ ] **Step 1: Write failing full-trigger and composition tests**

Add a table-driven test to `test/engineer.test.js`:

```js
test("every full loop trigger receives say-it-straight output by default", async () => {
  for (const prompt of [
    "loopy ship login",
    "루피 로그인 배포",
    "loopy team ship login",
    "루피 크루 로그인 배포",
    "loopycrew ship login",
    "ultrawork ship login"
  ]) {
    const output = await runUserPromptSubmitHook({
      hook_event_name: "UserPromptSubmit",
      cwd: await tempRepo(),
      prompt
    });
    const context = JSON.parse(output).hookSpecificOutput.additionalContext;
    assert.match(context, /^Say It Straight loop output overlay$/m, prompt);
    assert.equal(context.match(/^Say It Straight loop output overlay$/gm)?.length, 1, prompt);
  }
});
```

Add these active-loop and composition tests:

```js
test("active loops honor disable and re-enable without duplicate overlays", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  await updateSayItStraightOutput(repo, undefined, false);
  const disabled = JSON.parse(await runUserPromptSubmitHook({
    hook_event_name: "UserPromptSubmit",
    cwd: repo,
    prompt: "loopy continue"
  })).hookSpecificOutput.additionalContext;
  assert.doesNotMatch(disabled, /Say It Straight loop output overlay/u);

  await updateSayItStraightOutput(repo, undefined, true);
  const enabled = JSON.parse(await runUserPromptSubmitHook({
    hook_event_name: "UserPromptSubmit",
    cwd: repo,
    prompt: "loopy continue"
  })).hookSpecificOutput.additionalContext;
  assert.equal(enabled.match(/^Say It Straight loop output overlay$/gm)?.length, 1);
});

test("ADHD structure precedes say-it-straight wording", async () => {
  const context = JSON.parse(await runUserPromptSubmitHook({
    hook_event_name: "UserPromptSubmit",
    cwd: await tempRepo(),
    prompt: "loopy I have ADHD; keep this one step at a time"
  })).hookSpecificOutput.additionalContext;
  assert.ok(context.indexOf("ADHD-friendly output overlay") < context.indexOf("Say It Straight loop output overlay"));
  assert.match(context, /ADHD-friendly output.*owns structure/is);
});
```

Add Stop-hook coverage to `test/hooks.test.js`:

```js
test("Stop continuation follows the durable output-style setting", async () => withStopHookEnabled(async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  const enabled = JSON.parse(await runStopHook({
    hook_event_name: "Stop",
    cwd: repo,
    stop_hook_active: false
  })).reason;
  assert.match(enabled, /Say It Straight loop output overlay/u);

  await updateSayItStraightOutput(repo, undefined, false);
  const disabled = JSON.parse(await runStopHook({
    hook_event_name: "Stop",
    cwd: repo,
    stop_hook_active: false
  })).reason;
  assert.doesNotMatch(disabled, /Say It Straight loop output overlay/u);
}));

test("guidance-only aliases do not activate the full-loop output default", async () => {
  for (const prompt of ["loopywork ship", "lpy ship", "$lpy ship"]) {
    const repo = await tempRepo();
    const context = JSON.parse(await runUserPromptSubmitHook({
      hook_event_name: "UserPromptSubmit",
      cwd: repo,
      prompt
    })).hookSpecificOutput.additionalContext;
    assert.doesNotMatch(context, /Say It Straight loop output overlay/u);
    assert.equal(existsSync(join(repo, ".superloopy", "goals.json")), false);
  }
});
```

Add Stop-hook tests to `test/hooks.test.js` that assert enabled continuation reasons contain the overlay and disabled continuation reasons do not. Assert `loopywork`, `lpy`, and `$lpy` without an existing full loop still do not create state or claim full-loop activation.

- [ ] **Step 2: Run engineer and hook tests and verify RED**

Run: `node --test test/engineer.test.js test/hooks.test.js`

Expected: FAIL because no Say It Straight loop overlay is currently injected.

- [ ] **Step 3: Implement start, resume, completion, context, and continuation injection**

In `src/engineer.js`:

- replace `withAdhdOverlay` with `withOutputOverlays(lines, adhdOverlay, sayItStraightOverlay)`, appending ADHD first and Say It Straight second;
- fresh full-loop triggers pass `renderSayItStraightLoopOverlay(true)`;
- active/resumed loops call `renderSuperloopyContext(status, guide, { includeOutputStyle: false })` and pass the effective plan overlay separately;
- aggregate-complete guidance appends the overlay only when `isSayItStraightEnabled(status.plan)` is true;
- connected crew and `ultrawork` receive the same default even though they intentionally skip automatic ADHD cue loading;
- keep ADHD structure precedence explicit when both overlays are present.

In `src/hooks.js`:

- extend `renderSuperloopyContext` with `options = {}` and append the effective overlay unless `options.includeOutputStyle === false`;
- append it to `renderContinuationDirective(status, guide)`;
- do not append it for a disabled plan;
- do not change guidance-only starter behavior when no full plan exists;
- keep evidence, proof-plan, and completion instructions before any presentation-only overlay.

- [ ] **Step 4: Run the full trigger and continuation regression set**

Run: `node --test test/loop-output-style.test.js test/engineer.test.js test/hooks.test.js test/golden-hooks.test.js test/golden-continuation.test.js test/adhd-output.test.js`

Expected: all tests pass with exactly one Say It Straight overlay per full-loop context.

- [ ] **Step 5: Commit the routing slice**

```bash
git add src/engineer.js src/hooks.js test/engineer.test.js test/hooks.test.js
git commit -m "feat: default Loopy responses to direct output"
```

---

### Task 4: Preserve output style through compaction and document the boundary

**Files:**
- Modify: `src/compaction-recovery.js:1-55`
- Modify: `test/compaction-recovery.test.js:1-100`
- Modify: `skills/superloopy-loop/SKILL.md:10-35`
- Modify: `skills/say-it-straight/SKILL.md:1-42`
- Modify: `README.md:43-58`
- Modify: `README.ko.md` matching skill table and trigger paragraph
- Modify: `README.ja.md` matching skill table and trigger paragraph
- Modify: `README.zh-CN.md` matching skill table and trigger paragraph
- Modify: `README.es.md` matching skill table and trigger paragraph
- Modify: `test/say-it-straight.test.js:1-55`
- Modify: `test/docs.test.js` localized skill assertions
- Modify: `test/plugin.test.js` packaged skill metadata assertions
- Modify: `docs/superloopy-design-audit.md` decision table
- Modify: `docs/superloopy-file-audit.md` inventory rows
- Modify: `docs/superloopy-loop-golden-set.md` inventory rows

**Interfaces:**
- Consumes: `isSayItStraightEnabled` and `renderSayItStraightLoopOverlay` from Task 1.
- Extends: recovery projection with `sayItStraight: boolean`.
- Preserves: explicit-only host invocation metadata for direct prose editing (`disable-model-invocation: true` and `allow_implicit_invocation: false`).

- [ ] **Step 1: Write failing recovery and documentation contract tests**

Extend `test/compaction-recovery.test.js`:

```js
test("compaction recovery carries the effective loop output style", async () => {
  const repo = await activeRepo();
  const enabled = projection(await statusLoop(repo));
  assert.equal(enabled.sayItStraight, true);
  assert.match(renderRecoveryCapsule(enabled), /Say It Straight loop output overlay/u);

  await updateSayItStraightOutput(repo, undefined, false);
  const disabled = projection(await statusLoop(repo));
  assert.equal(disabled.sayItStraight, false);
  assert.match(renderRecoveryCapsule(disabled), /Say It Straight output: disabled for this loop/u);
  assert.doesNotMatch(renderRecoveryCapsule(disabled), /^Say It Straight loop output overlay$/m);
});
```

Update documentation tests to require all localized README rows to distinguish explicit source/artifact rewriting from the default full-loop progress/final overlay. Update `test/say-it-straight.test.js` and `test/plugin.test.js` so explicit invocation metadata remains disabled while the skill body documents the bounded Loopy composition.

- [ ] **Step 2: Run focused recovery and documentation tests and verify RED**

Run: `node --test test/compaction-recovery.test.js test/say-it-straight.test.js test/docs.test.js test/plugin.test.js`

Expected: FAIL because recovery and public docs do not yet expose the loop default.

- [ ] **Step 3: Implement compaction projection and bounded recovery output**

Add `sayItStraight: isSayItStraightEnabled(status.plan)` in `buildRecoveryProjection`. In `renderRecoveryCapsule`, include either the compact overlay or the exact line `Say It Straight output: disabled for this loop.` Keep the aggregate-completion and next-action lines inside the mandatory truncation budget.

- [ ] **Step 4: Update user-facing documentation and repository audit records**

Document these exact boundaries across the loop skill and localized READMEs:

- full Loopy runs default to direct, concise, complete progress and final responses;
- exact English/Korean controls affect only the current incomplete loop;
- direct editing of supplied prose or task artifacts remains explicit-only;
- new loops reset the default to enabled;
- ADHD and Korean ownership precedence remains unchanged.

Keep `skills/say-it-straight/agents/openai.yaml` implicit invocation disabled. Add a `say-it-straight-loop-default` decision row to `docs/superloopy-design-audit.md`. Add inventory rows for `src/loop-output-style.js`, `test/loop-output-style.test.js`, and this approved plan to both repository inventories.

- [ ] **Step 5: Run recovery, documentation, package, and inventory tests**

Run: `node --test test/compaction-recovery.test.js test/say-it-straight.test.js test/docs.test.js test/plugin.test.js test/audit.test.js test/file-audit.test.js`

Expected: all tests pass. The pre-existing untracked `.superpowers/brainstorm` files must not be deleted, staged, inventoried, or modified. For the inventory tests, create `/private/tmp/superloopy-loop-default-test-excludes` with `apply_patch` containing exactly `.superpowers/`, then run:

```bash
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.excludesfile GIT_CONFIG_VALUE_0=/private/tmp/superloopy-loop-default-test-excludes node --test test/compaction-recovery.test.js test/say-it-straight.test.js test/docs.test.js test/plugin.test.js test/audit.test.js test/file-audit.test.js
```

Delete only that temporary exclude file with `apply_patch` after the test command finishes.

- [ ] **Step 6: Commit recovery and documentation**

```bash
git add src/compaction-recovery.js test/compaction-recovery.test.js skills/superloopy-loop/SKILL.md skills/say-it-straight/SKILL.md README.md README.ko.md README.ja.md README.zh-CN.md README.es.md test/say-it-straight.test.js test/docs.test.js test/plugin.test.js docs/superloopy-design-audit.md docs/superloopy-file-audit.md docs/superloopy-loop-golden-set.md
git add -f docs/superpowers/plans/2026-08-06-say-it-straight-loop-default.md
git commit -m "docs: publish Loopy direct output default"
```

---

### Task 5: Run final regression and preservation gates

**Files:**
- Modify only if a verified regression requires a narrow repair: files already named in Tasks 1-4
- Preserve unchanged: `skills/humanize-korean/references/quick-rules.md`
- Preserve unchanged: `skills/humanize-korean/scripts/audit-humanize-output.mjs`
- Preserve unchanged: `test/humanize-korean.test.js`

**Interfaces:**
- Consumes: all Task 1-4 behavior and documentation.
- Produces: a clean dependency-free package verification with no unrelated edits.

- [ ] **Step 1: Prepare a process-only inventory exclusion**

Create `/private/tmp/superloopy-loop-default-final-excludes` with `apply_patch` containing exactly:

```text
.superpowers/
```

This preserves the pre-existing generated files while keeping them outside Git-visible inventory checks.

- [ ] **Step 2: Run the complete Node test suite**

Run: `GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.excludesfile GIT_CONFIG_VALUE_0=/private/tmp/superloopy-loop-default-final-excludes node --test`

Expected: zero failures and zero cancellations.

- [ ] **Step 3: Run doctor and inspect the result**

Run: `GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.excludesfile GIT_CONFIG_VALUE_0=/private/tmp/superloopy-loop-default-final-excludes node src/cli.js doctor --json`

Expected: JSON reports `"ok": true`, includes `say-it-straight` in required skills, and reports no file-audit or package failure.

- [ ] **Step 4: Verify package contents from a clean committed archive without publishing**

Run these commands in order:

```bash
mkdir /private/tmp/superloopy-loop-default-package-20260806
git archive --format=tar HEAD -o /private/tmp/superloopy-loop-default-package-20260806.tar
tar -xf /private/tmp/superloopy-loop-default-package-20260806.tar -C /private/tmp/superloopy-loop-default-package-20260806
```

Then run `npm pack --dry-run --json --ignore-scripts` with working directory `/private/tmp/superloopy-loop-default-package-20260806`.

Expected: exit 0; output includes both Superloopy skills, `src/loop-output-style.js`, and no dependency installation or publish action.

- [ ] **Step 5: Verify diff integrity and scope**

Run:

```bash
git diff --check
git status --short --untracked-files=all
git diff -- skills/humanize-korean/references/quick-rules.md skills/humanize-korean/scripts/audit-humanize-output.mjs test/humanize-korean.test.js
```

Expected: no whitespace errors; only planned files plus the preserved pre-existing `.superpowers/brainstorm` artifacts appear; the three humanize-korean paths have no feature-worktree diff.

- [ ] **Step 6: Verify the primary checkout's preserved humanize-korean bytes**

Run from `/Users/bee/Documents/Personal/superloopy`:

```bash
shasum -a 256 skills/humanize-korean/references/quick-rules.md skills/humanize-korean/scripts/audit-humanize-output.mjs test/humanize-korean.test.js
```

Expected hashes:

```text
c630e3d11a459190b97ec8c685e99bdaa5c3a6c2339f7c5e44e571e9530b1b69  skills/humanize-korean/references/quick-rules.md
356879c4fdcd991585d6ec25d0ad064a5b03728c5100990c6ff7d4aeadaa1f76  skills/humanize-korean/scripts/audit-humanize-output.mjs
28643070b8efa9daa48fc9f650c86346a31aa42f5dc744b64b97218eff297f03  test/humanize-korean.test.js
```

- [ ] **Step 7: Remove the process-only exclude file and commit only if verification required a repair**

Delete `/private/tmp/superloopy-loop-default-final-excludes` with `apply_patch`. Do not delete or modify `.superpowers/brainstorm`.

If Tasks 1-4 already produced a clean final state, do not create an empty commit. If a verified regression required a narrow repair, stage only the repaired planned files and commit with:

```bash
git commit -m "fix: close Loopy output style regressions"
```
