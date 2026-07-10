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
  assert.match(web, /for any served web-app implementation or validation plan.*production build.*design compliance.*real-browser state capture.*390.*768.*1280.*Lighthouse.*React Doctor only when.*React/is);
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
  assert.match(quick, /ownership.*static-build.*unknown.*remain unresolved.*without listing alternatives/is);
  assert.match(quick, /once.*known.*exactly one repository-owned runtime channel.*compile-time route.*required/is);
  assert.match(quick, /before returning a custom-style plan.*style-selection channel: unresolved pending repository ownership and static-build inspection.*do not name, recommend, or exemplify/is);
  assert.doesNotMatch(quick, /provisional channel by name/i);
  assert.match(quick, /QtQuick\.Templates.*fallback/is);
  assert.match(quick, /exactly one fallback mechanism.*style route/is);
  assert.match(quick, /compile-time.*static fallback.*qmldir import/is);
  assert.match(quick, /dynamic runtime fallback.*only when no static.*qmldir fallback exists/is);
  assert.match(quick, /never configure both/is);
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
