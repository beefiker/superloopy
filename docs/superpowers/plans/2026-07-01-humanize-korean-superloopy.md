# Humanize Korean Superloopy Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a bundled `humanize-korean` skill that is better than `epoko77-ai/im-not-ai` for Codex/Superloopy users by combining Korean AI-style rewriting guidance with deterministic packaging, measurable safeguards, and evidence-backed QA.

**Architecture:** Ship one Superloopy-native Codex skill under `skills/humanize-korean/` with local references, local UI metadata, and one dependency-free Node audit script. The skill runs as a normal Codex skill for short text and upgrades cleanly into a Superloopy evidence workflow when invoked through `loopy` or `루피`. The implementation adapts upstream ideas only where useful, keeps attribution explicit, avoids symlinked reference packaging, and adds tests that prove the skill package, metrics script, docs, and inventories stay complete.

**Tech Stack:** Codex skills, Markdown references, `agents/openai.yaml`, Node.js 20 ESM, `node:test`, Superloopy evidence artifacts, no package dependencies.

---

## File Structure

- Create: `skills/humanize-korean/SKILL.md` - concise trigger and workflow contract for Korean humanization.
- Create: `skills/humanize-korean/agents/openai.yaml` - Codex UI metadata.
- Create: `skills/humanize-korean/references/quick-rules.md`, `quality-rubric.md`, and `upstream-notice.md` - packaged rules, stricter rubric, and MIT attribution.
- Create: `skills/humanize-korean/scripts/audit-humanize-output.mjs` - dependency-free audit tool for Korean ratio, protected-token preservation, pattern deltas, and change-rate gating.
- Create: `test/humanize-korean.test.js` - script-level contract tests.
- Modify: `test/plugin.test.js` - packaged-skill assertions.
- Modify: `test/docs.test.js` - README locale assertions for the new skill row.
- Modify: `README.md`, `README.ko.md`, `README.zh-CN.md`, `README.ja.md`, `README.es.md` - skill table/docs.
- Modify: `docs/superloopy-file-audit.md` - inventory rows for every new file.
- Modify: `docs/superloopy-loop-golden-set.md` - golden inventory rows for every new file.
- Modify: `docs/superloopy-design-audit.md` - add the `korean-humanizer-skill` design decision.

## Better-Than-Upstream Acceptance

- No symlinked references: every packaged reference resolves inside `skills/humanize-korean/`.
- Output is measurable: the audit script reports Korean ratio, character-change rate, protected-token preservation, and before/after AI-pattern counts.
- Evidence mode records under `.superloopy/evidence/humanize-korean/<run-id>/`; normal mode records under `_workspace/humanize-korean/<run-id>/`.
- The skill preserves facts, numbers, dates, URLs, quoted spans, product names, model names, acronyms, and register; it refuses non-Korean input.
- It warns when change rate is over 30%, fails the audit above 50%, and adds no package dependencies.

### Task 1: Add Red Tests For The Packaged Skill

**Files:**
- Create: `test/humanize-korean.test.js`
- Modify: `test/plugin.test.js`
- Modify: `test/docs.test.js`

- [ ] **Step 1: Create script contract tests**

Create `test/humanize-korean.test.js`:

```js
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const script = "skills/humanize-korean/scripts/audit-humanize-output.mjs";

async function writeCase(sourceText, finalText) {
  const dir = await mkdtemp(join(tmpdir(), "superloopy-humanize-"));
  const source = join(dir, "source.md");
  const final = join(dir, "final.md");
  const report = join(dir, "audit.json");
  await writeFile(source, sourceText);
  await writeFile(final, finalText);
  return { source, final, report };
}

test("humanize audit accepts Korean output with preserved protected tokens", async () => {
  const files = await writeCase(
    "2026년 7월 1일, GPT-5 API를 통해 Fileloom 2.3.1의 성능을 개선할 수 있다.",
    "2026년 7월 1일, GPT-5 API로 Fileloom 2.3.1의 성능을 개선한다."
  );
  const result = spawnSync(process.execPath, [script, "--source", files.source, "--final", files.final, "--report", files.report], {
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(await readFile(files.report, "utf8"));
  assert.equal(report.ok, true);
  assert.equal(report.protectedTokens.missing.length, 0);
  assert.equal(report.patterns.before["A-2"], 1);
  assert.equal(report.patterns.after["A-2"], 0);
});

test("humanize audit rejects non-Korean source text", async () => {
  const files = await writeCase("This is not Korean text.", "This is still not Korean text.");
  const result = spawnSync(process.execPath, [script, "--source", files.source, "--final", files.final, "--report", files.report], {
    encoding: "utf8"
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Korean source text required/);
});

test("humanize audit rejects missing protected tokens", async () => {
  const files = await writeCase(
    "Transferloom 1.4.0은 2026년 7월 1일에 배포됐다.",
    "Transferloom은 배포됐다."
  );
  const result = spawnSync(process.execPath, [script, "--source", files.source, "--final", files.final, "--report", files.report], {
    encoding: "utf8"
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Protected tokens changed/);
});
```

- [ ] **Step 2: Add packaged-skill assertions**

Append this test to `test/plugin.test.js`:

```js
test("plugin packages the Superloopy Korean humanizer skill with measurable safeguards", async () => {
  const skill = await readSkill("humanize-korean");

  assert.match(skill.frontmatter, /^name: humanize-korean$/m);
  assert.match(skill.frontmatter, /AI 티|humanize Korean|번역투/u);
  assert.match(skill.content, /SUPERLOOPY HUMANIZE KOREAN ENABLED/);
  assert.match(skill.content, /references\/quick-rules\.md/);
  assert.match(skill.content, /audit-humanize-output\.mjs/);
  assert.match(skill.content, /SUPERLOOPY_EVIDENCE/);

  for (const file of [
    "skills/humanize-korean/agents/openai.yaml",
    "skills/humanize-korean/references/quick-rules.md",
    "skills/humanize-korean/references/quality-rubric.md",
    "skills/humanize-korean/references/upstream-notice.md",
    "skills/humanize-korean/scripts/audit-humanize-output.mjs"
  ]) {
    assert.equal(existsSync(file), true);
  }
});
```

- [ ] **Step 3: Extend README skill-doc assertions**

In `test/docs.test.js`, inside `README lists the packaged Superloopy skills and their jobs`, add:

```js
assert.match(content, /humanize-korean/);
assert.match(content, /AI|Korean|한국어|한글|윤문/u);
```

- [ ] **Step 4: Run red tests**

Run: `node --test test/humanize-korean.test.js test/plugin.test.js test/docs.test.js`

Expected: fails because `skills/humanize-korean/` and the audit script do not exist yet.

### Task 2: Create The Skill Package

**Files:**
- Create: `skills/humanize-korean/SKILL.md`
- Create: `skills/humanize-korean/agents/openai.yaml`

- [ ] **Step 1: Create `SKILL.md` with the Superloopy contract**

Create `skills/humanize-korean/SKILL.md` with these required sections:

```markdown
---
name: humanize-korean
description: Korean AI-style humanization for Codex and Superloopy. Use when the user asks to remove Korean AI tells, make Korean text sound human, fix 번역투, remove ChatGPT/Claude/Gemini tone, polish Korean without changing meaning, or says "AI 티 없애줘", "AI 윤문", "번역투 고쳐", "사람이 쓴 것처럼", "humanize Korean", "한글 AI 티 제거". Handles Korean rewriting only; not for translation, fact expansion, SEO rewriting, or generic proofreading.
---

# Humanize Korean

SUPERLOOPY HUMANIZE KOREAN ENABLED

## Contract

- Rewrite only Korean text.
- Preserve meaning, claims, facts, numbers, dates, URLs, code, product names, model names, acronyms, and quoted spans.
- Preserve register: formal text stays formal, conversational text stays conversational, official text stays official.
- Prefer fewer, sharper edits over broad smoothing.
- Do not add examples, metaphors, facts, citations, or marketing claims that were not in the source.
- Load `references/quick-rules.md` before rewriting.
- Load `references/quality-rubric.md` before grading or finalizing.
- Use `scripts/audit-humanize-output.mjs` to validate any file-backed output.
- If adapting upstream rule text, respect `references/upstream-notice.md`.

## Workflow

1. Identify source text from the prompt or from a `.txt` or `.md` path supplied by the user.
2. Refuse non-Korean source text with `한국어 텍스트만 처리할 수 있습니다.`
3. Estimate genre as `공적`, `리포트`, `블로그`, `칼럼`, or `대화체`; user-provided genre wins.
4. Mark protected spans before editing: numbers, dates, units, URLs, emails, code spans, quoted spans, English acronyms, product names, model names, and legal/article references.
5. Detect AI-tell patterns from `references/quick-rules.md`, prioritizing S1 then repeated S2.
6. Rewrite paragraph by paragraph in this order: protected spans unchanged, signature phrases, translationese, passive/hedging, structure/list rhythm, sentence endings, visual formatting.
7. Keep total character-change rate under 30% whenever possible; stop and report risk above 50%.
8. Write outputs:
   - Active Superloopy loop: `.superloopy/evidence/humanize-korean/<run-id>/source.md`, `final.md`, `summary.md`, `audit.json`.
   - No active loop: `_workspace/humanize-korean/<run-id>/source.md`, `final.md`, `summary.md`, `audit.json`.
9. Run `node skills/humanize-korean/scripts/audit-humanize-output.mjs --source <source.md> --final <final.md> --report <audit.json>`.
10. If audit fails, repair once. If it still fails, keep the safest version and report the failing audit reason.
11. Respond concisely with output path, change rate, grade, preserved-token status, and 3 to 5 before/after highlights. Do not paste the full rewritten body unless the user asks.

## Superloopy Evidence

When a Superloopy loop is active, the final line of the completion note must include:

`SUPERLOOPY_EVIDENCE: .superloopy/evidence/humanize-korean/<run-id>/audit.json`
```

- [ ] **Step 2: Create UI metadata**

Create `skills/humanize-korean/agents/openai.yaml`:

```yaml
interface:
  display_name: "Humanize Korean"
  short_description: "Korean AI-tone removal with measurable safeguards"
  default_prompt: "Use humanize-korean to rewrite Korean text so it sounds naturally human while preserving facts, protected spans, register, and meaning. Validate file-backed output with the bundled audit script and record Superloopy evidence when a loop is active."
```

- [ ] **Step 3: Run metadata test slice**

Run: `node --test test/plugin.test.js`

Expected: still fails until references and script are added.

### Task 3: Add References And Attribution

**Files:**
- Create: `skills/humanize-korean/references/quick-rules.md`
- Create: `skills/humanize-korean/references/quality-rubric.md`
- Create: `skills/humanize-korean/references/upstream-notice.md`

- [ ] **Step 1: Create adapted quick rules**

Seed `quick-rules.md` from the upstream rule categories at `https://github.com/epoko77-ai/im-not-ai/blob/main/.claude/skills/humanize-korean/references/quick-rules.md`, then add these Superloopy-specific sections near the top:

```markdown
## Superloopy Additions

- Protected spans outrank every rewrite rule.
- Register preservation outranks naturalness.
- A sentence may remain slightly formal if loosening it would change genre or authority.
- Do not remove all structure from operational, legal, release-note, or support-copy text.
- Treat repeated English terms differently from standard technical acronyms: `API`, `LLM`, `GPU`, `MCP`, `URL`, and version tags stay unchanged.
- Prefer Korean-native verbs over noun-heavy rewrites, but do not invent a subject to make a sentence active.
```

- [ ] **Step 2: Create quality rubric**

Create `quality-rubric.md` with these gates:

```markdown
# Humanize Korean Quality Rubric

## Required Gates

- Korean source ratio: at least 0.2 Hangul characters over all letters.
- Protected tokens: 100% preserved.
- Change rate: pass at 0.3 or lower, warn above 0.3, fail above 0.5.
- S1 AI-tell count: lower after rewrite, target zero when possible.
- S2 repeated-pattern count: lower after rewrite unless the pattern is genre-appropriate.
- Register: unchanged.
- Added claims: zero.

## Grades

- A: all gates pass, S1 after count is zero, change rate is 0.1 to 0.3.
- B: all required gates pass, S1 after count is zero, S2 after count is four or fewer.
- C: protected tokens pass, but change rate warns or S1 remains.
- D: protected tokens changed, non-Korean input, change rate above 0.5, or new claims were added.
```

- [ ] **Step 3: Add upstream attribution**

Create `upstream-notice.md`:

```markdown
# Upstream Notice

This skill adapts selected Korean AI-tell ideas from `epoko77-ai/im-not-ai`.

- Source repository: https://github.com/epoko77-ai/im-not-ai
- Source license: MIT, copyright 2026 epoko77-ai
- Adaptation boundary: Superloopy packages local references instead of the upstream Codex symlink, adds a dependency-free audit script, adds Superloopy evidence output, and maintains its own quality rubric.

Include the upstream MIT copyright notice in release notes or distribution artifacts when substantial upstream text is copied.
```

- [ ] **Step 4: Keep references reviewable**

Run: `wc -l skills/humanize-korean/SKILL.md skills/humanize-korean/references/*.md`

Expected: every file is under 500 lines.

### Task 4: Add The Deterministic Audit Script

**Files:**
- Create: `skills/humanize-korean/scripts/audit-humanize-output.mjs`

- [ ] **Step 1: Create the script**

Implement a dependency-free Node ESM CLI with this behavior:

```js
#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";

const PATTERNS = [
  ["A-2", /를 통해|을 통해|통하여/gu], ["A-3", /에 있어서|에 있어/gu],
  ["A-7", /가지고 있다|가졌다/gu], ["A-8", /되어진다|되어졌다/gu],
  ["A-10", /할 수 있다|할 수 있을/gu], ["C-11", /(고|며|지만|아서|어서),/gu],
  ["D-1", /결론적으로|따라서|요약하면|정리하면/gu], ["D-2", /시사하는 바가 크다|주목할 만하다/gu],
  ["H-1", /(^|\n)\s*(또한|따라서|즉|나아가|아울러|게다가|더욱이)/gu],
  ["I-1", /인 것이다|한 것이다/gu], ["J-2", /"[^"]{1,40}"/gu]
];

const args = parseArgs(process.argv.slice(2));
if (!args.source || !args.final || !args.report) fail("Usage: audit-humanize-output.mjs --source SOURCE --final FINAL --report REPORT");

const source = await readFile(args.source, "utf8");
const final = await readFile(args.final, "utf8");
const sourceRatio = koreanRatio(source), finalRatio = koreanRatio(final);
if (sourceRatio < 0.2) fail("Korean source text required");

const protectedTokens = collectProtectedTokens(source);
const missing = [...protectedTokens].filter((token) => !final.includes(token));
const before = countPatterns(source), after = countPatterns(final);
const changeRate = levenshtein(source, final) / Math.max(source.length, 1);
const problems = [];
if (missing.length > 0) problems.push("Protected tokens changed");
if (finalRatio < 0.2) problems.push("Final text is not Korean enough");
if (changeRate > 0.5) problems.push("Change rate exceeds 50%");

const report = {
  ok: problems.length === 0,
  sourceChars: source.length,
  finalChars: final.length,
  changeRate: Number(changeRate.toFixed(4)),
  koreanRatio: { source: Number(sourceRatio.toFixed(4)), final: Number(finalRatio.toFixed(4)) },
  protectedTokens: { total: protectedTokens.size, missing },
  patterns: { before, after },
  warnings: changeRate > 0.3 && changeRate <= 0.5 ? ["Change rate exceeds 30%"] : [],
  problems
};
await writeFile(args.report, `${JSON.stringify(report, null, 2)}\n`);
if (!report.ok) fail(problems.join("; "));

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 2) parsed[values[index].replace(/^--/u, "")] = values[index + 1];
  return parsed;
}
function koreanRatio(text) {
  const hangul = text.match(/[\u3131-\u318E\uAC00-\uD7A3]/gu)?.length ?? 0;
  const letters = text.match(/[\p{L}]/gu)?.length ?? 0;
  return letters === 0 ? 0 : hangul / letters;
}
function collectProtectedTokens(text) {
  const patterns = [/https?:\/\/\S+/gu, /\b[A-Z][A-Za-z0-9.-]*\b/gu, /\b[A-Z]{2,}\b/gu, /\b\d+(?:\.\d+){1,}\b/gu, /\d{4}년\s*\d{1,2}월\s*\d{1,2}일/gu, /\d+(?:\.\d+)?\s?(?:%|MB|GB|KB|ms|초|분|시간|원|달러)/gu];
  return new Set(patterns.flatMap((pattern) => text.match(pattern) ?? []).filter(Boolean));
}
function countPatterns(text) {
  return Object.fromEntries(PATTERNS.map(([id, pattern]) => [id, [...text.matchAll(pattern)].length]));
}
function levenshtein(left, right) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = Array.from({ length: right.length + 1 }, () => 0);
  for (let i = 1; i <= left.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}
function fail(message) {
  console.error(message);
  process.exit(1);
}
```

- [ ] **Step 2: Make it executable**

Run: `chmod +x skills/humanize-korean/scripts/audit-humanize-output.mjs`

- [ ] **Step 3: Run script tests**

Run: `node --test test/humanize-korean.test.js`

Expected: pass.

### Task 5: Document The New Skill

**Files:**
- Modify: `README.md`
- Modify: `README.ko.md`
- Modify: `README.zh-CN.md`
- Modify: `README.ja.md`
- Modify: `README.es.md`
- Modify: `docs/superloopy-design-audit.md`

- [ ] **Step 1: Add the skill to every README skill table**

Add a row for `humanize-korean` in each README. The English row should say:

```markdown
| `humanize-korean` | Use when Korean users ask to remove AI tone, fix 번역투, or make Korean text sound human without changing facts. | Writes `final.md`, `summary.md`, and `audit.json`; in Superloopy loops it records evidence under `.superloopy/evidence/humanize-korean/`. |
```

Use natural translations in the localized READMEs while preserving the exact skill name and artifact paths.

- [ ] **Step 2: Add the design decision**

Add this row to `docs/superloopy-design-audit.md`:

```markdown
| `korean-humanizer-skill` | Korean users need a Codex-native AI-tone-removal workflow with stronger proof than a prompt-only port. | Superloopy ships a local `humanize-korean` skill with packaged references, attribution, deterministic audit metrics, and evidence artifacts. | `skills/humanize-korean/SKILL.md`, `skills/humanize-korean/scripts/audit-humanize-output.mjs`, `test/humanize-korean.test.js`, `test/plugin.test.js`, and the file-audit/golden-set inventories. |
```

- [ ] **Step 3: Run docs tests**

Run: `node --test test/docs.test.js test/plugin.test.js`

Expected: pass after README and package assertions are aligned.

### Task 6: Update Repository Inventories

**Files:**
- Modify: `docs/superloopy-file-audit.md`
- Modify: `docs/superloopy-loop-golden-set.md`

- [ ] **Step 1: Add file-audit rows for every new file**

Add one row in `docs/superloopy-file-audit.md` for each new file listed in this plan. Each row must name the file's Superloopy role and explicitly say it stays inside the Superloopy-native boundary.

- [ ] **Step 2: Add golden-set rows for every new file**

Add one row in `docs/superloopy-loop-golden-set.md` for each new file listed in this plan. Each row must name the evidence anchor and strict pass rule.

- [ ] **Step 3: Run inventory tests**

Run: `node --test test/audit.test.js test/file-audit.test.js test/docs.test.js`

Expected: pass, including the Git-visible file inventory checks.

### Task 7: Forward-Test The Skill On Real Korean Text

**Files:**
- Runtime only: `_workspace/humanize-korean/<run-id>/`
- Optional Superloopy runtime only: `.superloopy/evidence/humanize-korean/<run-id>/`

- [ ] **Step 1: Run a realistic Korean prompt**

```markdown
$humanize-korean
이 글 AI 티 없애줘:

AI 기술을 통해 업무 효율을 높일 수 있다는 점은 시사하는 바가 크다. 또한 이러한 변화는 조직의 생산성 향상에 있어서 중요한 역할을 할 것이다. 결론적으로, 기업은 이를 적극적으로 도입해야 한다.
```

- [ ] **Step 2: Verify output artifacts**

Run the audit script against the produced `source.md` and `final.md`.

Expected: `audit.json` has `"ok": true`, protected-token missing count is `0`, `A-2`, `A-3`, `D-1`, and `D-2` after counts are lower than before.

### Task 8: Final Validation And Commit

**Files:**
- All files changed by Tasks 1-6.

- [ ] **Step 1: Run focused validation**

Run: `node --test test/humanize-korean.test.js test/plugin.test.js test/docs.test.js test/audit.test.js test/file-audit.test.js`

Expected: all tests pass.

- [ ] **Step 2: Run full validation**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 3: Run doctor**

Run: `node src/cli.js doctor --json`

Expected: JSON has `"ok": true`.

- [ ] **Step 4: Check diff hygiene**

Run: `git diff --check`

Expected: no whitespace errors.

- [ ] **Step 5: Commit**

```bash
git add README.md README.ko.md README.zh-CN.md README.ja.md README.es.md \
  docs/superloopy-design-audit.md docs/superloopy-file-audit.md docs/superloopy-loop-golden-set.md \
  skills/humanize-korean test/humanize-korean.test.js test/plugin.test.js test/docs.test.js
git commit -m "feat: add Superloopy Korean humanizer skill"
```

## Plan Self-Review
Spec coverage includes package structure, attribution, audit safeguards, evidence output, docs, tests, inventories, and validation. The script CLI uses `--source`, `--final`, and `--report` everywhere; tests and docs name the same artifacts.
