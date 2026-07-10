# Automatic Upgrade Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the first approved Codex SessionStart after a Superloopy install or upgrade automatically reconcile recognized wrappers, legacy agents, managed agents, and routing state without requiring a migration command.

**Architecture:** Keep `runSessionStartHook` as the supported host lifecycle entry point and reuse the existing transactional bootstrap rather than adding another installer. Add an end-to-end SessionStart test surface in a new file so capped source/tests stay reviewable, tighten user-facing hook copy so normal migration and preserved conflicts do not prescribe repair commands, and document the automatic lifecycle explicitly.

**Tech Stack:** Node.js 20+ ESM, `node:test`, dependency-free filesystem transactions, Codex plugin SessionStart hooks.

## Global Constraints

- No dependencies may be added.
- Normal install or upgrade paths must not require `superloopy install`, `superloopy agents install`, or a version-specific Node command.
- Automatic migration must never imply or add `--force`.
- A managed marker plus matching prior-state hash, or an exact legacy release manifest, is required before automatic replacement.
- Handled commit failures restore the six-agent fleet before surfacing the error; wrapper reconciliation is an independent safety domain. An abrupt process termination may leave private backups for recovery and is not claimed to be crash-atomic.
- Edited, partial, mixed, foreign, or symlinked owned fleets must be preserved.
- Unrelated personal agents must remain byte-for-byte unchanged.
- Existing 550-line reviewability limits must remain satisfied.
- Codex hook approval and any genuine host reload remain user-controlled host boundaries.

---

### Task 1: End-to-end automatic SessionStart migration

**Files:**
- Create: `test/session-start-migration.test.js`
- Modify: `src/agents.js`
- Modify: `src/hooks.js`

**Interfaces:**
- Consumes: `runSessionStartHook(payload, options)`, `SUPERLOOPY_AGENT_NAMES`, `resolveModelResolutionStatePath`, the six bundled `.codex/agents/*.toml` templates, and `legacy-agent-manifests.json`.
- Produces: hook context headed `Superloopy automatic migration`; successful normal migration contains no repair command; conflicts say files were preserved and contain neither `--force` nor a migration command.

- [ ] **Step 1: Write the failing automatic-migration tests**

Create an isolated Codex home, bin directory, exact legacy fleet, and generated legacy wrapper. Invoke `runSessionStartHook` without install flags and assert:

```js
const first = await runSessionStartHook(
  { hook_event_name: "SessionStart", cwd: root },
  { env, homeDir, policyRoot: REPO_ROOT, statePath, queryModelCatalog: async () => fullCatalog() }
);
const context = JSON.parse(first).hookSpecificOutput.additionalContext;
assert.match(context, /Superloopy automatic migration/u);
assert.match(context, /Restart Codex/u);
assert.doesNotMatch(context, /superloopy (?:agents )?install|node .*src[\\/]cli\.js.*install|--force/u);
```

Verify the six targets contain `# superloopy-managed-agent v1`, the state exists, an unrelated `personal.toml` is unchanged, and the wrapper points at the current repository CLI. Invoke SessionStart again with a catalog function that throws; assert it makes zero queries, leaves state mtime unchanged, and returns an empty hook payload.

Add a second case that edits one legacy agent before SessionStart and asserts the conflict context contains `preserved`, excludes `--force` and migration commands, writes no state, and leaves every owned file unchanged.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test test/session-start-migration.test.js`

Expected: FAIL because current hook context says `Superloopy bootstrap` and conflict guidance recommends re-running with `--force`.

- [ ] **Step 3: Implement the minimal lifecycle copy change**

In `formatBootstrapHookContext`, change the heading to `Superloopy automatic migration`. Replace conflict guidance in `bootstrapSuperloopy` with a preservation-first message:

```js
"Superloopy preserved conflicting custom-agent files. Review the reported conflicts before choosing whether to replace your customizations."
```

In the SessionStart exception fallback, remove command prescriptions and say:

```js
"- Automatic migration stopped safely; no forced replacement was attempted. Review the setup error after this session."
```

Do not change CLI recovery output for explicit diagnostic commands.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run: `node --test test/session-start-migration.test.js test/hooks.test.js test/legacy-agent-migration.test.js test/model-install.test.js`

Expected: all tests pass and capped files stay at or below 550 lines.

- [ ] **Step 5: Commit**

```bash
git add test/session-start-migration.test.js src/agents.js src/hooks.js
git commit -m "Automate SessionStart upgrade migration"
```

### Task 2: Complete legacy conflict coverage

**Files:**
- Modify: `test/legacy-agent-migration.test.js`

**Interfaces:**
- Consumes: existing `fixture(t)`, `installAgents`, `SUPERLOOPY_AGENT_NAMES`, and isolated state paths.
- Produces: explicit regression coverage for partial, mixed, and symlinked legacy fleets.

- [ ] **Step 1: Add the missing safety cases**

Add table-driven subtests that start from the exact legacy fixture and respectively remove `nami.toml`, replace `zoro.toml` with an unknown/mixed definition, and replace `usopp.toml` with a symlink. For each case snapshot all existing owned paths, invoke `installAgents` without force, and assert:

```js
assert.equal(result.ok, false);
assert.equal(await exists(setup.statePath), false);
assert.ok(result.agents.every(({ status }) => status === "conflict" || status === "blocked"));
```

Then verify all surviving regular files retain their original content and the symlink remains a symlink.

- [ ] **Step 2: Run the focused safety suite**

Run: `node --test test/legacy-agent-migration.test.js test/model-install.test.js`

Expected: all tests pass because the existing fail-closed preflight is the behavior being locked down.

- [ ] **Step 3: Commit**

```bash
git add test/legacy-agent-migration.test.js
git commit -m "Test unsafe legacy upgrade shapes"
```

### Task 3: User-facing upgrade documentation and repository audit

**Files:**
- Modify: `test/docs.test.js`
- Modify: `README.md`
- Modify: `installation.md`
- Modify: `docs/superloopy-file-audit.md`
- Modify: `docs/superloopy-loop-golden-set.md`

**Interfaces:**
- Consumes: the approved automatic-upgrade design and Task 1 hook wording.
- Produces: normal Codex upgrade docs that require only Codex-managed update, hook approval, and a host reload when necessary—never a post-upgrade Superloopy migration command.

- [ ] **Step 1: Write the failing documentation contract**

In `test/docs.test.js`, assert the main README and `installation.md` describe automatic SessionStart reconciliation and do not tell users to run `superloopy doctor` or a Superloopy installer after the approved post-upgrade session:

```js
assert.match(readme, /SessionStart.*automatically reconciles.*wrapper.*agents.*routing/is);
assert.match(installation, /no (?:Superloopy )?migration command is required/i);
assert.doesNotMatch(readme, /following approved session.*Then run `superloopy doctor`/is);
```

- [ ] **Step 2: Run the docs test and verify RED**

Run: `node --test test/docs.test.js`

Expected: FAIL because current upgrade copy tells users to run doctor and does not state the command-free guarantee.

- [ ] **Step 3: Update normal upgrade copy**

Keep the Codex marketplace upgrade action because Codex owns plugin updates. Replace the post-upgrade paragraph with copy equivalent to:

```md
Restart Codex after the upgrade and approve Modified hooks. The next approved `SessionStart` automatically reconciles the generated wrapper, all six agents, and model-routing state from the new plugin version. No Superloopy migration command is required. If definitions changed, follow only the Codex restart notice so the host reloads them.
```

Update `installation.md` consistently. Preserve exceptional conflict and checkout-development recovery sections.

Add the new plan and `test/session-start-migration.test.js` to the file audit and golden set with their exact safety boundaries.

- [ ] **Step 4: Run documentation and audit verification**

Run: `node --test test/docs.test.js test/audit.test.js`

Expected: all tests pass and the inventory covers every tracked file.

- [ ] **Step 5: Commit**

```bash
git add README.md installation.md test/docs.test.js docs/superloopy-file-audit.md docs/superloopy-loop-golden-set.md docs/superpowers/plans/2026-07-10-automatic-upgrade-migration.md
git commit -m "Document command-free upgrade migration"
```

### Task 4: Full validation and PR update

**Files:**
- Modify only if validation or review finds a concrete defect.

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: reviewed commits on PR #23 with green local and GitHub validation.

- [ ] **Step 1: Run full validation**

Run:

```bash
npm test
node src/cli.js doctor --json
npm pack --dry-run --json
git diff --check
```

Expected: zero test failures, doctor `ok: true`, package contains the new plan/test, and no whitespace errors.

- [ ] **Step 2: Run independent review**

Review the complete diff for lifecycle correctness, command-free normal migration, user-edit preservation, platform path handling, test isolation, and documentation accuracy. Fix all Critical or Important findings and rerun covering tests.

- [ ] **Step 3: Push and update PR #23**

Push `codex/gpt-5-6-model-policy`, update the PR description with automatic SessionStart migration and validation evidence, then monitor all GitHub Actions jobs through completion.
