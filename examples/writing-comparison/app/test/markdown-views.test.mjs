import assert from "node:assert/strict";
import test from "node:test";

import { escapeHtml, renderBlock, renderInline } from "../markdown.mjs";
import { renderSideBySide, renderSource, renderUnified } from "../views.mjs";
import { diffDocuments } from "../diff-core.mjs";

test("escapes every HTML-significant source character before rendering", () => {
  assert.equal(escapeHtml('<img src=x onerror="alert(1)">'), "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  assert.equal(escapeHtml("Tom & 'Ada'"), "Tom &amp; &#39;Ada&#39;");
  assert.doesNotMatch(renderInline("<script>alert(1)</script>"), /<script>/);
  assert.match(renderInline("<script>alert(1)</script>"), /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

test("renders supported inline Markdown without allowing unsafe or relative links", () => {
  const rendered = renderInline("Use `code` with **bold**, *emphasis*, and [safe](https://example.test/docs).");

  assert.match(rendered, /<code>code<\/code>/);
  assert.match(rendered, /<strong>bold<\/strong>/);
  assert.match(rendered, /<em>emphasis<\/em>/);
  assert.match(rendered, /<a href="https:\/\/example\.test\/docs" target="_blank" rel="noreferrer">safe<\/a>/);

  for (const value of [
    "[script](javascript:alert(1))",
    "[payload](data:text/html,alert(1))",
    "[relative](guide.md)",
    "[root](/guide)"
  ]) {
    const output = renderInline(value);
    assert.doesNotMatch(output, /<a href=/);
    assert.match(output, /\[/);
  }
});

test("renders each supported structural Markdown block", () => {
  assert.match(renderBlock({ type: "heading", raw: "## Title" }), /<h2[^>]*>Title<\/h2>/);
  assert.match(renderBlock({ type: "frontmatter", raw: "---\ntitle: Sample\n---" }), /<pre[^>]*><code>---\ntitle: Sample\n---<\/code><\/pre>/);
  assert.match(renderBlock({ type: "fence", raw: "```sh\nnpm test\n```" }), /<pre><code[^>]*>npm test/);
  assert.match(renderBlock({ type: "blockquote", raw: "> quoted\n> lines" }), /<blockquote>quoted<br>lines<\/blockquote>/);
  assert.match(renderBlock({ type: "table", raw: "| Name | Done |\n| --- | --- |\n| Ada | yes |" }), /<table>.*<th>Name<\/th>.*<td>Ada<\/td>.*<\/table>/s);
  assert.match(renderBlock({ type: "list", raw: "1. first\n2. second" }), /<ol>.*<li>first<\/li>.*<\/ol>/s);
  assert.match(renderBlock({ type: "list", raw: "- plain\n- [x] done\n- [ ] next" }), /<ul>.*<li>plain<\/li>.*type="checkbox" checked disabled.*next.*<\/ul>/s);
  assert.match(renderBlock({ type: "paragraph", raw: "A plain paragraph." }), /<p>A plain paragraph\.<\/p>/);
});

test("side-by-side rendering highlights replacement tokens instead of entire sections", () => {
  const hunks = diffDocuments("# Title\n\nOld line.\n\nKeep.", "# Title\n\nNew line.\n\nKeep.\n\nAdded.");
  const html = renderSideBySide(hunks, { leftLabel: "Before", rightLabel: "After" });

  assert.match(html, /<article[^>]*data-side="left"[^>]*aria-label="Before"/);
  assert.match(html, /<article[^>]*data-side="right"[^>]*aria-label="After"/);
  assert.match(html, /data-hunk-id="change-2"/);
  assert.match(html, /<section class="diff-hunk diff-change"[^>]*><span class="visually-hidden">Changed<\/span><p><span class="token-remove">Old<\/span> line\.<\/p>/);
  assert.match(html, /<section class="diff-hunk diff-change"[^>]*><span class="visually-hidden">Changed<\/span><p><span class="token-add">New<\/span> line\.<\/p>/);
  assert.doesNotMatch(html, /class="diff-hunk diff-(?:remove|add) diff-change"/);
  assert.match(html, /diff-add/);
  assert.match(html, /diff-change/);
  assert.match(html, /<span class="visually-hidden">Changed<\/span>/);
  assert.match(html, /<span class="visually-hidden">Added<\/span>/);
});

test("source rendering preserves escaped physical rows including blank separators", () => {
  const hunks = diffDocuments("# Title\n\nOld <tag>.", "# Title\n\nNew <tag>.");
  const html = renderSource(hunks);

  assert.match(html, /<article[^>]*data-side="left"/);
  assert.match(html, /<pre[^>]*data-line="1"[^>]*># Title<\/pre>/);
  assert.match(html, /<pre[^>]*data-line="2"[^>]*><\/pre>/);
  assert.match(html, /<pre[^>]*data-line="3"[^>]*><span class="token-remove">Old<\/span> &lt;tag&gt;\.<\/pre>/);
  assert.match(html, /<pre[^>]*data-line="3"[^>]*><span class="token-add">New<\/span> &lt;tag&gt;\.<\/pre>/);
  assert.match(html, /aria-label="Changed line 3"/);
});

test("source rendering retains each physical fence and list row with their blank separator", () => {
  const hunks = diffDocuments("```sh\nnpm test\n```\n\n- first\n- second", "```sh\nnpm run test\n```\n\n- first\n- second");
  const html = renderSource(hunks);

  assert.match(html, /data-line="1"[^>]*>```sh<\/pre>/);
  assert.match(html, /data-line="2"[^>]*>npm test<\/pre>/);
  assert.match(html, /data-side="right"[\s\S]*data-line="2"[^>]*>npm <span class="token-add">run <\/span>test<\/pre>/);
  assert.match(html, /data-line="3"[^>]*>```<\/pre>/);
  assert.match(html, /data-line="4"[^>]*><\/pre>/);
  assert.match(html, /data-line="5"[^>]*>- first<\/pre>/);
  assert.match(html, /data-line="6"[^>]*>- second<\/pre>/);
});

test("source rendering reconstructs multiple blank rows without inventing or dropping rows", () => {
  const hunks = diffDocuments("# Heading\n\nBefore.\n\n\nAfter.", "# Heading\n\nAfter.");
  const html = renderSource(hunks);

  for (const line of [1, 2, 3, 4, 5, 6]) {
    assert.match(html, new RegExp(`data-side="left"[\\s\\S]*data-line="${line}"`));
  }
  assert.match(html, /data-line="4"[^>]*><\/pre><pre[^>]*data-line="5"[^>]*><\/pre>/);
});

test("source rendering retains exact physical rows for identical whitespace-only documents without structural blocks", () => {
  const hunks = diffDocuments("   \n\n", "   \n\n");
  const html = renderSource(hunks);

  assert.deepEqual(hunks, []);
  assert.equal(hunks.sourceLeft, "   \n\n");
  assert.equal(hunks.sourceRight, "   \n\n");
  assert.equal(Object.keys(hunks).includes("sourceLeft"), false);
  assert.match(html, /data-side="left"[\s\S]*data-line="1"[^>]*>   <\/pre><pre[^>]*data-line="2"[^>]*><\/pre>/);
  assert.match(html, /data-side="right"[\s\S]*data-line="1"[^>]*>   <\/pre><pre[^>]*data-line="2"[^>]*><\/pre>/);
});

test("source rendering marks whitespace-only replacements without losing their raw rows", () => {
  const hunks = diffDocuments(" \n", "  \n");
  const html = renderSource(hunks);

  assert.equal(hunks.length, 1);
  assert.equal(hunks[0].op, "replace");
  assert.match(html, /data-side="left"[\s\S]*class="source-row diff-remove diff-change"[^>]*data-line="1"[^>]*aria-label="Changed line 1"[^>]*><span class="token-remove"> <\/span><\/pre>/);
  assert.match(html, /data-side="right"[\s\S]*class="source-row diff-add diff-change"[^>]*data-line="1"[^>]*aria-label="Changed line 1"[^>]*><span class="token-add">  <\/span><\/pre>/);
});

test("unified rendering provides removed, added, and neutral gutters with token spans", () => {
  const hunks = diffDocuments("Same.\n\nOld word.", "Same.\n\nNew word.");
  const html = renderUnified(hunks);

  assert.match(html, /class="unified-gutter"[^>]*> <\/span>/);
  assert.match(html, /class="unified-gutter"[^>]*>−<\/span>/);
  assert.match(html, /class="unified-gutter"[^>]*>\+<\/span>/);
  assert.match(html, /<span class="token-remove">Old<\/span>/);
  assert.match(html, /<span class="token-add">New<\/span>/);
  assert.match(html, /<span class="visually-hidden">Removed<\/span>/);
  assert.match(html, /<span class="visually-hidden">Added<\/span>/);
});

// Highlight sentinels land on structural markers when a change starts at a
// block's first character. Each of these silently mangled output before.
test("block markers survive a highlight sentinel at offset 0", () => {
  const rendered = (left, right) => renderSideBySide(diffDocuments(left, right), {});

  const bullets = rendered("* one\n* two", "- one\n- two");
  assert.doesNotMatch(bullets, /<ul><\/ul>/, "a marker change must not delete the list");
  assert.match(bullets, /<li>/);

  const ordered = rendered("1. one\n2. two", "2. one\n3. two");
  assert.ok((ordered.match(/<li>/gu) ?? []).length >= 4, "renumbering must not delete the list");

  const checklist = rendered("- [ ] ship it", "- [x] ship it");
  assert.match(checklist, /type="checkbox" checked/);
  assert.match(checklist, /type="checkbox" disabled/);

  const fence = rendered("```sh\nnpm test\n```", "```js\nnpm test\n```");
  for (const attribute of fence.match(/class="language-[^"]*"/gu) ?? []) {
    assert.match(attribute, /^class="language-(sh|js)"$/u, "the info string must never carry markup");
  }
  assert.doesNotMatch(fence, /class="language-<span/u);
});

test("source panes emit the same row count on both sides", () => {
  const paneRows = (html, index) => (html.split('class="source-pane"')[index]?.match(/<pre /gu) ?? []).length;
  // An add at the top: the left side spends a blank separator line the filler
  // count used to ignore, so every row below drifted.
  const html = renderSource(diffDocuments("A one.\n\nB two.", "X new.\n\nA one.\n\nB two."), {});
  assert.equal(paneRows(html, 1), paneRows(html, 2));

  const replaced = renderSource(diffDocuments("One.\n\nTwo.", "One line.\nAnd another.\n\nTwo."), {});
  assert.equal(paneRows(replaced, 1), paneRows(replaced, 2));
});
