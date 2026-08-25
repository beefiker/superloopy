import assert from "node:assert/strict";
import test from "node:test";

import { enhanceSelect, nextActiveIndex, typeaheadIndex } from "../combobox.mjs";

test("arrow keys wrap at both ends and start from the matching edge", () => {
  const cases = [
    [{ count: 3, activeIndex: -1, key: "ArrowDown" }, 0],
    [{ count: 3, activeIndex: -1, key: "ArrowUp" }, 2],
    [{ count: 3, activeIndex: 2, key: "ArrowDown" }, 0],
    [{ count: 3, activeIndex: 0, key: "ArrowUp" }, 2],
    [{ count: 3, activeIndex: 1, key: "Home" }, 0],
    [{ count: 3, activeIndex: 1, key: "End" }, 2]
  ];

  for (const [input, expected] of cases) {
    assert.equal(nextActiveIndex(input), expected, JSON.stringify(input));
  }
});

test("non-movement keys and an empty list produce no move", () => {
  assert.equal(nextActiveIndex({ count: 3, activeIndex: 0, key: "a" }), null);
  assert.equal(nextActiveIndex({ count: 0, activeIndex: -1, key: "ArrowDown" }), null);
});

test("an out-of-range active index is treated as no selection", () => {
  assert.equal(nextActiveIndex({ count: 3, activeIndex: 9, key: "ArrowDown" }), 0);
  assert.equal(nextActiveIndex({ count: 3, activeIndex: 9, key: "ArrowUp" }), 2);
});

test("typeahead searches after the active row so repeats cycle", () => {
  const labels = ["Deployment notice", "Meeting follow-up", "Incident review", "Internal proposal"];

  assert.equal(typeaheadIndex(labels, "i", -1), 2);
  assert.equal(typeaheadIndex(labels, "i", 2), 3);
  assert.equal(typeaheadIndex(labels, "i", 3), 2, "wraps back to the first match");
  assert.equal(typeaheadIndex(labels, "in", 2), 3, "a longer query narrows rather than cycles");
});

test("typeahead folds case and reports no match rather than guessing", () => {
  const labels = ["Deployment notice", "주간 배포 안내"];

  assert.equal(typeaheadIndex(labels, "DEP", -1), 0);
  assert.equal(typeaheadIndex(labels, "주간", -1), 1);
  assert.equal(typeaheadIndex(labels, "z", -1), null);
  assert.equal(typeaheadIndex(labels, "", -1), null);
});

test("traversal steps over disabled rows in both directions", () => {
  // Mirrors a version selector for an English sample: A is unavailable.
  const isDisabled = (index) => index === 1;

  assert.equal(nextActiveIndex({ count: 4, activeIndex: 0, key: "ArrowDown", isDisabled }), 2);
  assert.equal(nextActiveIndex({ count: 4, activeIndex: 2, key: "ArrowUp", isDisabled }), 0);
  assert.equal(nextActiveIndex({ count: 4, activeIndex: 3, key: "ArrowDown", isDisabled }), 0, "wraps past the disabled row");
  assert.equal(nextActiveIndex({ count: 4, activeIndex: -1, key: "ArrowUp", isDisabled }), 3);
});

test("Home and End land on the first and last selectable row", () => {
  const isDisabled = (index) => index === 0 || index === 3;

  assert.equal(nextActiveIndex({ count: 4, activeIndex: 2, key: "Home", isDisabled }), 1);
  assert.equal(nextActiveIndex({ count: 4, activeIndex: 1, key: "End", isDisabled }), 2);
});

test("an all-disabled list reports no destination instead of looping", () => {
  const isDisabled = () => true;

  for (const key of ["ArrowDown", "ArrowUp", "Home", "End"]) {
    assert.equal(nextActiveIndex({ count: 3, activeIndex: 0, key, isDisabled }), null, key);
  }
  assert.equal(typeaheadIndex(["a", "ab", "abc"], "a", -1, isDisabled), null);
});

test("typeahead skips a disabled row that would otherwise match", () => {
  const labels = ["Original", "A · Unavailable", "B · i-have-adhd", "C · Say It Straight"];

  assert.equal(typeaheadIndex(labels, "a", -1), 1, "without the guard the unavailable version is a jump target");
  assert.equal(typeaheadIndex(labels, "a", -1, (index) => index === 1), null, "with it, typing the letter moves nowhere");
  assert.equal(typeaheadIndex([...labels, "Aside"], "a", -1, (index) => index === 1), 4, "a later enabled match still wins");
});

test("enhancement is skipped rather than throwing when there is no select or no DOM", () => {
  assert.equal(globalThis.document, undefined, "this suite must run without a DOM");
  assert.equal(enhanceSelect(null), null);
  assert.equal(enhanceSelect({}), null);
});
