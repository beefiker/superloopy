# GPT-5.6 Routing Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade exact legacy Superloopy agent fleets safely, diagnose split-brain installations, and distinguish configured routing from runtime-verifiable model enforcement.

**Architecture:** Extend the existing all-or-conflict managed installer with an explicit, hash-bound legacy-adoption manifest. Make doctor inspect legacy files and live availability even before managed state exists, compare the active generated wrapper with the diagnosed plugin root, and report the host's model-verification limit as structured data. Keep runtime routing pre-launch and dependency-free.

**Tech Stack:** Node.js ES modules, built-in `node:test`, JSON policy/state, generated TOML agents

## Global Constraints

- Add no dependencies.
- Never overwrite modified, foreign, symlinked, or partially matching personal agent files without `--force`.
- Legacy adoption is allowed only when all six Superloopy-owned filenames match a complete known release manifest; unrelated personal agent filenames remain untouched and do not block migration.
- Preserve the existing atomic fleet transaction and rollback guarantees.
- Do not claim runtime model enforcement unless the host provides role/model attestation.

---

### Task 1: Adopt exact legacy Superloopy fleets

**Files:**
- Create: `legacy-agent-manifests.json`
- Modify: `src/managed-agents.js`
- Modify: `src/agents.js`
- Modify: `test/model-install.test.js`

**Interfaces:**
- Consumes: the six existing target files and bundled known-release SHA-256 manifests
- Produces: `legacyManifest` passed into `preflightManagedAgentFiles(files, previousManifest, force, legacyManifest)`
- Produces: `updated` only when every existing regular file matches one complete known legacy manifest

- [ ] Write a failing installer test that copies the six exact `0.7.2` templates, omits state, installs preferred 5.6 routing without `--force`, and expects all six files to update atomically.
- [ ] Write failing negative tests for one edited legacy file, a mixed-version fleet, a symlink, and an unknown foreign fleet; expect conflicts and zero writes.
- [ ] Run `node --test test/model-install.test.js` and confirm the legacy-upgrade test fails because unmarked files conflict.
- [ ] Add the complete 0.7.2 template hashes to `legacy-agent-manifests.json`, validate the manifest shape, identify a legacy fleet before preflight, and allow only that exact fleet to update.
- [ ] Re-run `node --test test/model-install.test.js` and confirm all focused tests pass.

### Task 2: Diagnose unmanaged legacy routing and pre-install availability

**Files:**
- Modify: `src/installed-model-policy.js`
- Modify: `src/doctor.js`
- Modify: `test/installed-model-policy.test.js`

**Interfaces:**
- Produces: `selectionStatus: "legacy_unmanaged"` with per-agent `legacy_unmanaged` status when state is absent and a complete known fleet exists
- Produces: `availabilityStatus: "preferred_available" | "compatibility_only" | "unsupported" | "unknown"` during explicit read-only refresh even without state
- Produces: an exact non-force migration command for an exact known legacy fleet

- [ ] Write failing doctor tests for an exact legacy fleet, an edited legacy fleet, and `--refresh-models` with no state but full 5.6 availability.
- [ ] Run `node --test test/installed-model-policy.test.js` and confirm the new assertions fail on the current informational absence result.
- [ ] Inspect the default target directory when state is absent, classify only complete known fleets as safely migratable, and query the catalog on explicit refresh without writing state or files.
- [ ] Re-run the focused doctor tests and confirm they pass.

### Task 3: Detect wrapper/plugin split-brain and disclose runtime verification

**Files:**
- Modify: `src/wrapper-check.js`
- Modify: `src/doctor.js`
- Modify: `test/wrapper-check.test.js`
- Modify: `test/doctor.test.js`
- Modify: `src/engineer.js`
- Modify: `test/engineer.test.js`
- Modify: `docs/superloopy-host-contract.md`

**Interfaces:**
- Produces: wrapper status `split_brain` when a generated wrapper targets a different checkout/cache root than the diagnosed root
- Produces: `hostContract.modelRoutingVerification: "verified" | "unverified"`, defaulting to `unverified` when the host cannot attest resolved role/model
- Injects: crew guidance requiring `agent_type` when supported and reporting `model_unverified` otherwise

- [ ] Write failing wrapper and doctor tests for a generated 0.7.2 checkout wrapper while diagnosing a 0.9.0 plugin root.
- [ ] Write failing engineer/host-contract tests requiring an explicit `model_unverified` fallback when role/model attestation is unavailable.
- [ ] Run the focused tests and confirm the failures describe missing split-brain and verification fields.
- [ ] Implement root comparison and structured advisory reporting without blocking the deterministic evidence floor.
- [ ] Re-run the focused tests and confirm they pass.

### Task 4: Document, validate, and publish PR #23

**Files:**
- Modify: `README.md`
- Modify: `docs/superloopy-model-policy.md`
- Modify: `docs/superloopy-file-audit.md`
- Modify: `docs/superloopy-design-audit.md`
- Modify: `docs/superloopy-loop-golden-set.md`
- Test: `test/docs.test.js`

**Interfaces:**
- Documents: legacy migration, split-brain repair, pre-install availability, restart requirement, and advisory runtime model verification

- [ ] Add failing documentation assertions for the migration and verification contract, then run `node --test test/docs.test.js`.
- [ ] Update the English policy and audit documents; keep localized README changes limited to existing model-routing paragraphs if tests require them.
- [ ] Run focused tests, `npm test`, `node src/cli.js doctor --json`, the live read-only `model/list` probe, `npm pack --dry-run --json`, and `git diff --check`.
- [ ] Request an independent code review, address every critical or important finding, and rerun validation.
- [ ] Commit only the intended files, push `codex/gpt-5-6-model-policy`, and update PR #23's body with root cause, behavior, validation, and remaining host limitation.
