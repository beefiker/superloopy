# Explicit Frontend Activation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace semantic specialist prompt classification with explicit Superloopy invocation while preserving the packaged specialist workflows.

**Architecture:** `UserPromptSubmit` recognizes the existing explicit loop aliases and structured steering only; it no longer scans arbitrary prompts for UI intent. Frontend specialization remains available after explicit invocation through skill metadata whose activation boundary matches the hook contract.

**Tech Stack:** Node.js ES modules, built-in `node:test`, Markdown/YAML plugin metadata

## Global Constraints

- Add no dependencies.
- Preserve the packaged Korean humanizer skill and existing loop/steering behavior; remove only its semantic prompt-hook steer.
- Keep DESIGN.md, anti-slop, browser visual-QA, and evidence gates unchanged.
- Use complete-token matching for `loopy` and `루피`.

---

### Task 1: Lock the explicit invocation contract

**Files:**
- Modify: `test/engineer.test.js`
- Modify: `test/hooks.test.js`
- Modify: `src/engineer.js`

**Interfaces:**
- Consumes: `hasEngineerTrigger(prompt)` and `parseInvocation(prompt)`
- Produces: exact-token invocation behavior shared by engineer and hook paths

- [ ] **Step 1: Write failing tests**

Add assertions that Korean-particle suffixes do not activate `loopy`, `루피`, `loopycrew`, or `ultrawork`, while exact invocations still do. Change loose aliases so only leading, complete `loopywork`, `lpy`, and `$lpy` tokens activate. Preserve multiline briefs by accepting Unicode whitespace.

- [ ] **Step 2: Verify RED**

Run: `node --test test/hooks.test.js test/engineer.test.js`

Expected: FAIL because the current invocation regexes accept Korean suffixes and loose aliases inside ordinary prose.

- [ ] **Step 3: Implement complete-token syntax**

Replace word-boundary/prefix behavior with exact leading invocation patterns that accept only end-of-input, Unicode whitespace, `:`, or `,` after each alias. Require spaced `루피 팀` instead of connected `루피팀`.

- [ ] **Step 4: Verify GREEN**

Run: `node --test test/hooks.test.js test/engineer.test.js`

Expected: invocation boundary tests pass; frontend tests may still fail until Task 2 is complete.

### Task 2: Remove frontend semantic auto-routing

**Files:**
- Modify: `test/engineer.test.js`
- Modify: `src/engineer.js`
- Modify: `src/hooks.js`

**Interfaces:**
- Consumes: `runUserPromptSubmitHook(payload)`
- Produces: empty hook output for uninvoked UI and mixed backend/UI prompts

- [ ] **Step 1: Write failing regression tests**

Assert that each of these prompts returns an empty hook result with default environment settings:

```text
The backend error makes the UI fail. Diagnose the root cause.
Fix the API; the UI symptom is only a consequence.
Build a landing page hero that does not look generic.
AI 티 안 나게 공지 써줘.
```

- [ ] **Step 2: Verify RED**

Run: `node --test test/engineer.test.js`

Expected: FAIL because the current frontend classifier injects `Superloopy frontend trigger` context.

- [ ] **Step 3: Remove the classifier and hook branch**

Delete `hasFrontendTrigger`, `renderFrontendTriggerContext`, `hasKoreanWritingTrigger`, `renderKoreanWritingTriggerContext`, their semantic regex helpers/imports, and the `SUPERLOOPY_FRONTEND_STEER` branch. Keep explicit engineer, explicit loose aliases, structured steering, and opt-in auto-context paths unchanged. Remove `statusMessage` from `hooks/user-prompt-submit.json`.

- [ ] **Step 4: Verify GREEN**

Run: `node --test test/engineer.test.js test/hooks.test.js`

Expected: all focused hook behavior passes.

### Task 3: Align packaged skill activation and documentation

**Files:**
- Modify: `skills/superloopy-frontend/SKILL.md`
- Modify: `skills/superloopy-frontend/agents/openai.yaml`
- Modify: `test/plugin.test.js`
- Modify: `hooks/user-prompt-submit.json`
- Modify: `README.md`
- Modify: `README.ko.md`
- Modify: `README.ja.md`
- Modify: `README.zh-CN.md`
- Modify: `README.es.md`
- Modify: `docs/superloopy-design-audit.md`
- Modify: `docs/superloopy-file-audit.md`
- Modify: `docs/superloopy-loop-golden-set.md`

**Interfaces:**
- Consumes: Codex/Claude skill discovery metadata
- Produces: explicit-only frontend activation wording with unchanged quality gates

- [ ] **Step 1: Change packaging tests to the approved contract**

Require explicit invocation wording and reject `MUST USE`, `Auto-activate`, `do not wait to be asked`, and `When in doubt` in frontend metadata/instructions. Continue asserting DESIGN.md, anti-slop, browser evidence, and Superloopy evidence requirements.

- [ ] **Step 2: Verify RED**

Run: `node --test test/plugin.test.js`

Expected: FAIL against the current auto-activation metadata.

- [ ] **Step 3: Narrow metadata and update inventories**

Describe activation through `$superloopy-frontend`, a leading `loopy`/`루피` visual request, or explicit routing from an active loop. Remove all auto-activation and environment opt-out claims without changing the frontend execution workflow. Assert the prompt hook has no always-visible status message.

- [ ] **Step 4: Verify GREEN and the full repository**

Run:

```bash
node --test test/engineer.test.js test/hooks.test.js test/plugin.test.js test/audit.test.js
npm test
git diff --check
```

Expected: all tests pass and the diff check exits 0.
