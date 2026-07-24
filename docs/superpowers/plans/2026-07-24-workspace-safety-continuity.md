# Workspace Safety and Continuity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bind Superloopy plans to a canonical worktree, make steering retries idempotent, meter injected context, restore durable loop meaning after compaction, and replace research saturation floors with non-blocking usage targets.

**Architecture:** A shared workspace identity module resolves the loop root and supplies the checkout fingerprint used by plan v2 and command trust. Store reads verify bound plans by default while a narrow inspection path supports status and explicit legacy binding. Hook rendering gains dependency-free context metering and a pure compaction projection; steering stores bounded receipts in the plan; research targets remain skill-level evidence telemetry and never become runtime gates.

**Tech Stack:** Node.js 20 ESM, built-in `node:crypto`/`node:fs`/`node:path`, `node:test`, existing atomic JSON and file-lock helpers, Markdown skill contracts.

## Global Constraints

- No new dependency.
- Repository mismatch and duplicate steering retries fail safely; research targets never block, rewrite, delay, or request approval.
- Existing `SUPERLOOPY_STEER` objects without `requestId` remain compatible.
- Empty hook output remains empty and receives no metrics-only injection.
- Compaction recovery is read-only and ignores context-pressure suppression only for `SessionStart source=compact`.
- Portable export anonymization, search brokering, generic steering batches, and budget enforcement remain out of scope.
- Release version is `0.13.0`.

---

### Task 1: Canonical Workspace Identity

**Files:**
- Create: `src/workspace-identity.js`
- Create: `test/workspace-identity.test.js`
- Modify: `src/plan-trust.js`

**Interfaces:**
- Produces: `resolveWorkspaceRoot(start): string`, `checkoutIdentity(root): Promise<string>`, `createRepositoryBinding(root): Promise<object>`, `bindingMatches(root, binding): Promise<boolean>`.
- Consumes: existing atomic JSON writer only through callers; this module owns the Git-dir UUID marker.

- [ ] **Step 1: Write failing root and identity tests**

Cover Git root discovery from a child directory, nearest nested Git ownership, non-Git `.superloopy` ancestor fallback, same-worktree stable identity, and distinct worktree identities.

```js
const child = join(repo, "src", "nested");
assert.equal(resolveWorkspaceRoot(child), realpathSync(repo));
assert.equal(await checkoutIdentity(repo), await checkoutIdentity(child));
assert.notEqual(await checkoutIdentity(repo), await checkoutIdentity(otherRepo));
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `node --test test/workspace-identity.test.js`

Expected: FAIL because `src/workspace-identity.js` does not exist.

- [ ] **Step 3: Implement the shared identity module**

Use ancestor walking without shelling out. Resolve `.git` directories and `gitdir:` files, prefer the nearest Git root over an outer `.superloopy`, and fall back to the nearest `.superloopy` ancestor or the resolved start.

```js
export function resolveWorkspaceRoot(start) {
  const origin = canonicalExistingDirectory(start);
  const git = findNearestGitWorktree(origin);
  if (git !== null) return git.root;
  return findNearestStateRoot(origin) ?? origin;
}
export async function checkoutIdentity(root) {
  const canonicalRoot = resolveWorkspaceRoot(root);
  const git = findNearestGitWorktree(canonicalRoot);
  const value = git === null
    ? nonGitIdentity(canonicalRoot)
    : { version: 1, kind: "git", root: canonicalRoot, gitDir: git.gitDir, id: await checkoutUuid(git.gitDir) };
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
export async function createRepositoryBinding(root) {
  return { version: 1, kind: findNearestGitWorktree(root) ? "git-worktree" : "path", identity: await checkoutIdentity(root), rootLabel: basename(root) };
}
export async function bindingMatches(root, binding) {
  return validBinding(binding) && timingSafeEqualText(binding.identity, await checkoutIdentity(root));
}
```

- [ ] **Step 4: Reuse the module in command trust**

Remove the duplicate private Git-dir and checkout-identity functions from `src/plan-trust.js`. Normalize the trust-store key through `resolveWorkspaceRoot(cwd)` and call the exported `checkoutIdentity()`.

- [ ] **Step 5: Run focused tests**

Run: `node --test test/workspace-identity.test.js test/golden-audit.test.js test/loop-gates.test.js`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/workspace-identity.js src/plan-trust.js test/workspace-identity.test.js
git commit -m "feat(runtime): resolve canonical workspace identity"
```

### Task 2: Plan v2 Repository Binding and Legacy Migration

**Files:**
- Create: `src/repository-binding.js`
- Create: `test/repository-binding.test.js`
- Modify: `src/store.js`
- Modify: `src/loop.js`
- Modify: `src/cli.js`
- Modify: `src/help.js`
- Modify: `src/begin.js`
- Test: `test/loop.test.js`
- Test: `test/cli.test.js`

**Interfaces:**
- Consumes: Task 1 `resolveWorkspaceRoot`, `createRepositoryBinding`, `bindingMatches`.
- Produces: `inspectRepositoryBinding(cwd, plan)`, `requireRepositoryBinding(cwd, plan)`, `bindLegacyLoop(cwd, argv)`, `readPlanUnchecked(cwd, scope)`.

- [ ] **Step 1: Write failing binding tests**

Test that new plans are version 2 and bound, child-directory CLI status finds the root plan, a copied v2 plan refuses mutation, status reports the mismatch, legacy v1 mutation refuses with the exact bind command, and explicit bind validates confined relative plan paths before upgrading.

```js
assert.equal(created.plan.version, 2);
assert.equal((await statusLoop(child)).plan.repositoryBinding.identity, created.plan.repositoryBinding.identity);
await assert.rejects(nextLoop(copiedRepo), /repository binding mismatch/i);
```

- [ ] **Step 2: Run tests and verify failure**

Run: `node --test test/repository-binding.test.js test/loop.test.js test/cli.test.js`

Expected: FAIL on plan version/root reuse/bind command.

- [ ] **Step 3: Add binding inspection and store read modes**

`readPlanUnchecked()` parses and validates shape only. `readPlan()` calls it and requires a current binding. `inspectRepositoryBinding()` returns `bound`, `legacy_unbound`, `mismatch`, or `invalid` with abbreviated fingerprints and a safe next command.

```js
export async function readPlan(cwd, scope) {
  const plan = await readPlanUnchecked(cwd, scope);
  await requireRepositoryBinding(cwd, plan);
  return plan;
}
```

- [ ] **Step 4: Create bound plans and canonicalize runtime roots**

Set plan `version: 2` and `repositoryBinding: await createRepositoryBinding(cwd)`. Resolve the root before every loop CLI dispatch and in `beginLoop()` guide rendering. Do not change doctor/install root semantics.

- [ ] **Step 5: Implement explicit legacy bind**

Add `superloopy loop bind [--session-id ID] --confirm-current-root --json`. Under the goals lock, read unchecked, require version 1, validate `briefPath`, `evidencePath`, `goalsPath`, and `ledgerPath` as relative confined paths, attach the v2 binding, write once, and append `repository_bound`.

- [ ] **Step 6: Make status diagnostic-safe**

`statusLoop()` uses unchecked read plus inspection. For a non-bound plan it returns `ok:false`, the plan summary, and `binding` diagnostic without constructing a resume guide. Hook callers render the exact bind/mismatch diagnostic rather than suggesting a new plan.

- [ ] **Step 7: Run focused tests**

Run: `node --test test/workspace-identity.test.js test/repository-binding.test.js test/loop.test.js test/cli.test.js test/engineer.test.js test/hooks.test.js`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/repository-binding.js src/store.js src/loop.js src/cli.js src/help.js src/begin.js test/repository-binding.test.js test/loop.test.js test/cli.test.js
git commit -m "feat(loop): bind plans to canonical workspaces"
```

### Task 3: Idempotent Steering Receipts

**Files:**
- Create: `src/steering-receipts.js`
- Create: `test/steering-idempotency.test.js`
- Modify: `src/hooks.js`
- Modify: `src/loop.js`
- Test: `test/hooks.test.js`
- Test: `test/golden-hooks.test.js`

**Interfaces:**
- Consumes: bound plan reads from Task 2.
- Produces: `steeringRequestKey(payload, directive, nowMs)`, `findSteeringReceipt(plan, key, nowMs)`, `recordSteeringReceipt(plan, receipt)`, and `applySteering(cwd, directive, scope, request)`.

- [ ] **Step 1: Write failing retry tests**

Test explicit `requestId`, Codex session/turn-derived keys, no-turn short-window fallback, scoped-session isolation, repository isolation, later intentional repeats, bounded receipt pruning, and ledger repair after a simulated missing entry.

```js
await runUserPromptSubmitHook(payload);
const retry = JSON.parse(await runUserPromptSubmitHook(payload));
assert.equal(retry.deduplicated, true);
assert.equal((await readPlan(repo)).goals.length, 2);
```

- [ ] **Step 2: Run tests and verify duplicate failure**

Run: `node --test test/steering-idempotency.test.js`

Expected: FAIL because the repeated `add_goal` creates a third goal.

- [ ] **Step 3: Implement normalized request keys and bounded receipts**

Accept optional safe `requestId`. Otherwise hash host/session/turn/scope/normalized directive. Without a turn id, bucket retries into a documented short time window. Store at most 128 receipts and prune entries older than seven days.

- [ ] **Step 4: Apply steering once under the plan lock**

Move dispatch inside one `withFileLock(goalsPath(...))` section. Read the bound plan, return the stored result for a retry, apply the typed mutation to the in-memory plan, attach the receipt, perform one atomic plan write, then append the keyed ledger entry. Keep single-operation syntax; do not add `ops`.

- [ ] **Step 5: Run steering and hook tests**

Run: `node --test test/steering-idempotency.test.js test/hooks.test.js test/golden-hooks.test.js`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/steering-receipts.js src/hooks.js src/loop.js test/steering-idempotency.test.js test/hooks.test.js test/golden-hooks.test.js
git commit -m "fix(steering): deduplicate retried directives"
```

### Task 4: Additional-Context Cost Meter

**Files:**
- Create: `src/context-cost.js`
- Create: `test/context-cost.test.js`
- Modify: `src/hooks.js`
- Modify: `src/pre-tool-use.js`
- Test: `test/engineer.test.js`
- Test: `test/pre-tool-use.test.js`

**Interfaces:**
- Produces: `measureContext(text) -> {characters, utf8Bytes, estimatedTokens, estimator}`, `appendContextCost(text): string`, `formatMeasuredAdditionalContext(event, text): string`.

- [ ] **Step 1: Write failing metering tests**

Cover ASCII, Korean, emoji/code-point counting, UTF-8 bytes, stable estimator label, fixed-point final counts, empty output, and PreToolUse/engineer contexts.

```js
const measured = measureContext("루피🙂");
assert.equal(measured.characters, 3);
assert.equal(measured.utf8Bytes, Buffer.byteLength("루피🙂"));
assert.match(appendContextCost("body"), /estimated tokens/);
```

- [ ] **Step 2: Run tests and verify failure**

Run: `node --test test/context-cost.test.js`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement dependency-free measurement**

Count Unicode code points with `Array.from(text).length`, bytes with `Buffer.byteLength`, and tokens with estimator `mixed-v1`: `ceil(asciiCodePoints / 4 + nonAsciiCodePoints / 1.5)`. Iterate the appended metric line up to five times until the displayed character/byte/token values match the final string.

- [ ] **Step 4: Route all Superloopy additional context through the formatter**

Replace hook-local JSON formatting and PreToolUse additional-context construction with the shared formatter. Preserve `permissionDecision` and denial fields. Empty context remains an empty string.

- [ ] **Step 5: Run focused tests**

Run: `node --test test/context-cost.test.js test/hooks.test.js test/engineer.test.js test/pre-tool-use.test.js test/golden-hooks.test.js`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/context-cost.js src/hooks.js src/pre-tool-use.js test/context-cost.test.js test/engineer.test.js test/pre-tool-use.test.js test/golden-hooks.test.js
git commit -m "feat(hooks): meter injected context cost"
```

### Task 5: Compaction Recovery Capsule

**Files:**
- Create: `src/compaction-recovery.js`
- Create: `test/compaction-recovery.test.js`
- Modify: `src/hooks.js`
- Modify: `hooks/session-start.json`
- Test: `test/session-start-migration.test.js`
- Test: `test/golden-continuation.test.js`

**Interfaces:**
- Consumes: Task 2 bound status, Task 4 measured-context formatter.
- Produces: `buildRecoveryProjection({status, guide, handoffs, researchUsage})`, `renderRecoveryCapsule(projection, {maxChars})`.

- [ ] **Step 1: Write the six failing semantic tests**

Implement the approved cases: semantic preservation, bounded rendering, durable incomplete truth, scoped isolation, byte-identical read-only repetition, and pressure-marker recovery.

```js
const before = await snapshotState(repo);
const output = await runSessionStartHook({hook_event_name:"SessionStart", source:"compact", cwd:repo, transcript_path:pressureTranscript});
assert.match(JSON.parse(output).hookSpecificOutput.additionalContext, /Aggregate complete: no/);
assert.deepEqual(await snapshotState(repo), before);
```

- [ ] **Step 2: Run tests and verify failure**

Run: `node --test test/compaction-recovery.test.js`

Expected: FAIL because compact SessionStart is suppressed or has no capsule.

- [ ] **Step 3: Implement pure projection and bounded renderer**

Project binding status, session/mode, active goal, unresolved criterion refs, aggregate completion, next action, and outstanding handoffs. Render mandatory fields first and append optional details only while `maxChars` remains. Never derive completion from transcript text.

- [ ] **Step 4: Wire compact SessionStart**

For `source === "compact"`, bypass only the transcript pressure-marker early return, load bound state, and inject the capsule even when `SUPERLOOPY_AUTO_CONTEXT` is off. No plan remains quiet. Corrupt/mismatched state emits a bounded non-resume diagnostic.

- [ ] **Step 5: Run compaction and continuation tests**

Run: `node --test test/compaction-recovery.test.js test/session-start-migration.test.js test/golden-continuation.test.js test/hooks.test.js`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/compaction-recovery.js src/hooks.js hooks/session-start.json test/compaction-recovery.test.js test/session-start-migration.test.js test/golden-continuation.test.js
git commit -m "feat(hooks): restore loop meaning after compaction"
```

### Task 6: Advisory Research Targets

**Files:**
- Modify: `skills/superloopy-research/SKILL.md`
- Modify: `test/plugin.test.js`
- Modify: `docs/superloopy-host-contract.md`

**Interfaces:**
- Produces: four automatic advisory profiles and a required final `Research usage` summary.
- No runtime hook consumes or enforces these targets.

- [ ] **Step 1: Write failing skill-contract tests**

Assert that the skill contains focused-codebase, focused-web, mixed, and exhaustive profiles; target/observed/provenance language; automatic continuation with a reason; and `unknown` rather than zero. Assert that it contains no “pause and ask to extend”, scaling floor, worker minimum, query minimum, or budget-denial language.

- [ ] **Step 2: Run the contract test and verify failure**

Run: `node --test test/plugin.test.js`

Expected: FAIL on the current scaling floors and extension approval.

- [ ] **Step 3: Replace saturation floors with advisory profiles**

Use these initial targets:

| profile | workers | queries | waves |
| --- | ---: | ---: | ---: |
| focused-codebase | 4 | 12 | 2 |
| focused-web | 6 | 32 | 2 |
| mixed | 8 | 40 | 3 |
| exhaustive | 15 | 80 | 5 |

Crossing a target continues automatically when unresolved criteria or material leads remain, records one reason in `expansion-log.md`, and reports target/observed/provenance in `SYNTHESIS.md`. Missing observation is `unknown`.

- [ ] **Step 4: Document host truth**

State that Codex worker interception exists but Superloopy intentionally does not use it for budget denial, and hosted queries are not universally observable.

- [ ] **Step 5: Run contract and packaging tests**

Run: `node --test test/plugin.test.js test/docs.test.js`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add skills/superloopy-research/SKILL.md test/plugin.test.js docs/superloopy-host-contract.md
git commit -m "docs(research): make usage targets advisory"
```

### Task 7: Release Version and Full Validation

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.codex-plugin/plugin.json`
- Modify: `.claude-plugin/plugin.json`
- Modify: `.claude-plugin/marketplace.json`
- Modify: `docs/superloopy-design-audit.md`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: synchronized release version `0.13.0` and package-retained runtime.

- [ ] **Step 1: Add the design-audit row**

Record the four shipped slices, advisory-only budget boundary, validation anchors, and deferred export/batch/search-broker scope.

- [ ] **Step 2: Bump the authoritative version and synchronize manifests**

Run: `node scripts/sync-version.mjs 0.13.0`

Expected: JSON/manifests report `0.13.0`.

- [ ] **Step 3: Run focused release checks**

Run: `node --test test/sync-version.test.js test/plugin.test.js test/doctor.test.js test/doctor-packed.test.js`

Expected: PASS.

- [ ] **Step 4: Run the full suite**

Run: `npm test`

Expected: all tests pass with zero failures.

- [ ] **Step 5: Validate the package and diff**

Run: `npm pack --dry-run`

Expected: new runtime source files and updated hooks/skills are listed; test-only files and ignored plan/spec documents need not be packaged.

Run: `git diff --check`

Expected: no whitespace errors.

- [ ] **Step 6: Commit release metadata**

```bash
git add package.json package-lock.json .codex-plugin/plugin.json .claude-plugin/plugin.json .claude-plugin/marketplace.json docs/superloopy-design-audit.md
git commit -m "chore(release): bump version to 0.13.0"
```

- [ ] **Step 7: Review publish scope**

Run: `git status -sb`

Run: `git diff --stat origin/main...HEAD`

Expected: only the approved design, implementation, tests, documentation, and version files appear.
