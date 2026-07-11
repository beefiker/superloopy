import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const root = "skills/superloopy-frontend";
const reference = (name) => `${root}/references/${name}.md`;

const activationContract = `## Activation

Open your reply with \`SUPERLOOPY FRONTEND ENABLED\`. If another active Superloopy mode mandates its own first line, print that first and this marker on the next line.

**Explicit activation only.** Engage when the user invokes \`$superloopy:superloopy-frontend\` in Codex or \`/superloopy:superloopy-frontend\` in Claude Code, begins a visual task with a leading \`loopy\` or \`루피\`, or an already-active Superloopy loop explicitly assigns a visual subtask to this skill. A plain mention of UI, frontend, CSS, layout, responsiveness, or a visible symptom is not authorization to activate this workflow. Diagnose ownership first; backend, API, data, concurrency, infrastructure, and non-visual work stay with their primary workflow unless a visual deliverable is separately requested.
`;

async function read(path) {
  assert.equal(existsSync(path), true, `missing ${path}`);
  return (await readFile(path, "utf8")).replace(/\r\n?/gu, "\n");
}

test("frontend contract reader normalizes platform line endings", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "superloopy-frontend-contract-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const path = join(directory, "contract.md");
  await writeFile(path, "## Activation\r\n\r\nBody\r\n", "utf8");

  assert.equal(await read(path), "## Activation\n\nBody\n");
});

test("frontend skill routes web and Qt only after explicit activation", async () => {
  const skill = await read(`${root}/SKILL.md`);
  const activation = skill.match(/## Activation\n[\s\S]*?(?=\n## )/)?.[0];
  assert.equal(activation, activationContract, "the activation section must remain byte-for-byte unchanged");
  assert.match(skill, /Explicit activation only/i);
  assert.match(skill, /web.*Qt Widgets.*Qt Quick\/QML.*mixed/is);
  for (const name of ["web", "qt", "qt-widgets", "qt-quick", "qt-qa"]) {
    assert.match(skill, new RegExp(`references/${name}\\.md`));
  }
  assert.match(skill, /mixed web UI and Qt.*references\/web\.md.*references\/qt\.md.*relevant one or both.*references\/qt-widgets\.md.*references\/qt-quick\.md.*references\/qt-qa\.md/is);
  assert.match(skill, /mixed web\/Qt.*gates and evidence independently for each surface/is);
  assert.match(skill, /web proof cannot substitute for Qt proof.*Qt proof cannot substitute for web proof/is);
  assert.doesNotMatch(skill, /Auto-activate|When in doubt/i);
});

test("web route preserves browser-only gates", async () => {
  const web = await read(reference("web"));
  for (const pattern of [/anti-slop/i, /390.*768.*1280/s, /ds-compliance\.mjs/, /Lighthouse/, /real browser/i]) {
    assert.match(web, pattern);
  }
  assert.match(web, /for any served web-app implementation or validation plan.*production build.*design compliance.*real-browser state capture.*390.*768.*1280.*Lighthouse.*React Doctor only when.*React/is);
});

test("Qt common and Widgets references preserve native ownership", async () => {
  const common = await read(reference("qt"));
  const widgets = await read(reference("qt-widgets"));
  assert.match(common, /minimum Qt version/i);
  assert.match(common, /system palette.*platform font.*accessibility/is);
  assert.match(common, /QGuiApplication.*application defaults/is);
  assert.match(common, /Widgets.*effective.*QPalette.*current.*QStyle/is);
  assert.match(common, /Quick.*type that owns.*palette.*Item.*Window.*Control.*ApplicationWindow.*font.*Control.*ApplicationWindow.*Text.*selected Controls style.*implicit sizes.*Layout\.\*/is);
  assert.match(common, /generic.*Item.*Window.*must not.*assum.*font/is);
  assert.match(common, /pure Quick.*must not.*Qt Widgets dependency.*QStyle.*style metrics/is);
  assert.match(widgets, /native-adaptive.*branded-deterministic.*QSS/is);
  assert.match(widgets, /QSS.*QProxyStyle.*same (?:widget )?subtree/is);
  assert.match(widgets, /QStyledItemDelegate/);
  assert.match(widgets, /paint.*hit.test.*keyboard.*accessibility/is);
});

test("Qt Widgets branded identities stay differentiated and behavior-neutral", async () => {
  const widgets = await read(reference("qt-widgets"));
  const branded = widgets.match(/## Branded and multi-identity systems\n[\s\S]*?(?=\n## )/)?.[0];
  assert.ok(branded, "missing branded and multi-identity contract");
  assert.match(branded, /only when.*product.*owns/is);
  assert.match(branded, /ordinary native-adaptive.*must not.*skin manager.*gallery/is);
  assert.match(branded, /identity constitution.*signature.*hierarchy.*geometry.*depth.*state grammar.*prohibited.*extend/is);
  assert.match(branded, /differ only by palette.*themes.*not.*identities.*multiple meaningful.*non-color/is);
  assert.match(branded, /QSS.*stock widget chrome/is);
  assert.match(branded, /QStyledItemDelegate.*model\/view rows.*sizeHint.*editing.*editorEvent/is);
  assert.match(branded, /QPainter.*non-item.*custom.*data geometry/is);
  assert.match(branded, /view factor(?:y|ies).*structure/is);
  assert.match(branded, /shared models.*controllers.*host widgets.*delegates.*data.*commands.*serialization.*input.*keyboard.*accessibility actions/is);
  assert.match(branded, /identity-specific presentation.*state.*geometry.*styling.*painting.*structure.*must not.*per-identity behavior/is);
  assert.match(branded, /legacy-equivalent.*idempotent.*focus.*selection.*scroll.*updateGeometry.*layout/is);
});

test("Qt Quick and QA references enforce native validation", async () => {
  const quick = await read(reference("qt-quick"));
  const qa = await read(reference("qt-qa"));
  assert.match(quick, /style.*before.*Qt Quick Controls/is);
  assert.match(quick, /runtime.*compile-time/is);
  assert.match(quick, /ownership.*static-build.*unknown.*remain unresolved.*without listing alternatives/is);
  assert.match(quick, /once.*known.*exactly one repository-owned runtime channel.*compile-time route.*required/is);
  assert.match(quick, /before returning a custom-style plan.*style-selection channel: unresolved pending repository ownership and static-build inspection.*do not name, recommend, or exemplify/is);
  assert.doesNotMatch(quick, /provisional channel by name/i);
  assert.match(quick, /QtQuick\.Templates.*fallback/is);
  assert.match(quick, /exactly one fallback mechanism.*style route/is);
  assert.match(quick, /compile-time.*static fallback.*qmldir import/is);
  assert.match(quick, /dynamic runtime fallback.*only when no static.*qmldir fallback exists/is);
  assert.match(quick, /never configure both/is);
  assert.match(quick, /Accessible.*attached properties.*metadata.*actions/is);
  assert.match(quick, /ordinary properties.*value.*minimumValue.*maximumValue.*stepSize/is);
  assert.match(quick, /availability.*enabled/is);
  assert.match(quick, /semantics.*unavailable.*standard Control.*validated custom accessibility-interface path/is);
  assert.doesNotMatch(quick, /Accessible\.(?:value|disabled)\b/);
  assert.match(quick, /QQuickWidget.*threaded render loop/is);
  assert.match(qa, /every implementation or release-proof plan.*configure\/build.*Qt Test\/ctest.*repository lint\/static gates/is);
  assert.match(qa, /applicable commands.*run and pass/is);
  assert.match(qa, /no relevant repository lint\/static check exists.*N\/A.*evidence/is);
  assert.match(qa, /missing.*build.*test infrastructure.*disclosed blocker/is);
  assert.match(qa, /before returning.*repository gates.*configure\/build.*BLOCKED.*Qt Test\/ctest.*BLOCKED.*lint\/static.*N\/A with evidence/is);
  assert.doesNotMatch(qa, /run and pass all three/i);
  assert.match(qa, /VISUAL_QA\.md/);
  assert.match(qa, /offscreen.*not.*native/is);
  assert.match(qa, /Lighthouse.*not.*Qt.*proof/is);
  assert.match(qa, /screenshot.*guidance.*verdict/is);
});

test("Qt QA treats deterministic galleries as conditional client-pixel evidence", async () => {
  const qa = await read(reference("qt-qa"));
  const gallery = qa.match(/## Deterministic branded gallery\n[\s\S]*?(?=\n## )/)?.[0];
  assert.ok(gallery, "missing deterministic branded gallery contract");
  assert.match(gallery, /custom-painted.*multi-identity Widgets.*broad reusable presentation/is);
  assert.match(gallery, /do not impose.*ordinary native-adaptive/is);
  assert.match(gallery, /stable.*fixtures.*dimensions.*states.*themes.*filenames/is);
  assert.match(gallery, /expected artifact count.*clipping.*overflow/is);
  assert.match(gallery, /offscreen gallery.*not.*native.*accessibility/is);
  assert.match(gallery, /exact pixel equality.*unchanged pixels.*not.*visual quality/is);
});
