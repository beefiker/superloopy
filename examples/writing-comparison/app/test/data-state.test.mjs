import assert from "node:assert/strict";
import test from "node:test";

import { SAMPLE_ORDER, SAMPLES, VERSION_ORDER } from "../data.generated.mjs";
import {
  VALID_MODES,
  parseViewState,
  selectSample,
  selectVersion,
  serializeViewState,
  swapVersions
} from "../state.mjs";

const DEFAULT_STATE = { sample: "release-note", left: "original", right: "c", mode: "rendered" };

test("parses valid URL states for every display mode", () => {
  assert.deepEqual(VALID_MODES, ["rendered", "source", "unified"]);

  const cases = [
    ["?sample=release-note&left=a&right=b&mode=rendered", { sample: "release-note", left: "a", right: "b", mode: "rendered" }],
    ["?sample=release-note&left=a&right=b&mode=source", { sample: "release-note", left: "a", right: "b", mode: "source" }],
    ["?sample=release-note&left=a&right=b&mode=unified", { sample: "release-note", left: "a", right: "b", mode: "unified" }]
  ];

  for (const [search, expected] of cases) {
    assert.deepEqual(parseViewState(search), expected);
  }
});

test("falls back to the complete default when URL state is missing or invalid", () => {
  for (const search of ["", "?left=bad&right=bad&mode=x", "?left=a&right=a&mode=source", "?left=a&right=b&mode=x"]) {
    assert.deepEqual(parseViewState(search), DEFAULT_STATE);
  }
});

test("falls back to the complete default for an unknown sample with an otherwise valid pair and mode", () => {
  assert.deepEqual(
    parseViewState("?sample=unknown-sample&left=a&right=b&mode=source"),
    DEFAULT_STATE
  );
});

test("round-trips sample-aware state", () => {
  const state = { sample: "incident-review", left: "a", right: "b", mode: "source" };
  assert.deepEqual(parseViewState("?sample=incident-review&left=a&right=b&mode=source"), state);
  assert.equal(serializeViewState(state), "?sample=incident-review&left=a&right=b&mode=source");
});

test("maps legacy URLs to the default sample", () => {
  assert.deepEqual(parseViewState("?left=a&right=b&mode=unified"), {
    sample: "release-note", left: "a", right: "b", mode: "unified"
  });
});

test("serializes only valid pair state in canonical query order", () => {
  assert.equal(
    serializeViewState({ sample: "release-note", left: "a", right: "b", mode: "source" }),
    "?sample=release-note&left=a&right=b&mode=source"
  );
  assert.equal(serializeViewState({ sample: "release-note", left: "a", right: "a", mode: "source" }), "?sample=release-note&left=original&right=c&mode=rendered");
});

test("changing sample preserves pair and mode", () => {
  assert.deepEqual(
    selectSample({ sample: "release-note", left: "a", right: "b", mode: "source" }, "support-reply"),
    { sample: "support-reply", left: "a", right: "b", mode: "source" }
  );
});

test("selecting the version already on the opposite side swaps the pair", () => {
  assert.deepEqual(
    selectVersion({ sample: "release-note", left: "a", right: "b", mode: "rendered" }, "left", "b"),
    { sample: "release-note", left: "b", right: "a", mode: "rendered" }
  );
  assert.deepEqual(
    selectVersion({ sample: "release-note", left: "a", right: "b", mode: "source" }, "right", "a"),
    { sample: "release-note", left: "b", right: "a", mode: "source" }
  );
});

test("selecting a distinct version updates only the requested side", () => {
  assert.deepEqual(
    selectVersion({ sample: "release-note", left: "a", right: "b", mode: "unified" }, "left", "c"),
    { sample: "release-note", left: "c", right: "b", mode: "unified" }
  );
  assert.deepEqual(
    selectVersion({ sample: "release-note", left: "a", right: "b", mode: "unified" }, "right", "c"),
    { sample: "release-note", left: "a", right: "c", mode: "unified" }
  );
});

test("swaps versions without changing the selected display mode", () => {
  assert.deepEqual(
    swapVersions({ sample: "release-note", left: "a", right: "b", mode: "source" }),
    { sample: "release-note", left: "b", right: "a", mode: "source" }
  );
});

test("round-trips every ordered pair for every sample", () => {
  for (const sample of SAMPLE_ORDER) {
    for (const left of VERSION_ORDER) {
      for (const right of VERSION_ORDER) {
        if (left === right) continue;
        const state = { sample, left, right, mode: "rendered" };
        assert.deepEqual(parseViewState(serializeViewState(state)), state);
      }
    }
  }
});

test("round-trips every ordered pair through its hand-derived canonical URL", () => {
  const cases = [
    ["?sample=release-note&left=original&right=a&mode=rendered", { sample: "release-note", left: "original", right: "a", mode: "rendered" }],
    ["?sample=release-note&left=original&right=b&mode=rendered", { sample: "release-note", left: "original", right: "b", mode: "rendered" }],
    ["?sample=release-note&left=original&right=c&mode=rendered", { sample: "release-note", left: "original", right: "c", mode: "rendered" }],
    ["?sample=release-note&left=a&right=original&mode=rendered", { sample: "release-note", left: "a", right: "original", mode: "rendered" }],
    ["?sample=release-note&left=a&right=b&mode=rendered", { sample: "release-note", left: "a", right: "b", mode: "rendered" }],
    ["?sample=release-note&left=a&right=c&mode=rendered", { sample: "release-note", left: "a", right: "c", mode: "rendered" }],
    ["?sample=release-note&left=b&right=original&mode=rendered", { sample: "release-note", left: "b", right: "original", mode: "rendered" }],
    ["?sample=release-note&left=b&right=a&mode=rendered", { sample: "release-note", left: "b", right: "a", mode: "rendered" }],
    ["?sample=release-note&left=b&right=c&mode=rendered", { sample: "release-note", left: "b", right: "c", mode: "rendered" }],
    ["?sample=release-note&left=c&right=original&mode=rendered", { sample: "release-note", left: "c", right: "original", mode: "rendered" }],
    ["?sample=release-note&left=c&right=a&mode=rendered", { sample: "release-note", left: "c", right: "a", mode: "rendered" }],
    ["?sample=release-note&left=c&right=b&mode=rendered", { sample: "release-note", left: "c", right: "b", mode: "rendered" }]
  ];

  for (const [search, expectedState] of cases) {
    assert.deepEqual(parseViewState(search), expectedState, search);
    assert.equal(serializeViewState(expectedState), search, search);
  }
});

test("switching samples never selects a version the target sample lacks", () => {
  // English samples have no Humanize Korean version, so carrying `a` across
  // produced a "valid" state whose document does not exist.
  const englishSamples = SAMPLE_ORDER.filter((id) => id.endsWith("-en"));
  assert.ok(englishSamples.length > 0, "fixture must include English samples");

  for (const target of englishSamples) {
    for (const left of VERSION_ORDER) {
      for (const right of VERSION_ORDER) {
        if (left === right) continue;
        const next = selectSample({ sample: "release-note", left, right, mode: "rendered" }, target);
        const versions = SAMPLES[next.sample].versions;
        assert.ok(versions[next.left]?.text, `${target}: left ${next.left} has no document`);
        assert.ok(versions[next.right]?.text, `${target}: right ${next.right} has no document`);
        assert.notEqual(next.left, next.right, `${target}: pair collapsed`);
      }
    }
  }
});

test("switching between samples that share every version keeps the pair", () => {
  assert.deepEqual(
    selectSample({ sample: "release-note", left: "a", right: "b", mode: "source" }, "incident-review"),
    { sample: "incident-review", left: "a", right: "b", mode: "source" }
  );
});

test("the default state is derived from the embedded data, not hard-coded", () => {
  const fallback = parseViewState("?left=bad&right=bad&mode=x");
  assert.equal(fallback.sample, SAMPLE_ORDER[0]);
  assert.ok(SAMPLES[fallback.sample], "the default sample must exist");
  assert.ok(SAMPLES[fallback.sample].versions[fallback.left]?.text);
  assert.ok(SAMPLES[fallback.sample].versions[fallback.right]?.text);
});
