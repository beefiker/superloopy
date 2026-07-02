import test from "node:test";
import assert from "node:assert/strict";
import { parseBeats, parseTimes } from "../skills/superloopy-video/scripts/frame-qa.mjs";

test("parseBeats reads storyboard beat markers with start and duration", () => {
  const storyboard = [
    "- [t=0s d=2s] Hook card — visual: wordmark | motion: scale | audio: hit | text: hello",
    "- [t=2s d=5.5s] Problem — visual: split | motion: counter | audio: VO 1 | text: stat",
    "- [t=7.5s] Close — visual: CTA | motion: — | audio: outro | text: CTA"
  ].join("\n");

  assert.deepEqual(parseBeats(storyboard), [
    { t: 0, d: 2 },
    { t: 2, d: 5.5 },
    { t: 7.5, d: null }
  ]);
});

test("parseBeats sorts out-of-order markers and ignores non-beat brackets", () => {
  const storyboard = "[t=4s d=1s] later\nsee [ref] and [t=1.25s d=0.75s] earlier";
  assert.deepEqual(parseBeats(storyboard), [
    { t: 1.25, d: 0.75 },
    { t: 4, d: 1 }
  ]);
});

test("parseBeats returns empty for a storyboard without markers", () => {
  assert.deepEqual(parseBeats("# STORYBOARD\nno timeline yet"), []);
});

test("parseTimes parses a comma list, drops invalid entries, and sorts", () => {
  assert.deepEqual(parseTimes("7, 0, 2.5, x, -1"), [
    { t: 0, d: null },
    { t: 2.5, d: null },
    { t: 7, d: null }
  ]);
});
