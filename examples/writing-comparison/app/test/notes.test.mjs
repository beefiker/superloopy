import assert from "node:assert/strict";
import test from "node:test";

import { attachNotes, buildSamples } from "../build-data.mjs";
import { diffDocuments } from "../diff-core.mjs";
import { renderBlock } from "../markdown.mjs";
import { anchorSliceRanges, findAnchorMatch, findAnchorRange, normalizeAnchor } from "../notes.mjs";

const KOREAN_NOTE_SAMPLES = ["release-note", "meeting-followup", "incident-review", "support-reply", "internal-proposal", "api-migration", "llm-wiki"];

function fakeVersions(originalText, cText) {
  return {
    original: { id: "original", text: originalText, notes: [] },
    c: { id: "c", text: cText, notes: [] }
  };
}

test("findAnchorRange locates the first occurrence or reports none", () => {
  assert.deepEqual(findAnchorRange("가나다라 가나", "나다"), { start: 1, end: 3 });
  assert.equal(findAnchorRange("가나다", "없음"), null);
});

test("anchorSliceRanges splits a match across segment boundaries", () => {
  // Segments "ab" + "cde" + "fg"; match [1, 6) covers "b", "cde", "f".
  assert.deepEqual(anchorSliceRanges([2, 3, 2], 1, 6), [
    { segment: 0, start: 1, end: 2 },
    { segment: 1, start: 0, end: 3 },
    { segment: 2, start: 0, end: 1 }
  ]);
  // Match inside one segment touches only that segment.
  assert.deepEqual(anchorSliceRanges([2, 3, 2], 3, 5), [{ segment: 1, start: 1, end: 3 }]);
});

test("attachNotes embeds a valid note onto its version", () => {
  const versions = fakeVersions("원문 문장입니다.", "고친 문장입니다.");
  attachNotes(versions, [{ version: "c", anchor: "고친 문장입니다.", from: "원문 문장입니다.", rule: "Wording", note: "이유" }], "fake");
  assert.equal(versions.c.notes.length, 1);
  assert.equal(versions.c.notes[0].anchor, "고친 문장입니다.");
  assert.equal(versions.original.notes.length, 0);
});

test("attachNotes rejects orphan anchors, ambiguous anchors, missing fields, and bad from", () => {
  const versions = () => fakeVersions("원문 문장. 반복 반복", "반복 반복");
  assert.throws(
    () => attachNotes(versions(), [{ version: "c", anchor: "없는 문장", rule: "R", note: "N" }], "fake"),
    /anchor must appear exactly once in c\.md, found 0/
  );
  assert.throws(
    () => attachNotes(versions(), [{ version: "c", anchor: "반복", rule: "R", note: "N" }], "fake"),
    /anchor must appear exactly once in c\.md, found 2/
  );
  assert.throws(
    () => attachNotes(versions(), [{ version: "c", anchor: "반복 반복", rule: "R" }], "fake"),
    /missing required field "note"/
  );
  assert.throws(
    () => attachNotes(versions(), [{ version: "z", anchor: "반복 반복", rule: "R", note: "N" }], "fake"),
    /version "z" does not exist/
  );
  assert.throws(
    () => attachNotes(versions(), [{ version: "c", anchor: "반복 반복", from: "원문에 없음", rule: "R", note: "N" }], "fake"),
    /"from" not found in original\.md/
  );
});

test("every changed hunk of the Korean C variants carries at least one note", async () => {
  const samples = await buildSamples();
  for (const sampleId of KOREAN_NOTE_SAMPLES) {
    const sample = samples[sampleId];
    const notes = sample.versions.c.notes;
    assert.ok(notes.length > 0, `${sampleId}: expected authored notes for version c`);

    const hunks = diffDocuments(sample.versions.original.text, sample.versions.c.text)
      .filter((hunk) => hunk.op !== "equal" && hunk.right);
    for (const hunk of hunks) {
      const rightText = hunk.right.blocks.map((block) => block.raw).join("\n\n");
      const covered = notes.some((note) => rightText.includes(note.anchor));
      assert.ok(covered, `${sampleId}: changed hunk has no note — "${rightText.slice(0, 60)}"`);
    }
  }
});

// Prose sentences of a document: code fences, tables, headings, and blank
// lines are skipped; list markers are stripped so list sentences count too.
function proseSentences(text) {
  const sentences = [];
  let inFence = false;
  for (const line of text.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence || /^\s*$/.test(line) || /^#/.test(line) || /^\s*\|/.test(line)) continue;
    const body = line.replace(/^\s*(?:- \[ \] |[-*+] |\d+\. )/, "");
    for (const sentence of body.split(/(?<=[.!?])\s+/)) {
      if (sentence.trim()) sentences.push(sentence.trim());
    }
  }
  return sentences;
}

test("every changed sentence of the Korean C variants carries a note", async () => {
  const samples = await buildSamples();
  for (const sampleId of KOREAN_NOTE_SAMPLES) {
    const { versions } = samples[sampleId];
    const notes = versions.c.notes;
    const changed = proseSentences(versions.c.text).filter((sentence) => !versions.original.text.includes(sentence));
    for (const sentence of changed) {
      const covered = notes.some((note) => note.anchor.includes(sentence) || sentence.includes(note.anchor));
      assert.ok(covered, `${sampleId}: changed sentence has no note — "${sentence}"`);
    }
  }
});

test("normalizeAnchor strips list markers and code backticks", () => {
  assert.equal(normalizeAnchor("1. 항목을 확인해 주세요."), "항목을 확인해 주세요.");
  assert.equal(normalizeAnchor("- [ ] 민지: 초안을 공유합니다."), "민지: 초안을 공유합니다.");
  assert.equal(normalizeAnchor("`X-API-Version: 2`를 추가합니다."), "X-API-Version: 2를 추가합니다.");
  assert.equal(normalizeAnchor("일반 문장은 그대로입니다."), "일반 문장은 그대로입니다.");
});

// The DOM walker sees the RENDERED text, which drops Markdown syntax. This
// approximates a pane's text stream with the app's real renderer, so a note
// whose anchor can never match the rendered document fails here instead of
// silently losing its underline in the browser.
function renderedText(markdown) {
  const blocks = diffDocuments(markdown, markdown).flatMap((hunk) => hunk.left?.blocks ?? []);
  const html = blocks.map(renderBlock).join("");
  return html
    .replace(/<[^>]+>/gu, "")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'");
}

test("every note anchor matches the rendered document, not just the raw Markdown", async () => {
  const samples = await buildSamples();
  for (const sampleId of KOREAN_NOTE_SAMPLES) {
    const { versions } = samples[sampleId];
    const rendered = renderedText(versions.c.text);
    for (const note of versions.c.notes) {
      assert.ok(findAnchorMatch(rendered, note.anchor), `${sampleId}: anchor not findable in rendered text — "${note.anchor.slice(0, 50)}"`);
    }
  }
});

test("note anchors and sources stay verbatim in the built data", async () => {
  const samples = await buildSamples();
  for (const sampleId of KOREAN_NOTE_SAMPLES) {
    const { versions } = samples[sampleId];
    for (const note of versions.c.notes) {
      assert.equal(versions.c.text.includes(note.anchor), true, `${sampleId}: anchor drifted`);
      if (note.from) assert.equal(versions.original.text.includes(note.from), true, `${sampleId}: from drifted`);
      assert.ok(note.rule.length > 0 && note.note.length > 0, sampleId);
    }
  }
});
