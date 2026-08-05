# Impeccable Frontend A/B/C Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a bounded, attributed Impeccable visual-direction reference to Superloopy Frontend and evaluate current Superloopy, released Impeccable, and the combined candidate through fresh, isolated Codex-generated Threadmark landing pages.

**Architecture:** Keep Superloopy's routing and evidence contracts authoritative, with one new reference selected only for marketing/editorial or explicit new visual direction. Store the experimental prompt, instruction snapshots, generated sites, browser evidence, screenshots, pairwise diffs, and report in one ignored run-scoped evidence root. Use fresh ephemeral Codex executions and dependency-free Node/Chrome validation so the only arm variable is the instruction bundle.

**Tech Stack:** Markdown skills, Node.js 22+ built-ins, Node test runner, Codex CLI 0.146.0, Google Chrome 150 headless, static HTML/CSS/JavaScript, existing dependency-free PNG diff helper.

## Global Constraints

- Superloopy control revision is exactly `872caa620ae0c3a22174bd230c0699ef14b24acd`.
- Impeccable reference revision is exactly `ae5e95101a6979e7f7973a4ff57680b3c7adc1ec`, skill `4.0.4`, Apache-2.0.
- A, B, and C receive the same Threadmark copy, constraints, model configuration, execution budget, and completion request.
- Static HTML, CSS, and JavaScript only; no dependencies, remote assets, analytics, network calls, build step, or framework.
- Required viewports are `1440 × 1000` and `390 × 844` CSS pixels.
- Impeccable detector findings are diagnostic only and cannot affect scoring.
- Product truth, platform routing, existing-stack preservation, accessibility, responsive proof, evidence, and completion remain owned by Superloopy.
- Do not push or merge the feature branch without separate authorization.

---

### Task 1: Freeze and Generate Arm A

**Files:**
- Read: `skills/superloopy-frontend/SKILL.md`
- Read: `skills/superloopy-frontend/references/ux.md`
- Read: `skills/superloopy-frontend/references/web.md`
- Read: `skills/superloopy-frontend/references/layout.md`
- Read: `skills/superloopy-frontend/references/anti-slop.md`
- Create local evidence: `.superloopy/evidence/frontend/<run-id>/instructions/a-superloopy.md`
- Create local evidence: `.superloopy/evidence/frontend/<run-id>/prompt/threadmark.md`
- Create local evidence: `.superloopy/evidence/frontend/<run-id>/arms/a/`
- Create local evidence: `.superloopy/evidence/frontend/<run-id>/manifest.json`

**Interfaces:**
- Consumes: pinned Git objects at control revision `872caa620ae0c3a22174bd230c0699ef14b24acd`.
- Produces: immutable A instruction snapshot and a generated site containing `index.html` as the control output.

- [ ] **Step 1: Create the evidence root and manifest skeleton**

Run:

```bash
node skills/superloopy-frontend/scripts/evidence-root.mjs create impeccable-frontend-abc
```

Record the returned absolute root as `ABC_EVIDENCE_ROOT`; create `instructions`, `prompt`, `arms/a`, `arms/b`, `arms/c`, `screenshots`, `diffs`, and `reports` beneath it. The manifest begins with the pinned revisions, `codex-cli 0.146.0`, Chrome version, Node version, viewports, arm statuses, and rerun count `0`.

- [ ] **Step 2: Write the exact common prompt and A snapshot**

Use `git show 872caa620ae0c3a22174bd230c0699ef14b24acd:<path>` for every A skill/reference input. Concatenate them with path headers into `instructions/a-superloopy.md`. Write the exact fixed Threadmark content and constraints from the approved design to `prompt/threadmark.md`, ending with:

```text
Read the supplied frontend instruction bundle as your only design workflow. Build the complete result now in this directory. Do not ask follow-up questions. Create index.html and any local CSS or JavaScript files it uses. Before finishing, verify required copy, keyboard behavior, responsive layout, reduced motion, and absence of remote resources.
```

- [ ] **Step 3: Run the fresh A generation**

Run one ephemeral Codex process from `arms/a` with the common prompt and A instruction snapshot on stdin, `--skip-git-repo-check`, `--ignore-user-config`, identical model/config flags reserved for all arms, workspace-write sandbox, and approval policy `never`. Save JSONL events, stderr, exit code, final message, timestamps, and file inventory in the manifest.

- [ ] **Step 4: Validate the A output exists before changing the candidate**

Run:

```bash
test -s "$ABC_EVIDENCE_ROOT/arms/a/index.html"
rg -n "Every claim keeps its trail|Source|Evidence|Claim|Draft" "$ABC_EVIDENCE_ROOT/arms/a/index.html"
```

Expected: non-empty `index.html` and all fixed workflow terms. If generation fails for an environmental reason, preserve attempt 1 and perform at most the one rerun allowed by the design.

---

### Task 2: Add the Combined Skill Contract Test-First

**Files:**
- Create: `test/frontend-impeccable-contract.test.js`
- Create: `skills/superloopy-frontend/references/impeccable.md`
- Modify: `skills/superloopy-frontend/SKILL.md`
- Modify: `test/plugin.test.js`
- Modify: `docs/superloopy-file-audit.md`
- Modify: `docs/superloopy-loop-golden-set.md`

**Interfaces:**
- Consumes: existing Superloopy marketing/new-direction routing and upstream review findings.
- Produces: a claim-selected `references/impeccable.md` contract and packaged, audited routing to it.

- [ ] **Step 1: Write the failing contract tests**

Create tests using the repository's `readFile` and `node:test` patterns. Assert that:

```js
assert.match(skill, /marketing.*impeccable\.md|impeccable\.md.*new visual direction/is);
assert.match(reference, /visitor mode/iu);
assert.match(reference, /direction pass[\s\S]*refinement pass/iu);
assert.match(reference, /Superloopy owns[\s\S]*Impeccable informs/iu);
assert.match(reference, /contextual[\s\S]*not.*universal/iu);
assert.match(reference, /ae5e95101a6979e7f7973a4ff57680b3c7adc1ec/u);
assert.match(reference, /Apache-2\.0/u);
assert.doesNotMatch(reference, /install.*hook|mandatory root.*PRODUCT\.md|mandatory root.*DESIGN\.md/iu);
```

Also extend the npm-pack assertion in `test/plugin.test.js` so `skills/superloopy-frontend/references/impeccable.md` must ship.

- [ ] **Step 2: Run the focused tests to verify RED**

Run:

```bash
node --test test/frontend-impeccable-contract.test.js test/plugin.test.js
```

Expected: FAIL because `references/impeccable.md` and its routing do not exist.

- [ ] **Step 3: Write the minimal combined reference**

Create original, attributed guidance with these exact sections:

```markdown
## Ownership boundary
## Direction pass
## Refinement pass
## Contextual taste guidance
## Evidence and stopping rule
## Provenance
```

The direction pass records visitor mode, hierarchy, visual thesis, typography/composition, and interaction character. The refinement pass occurs once after functional/responsive truth and reviews hierarchy, rhythm, type, contrast, feedback, and generic-pattern residue. It cannot change product facts, platform, dependencies, or required proof.

- [ ] **Step 4: Route and inventory the reference**

Modify the marketing/editorial/new-visual-direction rows in `SKILL.md` and `web.md` to load `references/impeccable.md` after `anti-slop.md`. Add exactly one file-audit and golden-set row describing bounded presentation guidance and upstream provenance. Keep existing activation, target table, platform ownership, and evidence commands unchanged.

- [ ] **Step 5: Run focused tests to verify GREEN**

Run:

```bash
node --test test/frontend-impeccable-contract.test.js test/frontend-quality-overlays.test.js test/frontend-routing-scenarios.test.js test/frontend-ux-contract.test.js test/frontend-ux-semantics.test.js test/plugin.test.js test/file-audit.test.js
```

Expected: all pass.

- [ ] **Step 6: Commit the combined candidate**

```bash
git add skills/superloopy-frontend/SKILL.md skills/superloopy-frontend/references/impeccable.md test/frontend-impeccable-contract.test.js test/plugin.test.js docs/superloopy-file-audit.md docs/superloopy-loop-golden-set.md
git commit -m "feat: add bounded Impeccable frontend direction"
```

---

### Task 3: Exercise Combined Behavior and Generate B/C

**Files:**
- Read: `/tmp/superloopy-impeccable-abc-upstream/plugin/skills/impeccable/`
- Create local evidence: `.superloopy/evidence/frontend/<run-id>/instructions/b-impeccable.md`
- Create local evidence: `.superloopy/evidence/frontend/<run-id>/instructions/c-combined.md`
- Create local evidence: `.superloopy/evidence/frontend/<run-id>/behavior/`
- Create local evidence: `.superloopy/evidence/frontend/<run-id>/arms/b/`
- Create local evidence: `.superloopy/evidence/frontend/<run-id>/arms/c/`

**Interfaces:**
- Consumes: the same common prompt, released B snapshot, and committed C snapshot.
- Produces: fresh B/C sites and behavioral traces proving C's bounded ownership.

- [ ] **Step 1: Snapshot B and C instructions**

For B, concatenate the pinned released `plugin/skills/impeccable/SKILL.md` plus only the references its new-work landing-page route requires, each with a path header. For C, concatenate the committed candidate `SKILL.md`, `ux.md`, `web.md`, `layout.md`, `anti-slop.md`, and `impeccable.md`. Record SHA-256 hashes in the manifest.

- [ ] **Step 2: Run fresh behavioral pressure cases for C**

Use three ephemeral Codex runs with the C bundle and small disposable workspaces:

1. a Web landing-page request that must state visitor mode/direction before writing and perform one refinement pass;
2. a Qt request where Impeccable cannot replace Qt/Superloopy ownership;
3. a request to add a visual dependency and invent a testimonial, which must preserve the approval and product-truth boundaries.

Save JSONL tool traces and final messages. Require observable file/tool behavior plus final receipts; do not pass a case from prose assertions alone.

- [ ] **Step 3: Run fresh B and C generations**

Run the exact same Codex command/profile used for A, changing only the instruction snapshot and arm directory. Save complete event logs, final messages, timestamps, exit statuses, and file inventories. Do not allow either arm to read another arm directory.

- [ ] **Step 4: Check output contract before browser work**

For every arm, require `index.html`, the fixed headline/actions/capabilities/workflow/trust copy, no `http://` or `https://` resource attributes, and no forbidden testimonial/metrics/customer wording. Record failures without editing the output.

---

### Task 4: Capture Browser Evidence and Pairwise Differences

**Files:**
- Create local evidence: `.superloopy/evidence/frontend/<run-id>/browser-validation.json`
- Create local evidence: `.superloopy/evidence/frontend/<run-id>/screenshots/{a,b,c}-{desktop,mobile}.png`
- Create local evidence: `.superloopy/evidence/frontend/<run-id>/diffs/*.json`
- Create local evidence: `.superloopy/evidence/frontend/<run-id>/comparison.html`

**Interfaces:**
- Consumes: unchanged A/B/C output directories.
- Produces: six screenshots, common browser checks, six pairwise diff records, and a viewable comparison page.

- [ ] **Step 1: Run common real-browser validation**

Launch the pinned local Chrome binary with a temporary profile and remote debugging. For each arm and viewport, use the Chrome DevTools Protocol to set device metrics, navigate to the local `index.html`, collect console/page failures, and evaluate:

```js
({
  horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  landmarks: ["header", "main", "footer"].every((name) => document.querySelector(name)),
  headingOrder: [...document.querySelectorAll("h1,h2,h3")].map((node) => node.tagName),
  interactive: [...document.querySelectorAll("a,button,[tabindex]")].map((node) => ({
    tag: node.tagName,
    text: node.textContent.trim(),
    name: node.getAttribute("aria-label") || node.textContent.trim()
  }))
})
```

Exercise the evidence-flow control through pointer and keyboard events, capture its before/after state, and rerun with `prefers-reduced-motion: reduce`. Mark any check not actually exercised as manual-review-required.

- [ ] **Step 2: Capture the six primary PNGs**

Use one Chrome build, device scale factor `1`, light color scheme, `en-US`, reduced motion off for the primary screenshots, fixed ready condition, and identical delay. Capture `1440×1000` and `390×844` viewport images for A, B, and C.

- [ ] **Step 3: Measure all pairwise differences**

Run the existing helper for A↔B, A↔C, and B↔C at desktop and mobile:

```bash
node skills/superloopy-frontend/scripts/visual-diff.mjs reference.png actual.png --json
```

Expected: six valid JSON files. Similarity is descriptive only.

- [ ] **Step 4: Build the comparison page**

Create a dependency-free local HTML page with a sticky viewport selector and labeled A/B/C columns. Use only relative paths to the six PNGs and link the raw browser/diff records.

---

### Task 5: Score, Report, and Verify

**Files:**
- Create local evidence: `.superloopy/evidence/frontend/<run-id>/scorecard.json`
- Create local evidence: `.superloopy/evidence/frontend/<run-id>/VISUAL_QA.md`
- Create local evidence: `.superloopy/evidence/frontend/<run-id>/REPORT.md`
- Modify: `docs/superloopy-design-audit.md`

**Interfaces:**
- Consumes: arm-blind screenshots, browser results, behavior traces, and pairwise differences.
- Produces: direct winner, limitations, durable design-audit note, and final evidence receipt.

- [ ] **Step 1: Inspect and score without detector influence**

Randomize arm labels during first-pass visual review. Score distinctiveness 20%, clarity 25%, responsiveness 20%, accessibility 20%, and implementation integrity 15%, each from 0–5 with an artifact-backed observation. Apply the critical-failure and two-point practical-tie rules from the design.

- [ ] **Step 2: Add detector context separately**

Run Impeccable's deterministic detector against each unchanged arm if the pinned CLI can do so without installing into Superloopy. Preserve advisory severity as advisory. Store detector output in a separate report section with no score arithmetic.

- [ ] **Step 3: Write visual QA and the direct verdict**

`VISUAL_QA.md` records target, browser/OS/input, state, viewport, observed differences, source cause, result, and limitations. `REPORT.md` links all six screenshots and `comparison.html`, names the winner or practical tie, and distinguishes visual judgment from behavior/contract results.

- [ ] **Step 4: Update the durable design audit**

Add a narrow note to `docs/superloopy-design-audit.md` naming the pinned Impeccable reference, concepts adopted, rejected runtime/authority coupling, and the evidence run. Add/update its inventory row if required by the repository audit contract.

- [ ] **Step 5: Run final verification**

Run:

```bash
node --test test/frontend-impeccable-contract.test.js test/frontend-routing-scenarios.test.js test/frontend-qt-contract.test.js test/frontend-ux-contract.test.js test/frontend-ux-semantics.test.js test/frontend-quality-overlays.test.js test/ds-compliance.test.js test/visual-diff.test.js test/plugin.test.js test/file-audit.test.js
npm test
npm pack --dry-run --json --ignore-scripts
git diff --check
```

Verify the evidence root contains non-empty A/B/C `index.html`, six PNGs, six diff JSON files, browser validation, behavior traces, scorecard, manifest, comparison page, `VISUAL_QA.md`, and `REPORT.md`.

- [ ] **Step 6: Commit the audit and final test adjustments**

```bash
git add docs/superloopy-design-audit.md docs/superloopy-file-audit.md docs/superloopy-loop-golden-set.md test
git commit -m "docs: record Impeccable frontend evaluation"
```

Finish with the exact branch/commit state, validations, blockers, comparison link, screenshot links, direct winner, and:

```text
SUPERLOOPY_EVIDENCE: <run-scoped evidence root>
```
