# Qt Frontend Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Record status:** Immutable pre-implementation plan. Completion is recorded in Git history and validation evidence rather than by rewriting this checklist.

**Goal:** Extend the explicitly activated `superloopy-frontend` skill from a browser-only workflow into a platform router with correct web, Qt Widgets, Qt Quick/QML, mixed-stack, and native-QA guidance.

**Architecture:** Keep `SKILL.md` lean: activation, repository inspection, platform selection, DESIGN.md, dispatch, and evidence contracts. Preserve the existing browser workflow in `references/web.md`; place Qt common, Widgets, Quick, and native-QA details in four direct one-hop references. Prove the change with static contract tests and fresh-context control/treatment runs before using it on the Kanban demo.

**Tech Stack:** Markdown/YAML skill files, Node.js ES modules, built-in `node:test`, fresh-agent forward tests, npm packaging

## Global Constraints

- Add no repository dependency.
- Preserve the exact explicit-activation boundary and keep plain Qt/UI vocabulary inert.
- Preserve the current web DESIGN.md, anti-slop, browser visual-QA, compliance, Lighthouse, and evidence behavior.
- Support C++ Qt 6 desktop Widgets, Quick/QML, and mixed Widgets/QML; treat Qt 5, Python bindings, mobile, and MCU as disclosed boundary cases.
- Inspect the declared minimum Qt version and target platform before version-sensitive or HIG guidance.
- Preserve the detected stack; never migrate Widgets to QML or QML to Widgets only for polish.
- Keep every reference directly linked from `SKILL.md`; do not add a second Qt skill.
- Use original operational prose based on official, version-matched Qt/platform documentation; do not copy the issue guide or vendor upstream assets.
- Treat real target-platform application capture as Qt visual proof; browser, virtual-platform, client-only, and universal golden-image evidence cannot substitute for it.

---

### Task 1: Establish the RED skill contract and control evidence

**Files:**
- Create: `test/frontend-qt-contract.test.js`
- Create at runtime only: `.superloopy/evidence/frontend/qt-skill-forward-test/rubric.md`
- Create at runtime only: one file named from each table case ID under `.superloopy/evidence/frontend/qt-skill-forward-test/control/`

**Interfaces:**
- Consumes: current `skills/superloopy-frontend` directory at commit `d75f4cd`
- Produces: a failing deterministic contract test plus 20 uncontaminated control outputs

- [ ] **Step 1: Write the failing static contract test**

Create `test/frontend-qt-contract.test.js` with independent tests that:

```js
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = "skills/superloopy-frontend";
const reference = (name) => `${root}/references/${name}.md`;

async function read(path) {
  assert.equal(existsSync(path), true, `missing ${path}`);
  return readFile(path, "utf8");
}

test("frontend skill routes web and Qt only after explicit activation", async () => {
  const skill = await read(`${root}/SKILL.md`);
  assert.match(skill, /Explicit activation only/i);
  assert.match(skill, /web.*Qt Widgets.*Qt Quick\/QML.*mixed/is);
  for (const name of ["web", "qt", "qt-widgets", "qt-quick", "qt-qa"]) {
    assert.match(skill, new RegExp(`references/${name}\\.md`));
  }
  assert.doesNotMatch(skill, /Auto-activate|When in doubt/i);
});

test("web route preserves browser-only gates", async () => {
  const web = await read(reference("web"));
  for (const pattern of [/anti-slop/i, /390.*768.*1280/s, /ds-compliance\.mjs/, /Lighthouse/, /real browser/i]) {
    assert.match(web, pattern);
  }
});

test("Qt common and Widgets references preserve native ownership", async () => {
  const common = await read(reference("qt"));
  const widgets = await read(reference("qt-widgets"));
  assert.match(common, /minimum Qt version/i);
  assert.match(common, /system palette.*platform font.*accessibility/is);
  assert.match(widgets, /native-adaptive.*branded-deterministic.*QSS/is);
  assert.match(widgets, /QSS.*QProxyStyle.*same (?:widget )?subtree/is);
  assert.match(widgets, /QStyledItemDelegate/);
  assert.match(widgets, /paint.*hit.test.*keyboard.*accessibility/is);
});

test("Qt Quick and QA references enforce native validation", async () => {
  const quick = await read(reference("qt-quick"));
  const qa = await read(reference("qt-qa"));
  assert.match(quick, /style.*before.*Qt Quick Controls/is);
  assert.match(quick, /runtime.*compile-time/is);
  assert.match(quick, /QtQuick\.Templates.*fallback/is);
  assert.match(quick, /QQuickWidget.*threaded render loop/is);
  assert.match(qa, /VISUAL_QA\.md/);
  assert.match(qa, /offscreen.*not.*native/is);
  assert.match(qa, /Lighthouse.*not.*Qt.*proof/is);
  assert.match(qa, /screenshot.*guidance.*verdict/is);
});
```

- [ ] **Step 2: Verify deterministic RED**

Run: `node --test test/frontend-qt-contract.test.js`

Expected: FAIL with missing `references/web.md` and missing Qt reference paths. The failure is caused by absent behavior, not syntax or fixture setup.

- [ ] **Step 3: Freeze the 20-case forward-test rubric before skill edits**

Write the following case IDs, neutral prompts, required outcomes, and forbidden outcomes to the ignored rubric artifact. Keep rubrics out of tester prompts.

| ID | Neutral prompt category | Required outcome | Forbidden outcome |
| --- | --- | --- | --- |
| `activation-plain` | Plain Qt UI request | No frontend marker or evidence ceremony | Semantic auto-activation |
| `web-explicit` | Explicit web visual task | Existing web route and browser gates | Qt references replacing web proof |
| `widgets-windows` | Windows Widgets using system style | Native-adaptive Widgets route | QML migration, broad QSS, Lighthouse |
| `quick-kirigami` | KDE/Kirigami QML | Preserve Kirigami and KDE target | Basic/custom replacement, GNOME/web rules |
| `mixed-repo-qt` | Mixed web/Qt, Qt surface requested | Route only requested Qt surface | Editing both surfaces or web gates on Qt |
| `widgets-qss` | Existing QSS-led subtree | Scoped documented QSS strategy | “QSS is colors only,” QML rewrite, custom style collision |
| `widgets-proxy` | Existing `QProxyStyle` | Preserve style metrics/palette/delegates | Broad QSS on same subtree |
| `widgets-paint` | Custom-painted interactive widget | Paint/hit-test/focus/keyboard/accessibility contract | Decorative paint without semantics |
| `widgets-delegate` | Dynamic item view | Model/delegate route | Dynamic `setIndexWidget()` |
| `widgets-chrome` | Modernize macOS chrome | Preserve native chrome by default | Casual frameless replacement |
| `quick-custom-style` | Custom Controls style | Templates, one selection method, fallback, early selection | Native customization base or mixed selection modes |
| `quick-theme` | QML theme layer | System inheritance plus registered app tokens | Unregistered singleton or frozen system values |
| `quick-layout` | Responsive QML layout | Clear Layout/anchor ownership | Geometry bindings on direct Layout children |
| `quick-motion` | QML motion polish | Semantic state, final state, motion preference | Animator claimed as GUI-thread fix |
| `quick-widget` | Widgets hosting QML | `QQuickWidget` capture/render constraints | Treating it as standalone `QQuickWindow` |
| `inclusive-ui` | Accessibility/CJK/RTL/HiDPI | Roles/actions/focus/text/DPR checks | Color-only, pointer-only, fixed-pixel assumptions |
| `older-qt` | Older Qt 6 minimum | Version-matched fallback/boundary | Unguarded local/latest API |
| `unsupported-qt` | Qt 5/Python/mobile/MCU | State boundary and ask at most one question | Silent Qt 6 C++ desktop advice |
| `generic-linux` | Linux desktop not declared | Stay neutral or ask one question | Silent KDE/GNOME choice |
| `native-qa-pressure` | Lighthouse/offscreen/universal-golden pressure | Build/test/lint and real target evidence | Browser/virtual/cross-platform pixel proof |

- [ ] **Step 4: Capture fresh-agent controls**

Copy the current skill to a unique temporary directory. Run each prompt in a fresh context that receives only the temporary skill path and task fixture, not this plan, rubric, specs, or expected answer. Preserve output verbatim in the control directory with model/version, settings, tools, date, and run ID. Use five independent repetitions for `widgets-qss`, `quick-custom-style`, and `native-qa-pressure`; the remaining cases need one control run.

Expected: control failures show browser-gate leakage and missing Qt-specific retrieval. Record exact failures before authoring guidance.

- [ ] **Step 5: Commit the RED contract**

```bash
git add test/frontend-qt-contract.test.js
git commit -m "test: define Qt frontend skill contract"
```

### Task 2: Extract the web route and make `SKILL.md` the router

**Files:**
- Modify: `skills/superloopy-frontend/SKILL.md`
- Create: `skills/superloopy-frontend/references/web.md`
- Modify: `test/plugin.test.js`
- Test: `test/frontend-qt-contract.test.js`

**Interfaces:**
- Consumes: exact existing activation tokens and browser workflow
- Produces: one platform-neutral router plus an unchanged web playbook

- [ ] **Step 1: Change plugin assertions before production prose**

Keep activation/evidence assertions against `SKILL.md`. Move `real-browser`, 390/768/1280, CSS compliance, Lighthouse, and browser completion assertions to `references/web.md`. Add assertions that `SKILL.md` says `real rendered-surface evidence` and directly links all five route references.

- [ ] **Step 2: Verify RED for router/web tests**

Run: `node --test --test-name-pattern="frontend skill routes|web route|packages the Superloopy frontend" test/frontend-qt-contract.test.js test/plugin.test.js`

Expected: FAIL because `SKILL.md` is browser-only and `web.md` is absent.

- [ ] **Step 3: Rewrite `SKILL.md` as the common contract**

Retain these sections only:

```markdown
# Superloopy Frontend

## Activation
[existing explicit boundary and marker, unchanged]

## Inspect and route
Resolve requested surface, existing stack, minimum Qt version, target platform,
existing styling/tokens, and available validation. Ask one question only for a
material ambiguity. Load web.md, qt.md + one/both implementation references,
and qt-qa.md according to the route table.

## Shared design gate
DESIGN.md owns app-defined semantics. Preserve project architecture and add a
token before use. Platform runtime values remain authoritative when native.

## Build, dispatch, and evidence
Preserve stack, use self-contained crew slices, capture a real rendered surface,
write VISUAL_QA.md under .superloopy/evidence/frontend/, and record final evidence.

## Completion
Apply only the selected platform checklist. Design contract, interaction states,
real rendered evidence, and no weakened UX are mandatory for every route.
```

Keep frontmatter trigger-only: explicit invocation, leading `loopy`/`루피`, or active-loop routing for web UI, Qt Widgets, Qt Quick/QML, and visual deliverables. Do not add semantic Qt activation.

- [ ] **Step 4: Move the complete existing browser workflow to `web.md`**

Preserve the current browser acceptance bar, anti-slop/image-first/design-system/perfection loading, CSS-variable foundation, browser breakpoints, visual-diff hotspot interpretation, `ds-compliance.mjs`, Lighthouse/React Doctor, PERF evidence, and completion checklist. Do not alter `anti-slop.md`, `design-system.md`, `perfection.md`, `ds-compliance.mjs`, or `visual-diff.mjs`.

- [ ] **Step 5: Verify GREEN and activation regression safety**

```bash
node --test --test-name-pattern="frontend skill routes|web route|packages the Superloopy frontend" test/frontend-qt-contract.test.js test/plugin.test.js
node --test test/hooks.test.js test/engineer.test.js
```

Expected: router/web tests and explicit-activation regressions pass; Qt-reference tests remain RED until Tasks 3-4.

- [ ] **Step 6: Commit the routed web workflow**

```bash
git add skills/superloopy-frontend/SKILL.md skills/superloopy-frontend/references/web.md test/plugin.test.js
git commit -m "refactor(frontend): route platform-specific workflows"
```

### Task 3: Add Qt common and Widgets references

**Files:**
- Create: `skills/superloopy-frontend/references/qt.md`
- Create: `skills/superloopy-frontend/references/qt-widgets.md`
- Test: `test/frontend-qt-contract.test.js`

**Interfaces:**
- Consumes: router facts and DESIGN.md semantic roles
- Produces: common Qt/platform rules plus three explicit Widgets strategies

- [ ] **Step 1: Verify RED for Qt common/Widgets tests**

Run: `node --test --test-name-pattern="Qt common and Widgets" test/frontend-qt-contract.test.js`

Expected: FAIL because both references are absent.

- [ ] **Step 2: Write `qt.md` with a compact decision contract**

Include:

- repository detection for CMake/qmake, Widgets/QML/mixed, declared minimum Qt, target OS/desktop, selected style, tests, and capture;
- authority order: existing architecture, target behavior/accessibility, product appearance, version-matched Qt docs, target-specific HIG, optional inspiration;
- DESIGN.md mapping for app-owned color/spacing/type/motion without freezing system palette, font, native metrics, or accessibility preferences;
- version guards and fallback/boundary rule;
- common focus, keyboard, accessibility, CJK/RTL/long-text/font-fallback, high-DPI, motion, and native-chrome constraints;
- disclosed boundary for Qt 5, bindings, mobile, MCU, and unknown Linux desktop;
- Qt pre-flight checklist that replaces the web anti-slop/browser checklist.

Link the claims to official [QStyleHints](https://doc.qt.io/qt-6/qstylehints.html), [Accessibility](https://doc.qt.io/qt-6/accessible.html), [High DPI](https://doc.qt.io/qt-6/highdpi.html), and [Internationalization](https://doc.qt.io/qt-6/internationalization.html) documentation.

- [ ] **Step 3: Write `qt-widgets.md` around the three strategies**

Provide a quick-reference table for:

| Strategy | Use when | Owns appearance |
| --- | --- | --- |
| Native-adaptive | Platform-native app | current `QStyle`, semantic `QPalette`, narrow `QProxyStyle` |
| Branded-deterministic | App intentionally owns consistent chrome | explicit base style, controlled proxy/delegates/custom paint |
| QSS-led | Existing subtree already uses documented QSS | QSS properties/states/subcontrols without custom style collision |

Then require layouts/size hints/policies; Active/Inactive/Disabled palette groups; visible focus and keyboard activation; `QStyleOption` and shared paint/hit-test geometry; `QStyledItemDelegate` for dynamic rows; native top-level chrome by default; accessibility interfaces/events; device-independent geometry/assets; font fallback, CJK, RTL, emoji, long/enlarged text; and Qt Test behavior checks. State explicitly that an affected subtree cannot be both QSS-led and custom-`QStyle`/`QProxyStyle`-led.

Link the implementation claims to official [QStyle](https://doc.qt.io/qt-6/qstyle.html), [QProxyStyle](https://doc.qt.io/qt-6/qproxystyle.html), [QPalette](https://doc.qt.io/qt-6/qpalette.html), [Style Sheets](https://doc.qt.io/qt-6/stylesheet.html), and [QStyledItemDelegate](https://doc.qt.io/qt-6/qstyleditemdelegate.html) documentation.

- [ ] **Step 4: Verify GREEN**

Run: `node --test --test-name-pattern="Qt common and Widgets" test/frontend-qt-contract.test.js`

Expected: PASS with no keyword-only false positive; manually read the matching paragraphs.

- [ ] **Step 5: Commit Qt common/Widgets guidance**

```bash
git add skills/superloopy-frontend/references/qt.md skills/superloopy-frontend/references/qt-widgets.md
git commit -m "feat(frontend): add Qt Widgets guidance"
```

### Task 4: Add Qt Quick and native-QA references

**Files:**
- Create: `skills/superloopy-frontend/references/qt-quick.md`
- Create: `skills/superloopy-frontend/references/qt-qa.md`
- Test: `test/frontend-qt-contract.test.js`

**Interfaces:**
- Consumes: Qt common contract and detected Quick/mixed route
- Produces: correct Controls/QML architecture and native evidence gate

- [ ] **Step 1: Verify RED for Quick/QA tests**

Run: `node --test --test-name-pattern="Qt Quick and QA" test/frontend-qt-contract.test.js`

Expected: FAIL because both references are absent.

- [ ] **Step 2: Write `qt-quick.md`**

Require standard Controls first; preserve selected style; runtime style selection before loading QML that imports Controls; compile-time selection as a separate route; `QtQuick.Templates` plus fallback for custom styles; project theme reuse and registered typed singleton only for app-owned tokens; Layout ownership; semantic states and interruptible/final-state-correct motion; Controls or complete accessible semantics for custom items; project-aware `qmllint`, formatting, and Quick Test; text/RTL/DPR/popup/resizing/scene-graph checks; profiling before rewrites; and a separate `QQuickWidget` branch covering offscreen/threaded-loop, focus/IME, DPR, popup, palette, and capture limits.

Link the claims to official [Controls styles](https://doc.qt.io/qt-6/qtquickcontrols-styles.html), [customization](https://doc.qt.io/qt-6/qtquickcontrols-customize.html), [best practices](https://doc.qt.io/qt-6/qtquick-bestpractices.html), [performance](https://doc.qt.io/qt-6/qtquick-performance.html), and [QQuickWidget](https://doc.qt.io/qt-6/qquickwidget.html) documentation.

- [ ] **Step 3: Write `qt-qa.md`**

Define exact evidence slots:

```markdown
# Qt QA

## Commands
Project configure/build, Qt Test/ctest, module-aware qmllint, Quick Test.

## State matrix
Normal, hover when supported, pressed, focused, selected/checked, disabled,
inactive, popups/editors, empty/loading/error, localization, resizing, DPR.

## Capture contract
Real target application, settled rendering, OS capture for native chrome/dialogs/
separate popups. Virtual/client capture is functional evidence only.

## VISUAL_QA.md fields
Platform, Qt version, style, DPR, locale, theme, graphics backend, capture method,
window size, exercised states, findings/fixes, unverified surfaces.

## Screenshot interpretation
Compare only equivalent environments; dimension mismatch is non-comparable;
hotspots guide human review and never decide pass/fail.

## Qt exclusions
No Lighthouse, React Doctor, CSS compliance, or browser viewport matrix as Qt proof.
```

Link commands/evidence claims to official [`qmllint`](https://doc.qt.io/qt-6/qtqml-tooling-qmllint.html), [Qt Quick Test](https://doc.qt.io/qt-6/qtquicktest-index.html), and [Qt Test best practices](https://doc.qt.io/qt-6/qttest-best-practices.html) documentation.

- [ ] **Step 4: Verify GREEN**

Run: `node --test test/frontend-qt-contract.test.js test/plugin.test.js`

Expected: all Qt and existing frontend packaging tests pass.

- [ ] **Step 5: Commit Quick/QA guidance**

```bash
git add skills/superloopy-frontend/references/qt-quick.md skills/superloopy-frontend/references/qt-qa.md
git commit -m "feat(frontend): add Qt Quick and native QA guidance"
```

### Task 5: Align metadata, public docs, and inventories

**Files:**
- Modify: `skills/superloopy-frontend/agents/openai.yaml`
- Modify: `README.md`
- Modify: `README.ko.md`
- Modify: `README.ja.md`
- Modify: `README.zh-CN.md`
- Modify: `README.es.md`
- Modify: `test/docs.test.js`
- Modify: `docs/superloopy-design-audit.md`
- Modify: `docs/superloopy-file-audit.md`
- Modify: `docs/superloopy-loop-golden-set.md`

**Interfaces:**
- Consumes: final router/reference vocabulary
- Produces: discoverable, packaged, provenance-audited Qt support in every locale

- [ ] **Step 1: Add failing documentation/metadata assertions**

Require each README skill row to mention browser evidence for web and native application evidence for Qt while preserving direct invocation strings. Require `openai.yaml` to mention web and Qt rendered-surface evidence without semantic auto-activation. Require audit/golden inventories to list `web.md`, all four Qt references, and `test/frontend-qt-contract.test.js`.

- [ ] **Step 2: Verify RED**

Run: `node --test test/docs.test.js test/plugin.test.js`

Expected: FAIL because public/agent descriptions are browser-only and inventories lack new files.

- [ ] **Step 3: Update all discovery and audit surfaces**

Keep `$superloopy:superloopy-frontend`, `/superloopy:superloopy-frontend`, and leading `loopy`/`루피` wording unchanged. Replace “real-browser evidence” summaries with routed wording: DESIGN.md plus browser evidence for web or native rendered-application evidence for Qt. Document original prose and linked official-source provenance; add one exact inventory row for each new Git-visible file.

- [ ] **Step 4: Verify GREEN**

```bash
node --test test/docs.test.js test/plugin.test.js test/audit.test.js test/file-audit.test.js
```

Expected: all focused documentation, packaging, and audit tests pass.

- [ ] **Step 5: Commit metadata/docs/audits**

```bash
git add skills/superloopy-frontend/agents/openai.yaml README*.md test/docs.test.js \
  docs/superloopy-design-audit.md docs/superloopy-file-audit.md docs/superloopy-loop-golden-set.md
git commit -m "docs(frontend): publish explicit Qt support"
```

### Task 6: Forward-test, refactor, and release-gate the skill

**Files:**
- Modify only if a treatment failure proves a gap: `skills/superloopy-frontend/SKILL.md`
- Modify only if a treatment failure proves a gap: `skills/superloopy-frontend/references/*.md`
- Write at runtime only: one file named from each table case ID under `.superloopy/evidence/frontend/qt-skill-forward-test/treatment/`
- Write at runtime only: `.superloopy/evidence/frontend/qt-skill-forward-test/SUMMARY.md`

**Interfaces:**
- Consumes: frozen rubric and identical neutral prompts from Task 1
- Produces: at least 19/20 treatment passes, zero hard failures, and packaged skill proof

- [ ] **Step 1: Run fresh-context treatment evaluations**

Copy only the modified skill directory to a new temporary path. Re-run the identical prompts in fresh contexts with no rubric or design-spec leakage. Preserve outputs and manually score every required/forbidden outcome. Repeat the three fragile cases five times; a fragile case passes only when all five repetitions pass.

- [ ] **Step 2: Refactor only proven gaps**

For each failed case, classify retrieval gap, ambiguous condition, or missing hard rule. Edit the smallest relevant router/reference paragraph, rerun the focused static test, and rerun that case with a fresh agent. Do not add guidance for hypothetical failures.

- [ ] **Step 3: Verify the 9.5 treatment gate**

Require at least 19/20 case passes and zero accidental activation, platform-gate substitution, unsupported API, QSS/custom-style collision, late Quick style selection, or invalid native-evidence failures. Write the concise summary and exact remaining limitation, if any.

- [ ] **Step 4: Run final repository/package validation**

```bash
node --test test/frontend-qt-contract.test.js test/plugin.test.js test/hooks.test.js test/engineer.test.js
node --test test/docs.test.js test/audit.test.js test/file-audit.test.js test/ds-compliance.test.js test/visual-diff.test.js
npm test
npm pack --dry-run --json
git diff --check
```

Expected: all commands exit 0; package JSON lists `web.md`, `qt.md`, `qt-widgets.md`, `qt-quick.md`, and `qt-qa.md`.

- [ ] **Step 5: Commit proven refactors, if any**

```bash
git add skills/superloopy-frontend test docs README*.md
git commit -m "test(frontend): close Qt forward-test gaps"
```

Skip the commit only when Task 6 produces no tracked changes.
