import assert from "node:assert/strict";
import test from "node:test";

import { diffDocuments, diffTokens, splitBlocks, summarizeDiff } from "../diff-core.mjs";

test("splits headings, paragraphs, and fenced code without changing raw source", () => {
  assert.deepEqual(splitBlocks("# A\n\nBody.\n\n```sh\nnpm test\n```\n"), [
    { type: "heading", raw: "# A" },
    { type: "paragraph", raw: "Body." },
    { type: "fence", raw: "```sh\nnpm test\n```" }
  ]);
});

test("splits frontmatter, tables, lists, and blockquotes into contiguous blocks", () => {
  assert.deepEqual(splitBlocks("---\ntitle: Sample\n---\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n- one\n  continued\n- two\n\n> quoted\n> lines\n"), [
    { type: "frontmatter", raw: "---\ntitle: Sample\n---" },
    { type: "table", raw: "| A | B |\n| - | - |\n| 1 | 2 |" },
    { type: "list", raw: "- one\n  continued\n- two" },
    { type: "blockquote", raw: "> quoted\n> lines" }
  ]);
});

test("retains non-enumerable physical source metadata for view reconstruction", () => {
  const blocks = splitBlocks("# Title\n\n```sh\nnpm test\n```\n\n- one\n- two");

  assert.equal(blocks[0].sourceStartLine, 1);
  assert.equal(blocks[0].sourceEndLine, 1);
  assert.equal(blocks[1].sourceStartLine, 3);
  assert.equal(blocks[1].sourceEndLine, 5);
  assert.equal(blocks[2].sourceStartLine, 7);
  assert.equal(blocks[2].sourceEndLine, 8);
  assert.equal(blocks[1].sourceBefore, "\n\n");
  assert.equal(Object.keys(blocks[1]).includes("sourceStartLine"), false);
});

test("returns no blocks for empty or whitespace-only input", () => {
  assert.deepEqual(splitBlocks(""), []);
  assert.deepEqual(splitBlocks(" \n\t\n"), []);
});

test("creates a stable format replacement hunk for unequal blockless source", () => {
  const hunks = diffDocuments(" \n", "  \n");

  assert.equal(hunks.length, 1);
  assert.deepEqual(hunks[0], {
    id: "change-1",
    op: "replace",
    left: { start: 1, end: 1, blocks: [{ type: "paragraph", raw: " \n" }] },
    right: { start: 1, end: 1, blocks: [{ type: "paragraph", raw: "  \n" }] },
    section: "",
    kind: "format",
    tokens: [
      { type: "remove", value: " \n" },
      { type: "add", value: "  \n" }
    ],
    preservation: "unknown"
  });
});

test("emits word and whitespace token changes with adjacent equal text", () => {
  assert.deepEqual(diffTokens("Fileloom is very fast.", "Fileloom is fast."), [
    { type: "equal", value: "Fileloom is " },
    { type: "remove", value: "very " },
    { type: "equal", value: "fast." }
  ]);
});

test("keeps Korean words and punctuation as Unicode-aware tokens", () => {
  assert.deepEqual(diffTokens("출시 준비 완료!", "출시 검토 완료!"), [
    { type: "equal", value: "출시 " },
    { type: "remove", value: "준비" },
    { type: "add", value: "검토" },
    { type: "equal", value: " 완료!" }
  ]);
});

test("represents pure token additions and deletions", () => {
  assert.deepEqual(diffTokens("", "새 문장"), [{ type: "add", value: "새 문장" }]);
  assert.deepEqual(diffTokens("delete me", ""), [{ type: "remove", value: "delete me" }]);
});

test("aligns an interior token anchor beyond the former fallback threshold", () => {
  const left = `${Array.from({ length: 260 }, () => "left").join(" ")} anchor ${Array.from({ length: 260 }, () => "tail-left").join(" ")}`;
  const right = `${Array.from({ length: 260 }, () => "right").join(" ")} anchor ${Array.from({ length: 260 }, () => "tail-right").join(" ")}`;

  assert.equal(diffTokens(left, right).some((token) => token.type === "equal" && token.value.includes("anchor")), true);
});

test("creates stable wording replace hunks with one-based block ranges and heading sections", () => {
  const hunks = diffDocuments("# Decision\n\nShip soon.", "# Decision\n\nShip now.");

  assert.deepEqual(hunks, [
    {
      id: "change-1",
      op: "equal",
      left: { start: 1, end: 1, blocks: [{ type: "heading", raw: "# Decision" }] },
      right: { start: 1, end: 1, blocks: [{ type: "heading", raw: "# Decision" }] },
      section: "Decision",
      kind: "wording",
      tokens: [],
      preservation: "unknown"
    },
    {
      id: "change-2",
      op: "replace",
      left: { start: 2, end: 2, blocks: [{ type: "paragraph", raw: "Ship soon." }] },
      right: { start: 2, end: 2, blocks: [{ type: "paragraph", raw: "Ship now." }] },
      section: "Decision",
      kind: "wording",
      tokens: [
        { type: "equal", value: "Ship " },
        { type: "remove", value: "soon" },
        { type: "add", value: "now" },
        { type: "equal", value: "." }
      ],
      preservation: "unknown"
    }
  ]);
});

test("classifies changed numeric content, block structure, and whitespace format", () => {
  assert.equal(diffDocuments("# Limits\n\nUse 25%.", "# Limits\n\nUse 50%.")[1].kind, "number/protected");
  assert.equal(diffDocuments("- one\n- two", "One\n\nTwo")[0].kind, "structure");
  assert.equal(diffDocuments("One line", "One  line")[0].kind, "format");
});

test("classifies unequal replacement block counts as structure", () => {
  const hunk = diffDocuments("Before.", "After one.\n\nAfter two.")[0];

  assert.equal(hunk.op, "replace");
  assert.equal(hunk.left.blocks.length, 1);
  assert.equal(hunk.right.blocks.length, 2);
  assert.equal(hunk.kind, "structure");
});

test("marks additions and deletions with null absent sides", () => {
  const added = diffDocuments("", "Added.")[0];
  const removed = diffDocuments("Removed.", "")[0];

  assert.equal(added.op, "add");
  assert.equal(added.left, null);
  assert.deepEqual(added.right, { start: 1, end: 1, blocks: [{ type: "paragraph", raw: "Added." }] });
  assert.equal(removed.op, "remove");
  assert.deepEqual(removed.left, { start: 1, end: 1, blocks: [{ type: "paragraph", raw: "Removed." }] });
  assert.equal(removed.right, null);
});

test("derives preservation mechanically from selected-output audit data", () => {
  const pass = diffDocuments("Old.", "New.", { rightAudits: [{ ok: true, checks: { protected: { ok: true } } }] });
  const fail = diffDocuments("Old.", "New.", { rightAudits: [{ ok: false, checks: { protected: { ok: false } } }] });

  assert.equal(pass[0].preservation, "pass");
  assert.equal(fail[0].preservation, "fail");
});

test("summarizes hunk operations and changed tokens", () => {
  assert.deepEqual(summarizeDiff(diffDocuments("# A\n\nOld.\n\nKeep.", "# A\n\nNew.\n\nKeep.\n\nExtra.")), {
    equal: 2,
    add: 1,
    remove: 0,
    replace: 1,
    changedTokens: 3
  });
});

test("uses conservative prefix and suffix alignment when documents exceed the block LCS bound", () => {
  const repeated = Array.from({ length: 220 }, () => "Same.").join("\n\n");
  const hunks = diffDocuments(`${repeated}\n\nLeft edge.`, "Right edge.\n\nSame.");

  assert.equal(hunks.length, 1);
  assert.equal(hunks[0].op, "replace");
  assert.equal(hunks[0].left.blocks.length, 221);
  assert.equal(hunks[0].right.blocks.length, 2);
});
