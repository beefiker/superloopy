import assert from "node:assert/strict";
import test from "node:test";

import {
  auditTexts,
  extractProtectedSpans
} from "../skills/say-it-straight/scripts/audit-output.mjs";

// Mutation caught: returning a failing report for text whose protected values are unchanged.
test("audit accepts unchanged code URL path and number values", () => {
  const text = "Run `npm test` at https://example.test/docs from ./scripts/check.mjs; target 40%.";

  const report = auditTexts(text, text);

  assert.equal(report.schemaVersion, 1);
  assert.equal(report.ok, true);
  assert.equal(report.checks.protected.ok, true);
  assert.equal(report.checks.numbers.ok, true);
  assert.deepEqual(report.problems, []);
});

// Mutation caught: omitting a protected syntax matcher or allowing a nested match to duplicate its wider span.
test("extracts ordered non-overlapping markdown spans", () => {
  const text = [
    "---",
    "title: Release 2",
    "---",
    "Use `npm test`, [docs](https://example.test/docs), https://api.example.test/v1, ./scripts/check.mjs, [RFC 2119], and \"ship now\" for 40%.",
    "```sh",
    "npm pack",
    "```"
  ].join("\n");

  const spans = extractProtectedSpans(text);

  assert.deepEqual(
    spans.map(({ type, value }) => [type, value]),
    [
      ["frontmatter", "---\ntitle: Release 2\n---"],
      ["inline-code", "`npm test`"],
      ["markdown-url", "[docs](https://example.test/docs)"],
      ["bare-url", "https://api.example.test/v1"],
      ["path", "./scripts/check.mjs"],
      ["citation", "[RFC 2119]"],
      ["quotation", "\"ship now\""],
      ["number", "40%"],
      ["fenced-code", "```sh\nnpm pack\n```"]
    ]
  );
  assert.ok(spans.every((span, index) => index === 0 || spans[index - 1].end <= span.start));
});

// Mutation caught: collapsing repeated protected values into a set and accepting a removed duplicate.
test("audit rejects a removed repeated protected value", () => {
  const report = auditTexts(
    "Run `npm test`, then `npm test`.",
    "Run `npm test`."
  );

  assert.equal(report.ok, false);
  assert.equal(report.checks.protected.count.ok, false);
  assert.deepEqual(report.checks.protected.count.missing, ["`npm test`"]);
});

// Mutation caught: comparing protected values as unordered multisets and accepting a reordered sequence.
test("audit rejects reordered repeated protected values", () => {
  const report = auditTexts(
    "Run `npm test`, then `npm pack`.",
    "Run `npm pack`, then `npm test`."
  );
  assert.equal(report.ok, false);
  assert.equal(report.checks.protected.order.ok, false);
});

// Mutation caught: checking only source numbers and missing numbers introduced in the final text.
test("audit rejects a newly introduced number", () => {
  const report = auditTexts("The pilot improved checkout.", "The pilot improved checkout by 40%.");
  assert.equal(report.ok, false);
  assert.deepEqual(report.checks.numbers.added, ["40%"]);
});

// Mutation caught: ignoring exact user-specified frozen strings that automatic syntax matching cannot infer.
test("audit preserves user-frozen values", () => {
  const options = { protectedValues: ["Acme Ultra", "Northwind"] };
  const report = auditTexts(
    "Acme Ultra ships with Northwind.",
    "Acme ships with Northwind.",
    options
  );

  assert.equal(report.ok, false);
  assert.deepEqual(report.checks.protected.missing.values, ["Acme Ultra"]);
});
