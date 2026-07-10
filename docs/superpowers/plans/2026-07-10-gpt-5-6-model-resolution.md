# GPT-5.6 Model Resolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended when subagents are available) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Record status:** Immutable pre-implementation plan. Completion is recorded in Git history and validation evidence rather than by rewriting the original checklist.

**Goal:** Prefer the approved GPT-5.6 profile tuples when Codex reports them available, otherwise install explicit GPT-5.5 compatibility tuples without any post-launch retry.

**Architecture:** Keep `model-policy.json` as the only routing policy. A dependency-free app-server client obtains the stable `model/list` catalog, a pure resolver selects complete tuples, and a cached resolution manifest under `$CODEX_HOME/superloopy/` feeds an all-or-conflict managed agent installer. Doctor reads the same policy and manifest so repository defaults and personal installed agents are checked by one contract.

**Tech Stack:** Node.js ES modules, built-in `node:test`, Codex app-server JSONL protocol, TOML text generation, JSON state files

## Global Constraints

- Add no dependencies.
- Never retry or change models after an agent launch begins.
- Treat probe errors as unknown availability, not evidence that a model is unavailable.
- Preserve user-edited or foreign agent TOMLs unless `--force` is explicit.
- Resolve and preflight all six Codex agents before replacing any of them.
- Keep Claude agent policy and assignments unchanged.

---

### Task 1: Make ordered complete tuples the policy contract

**Files:**
- Create: `test/model-resolution.test.js`
- Modify: `src/model-policy.js`
- Modify: `model-policy.json`
- Modify: `.codex/agents/franky.toml`
- Modify: `.codex/agents/zoro.toml`
- Modify: `.codex/agents/usopp.toml`
- Modify: `.codex/agents/jinbe.toml`
- Modify: `.codex/agents/robin.toml`
- Modify: `.codex/agents/nami.toml`
- Modify: `docs/superloopy-model-policy.md`
- Modify: `test/doctor.test.js`

**Interfaces:**
- Produces: validated `codex.profiles.<name>.candidates[]` values
- Produces: `resolveCodexModelPolicy(policy, catalog)` with requested/resolved tuple and reason per profile and agent

- [ ] **Step 1: Write failing resolver and policy-validation tests**

Cover full GPT-5.6 availability, Sol-only absence, entire-family absence, missing GPT-5.5, unsupported tuple fields, and malformed candidate arrays. Assert that resolution checks model, effort, and tier as one tuple.

- [ ] **Step 2: Verify RED**

Run: `node --test test/model-resolution.test.js test/doctor.test.js`

Expected: FAIL because profiles are single tuples and no catalog-aware resolver exists.

- [ ] **Step 3: Implement candidate validation and pure resolution**

Export the policy loader and resolver from `src/model-policy.js`. Resolve the first complete supported tuple for each profile, map it to all six agents, and fail visibly if no candidate is supported. Update the policy data, documentation, and bundled preferred agent TOMLs to version `2026-07-10`.

- [ ] **Step 4: Verify GREEN**

Run: `node --test test/model-resolution.test.js test/doctor.test.js`

### Task 2: Query the stable Codex model catalog safely

**Files:**
- Create: `src/model-catalog.js`
- Create: `test/model-catalog.test.js`

**Interfaces:**
- Produces: `queryCodexModelCatalog(options)` returning normalized model tuples or an explicit unknown result
- Consumes: `codex app-server --stdio`, `initialize`, and `model/list`

- [ ] **Step 1: Write failing protocol tests**

Use a fake spawned process to cover successful JSONL handshake, paginated results, malformed responses, server errors, timeout, and non-zero exit. Assert that stderr/auth material is not copied into persisted output.

- [ ] **Step 2: Verify RED**

Run: `node --test test/model-catalog.test.js`

Expected: FAIL because the catalog client does not exist.

- [ ] **Step 3: Implement the bounded app-server client**

Use only Node built-ins. Send `initialize`, wait for its response, then request every `model/list` page. Normalize model slug, supported reasoning efforts, and supported service tiers. Enforce a short timeout and return a sanitized unknown reason for every transport or protocol failure.

- [ ] **Step 4: Verify GREEN and a read-only live handshake**

Run:

```bash
node --test test/model-catalog.test.js
node --input-type=module -e 'import { queryCodexModelCatalog } from "./src/model-catalog.js"; const result = await queryCodexModelCatalog(); console.log(JSON.stringify({ ok: result.ok, models: result.models?.map(({ id }) => id) }, null, 2));'
```

The live command must only list models; it must not start a model turn.

### Task 3: Cache resolution and install a managed fleet

**Files:**
- Create: `src/model-resolution.js`
- Create: `test/model-install.test.js`
- Modify: `src/agents.js`
- Modify: `test/cli.test.js`
- Modify: `src/cli.js`
- Modify: `src/hooks.js`

**Interfaces:**
- Persists: `$CODEX_HOME/superloopy/model-resolution.json`
- Consumes: `--refresh-models`, `--compat`, policy version, and a 24-hour TTL
- Produces: generated managed agent TOMLs and requested/resolved/reason/check-time metadata

- [ ] **Step 1: Write failing cache and installer tests**

Cover first install, conservative first install after an unknown probe, fresh cache reuse, stale cache refresh, explicit refresh, policy-version refresh, preferred-to-compat upgrade, managed-hash validation, foreign/user-edited conflicts, `--force`, and all-six preflight with no partial writes.

- [ ] **Step 2: Verify RED**

Run: `node --test test/model-install.test.js test/cli.test.js`

Expected: FAIL because install currently copies bundled TOMLs one at a time and has no resolution state.

- [ ] **Step 3: Implement cached resolution and managed installation**

Read a fresh compatible manifest without starting app-server. Otherwise query the catalog, preserve an existing valid resolution on unknown availability, or select the explicit GPT-5.5 baseline for an unknown first install. Render the selected tuple into every bundled TOML with a managed marker. Preflight all targets against stored hashes, write staged temporary files, rename them into place only after every conflict check passes, and persist the state last.

- [ ] **Step 4: Expose explicit controls and restart disclosure**

Add `--refresh-models` to install/help and `--compat` as a deterministic compatibility override for tests, recovery, and users who do not want a live preview probe. Ensure SessionStart reads fresh state without probing and reports a restart whenever installed definitions change.

- [ ] **Step 5: Verify GREEN**

Run: `node --test test/model-resolution.test.js test/model-catalog.test.js test/model-install.test.js test/cli.test.js test/hooks.test.js`

### Task 4: Diagnose installed routing without launching workers

**Files:**
- Modify: `src/model-resolution.js`
- Modify: `src/doctor.js`
- Modify: `src/cli.js`
- Modify: `test/doctor.test.js`

**Interfaces:**
- Produces: `installedModelPolicy` doctor check with preferred/degraded/stale/mixed/tampered status
- Consumes: cached manifest and `$CODEX_HOME/agents/*.toml`; live refresh only when explicitly requested

- [ ] **Step 1: Write failing doctor tests**

Cover no installation, preferred resolution, healthy compatibility degradation, stale manifest, mixed profiles, unsupported tuples, and managed-hash mismatch. Verify JSON includes requested model, resolved model, reason, `checkedAt`, and restart state without secrets.

- [ ] **Step 2: Verify RED**

Run: `node --test test/doctor.test.js`

- [ ] **Step 3: Implement the installed-resolution check**

Keep absence informational so repository doctor remains usable before personal installation. Treat compatibility as healthy with `degraded: true`; fail stale, mixed, unsupported, missing, or tampered managed installs. Do not query app-server during ordinary doctor runs.

- [ ] **Step 4: Verify GREEN**

Run: `node --test test/doctor.test.js test/cli.test.js`

### Task 5: Align packaging evidence and finish

**Files:**
- Modify: `README.md`
- Modify: `README.ko.md`
- Modify: `docs/superloopy-file-audit.md`
- Modify: `docs/superloopy-design-audit.md`
- Modify: other audit inventories only when tests identify a required entry

- [ ] **Step 1: Document the exact lifecycle**

Explain that routing is resolved while personal agents are installed/materialized, cached for 24 hours, refreshed explicitly or on policy change, and never retried after launch. Document conservative unknown handling and restart requirements.

- [ ] **Step 2: Run focused and full validation**

Run:

```bash
node --test test/model-resolution.test.js test/model-catalog.test.js test/model-install.test.js test/cli.test.js test/hooks.test.js test/doctor.test.js
npm test
node src/cli.js doctor --json
npm pack --dry-run --json
git diff --check
```

- [ ] **Step 3: Review, commit, and publish the existing PR branch**

Inspect the final diff for secrets, unrelated changes, oversized files, hidden runtime retries, and unsafe overwrites. Commit narrowly, push `codex/gpt-5-6-model-policy`, and update Draft PR #23 with the implementation and validation evidence.
