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
