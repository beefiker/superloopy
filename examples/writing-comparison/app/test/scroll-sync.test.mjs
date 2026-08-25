import assert from "node:assert/strict";
import test from "node:test";

import {
  anchoredTargetScrollTop,
  buildAnchorMap,
  mapOffset,
  proportionalTargetScrollTop,
  rulerMarks,
  viewportBand
} from "../scroll-sync.mjs";

const sourceEntries = [
  { id: "h1", top: 0, height: 100 },
  { id: "h2", top: 100, height: 200 },
  { id: "h3", top: 300, height: 100 }
];
// The same hunks, distributed differently: h2 is three times taller here.
const targetEntries = [
  { id: "h1", top: 0, height: 100 },
  { id: "h2", top: 100, height: 600 },
  { id: "h3", top: 700, height: 100 }
];

test("buildAnchorMap pairs shared hunk edges in document order", () => {
  const points = buildAnchorMap(sourceEntries, targetEntries);
  assert.deepEqual(points, [
    { s: 0, t: 0 },
    { s: 100, t: 100 },
    { s: 300, t: 700 },
    { s: 400, t: 800 }
  ]);
});

test("buildAnchorMap skips unmatched ids and non-monotone edges", () => {
  const points = buildAnchorMap(
    [{ id: "only-left", top: 0, height: 50 }, { id: "shared", top: 50, height: 50 }],
    [{ id: "shared", top: 20, height: 50 }]
  );
  assert.deepEqual(points, [{ s: 50, t: 20 }, { s: 100, t: 70 }]);
  // A counterpart placed before the previous edge would reverse the map; the
  // offending edges are dropped instead of interpolated backwards.
  const reversed = buildAnchorMap(
    [{ id: "a", top: 0, height: 100 }, { id: "b", top: 100, height: 100 }],
    [{ id: "a", top: 0, height: 100 }, { id: "b", top: 40, height: 20 }]
  );
  assert.deepEqual(reversed, [{ s: 0, t: 0 }, { s: 100, t: 100 }]);
});

test("mapOffset interpolates between control points and clamps the edges", () => {
  const points = buildAnchorMap(sourceEntries, targetEntries);
  assert.equal(mapOffset(points, 200), 400); // halfway through h2 → halfway through taller h2
  assert.equal(mapOffset(points, 0), 0);
  assert.equal(mapOffset(points, -50), 0);
  assert.equal(mapOffset(points, 999), 800);
  assert.equal(mapOffset([], 10), null);
  assert.equal(mapOffset([{ s: 0, t: 0 }], 10), null);
});

test("anchoredTargetScrollTop aligns the anchor line through matching hunks", () => {
  const source = { scrollTop: 170, clientHeight: 100, scrollHeight: 400, entries: sourceEntries };
  const target = { clientHeight: 100, scrollHeight: 800, entries: targetEntries };
  // Anchor sits at 170 + 30 = 200, the middle of source h2, which maps to 400
  // in the target; the target scrollTop puts 400 at its own anchor line.
  assert.equal(anchoredTargetScrollTop(source, target), 370);
});

test("anchoredTargetScrollTop snaps the exact scroll extremes", () => {
  const target = { clientHeight: 100, scrollHeight: 800, entries: targetEntries };
  assert.equal(anchoredTargetScrollTop({ scrollTop: 0, clientHeight: 100, scrollHeight: 400, entries: sourceEntries }, target), 0);
  assert.equal(anchoredTargetScrollTop({ scrollTop: 300, clientHeight: 100, scrollHeight: 400, entries: sourceEntries }, target), 700);
});

test("anchoredTargetScrollTop returns null without shared hunks or scroll room", () => {
  const source = { scrollTop: 50, clientHeight: 100, scrollHeight: 400, entries: [{ id: "x", top: 0, height: 400 }] };
  const target = { clientHeight: 100, scrollHeight: 800, entries: [{ id: "y", top: 0, height: 800 }] };
  assert.equal(anchoredTargetScrollTop(source, target), null);
  assert.equal(anchoredTargetScrollTop({ scrollTop: 0, clientHeight: 400, scrollHeight: 400, entries: sourceEntries }, target), null);
});

test("proportionalTargetScrollTop keeps the legacy ratio mapping", () => {
  const source = { scrollTop: 150, clientHeight: 100, scrollHeight: 400 };
  const target = { clientHeight: 100, scrollHeight: 800 };
  assert.equal(proportionalTargetScrollTop(source, target), 350);
  assert.equal(proportionalTargetScrollTop({ scrollTop: 0, clientHeight: 400, scrollHeight: 400 }, target), null);
});

test("rulerMarks maps changed hunks to fractions and skips unmeasured ids", () => {
  const marks = rulerMarks(
    [{ id: "h2", op: "replace" }, { id: "h3", op: "add" }, { id: "gone", op: "remove" }],
    targetEntries,
    800
  );
  assert.deepEqual(marks, [
    { id: "h2", op: "replace", top: 0.125, height: 0.75 },
    { id: "h3", op: "add", top: 0.875, height: 0.125 }
  ]);
  assert.deepEqual(rulerMarks([{ id: "h1", op: "add" }], targetEntries, 0), []);
});

test("viewportBand reports the visible fraction and clamps to the track", () => {
  assert.deepEqual(viewportBand(200, 100, 800), { top: 0.25, height: 0.125 });
  assert.deepEqual(viewportBand(0, 400, 400), { top: 0, height: 1 });
  assert.deepEqual(viewportBand(0, 500, 400), { top: 0, height: 1 });
});
