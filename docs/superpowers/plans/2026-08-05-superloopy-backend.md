# Superloopy Backend Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Research public AI-agent/database engineering practice and ship a stack-neutral, evidence-backed `superloopy-backend` skill for AI-assisted backend development and safe runtime database agents.

**Architecture:** Keep `SKILL.md` as an explicit-activation router and lifecycle contract. Put detailed, independently authored guidance in four one-level reference modules, ground it in a separately validated Superloopy research journal, and integrate the skill through the repository's existing doctor, plugin, documentation, and file-inventory surfaces.

**Tech Stack:** Markdown skills and references, YAML agent metadata, Node.js 22 built-in test runner, Superloopy scoped evidence, no added dependencies.

## Global Constraints

- Stay stack-neutral across languages, frameworks, databases, clouds, and deployment models.
- Cover both AI coding agents and runtime agents that access application data.
- Treat public evidence as evidence of published practice, never proof of private company-wide behavior.
- Default runtime database agents to typed, least-privilege, bounded, observable tools.
- Require explicit authority for production writes, destructive operations, DDL, bulk changes, privilege changes, and dependency additions.
- Follow RED→GREEN→REFACTOR for product files and skill behavior.
- Add no dependency.
- Preserve unrelated worktree changes in `skills/humanize-korean/` and `test/humanize-korean.test.js`.

---

### Task 1: Build the auditable research corpus

**Files:**

- Create: `.superloopy/sessions/ai-db-backend-skill-20260805/evidence/research/20260805-ai-agent-database-backend/INDEX.md`
- Create: `.superloopy/sessions/ai-db-backend-skill-20260805/evidence/research/20260805-ai-agent-database-backend/expansion-log.md`
- Create: `.superloopy/sessions/ai-db-backend-skill-20260805/evidence/research/20260805-ai-agent-database-backend/wave-*.md`
- Create: `.superloopy/sessions/ai-db-backend-skill-20260805/evidence/research/20260805-ai-agent-database-backend/blocked-sources.md` only if retrieval is blocked
- Create: `.superloopy/sessions/ai-db-backend-skill-20260805/evidence/research/20260805-ai-agent-database-backend/claim-ledger.md`
- Create: `.superloopy/sessions/ai-db-backend-skill-20260805/evidence/research/20260805-ai-agent-database-backend/SYNTHESIS.md`

**Interfaces:**

- Consumes: the approved design's research axes and the `superloopy-research` evidence contract.
- Produces: a validator-clean synthesis, source ledger, and source-to-guidance trace used by Tasks 3–5.

- [ ] **Step 1: Write the Phase 0 research frame**

Record these orthogonal axes in `INDEX.md` before searching:

```text
1. Major AI labs and platforms: official engineering docs, agent SDKs, repositories, and production examples.
2. AI/data companies: public architecture for governed agent-to-data access, semantic layers, retrieval, and operations.
3. Database authorities: transactions, isolation, migrations, least privilege, tenant security, backup, and recovery.
4. Standards and security: prompt injection, excessive agency, data leakage, auditability, and AI risk management.
5. Open-source implementations: pinned code paths that show tool boundaries, structured I/O, evaluation, and tracing.
6. Counter-brief: unsafe text-to-SQL, benchmark limits, failed assumptions, and the public/private evidence boundary.
```

Set `As-of: 2026-08-05`, locale `global/English-first`, minimum load-bearing grade `B`, and profile `mixed` with advisory targets of 8 workers, 40 queries, and 3 waves.

- [ ] **Step 2: Dispatch the first research wave**

Use unique, read-only lanes for the six axes. Every dispatch must include the Superloopy Research untrusted-content boundary, grade ladder, retrieval verdicts, `## EXPAND`, and `## SOURCES` tails. Record every dispatch with:

```bash
node '/Users/bee/.codex/plugins/cache/beefiker/superloopy/0.14.1/src/cli.js' loop handoff --session-id ai-db-backend-skill-20260805 --agent 'labs-platforms' --assignment 'Major AI labs and platforms: primary engineering docs, SDKs, repositories, and production examples; return graded dated sources and expansion leads.' --verdict working --json
node '/Users/bee/.codex/plugins/cache/beefiker/superloopy/0.14.1/src/cli.js' loop handoff --session-id ai-db-backend-skill-20260805 --agent 'ai-data-companies' --assignment 'AI and data companies: governed agent-to-data access, semantic layers, retrieval, and operations; return graded dated sources and expansion leads.' --verdict working --json
node '/Users/bee/.codex/plugins/cache/beefiker/superloopy/0.14.1/src/cli.js' loop handoff --session-id ai-db-backend-skill-20260805 --agent 'database-authorities' --assignment 'Database authorities: transactions, isolation, migrations, least privilege, tenant security, backup, and recovery; return graded dated sources and expansion leads.' --verdict working --json
node '/Users/bee/.codex/plugins/cache/beefiker/superloopy/0.14.1/src/cli.js' loop handoff --session-id ai-db-backend-skill-20260805 --agent 'standards-security' --assignment 'Standards and security: prompt injection, excessive agency, data leakage, auditability, and AI risk management; return graded dated sources and expansion leads.' --verdict working --json
node '/Users/bee/.codex/plugins/cache/beefiker/superloopy/0.14.1/src/cli.js' loop handoff --session-id ai-db-backend-skill-20260805 --agent 'open-source-implementations' --assignment 'Open-source implementations: pinned tool boundaries, structured input/output, evaluation, and tracing code paths; return graded dated sources and expansion leads.' --verdict working --json
node '/Users/bee/.codex/plugins/cache/beefiker/superloopy/0.14.1/src/cli.js' loop handoff --session-id ai-db-backend-skill-20260805 --agent 'counter-brief' --assignment 'Counter-brief: unsafe text-to-SQL, benchmark limits, failed assumptions, and public/private evidence boundaries; return graded dated sources and expansion leads.' --verdict working --json
```

- [ ] **Step 3: Journal each return and expand leads**

Write one wave file per returned lane, index every claim, lead, and source, and append retrieval totals to `expansion-log.md`. Re-dispatch thin, silent, or all-blocked lanes once. Continue until every actionable lead is investigated or two fully retrieved waves are dry.

- [ ] **Step 4: Verify and price claims**

Put dated, numeric, adoption, causal, and company-practice claims through `claim-ledger.md`. Mark private-practice generalizations `unresolved` or omit them. Run focused code verification only for behavior disputed by sources; save authorization, query-boundary, or transaction checks as `verify-tool-authorization.md`, `verify-query-bounds.md`, or `verify-transaction-outcome.md` respectively.

- [ ] **Step 5: Write the cited synthesis**

Use the required Superloopy sections and structured source bullets. Include a direct limitation that public sources establish documented patterns, not how every engineer at a company works. Map each retained skill principle to source numbers and each rejected pattern to the counter-brief.

- [ ] **Step 6: Validate the corpus**

Run:

```bash
node '/Users/bee/.codex/plugins/cache/beefiker/superloopy/0.14.1/skills/superloopy-research/scripts/validate-research-evidence.mjs' --root '.superloopy/sessions/ai-db-backend-skill-20260805/evidence/research/20260805-ai-agent-database-backend' --json
```

Expected: exit 0 with all indexed wave files, claim rows, citations, dates, and blocked-source outcomes valid.

---

### Task 2: Capture RED baseline behavior without the skill

**Files:**

- Create: `.superloopy/sessions/ai-db-backend-skill-20260805/evidence/baseline/schema-rollout.md`
- Create: `.superloopy/sessions/ai-db-backend-skill-20260805/evidence/baseline/customer-agent-tools.md`
- Create: `.superloopy/sessions/ai-db-backend-skill-20260805/evidence/baseline/prompt-injected-record.md`
- Create: `.superloopy/sessions/ai-db-backend-skill-20260805/evidence/baseline/ambiguous-write.md`
- Create: `.superloopy/sessions/ai-db-backend-skill-20260805/evidence/baseline/slow-query.md`
- Create: `.superloopy/sessions/ai-db-backend-skill-20260805/evidence/baseline/summary.md`

**Interfaces:**

- Consumes: five scenarios from the approved design, without exposing the desired answer or future skill text.
- Produces: observed failure categories that determine the minimal guidance authored in Tasks 4 and 5.

- [ ] **Step 1: Run five fresh-context scenarios without the skill**

Dispatch one read-only agent per scenario when slots permit. Give only a small synthetic repository description and the user task. Do not mention the intended safeguards. Preserve the response verbatim in the matching artifact.

- [ ] **Step 2: Score observable behavior**

For each artifact, record yes/no evidence for context discovery, stack preservation, contract definition, tenant authorization, typed tool boundaries, bounded execution, migration compatibility, realistic database testing, ambiguous-outcome handling, and production authority.

- [ ] **Step 3: Summarize reproduced failures**

In `summary.md`, list only failures that appeared in at least one raw output and cite the scenario filename. These failures become required guidance; hypothetical failures remain research notes, not mandatory process.

- [ ] **Step 4: Verify RED artifacts exist**

Run:

```bash
node -e 'const fs=require("node:fs");const root=".superloopy/sessions/ai-db-backend-skill-20260805/evidence/baseline";const files=["schema-rollout.md","customer-agent-tools.md","prompt-injected-record.md","ambiguous-write.md","slow-query.md","summary.md"];for(const file of files){const text=fs.readFileSync(`${root}/${file}`,"utf8");if(text.trim().length<80)throw new Error(`${file} is thin`)}console.log(`baseline artifacts pass: ${files.length}`)'
```

Expected: `baseline artifacts pass: 6`.

---

### Task 3: Add the failing backend-skill contract test

**Files:**

- Create: `test/backend-skill.test.js`

**Interfaces:**

- Consumes: the design acceptance criteria, research synthesis, and baseline failure summary.
- Produces: a deterministic contract for the skill directory, routing, safety invariants, and evidence boundaries.

- [ ] **Step 1: Write the failing test**

Create `test/backend-skill.test.js` with Node built-ins. The first tests must read `skills/superloopy-backend/SKILL.md`, `agents/openai.yaml`, and these references: `architecture.md`, `data-safety.md`, `runtime-agents.md`, `testing-and-operations.md`, `upstream-notice.md`. Assert:

```javascript
assert.match(skill, /^---\nname: superloopy-backend\ndescription: Use only after explicit Codex/mu);
assert.match(skill, /\$superloopy:superloopy-backend/u);
assert.match(skill, /\/superloopy:superloopy-backend/u);
assert.match(skill, /stack-neutral/iu);
assert.match(skill, /typed.*tool/isu);
assert.match(skill, /least[- ]privilege/iu);
assert.match(skill, /read-only/iu);
assert.match(skill, /tenant/iu);
assert.match(skill, /idempot/iu);
assert.match(skill, /ambiguous/iu);
assert.match(skill, /migration/iu);
assert.match(skill, /SUPERLOOPY_EVIDENCE/u);
assert.doesNotMatch(skill, /always use (PostgreSQL|TypeScript|Python|MongoDB)/iu);
assert.doesNotMatch(metadata, /^policy:/mu);
```

Also assert each routed reference exists, is linked directly from `SKILL.md`, and contains its owned contract.

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
node --test test/backend-skill.test.js
```

Expected: FAIL with `ENOENT` for `skills/superloopy-backend/SKILL.md`.

- [ ] **Step 3: Commit the RED test**

```bash
git add test/backend-skill.test.js
git commit -m "test: define backend skill contract"
```

---

### Task 4: Initialize and implement the minimal skill router

**Files:**

- Create: `skills/superloopy-backend/SKILL.md`
- Create: `skills/superloopy-backend/agents/openai.yaml`

**Interfaces:**

- Consumes: required contracts from `test/backend-skill.test.js` and baseline failures from Task 2.
- Produces: explicit activation, context card, change classification, reference routing, lifecycle, failure handling, and receipt contract.

- [ ] **Step 1: Initialize the skill using the packaged generator**

Run:

```bash
python3 '/Users/bee/.codex/skills/.system/skill-creator/scripts/init_skill.py' superloopy-backend --path skills --resources references --interface 'display_name=Superloopy Backend' --interface 'short_description=Stack-neutral backend and database-agent workflow' --interface 'default_prompt=Use $superloopy-backend to design and validate this backend or database-agent change safely.'
```

Expected: a new `skills/superloopy-backend/` directory with `SKILL.md`, `agents/openai.yaml`, and `references/`.

- [ ] **Step 2: Replace the generated router with the minimal contract**

Write frontmatter with only `name` and `description`. The description starts `Use only after explicit Codex` and names explicit invocation, leading `loopy`/`루피`, active-loop routing, relevant backend/database-agent triggers, and plain-vocabulary exclusions.

The body must:

- open with `SUPERLOOPY BACKEND ENABLED`;
- resolve and announce `BACKEND_SKILL_DIR`;
- build the approved backend context card;
- classify the change and load only directly linked references;
- define contracts before code;
- require TDD and project-native implementation;
- gate production authority and destructive operations;
- report `SUPERLOOPY_EVIDENCE: .superloopy/sessions/ai-db-backend-skill-20260805/evidence/backend-skill-report.md` for this active loop.

- [ ] **Step 3: Regenerate agent metadata**

Run:

```bash
python3 '/Users/bee/.codex/skills/.system/skill-creator/scripts/generate_openai_yaml.py' skills/superloopy-backend --interface 'display_name=Superloopy Backend' --interface 'short_description=Stack-neutral backend and database-agent workflow' --interface 'default_prompt=Use $superloopy-backend to design and validate this backend or database-agent change safely.'
```

Expected: quoted interface strings and no `policy` block, matching existing explicit-skill metadata conventions.

- [ ] **Step 4: Run the focused test**

```bash
node --test test/backend-skill.test.js
```

Expected: references remain missing or incomplete, while router and metadata assertions pass.

---

### Task 5: Author the evidence-backed reference modules

**Files:**

- Create: `skills/superloopy-backend/references/architecture.md`
- Create: `skills/superloopy-backend/references/data-safety.md`
- Create: `skills/superloopy-backend/references/runtime-agents.md`
- Create: `skills/superloopy-backend/references/testing-and-operations.md`
- Create: `skills/superloopy-backend/references/upstream-notice.md`
- Modify: `skills/superloopy-backend/SKILL.md`

**Interfaces:**

- Consumes: source-to-principle mappings in `SYNTHESIS.md` and reproduced failures in `baseline/summary.md`.
- Produces: directly routed, non-duplicated guidance for architecture, persistence safety, runtime agents, and validation/operations.

- [ ] **Step 1: Write `architecture.md`**

Cover project discovery, system boundaries, API and event contracts, consistency, transactions, idempotency, caching, background work, compatibility, and stack-selection restraint. Use one concrete pseudocode example for a typed service boundary, not parallel examples in many languages.

- [ ] **Step 2: Write `data-safety.md`**

Cover schema authority, least privilege, tenant isolation, parameterization, transaction ambiguity, migration expand-and-contract, lock/resource preflight, backup verification, staged rollout, rollback versus roll-forward, and fail-closed conditions.

- [ ] **Step 3: Write `runtime-agents.md`**

Define the runtime tool contract fields: input schema, authorization context, tenant scope, allowlisted operation, result schema, timeout, row/payload/cost limits, redaction, audit event, idempotency, and error shape. Separate retrieval from action; treat retrieved records as untrusted data; require approval for consequential writes.

- [ ] **Step 4: Write `testing-and-operations.md`**

Cover disposable real-database tests, contract/integration/migration/failure tests, observability, trace and audit requirements, bounded retries, reconciliation of ambiguous outcomes, performance evidence, rollout, recovery, and the minimum completion report.

- [ ] **Step 5: Write `upstream-notice.md`**

For every retained source family, record source URL or pinned repository revision, observed date, content date, license when code was reviewed, principle retained, limitation, and `independent prose; no copied code or text`. Include the public/private practice limitation.

- [ ] **Step 6: Run GREEN validation**

```bash
node --test test/backend-skill.test.js
python3 '/Users/bee/.codex/skills/.system/skill-creator/scripts/quick_validate.py' skills/superloopy-backend
```

Expected: both commands pass.

- [ ] **Step 7: Commit the skill core**

```bash
git add skills/superloopy-backend test/backend-skill.test.js
git commit -m "feat: add stack-neutral backend skill"
```

---

### Task 6: Integrate discovery, doctor, and package inventories

**Files:**

- Modify: `src/doctor-skills.js`
- Modify: `test/doctor.test.js`
- Modify: `test/plugin.test.js`
- Modify: `test/docs.test.js`
- Modify: `README.md`
- Modify: `README.ko.md`
- Modify: `README.ja.md`
- Modify: `README.zh-CN.md`
- Modify: `README.es.md`
- Modify: `docs/superloopy-file-audit.md`
- Modify: `docs/superloopy-loop-golden-set.md`
- Modify: `docs/superloopy-design-audit.md`

**Interfaces:**

- Consumes: packaged skill files from Task 5.
- Produces: host discovery, source-health checks, localized invocation rows, package assertions, and reviewability inventory coverage.

- [ ] **Step 1: Add failing integration assertions**

Add `superloopy-backend` to `EXPECTED_SKILLS` in `test/doctor.test.js`. In `test/plugin.test.js`, assert the package includes the router, metadata, and five references. In `test/docs.test.js`, assert all localized skill tables contain one backend row with both explicit invocations and leading `loopy`/`루피` scope.

- [ ] **Step 2: Run integration tests and verify RED**

```bash
node --test test/doctor.test.js test/plugin.test.js test/docs.test.js
```

Expected: FAIL because `src/doctor-skills.js`, READMEs, and inventories do not yet include `superloopy-backend`.

- [ ] **Step 3: Implement integration**

Add `superloopy-backend` to the sorted required-skill list in `src/doctor-skills.js`. Add one accurately localized README table row per locale. Inventory each new skill file once in both audit tables, and add one design-audit decision row describing the stack-neutral lifecycle and public-evidence boundary.

- [ ] **Step 4: Run integration tests and verify GREEN**

```bash
node --test test/doctor.test.js test/plugin.test.js test/docs.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit integration**

```bash
git add src/doctor-skills.js test/doctor.test.js test/plugin.test.js test/docs.test.js README.md README.ko.md README.ja.md README.zh-CN.md README.es.md docs/superloopy-file-audit.md docs/superloopy-loop-golden-set.md docs/superloopy-design-audit.md
git commit -m "docs: publish backend skill discovery"
```

---

### Task 7: Forward-test, review, and prove completion

**Files:**

- Create: `.superloopy/sessions/ai-db-backend-skill-20260805/evidence/forward/*.md`
- Create: `.superloopy/sessions/ai-db-backend-skill-20260805/evidence/review/backend-skill-review.md`
- Modify: `skills/superloopy-backend/SKILL.md` and owned references only if forward tests reproduce a gap

**Interfaces:**

- Consumes: baseline prompts, completed skill, repository tests, and research synthesis.
- Produces: same-scenario comparison, independent review, deterministic Superloopy proof, and a completed scoped loop.

- [ ] **Step 1: Repeat baseline scenarios with the skill**

Use fresh contexts and the five exact baseline tasks, prefixed with `Use $superloopy:superloopy-backend from the installed skill directory resolved by the current host to solve this task.` Do not leak the expected output or baseline diagnosis. Save raw responses and a scored comparison under `evidence/forward/`.

- [ ] **Step 2: Refactor only reproduced gaps**

If an agent still violates a safety rule, add a direct counter grounded in that output. If output has the wrong shape, strengthen the positive output contract. Re-run the affected scenario and `node --test test/backend-skill.test.js` after each edit.

- [ ] **Step 3: Request independent code review**

Use `superpowers:requesting-code-review`. Review scope, source provenance, activation boundaries, stack neutrality, safety invariants, tests, docs, and unrelated worktree preservation. Record the accepted findings and fixes in `evidence/review/backend-skill-review.md`.

- [ ] **Step 4: Run the final focused and full validations**

```bash
node --test test/backend-skill.test.js test/doctor.test.js test/plugin.test.js test/docs.test.js
npm test
python3 '/Users/bee/.codex/skills/.system/skill-creator/scripts/quick_validate.py' skills/superloopy-backend
npm pack --dry-run --json --ignore-scripts
git diff --check
```

Expected: all commands exit 0; the package listing contains the backend skill and its references.

- [ ] **Step 5: Register deterministic Superloopy proof**

Run the focused contract as the happy-path criterion:

```bash
node '/Users/bee/.codex/plugins/cache/beefiker/superloopy/0.14.1/src/cli.js' loop prove --session-id ai-db-backend-skill-20260805 -- node --test test/backend-skill.test.js test/doctor.test.js test/plugin.test.js test/docs.test.js
```

Run the research validator as the risk criterion:

```bash
node '/Users/bee/.codex/plugins/cache/beefiker/superloopy/0.14.1/src/cli.js' loop prove --session-id ai-db-backend-skill-20260805 -- node '/Users/bee/.codex/plugins/cache/beefiker/superloopy/0.14.1/skills/superloopy-research/scripts/validate-research-evidence.mjs' --root '.superloopy/sessions/ai-db-backend-skill-20260805/evidence/research/20260805-ai-agent-database-backend' --json
```

- [ ] **Step 6: Preflight and finish the scoped loop**

```bash
node '/Users/bee/.codex/plugins/cache/beefiker/superloopy/0.14.1/src/cli.js' loop check --session-id ai-db-backend-skill-20260805 --json
node '/Users/bee/.codex/plugins/cache/beefiker/superloopy/0.14.1/src/cli.js' loop finish --session-id ai-db-backend-skill-20260805 --evidence 'Research corpus, baseline and forward tests, packaged skill, integration checks, and full suite passed.' --artifact '.superloopy/sessions/ai-db-backend-skill-20260805/evidence/gate.json' --notes 'Stack-neutral backend skill completed with primary-source research and deterministic proof.' --json
```

Expected: aggregate completion `complete` with both criteria passed.

- [ ] **Step 7: Commit any review-driven refinements**

```bash
git add skills/superloopy-backend test/backend-skill.test.js src/doctor-skills.js test/doctor.test.js test/plugin.test.js test/docs.test.js README.md README.ko.md README.ja.md README.zh-CN.md README.es.md docs/superloopy-file-audit.md docs/superloopy-loop-golden-set.md docs/superloopy-design-audit.md
git commit -m "fix: harden backend skill validation"
```

Skip this commit only when Step 2 produced no tracked changes.
