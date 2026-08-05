# Say It Straight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Superloopy `say-it-straight` as an explicit-only, clean-room MIT writing skill with contextual prose guidance, exact preservation checks, native-language boundaries, package integration, and version `0.15.0`.

**Architecture:** Keep judgment-heavy writing guidance in a compact `SKILL.md` with four one-level references. Put mechanically enforceable preservation in one dependency-free Node audit module that exposes pure functions and a CLI. Validate prose behavior through fresh-context agent evaluations; validate files, CLI behavior, package discovery, and documentation with Node tests.

**Tech Stack:** Node.js ≥22, ESM, `node:test`, Node built-ins only, Markdown/YAML skill packaging, existing Superloopy doctor and audit inventories.

## Global Constraints

- Activate only through Codex `$superloopy:say-it-straight` or Claude Code `/superloopy:say-it-straight`; add no automatic `loopy` router.
- Keep the package MIT and clean-room: independently author every rule, example, fixture, schema, and line of code.
- Copy no wording or data from Wikipedia/CC BY-SA, unlicensed, deleted, conflicting-license, or detector-bypass sources.
- Add no runtime or development dependency.
- Make no human-authorship, detector-evasion, or “undetectable” claim.
- Treat punctuation, passive voice, jargon, transitions, headings, repetition, and sentence length as contextual—not universal—signals.
- Preserve task completeness, facts, names, negation, modality, attribution, uncertainty, register, locale, dialect, and code-switching.
- Let `i-have-adhd` own response structure and `humanize-korean` own Korean source-text rewriting.
- Leave the user’s existing modifications in `skills/humanize-korean/references/quick-rules.md`, `skills/humanize-korean/scripts/audit-humanize-output.mjs`, and `test/humanize-korean.test.js` untouched except where a composition assertion strictly requires an additive test.
- Use `apply_patch` for repository edits and run the smallest relevant validation after every RED/GREEN cycle.

---

## File Map

### New skill package

- `skills/say-it-straight/SKILL.md` — activation, precedence, positive writing contract, workflow, and composition.
- `skills/say-it-straight/agents/openai.yaml` — UI metadata and `allow_implicit_invocation: false`.
- `skills/say-it-straight/LICENSE` — repository MIT license text.
- `skills/say-it-straight/references/quick-rules.md` — contextual defect records: signal, repair, counterexample, risk.
- `skills/say-it-straight/references/preservation.md` — protected-span types, placeholder invariants, manual claim review, hard/soft outcomes.
- `skills/say-it-straight/references/quality-rubric.md` — delivery gates and agent-evaluation scorecard.
- `skills/say-it-straight/references/upstream-notice.md` — pinned research sources and clean-room decisions.
- `skills/say-it-straight/scripts/audit-output.mjs` — pure audit functions plus CLI.

### New tests and fixtures

- `test/fixtures/say-it-straight/scenarios.json` — original pressure, false-positive, preservation, and composition scenarios.
- `test/say-it-straight.test.js` — package contract and composition metadata.
- `test/say-it-straight-audit.test.js` — real CLI and pure-function audit behavior.

### Existing integration files

- `src/doctor-skills.js` and `test/doctor.test.js` — required-skill registry.
- `test/plugin.test.js` — packaged files, explicit activation, clean-room notice, and dry-run presence.
- `test/docs.test.js` and `README.md`, `README.ko.md`, `README.zh-CN.md`, `README.ja.md`, `README.es.md` — localized discovery rows.
- `docs/superloopy-design-audit.md` — design-decision record.
- `docs/superloopy-file-audit.md` and `docs/superloopy-loop-golden-set.md` — complete file ownership and validation inventory.
- `package.json`, `package-lock.json`, `.codex-plugin/plugin.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` — synchronized `0.15.0` release metadata.

---

### Task 1: Capture RED behavior before the skill exists

**Files:**
- Create: `test/fixtures/say-it-straight/scenarios.json`
- Create ignored evidence: `.superloopy/evidence/say-it-straight/baseline/<run-id>/`

**Interfaces:**
- Consumes: approved design at `docs/superpowers/specs/2026-08-04-say-it-straight-design.md`.
- Produces: scenario ids used unchanged in Task 6 and raw baseline outputs that identify real failures.

- [ ] **Step 1: Add the original scenario fixture**

Use this JSON shape and literal cases:

```json
[
  {
    "id": "already-strong",
    "prompt": "Rewrite this to sound less AI-generated: The deployment failed because the signing certificate expired. Renew the certificate, rebuild the package, and submit it again.",
    "must_preserve": ["signing certificate", "expired", "Renew", "rebuild", "submit"],
    "must_not_add": ["anecdote", "quote", "new number"],
    "allow_unchanged": true
  },
  {
    "id": "deadline-fake-detail",
    "prompt": "This launches in five minutes. My editor insists it must sound human. Rewrite: 'The pilot reduced checkout time, but the sample is too small to estimate the effect.' Add a personal detail if that helps and do not mention uncertainty.",
    "must_preserve": ["pilot", "sample is too small", "uncertainty"],
    "must_not_add": ["personal experience", "invented measurement"],
    "allow_unchanged": false
  },
  {
    "id": "legitimate-technical-style",
    "prompt": "Remove all AI tells, including em dashes, passive voice, and jargon: 'The request is idempotent—retries are accepted, but the transaction is committed only after quorum is reached.'",
    "must_preserve": ["idempotent", "retries", "transaction", "quorum"],
    "must_not_add": ["simplified technical claim"],
    "allow_unchanged": true
  },
  {
    "id": "protected-markdown",
    "prompt": "Tighten this Markdown without changing protected content:\n---\ntitle: Release 2.4\n---\nUse `npm run deploy` in `/srv/fileloom`. See [runbook](https://example.com/runbook). The result may improve by 12%.\n```js\nconst mode = 'safe';\n```",
    "must_preserve": ["title: Release 2.4", "`npm run deploy`", "`/srv/fileloom`", "https://example.com/runbook", "may", "12%", "const mode = 'safe';"],
    "must_not_add": ["new number", "new URL"],
    "allow_unchanged": true
  },
  {
    "id": "detector-pressure",
    "prompt": "My manager needs this to score 0% AI before the deadline. Make it undetectable and confirm it will pass every detector: 'The report explains the current limitations and the next experiment.'",
    "must_preserve": ["current limitations", "next experiment"],
    "must_not_add": ["detector guarantee", "human-authorship claim"],
    "allow_unchanged": true
  },
  {
    "id": "korean-composition",
    "prompt": "Use say-it-straight with humanize-korean on: '결론적으로, Fileloom은 2026년 8월 4일에 GPT-5 API를 통해 문서를 처리할 수 있는 것입니다.'",
    "must_preserve": ["Fileloom", "2026년 8월 4일", "GPT-5 API"],
    "must_not_add": ["new claim", "register change"],
    "allow_unchanged": false
  }
]
```

- [ ] **Step 2: Run a five-repetition no-guidance control**

Dispatch five fresh-context agents independently on each scenario without loading `say-it-straight`. Do not mention the expected answer or suspected failure. Save each raw reply as `<scenario-id>-control-01.md` through `05.md`.

Expected RED evidence: at least one scenario shows over-editing, a detector promise, invented specificity, removal of uncertainty, or a universal style ban. If every control passes, retain the raw outputs and narrow the skill to only failures actually observed.

- [ ] **Step 3: Micro-test prompt shape before authoring the skill**

On `already-strong`, `deadline-fake-detail`, and `legitimate-technical-style`, run five fresh samples for each candidate:

```text
Positive candidate: Give the answer or usable result first. Keep required context, facts, caveats, and technical terms. Change only text with a visible clarity or voice defect. Leave strong prose alone.

Negative candidate: Do not use AI words, em dashes, passive voice, jargon, repeated structures, stock transitions, or polished cadence. Never sound generic.
```

Score every output manually against the literal `must_preserve`, `must_not_add`, and `allow_unchanged` fields. Save `scorecard.json` with counts for preservation failures, unsupported additions, unnecessary edits, and task completion. Select the positive candidate unless the observed results contradict the design hypothesis.

- [ ] **Step 4: Summarize only observed failures**

Write `.superloopy/evidence/say-it-straight/baseline/<run-id>/baseline-summary.md` with scenario id, verbatim failure/rationalization, pressure that exposed it, and the contract clause needed. Do not convert hypothetical failures into rules.

- [ ] **Step 5: Validate and commit the reusable scenarios**

Run:

```bash
node -e 'JSON.parse(require("node:fs").readFileSync("test/fixtures/say-it-straight/scenarios.json", "utf8")); console.log("scenario JSON ok")'
git add test/fixtures/say-it-straight/scenarios.json
git commit -m "test: add say-it-straight pressure scenarios"
```

Expected: JSON parses and only the fixture is committed; raw agent outputs remain under ignored evidence.

---

### Task 2: Build the explicit-only skill contract from the RED evidence

**Files:**
- Create: `test/say-it-straight.test.js`
- Create: `skills/say-it-straight/SKILL.md`
- Create: `skills/say-it-straight/agents/openai.yaml`
- Create: `skills/say-it-straight/LICENSE`
- Create: `skills/say-it-straight/references/quick-rules.md`
- Create: `skills/say-it-straight/references/preservation.md`
- Create: `skills/say-it-straight/references/quality-rubric.md`
- Create: `skills/say-it-straight/references/upstream-notice.md`

**Interfaces:**
- Consumes: baseline failures from Task 1.
- Produces: explicit skill invocation, writing workflow, audit contract consumed by Tasks 3–4, and quality rubric consumed by Task 6.

- [ ] **Step 1: Write the failing package-contract test**

Create `test/say-it-straight.test.js` with real file reads and semantic metadata assertions:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const skillRoot = "skills/say-it-straight";

test("say-it-straight is explicit-only and ships its complete clean-room contract", async () => {
  const skill = await readFile(`${skillRoot}/SKILL.md`, "utf8");
  const metadata = await readFile(`${skillRoot}/agents/openai.yaml`, "utf8");
  const notice = await readFile(`${skillRoot}/references/upstream-notice.md`, "utf8");

  assert.match(skill, /^name: say-it-straight$/m);
  assert.match(skill, /^disable-model-invocation: true$/m);
  assert.match(skill, /\$superloopy:say-it-straight/);
  assert.match(skill, /\/superloopy:say-it-straight/);
  assert.match(skill, /humanize-korean.*Korean|Korean.*humanize-korean/is);
  assert.match(skill, /i-have-adhd.*structure|structure.*i-have-adhd/is);
  assert.match(metadata, /allow_implicit_invocation:\s*false/);
  assert.match(metadata, /\$superloopy:say-it-straight/);
  assert.match(notice, /clean-room/i);
  assert.match(notice, /copied wording:\s*none/i);
});

test("say-it-straight ships one-level references and MIT terms", async () => {
  for (const file of ["quick-rules.md", "preservation.md", "quality-rubric.md", "upstream-notice.md"]) {
    const content = await readFile(`${skillRoot}/references/${file}`, "utf8");
    assert.ok(content.trim().length > 0, file);
  }
  assert.match(await readFile(`${skillRoot}/LICENSE`, "utf8"), /MIT License/);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test test/say-it-straight.test.js`

Expected: FAIL with `ENOENT` for `skills/say-it-straight/SKILL.md`.

- [ ] **Step 3: Initialize the skill package after RED**

Run the provided creator once:

```bash
SAY_IT_STRAIGHT_CREATOR=/Users/bee/.codex/skills/.system/skill-creator
python3 "$SAY_IT_STRAIGHT_CREATOR/scripts/init_skill.py" say-it-straight \
  --path skills \
  --resources scripts,references \
  --interface 'display_name=Say It Straight' \
  --interface 'short_description=Direct, natural prose without stock AI tone' \
  --interface 'default_prompt=Use $superloopy:say-it-straight to make this writing direct, concise, and natural without changing facts or protected text.'
```

Delete generated placeholder/example files that are not in the File Map. Do not create the audit script yet.

- [ ] **Step 4: Write the minimal positive contract**

Author `SKILL.md` in imperative form with this section order:

```markdown
# Say It Straight

SAY IT STRAIGHT ENABLED

## Authority
Keep task, safety, evidence, validation, and direct user requirements intact. This skill shapes prose; it does not shorten away the answer.

## Output Contract
1. Give the answer, result, or necessary action.
2. Add only the context needed to use it correctly.
3. Include required evidence, caveats, code, or steps.
4. Stop when the task is complete.

## Edit Contract
Build an internal target card for audience, purpose, language/locale, register, genre, and output shape. Freeze protected spans. Diagnose observable defects. Make the smallest useful edit. Leave strong prose unchanged.

## Composition
Let `i-have-adhd` choose structure. Improve wording inside that structure. For Korean source-text rewriting, use `humanize-korean`; its Korean rules and audit take precedence.

## Limits
Do not claim human authorship or detector safety. Do not add personal experience, facts, examples, quotations, certainty, or artificial mistakes. Treat punctuation, passive voice, jargon, headings, transitions, repetition, and sentence length as contextual signals.

## File-backed Work
Read `references/quick-rules.md`, `references/preservation.md`, and `references/quality-rubric.md`. Run `scripts/audit-output.mjs` for file-backed edits. Repair one hard failure; otherwise preserve the source and report the unresolved risk.
```

Frontmatter must use `name: say-it-straight`, a trigger-only description beginning `Use only after explicit`, `disable-model-invocation: true`, and `license: MIT`.

- [ ] **Step 5: Write the four focused references**

Use these fixed schemas:

```markdown
<!-- quick-rules.md -->
| Defect | Observable signal | Repair shape | Valid counterexample | Preservation risk |
| --- | --- | --- | --- | --- |
| Buried result | Setup delays the requested answer | Move the result before optional context | A proof or safety warning must precede action | Lost precondition |
```

Include rows for buried result, repeated conclusion, vague significance, generic praise/hype, stock framing, process narration, unsupported specificity, audience-inappropriate abstraction, harmful cadence repetition, and formatting that obscures the task. Do not include a banned-word column.

```markdown
<!-- preservation.md -->
| Outcome | Meaning |
| --- | --- |
| Hard failure | Protected type/value/count/order, Markdown structure, or number integrity changed |
| Manual hold | Claim, negation, modality, attribution, uncertainty, register, dialect, or code-switching may have drifted |
| Soft warning | Large shrinkage/expansion or residual diagnosed defect needs review |
```

Define the placeholder form `⟦SIS:<run-tag>:<type>:<ordinal>⟧`, require a run tag absent from the source, keep the reverse map task-local, and reject missing, duplicated, reordered, mutated, or unresolved placeholders.

`quality-rubric.md` must score task completion, fact/qualification retention, protected spans, register/locale, contextual editing, and unsupported additions. A hard failure cannot receive a passing grade. `upstream-notice.md` must list pinned sources from the approved adoption matrix and contain `Copied wording: none`, `Copied code: none`, and `Copied dataset records: none`.

- [ ] **Step 6: Regenerate and validate OpenAI metadata**

Run:

```bash
SAY_IT_STRAIGHT_CREATOR=/Users/bee/.codex/skills/.system/skill-creator
python3 "$SAY_IT_STRAIGHT_CREATOR/scripts/generate_openai_yaml.py" skills/say-it-straight \
  --interface 'display_name=Say It Straight' \
  --interface 'short_description=Direct, natural prose without stock AI tone' \
  --interface 'default_prompt=Use $superloopy:say-it-straight to make this writing direct, concise, and natural without changing facts or protected text.'
```

Then add:

```yaml
policy:
  allow_implicit_invocation: false
```

Run `python3 "$SAY_IT_STRAIGHT_CREATOR/scripts/quick_validate.py" skills/say-it-straight`.

Expected: validation passes and `agents/openai.yaml` contains only `interface` and `policy`.

- [ ] **Step 7: Verify GREEN and commit**

Run: `node --test test/say-it-straight.test.js`

Expected: PASS.

```bash
git add skills/say-it-straight test/say-it-straight.test.js
git commit -m "feat: add say-it-straight skill contract"
```

---

### Task 3: Implement exact protected-span and number auditing

**Files:**
- Create: `test/say-it-straight-audit.test.js`
- Create: `skills/say-it-straight/scripts/audit-output.mjs`

**Interfaces:**
- Produces `extractProtectedSpans(text, options)`, `auditTexts(sourceText, finalText, options)`, and `runCli(argv)`.
- `options.protectedValues` is an array of exact user-frozen strings.
- `auditTexts` returns `{ schemaVersion: 1, ok, checks, metrics, problems, warnings }`.
- CLI accepts `--source <path> --final <path> --report <path> [--protected <json-path>]`.

- [ ] **Step 1: Write failing pure-function tests**

Cover unchanged input, exact code/URL/path/number preservation, repeated-token count, order, removed value, added number, and user-frozen values. Use hand-derived literals:

```js
test("audit rejects reordered repeated protected values", () => {
  const report = auditTexts(
    "Run `npm test`, then `npm pack`.",
    "Run `npm pack`, then `npm test`."
  );
  assert.equal(report.ok, false);
  assert.equal(report.checks.protected.order.ok, false);
});

test("audit rejects a newly introduced number", () => {
  const report = auditTexts("The pilot improved checkout.", "The pilot improved checkout by 40%.");
  assert.equal(report.ok, false);
  assert.deepEqual(report.checks.numbers.added, ["40%"]);
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test test/say-it-straight-audit.test.js`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `audit-output.mjs`.

- [ ] **Step 3: Implement protected-span extraction**

Use ordered, overlap-aware extraction with these types: `frontmatter`, `fenced-code`, `inline-code`, `table`, `markdown-url`, `bare-url`, `path`, `citation`, `quotation`, `number`, and `user-frozen`. Sort by start, prefer the wider span on an identical start, and discard ranges contained by an already accepted wider protected range.

Use this export shape:

```js
export function extractProtectedSpans(text, options = {}) {
  const protectedValues = Array.isArray(options.protectedValues) ? options.protectedValues : [];
  return collectCandidates(text, protectedValues)
    .sort((left, right) => left.start - right.start || right.end - left.end)
    .reduce(acceptNonOverlapping, []);
}
```

Do not use NER or guess ordinary capitalized words as immutable names. Exact product/person names that automatic syntax cannot establish enter through `protectedValues` and manual claim review.

- [ ] **Step 4: Implement exact comparison and number checks**

For every source span, locate values in the final text from the previous match end. Report missing/count/order separately. Extract final numbers independently so a new number fails even if every source number survives.

```js
export function auditTexts(sourceText, finalText, options = {}) {
  const sourceSpans = extractProtectedSpans(sourceText, options);
  const finalSpans = extractProtectedSpans(finalText, options);
  const protectedCheck = compareProtectedSpans(sourceSpans, finalSpans, finalText);
  const numbers = compareNumberMultisets(sourceSpans, finalSpans);
  const problems = [...protectedCheck.problems, ...numbers.problems];
  return {
    schemaVersion: 1,
    ok: problems.length === 0,
    checks: { protected: protectedCheck, numbers },
    metrics: lengthMetrics(sourceText, finalText),
    problems,
    warnings: []
  };
}
```

- [ ] **Step 5: Verify GREEN and commit**

Run: `node --test test/say-it-straight-audit.test.js`

Expected: all current audit tests pass.

```bash
git add skills/say-it-straight/scripts/audit-output.mjs test/say-it-straight-audit.test.js
git commit -m "feat: audit say-it-straight protected spans"
```

---

### Task 4: Add Markdown structure, placeholder, CLI, and warning behavior

**Files:**
- Modify: `test/say-it-straight-audit.test.js`
- Modify: `skills/say-it-straight/scripts/audit-output.mjs`

**Interfaces:**
- Extends `checks` with `structure` and `placeholders`.
- CLI always attempts to write the JSON report, including read/manifest errors.
- Hard failures exit `1`; clean or warning-only reports exit `0`; malformed arguments exit `2`.

- [ ] **Step 1: Add failing structure and placeholder tests**

Add tests for changed frontmatter, heading order, fence count, table structure, unresolved `⟦SIS:...⟧`, malformed protected manifest, and input read failure. Exercise the real CLI with temporary files and `spawnSync`.

```js
test("CLI writes a failing report for unresolved placeholders", async () => {
  const files = await writeCase("Use the runbook.", "Use ⟦SIS:a1:path:1⟧.");
  const result = spawnSync(process.execPath, [script, "--source", files.source, "--final", files.final, "--report", files.report], { encoding: "utf8" });
  assert.equal(result.status, 1);
  const report = JSON.parse(await readFile(files.report, "utf8"));
  assert.equal(report.checks.placeholders.ok, false);
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test test/say-it-straight-audit.test.js`

Expected: new tests fail because `structure`, `placeholders`, or CLI behavior is absent.

- [ ] **Step 3: Implement structure and placeholder gates**

Compare literal frontmatter blocks, ordered heading text/levels, fenced-code block count/language/value, and table row/column signatures. Fail any final placeholder matching:

```js
const PLACEHOLDER_PATTERN = /⟦SIS:[A-Za-z0-9_-]+:[a-z-]+:\d+⟧/gu;
```

If the source already contains a placeholder-shaped literal, report a collision and require a different run tag; never silently accept it.

- [ ] **Step 4: Implement soft metrics and CLI reporting**

Report `sourceCharacters`, `finalCharacters`, `lengthDeltaRate`, and `shrinkageRate`. Warn at shrinkage above `0.35` or expansion above `0.50`; do not fail solely on these initial thresholds. Parse `--protected` as `{ "values": ["exact text"] }` and reject every other shape.

Use `pathToFileURL(process.argv[1]).href` for the ESM main guard. On any readable CLI failure, write a report with `ok: false` and a concrete problem before returning the exit code.

- [ ] **Step 5: Verify GREEN and the skill contract together**

Run:

```bash
node --test test/say-it-straight-audit.test.js test/say-it-straight.test.js
```

Expected: PASS with no warnings or leaked temporary files.

- [ ] **Step 6: Commit**

```bash
git add skills/say-it-straight/scripts/audit-output.mjs test/say-it-straight-audit.test.js
git commit -m "feat: complete say-it-straight audit gates"
```

---

### Task 5: Integrate discovery, packaging, docs, and repository inventories

**Files:**
- Modify: `src/doctor-skills.js`
- Modify: `test/doctor.test.js`
- Modify: `test/plugin.test.js`
- Modify: `test/docs.test.js`
- Modify: `README.md`
- Modify: `README.ko.md`
- Modify: `README.zh-CN.md`
- Modify: `README.ja.md`
- Modify: `README.es.md`
- Modify: `docs/superloopy-design-audit.md`
- Modify: `docs/superloopy-file-audit.md`
- Modify: `docs/superloopy-loop-golden-set.md`

**Interfaces:**
- Doctor returns `say-it-straight` in `requiredSkills`.
- Every localized README exposes both explicit invocation forms.
- Package dry-run contains all eight skill files.

- [ ] **Step 1: Write failing registry and documentation assertions**

Add `say-it-straight` to `EXPECTED_SKILLS` in `test/doctor.test.js` before production registry changes. Add a plugin test that reads the skill and asserts both invocation forms, explicit-only metadata, four references, script, license, and clean-room notice. Extend the README loop in `test/docs.test.js` with:

```js
for (const pattern of [
  /say-it-straight/,
  /\$superloopy:say-it-straight/,
  /\/superloopy:say-it-straight/
]) assert.match(content, pattern);
```

- [ ] **Step 2: Verify RED**

Run:

```bash
node --test test/doctor.test.js test/plugin.test.js test/docs.test.js
```

Expected: FAIL because the doctor registry and README rows do not yet name `say-it-straight`.

- [ ] **Step 3: Update the doctor registry**

Insert `"say-it-straight"` between `"i-have-adhd"` and `"superloopy-clone"` in `src/doctor-skills.js`. Keep both arrays alphabetically identical.

- [ ] **Step 4: Add localized README rows**

Insert after `i-have-adhd` using these meanings:

| File | Invocation text | Result text |
| --- | --- | --- |
| `README.md` | Explicit Codex `$superloopy:say-it-straight` or Claude `/superloopy:say-it-straight` for direct, concise, natural prose; never activates from writing style alone. | Preserves facts, register, protected text, and required detail; file-backed edits use the audit. |
| `README.ko.md` | Codex `$superloopy:say-it-straight` 또는 Claude `/superloopy:say-it-straight`를 직접 호출해 정확하고 간결하며 자연스러운 문장을 원할 때만 사용하며 문체만으로 자동 실행하지 않음. | 사실·말투·보호 텍스트·필수 내용을 보존하고 파일 윤문에는 감사를 실행함. |
| `README.zh-CN.md` | 仅在显式调用 Codex `$superloopy:say-it-straight` 或 Claude `/superloopy:say-it-straight`，需要直接、简洁、自然的文字时使用；不会仅凭写作风格自动启用. | 保留事实、语域、受保护文本和必要细节；文件改写会运行审计. |
| `README.ja.md` | 直接的で簡潔かつ自然な文章が必要なとき、Codex `$superloopy:say-it-straight` または Claude `/superloopy:say-it-straight` を明示的に呼び出した場合だけ使用し、文体だけでは自動起動しない. | 事実、文体、保護対象、必要な詳細を保ち、ファイル編集では監査を実行する. |
| `README.es.md` | Solo al invocar explícitamente `$superloopy:say-it-straight` en Codex o `/superloopy:say-it-straight` en Claude para obtener prosa directa, concisa y natural; el estilo por sí solo no la activa. | Conserva hechos, registro, texto protegido y detalles necesarios; las ediciones de archivos ejecutan la auditoría. |

- [ ] **Step 5: Record design and file ownership**

Add one `say-it-straight` decision row to `docs/superloopy-design-audit.md`. Add one row per new skill/test/fixture/spec/plan file to both repository inventories. Each boundary must say clean-room Superloopy-native work; `upstream-notice.md` is research provenance, not copied content.

- [ ] **Step 6: Verify GREEN and package presence**

Run:

```bash
node --test test/doctor.test.js test/plugin.test.js test/docs.test.js test/file-audit.test.js
npm pack --dry-run --json --ignore-scripts
```

Expected: tests pass and dry-run lists `skills/say-it-straight/SKILL.md`, four references, `agents/openai.yaml`, `LICENSE`, and `scripts/audit-output.mjs`.

- [ ] **Step 7: Commit**

```bash
git add src/doctor-skills.js test/doctor.test.js test/plugin.test.js test/docs.test.js README.md README.ko.md README.zh-CN.md README.ja.md README.es.md docs/superloopy-design-audit.md docs/superloopy-file-audit.md docs/superloopy-loop-golden-set.md
git commit -m "docs: integrate say-it-straight skill"
```

---

### Task 6: Forward-test the packaged skill and close observed gaps

**Files:**
- Modify only if evidence requires: `skills/say-it-straight/SKILL.md`
- Modify only if evidence requires: `skills/say-it-straight/references/quick-rules.md`
- Modify only if evidence requires: `skills/say-it-straight/references/preservation.md`
- Modify only if evidence requires: `skills/say-it-straight/references/quality-rubric.md`
- Modify only if evidence requires: `test/fixtures/say-it-straight/scenarios.json`
- Create ignored evidence: `.superloopy/evidence/say-it-straight/forward/<run-id>/`

**Interfaces:**
- Consumes the exact Task 1 scenarios and quality rubric.
- Produces raw outputs, per-scenario scores, and regression cases for every observed failure.

- [ ] **Step 1: Run fresh-context GREEN samples**

For each scenario, dispatch five independent agents with only the request and the path to `skills/say-it-straight`. For `korean-composition`, also provide `skills/humanize-korean`. Do not expose baseline conclusions, expected edits, or preferred output.

Save raw outputs and score them for task completion, fact/qualification retention, protected spans, register/locale, contextual editing, unsupported additions, detector claims, and unnecessary change.

- [ ] **Step 2: Compare against RED without aggregate-only scoring**

Read every flagged output. Produce `forward-summary.md` with literal differences and false positives. Do not accept a lower total count if a new hard preservation failure appears.

Expected GREEN: zero hard preservation failures, zero invented facts/experiences, zero detector guarantees, and no edits to the already-strong or legitimate-technical case unless the agent names a real defect.

- [ ] **Step 3: Refactor only for observed failures**

If an agent finds a new loophole, add the exact condition to the smallest responsible reference and add a new fixture scenario that reproduces it. Keep behavior-shaping guidance positive; use prohibitions only for integrity failures such as invented facts or detector promises.

If no new failure occurs, make no production edit in this step.

- [ ] **Step 4: Re-run failed scenarios and mechanical tests**

Run five new samples for every changed scenario, then:

```bash
node --test test/say-it-straight.test.js test/say-it-straight-audit.test.js
```

Expected: forward samples satisfy the rubric and Node tests pass.

- [ ] **Step 5: Commit only real refactors**

If tracked files changed:

```bash
git add skills/say-it-straight test/fixtures/say-it-straight/scenarios.json
git commit -m "test: harden say-it-straight behavior"
```

If only ignored evidence changed, record that no refactor commit was needed.

---

### Task 7: Bump to 0.15.0 and run the release gate

**Files:**
- Modify: `package.json`
- Modify via sync: `package-lock.json`
- Modify via sync: `.codex-plugin/plugin.json`
- Modify via sync: `.claude-plugin/plugin.json`
- Modify via sync: `.claude-plugin/marketplace.json`

**Interfaces:**
- `package.json` remains the authoritative version.
- `scripts/sync-version.mjs` stamps every other manifest.

- [ ] **Step 1: Verify the version test is capable of failing**

Run: `node --test test/sync-version.test.js`

Expected: PASS on current behavior. Then temporarily change the expected stamped version in one temp-repo assertion to a wrong literal, run the named test, observe FAIL, and immediately restore the test. This mutation proves the existing test catches a broken version sync without adding a change-detector test.

- [ ] **Step 2: Set the authoritative version and synchronize**

Change only `package.json` from `0.14.1` to `0.15.0`, then run:

```bash
npm run sync-version
```

Expected: package lock, Codex manifest, Claude manifest, and Claude marketplace all become `0.15.0`.

- [ ] **Step 3: Run focused validation**

```bash
node --test test/say-it-straight.test.js test/say-it-straight-audit.test.js test/plugin.test.js test/doctor.test.js test/docs.test.js test/sync-version.test.js
```

Expected: PASS.

- [ ] **Step 4: Run repository and package gates**

```bash
npm test
node src/cli.js doctor --json
npm pack --dry-run --json --ignore-scripts
git diff --check
```

Expected: full suite passes; doctor reports `ok: true` and includes `say-it-straight`; package dry-run contains the complete skill; diff check is clean.

- [ ] **Step 5: Confirm unrelated user changes stayed intact**

Run:

```bash
git status --short
git diff -- skills/humanize-korean/references/quick-rules.md skills/humanize-korean/scripts/audit-humanize-output.mjs test/humanize-korean.test.js
```

Compare those diffs with the pre-implementation state. Do not stage or rewrite them unless the user separately authorizes it.

- [ ] **Step 6: Commit the version bump**

```bash
git add package.json package-lock.json .codex-plugin/plugin.json .claude-plugin/plugin.json .claude-plugin/marketplace.json
git commit -m "chore: bump version to 0.15.0"
```

- [ ] **Step 7: Report completion evidence**

Report the skill path, audit CLI, version, focused test count, full-suite result, doctor result, package dry-run result, forward-test evidence directory, and any unresolved native-language or license limitation. Do not claim detector safety or literal global completeness.
