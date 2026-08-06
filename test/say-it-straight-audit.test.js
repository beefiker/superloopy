import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { auditTexts, extractProtectedSpans } from "../skills/say-it-straight/scripts/audit-output.mjs";
const script = fileURLToPath(new URL("../skills/say-it-straight/scripts/audit-output.mjs", import.meta.url));
async function writeCase(t, sourceText, finalText, protectedText) {
  const directory = await mkdtemp(join(tmpdir(), "say-it-straight-audit-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const files = {
    source: join(directory, "source.md"),
    final: join(directory, "final.md"),
    report: join(directory, "report.json"),
    protected: join(directory, "protected.json")
  };
  await writeFile(files.source, sourceText);
  await writeFile(files.final, finalText);
  if (protectedText !== undefined) await writeFile(files.protected, protectedText);
  return files;
}

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

// Mutation caught: recognizing only slash-prefixed paths or only a relative path suffix.
test("audit preserves complete Windows and relative paths across CRLF input", () => {
  const fixtures = [
    [String.raw`C:\Reports\Q4 results.docx`, String.raw`C:\Reports\Q4 summary.docx`],
    [String.raw`C:\Program Files (x86)\Acme\config.json`, String.raw`C:\Program Data (x86)\Acme\config.json`],
    [String.raw`C:\Reports\Q4 [final]\report #1.docx`, String.raw`C:\Reports\Q4 [draft]\report #1.docx`],
    [String.raw`\\?\C:\very long\file.txt`, String.raw`\\?\D:\very long\file.txt`],
    ["\\\\?\\Volume{b75e2c83}\\very long\\", "\\\\?\\Volume{c91f3d94}\\very long\\"],
    [String.raw`\\.\C:\device path\file.txt`, String.raw`\\.\D:\device path\file.txt`],
    [String.raw`\\server\team share\folder (old)\report.csv`, String.raw`\\server\team share\folder (new)\report.csv`],
    [String.raw`\\server\C$\ProgramData\file.txt`, String.raw`\\server\D$\ProgramData\file.txt`],
    [String.raw`C:relative\file.txt`, String.raw`D:relative\file.txt`],
    [String.raw`src\config\app.json`, String.raw`src\config\prod.json`],
    ["src/config/app.json", "lib/config/app.json"], ["README.md", "README.txt"], [".gitignore", ".npmignore"]
  ];
  const source = fixtures.map(([path]) => `Keep ${path}.`).join("\r\n");
  const final = fixtures.map(([, path]) => `Keep ${path}.`).join("\r\n");
  const expected = fixtures.map(([path]) => path);
  const paths = extractProtectedSpans(source).filter((span) => span.type === "path").map((span) => span.value);
  const report = auditTexts(source, final);

  assert.deepEqual(paths, expected);
  assert.equal(report.ok, false);
  assert.deepEqual(report.checks.protected.missing.values, expected);
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

// Mutation caught: beginning a numeric match after a leading decimal point and treating .5% as 5%.
test("audit rejects removal of a leading decimal point", () => {
  const report = auditTexts("The rate is .5%.", "The rate is 5%.");

  assert.equal(report.ok, false);
  assert.deepEqual(report.checks.numbers.missing, [".5%"]);
  assert.deepEqual(report.checks.numbers.added, ["5%"]);
});

// Mutation caught: skipping numeric suffixes attached to identifiers and accepting a changed version.
test("audit rejects a changed numeric identifier suffix", () => {
  const report = auditTexts("Use API v2.", "Use API v3.");
  assert.equal(report.ok, false);
  assert.deepEqual(report.checks.numbers.missing, ["2"]);
  assert.deepEqual(report.checks.numbers.added, ["3"]);
});

test("audit rejects changed formulas and code-style identifiers", () => {
  assert.equal(auditTexts("Keep retry_count >= 5.", "Keep retry_count > 5.").ok, false);
  assert.equal(auditTexts("Set NODE_ENV safely.", "Set APP_ENV safely.").ok, false);
});

// Mutation caught: comparing only the numeric portion of a quantity and accepting a changed spaced unit.
test("audit rejects a changed separated unit", () => {
  const report = auditTexts("The package weighs 12 kg.", "The package weighs 12 lb.");

  assert.equal(report.ok, false);
  assert.deepEqual(report.checks.numbers.missing, ["12 kg"]);
  assert.deepEqual(report.checks.numbers.added, ["12 lb"]);
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

// Mutation caught: discarding a user-frozen string because it partially overlaps a wider syntax span.
test("audit preserves user-frozen values independently of syntax overlap", () => {
  const report = auditTexts(
    "Run `npm test` today.",
    "Run `npm test` tomorrow.",
    { protectedValues: ["npm test` today"] }
  );

  assert.equal(report.ok, false);
  assert.deepEqual(report.checks.protected.userFrozen.missing.values, ["npm test` today"]);
});

// Mutation caught: requiring duplicate manifest entries to consume distinct text occurrences.
test("audit accepts unchanged duplicate user-frozen values", () => {
  const report = auditTexts("Keep Acme.", "Keep Acme.", { protectedValues: ["Acme", "Acme"] });

  assert.equal(report.ok, true);
  assert.equal(report.checks.protected.userFrozen.order.ok, true);
});

// Mutation caught: requiring distinct overlaps to be disjoint or skipping repeated self-overlaps.
test("audit handles overlapping user-frozen values and occurrences", () => {
  const text = "Run `npm test` today.";
  const report = auditTexts(text, text, { protectedValues: ["npm test", "test` today"] });
  const repeated = auditTexts("Keep banana.", "Keep bana.", { protectedValues: ["ana"] });
  assert.equal(report.ok, true);
  assert.equal(report.checks.protected.userFrozen.order.ok, true);
  assert.equal(repeated.ok, false);
  assert.deepEqual(repeated.checks.protected.userFrozen.count.missing, ["ana"]);
});

// Mutation caught: omitting literal frontmatter comparison and accepting a changed document header.
test("audit rejects changed frontmatter", () => {
  const report = auditTexts("---\ntitle: Alpha\n---\nBody.", "---\ntitle: Beta\n---\nBody.");

  assert.equal(report.ok, false);
  assert.equal(report.checks.structure.frontmatter.ok, false);
});

// Mutation caught: requiring frontmatter content and accepting deletion of a valid empty frontmatter block.
test("audit rejects removal of empty frontmatter", () => {
  const report = auditTexts("---\n---\nBody.\n", "Body.\n");

  assert.equal(report.ok, false);
  assert.equal(report.checks.structure.frontmatter.ok, false);
});

// Mutation caught: treating headings as an unordered set and accepting a reordered hierarchy.
test("audit rejects reordered heading levels and text", () => {
  const report = auditTexts("# Start\n\n## Details\n", "## Details\n\n# Start\n");

  assert.equal(report.ok, false);
  assert.equal(report.checks.structure.headings.ok, false);
});

// Mutation caught: recognizing only ATX headings and accepting deletion of a Setext heading.
test("audit rejects removal of a Setext heading", () => {
  const report = auditTexts("Release notes\n=============\n\nBody.\n", "Body.\n");

  assert.equal(report.ok, false);
  assert.equal(report.checks.structure.headings.ok, false);
});

// Mutation caught: checking fenced-code values without their count and accepting an added block.
test("audit rejects a changed fenced-code block count", () => {
  const report = auditTexts(
    "```sh\nrun alpha\n```\n",
    "```sh\nrun alpha\n```\n\n```sh\nrun beta\n```\n"
  );

  assert.equal(report.ok, false);
  assert.equal(report.checks.structure.fences.ok, false);
});

// Mutation caught: requiring a closing fence to equal the opener instead of accepting a longer valid closer.
test("audit rejects removal of a fenced block with a longer closing fence", () => {
  const report = auditTexts("```sh\nrun alpha\n````\n", "Body.\n");

  assert.equal(report.ok, false);
  assert.equal(report.checks.structure.fences.ok, false);
});

// Mutation caught: ignoring a valid fenced-code block whose content extends to end of file.
test("audit rejects changed code in an unclosed EOF fence", () => {
  const report = auditTexts("```js\nconst mode = safe;", "```js\nconst mode = fast;");

  assert.equal(report.ok, false);
  assert.equal(report.checks.structure.fences.ok, false);
});

// Mutation caught: stopping a Markdown destination at its first closing parenthesis.
test("audit rejects a removed delimiter from a balanced-parentheses link", () => {
  const report = auditTexts(
    "See [guide](https://example.test/a_(b)).",
    "See [guide](https://example.test/a_(b)."
  );

  assert.equal(report.ok, false);
  assert.deepEqual(report.checks.protected.missing.values, ["[guide](https://example.test/a_(b))"]);
});

// Mutation caught: treating a Markdown image as the same protected value as a link with the same label and destination.
test("audit rejects changing a Markdown image into a link", () => {
  const report = auditTexts(
    "See ![release diagram](https://example.test/release.png).",
    "See [release diagram](https://example.test/release.png)."
  );

  assert.equal(report.ok, false);
  assert.deepEqual(report.checks.protected.missing.values, ["![release diagram](https://example.test/release.png)"]);
});

// Mutation caught: protecting a citation year alone while allowing its author or reference-style link identity to change.
test("audit rejects changed author-year citations and reference-style links", () => {
  const report = auditTexts(
    "Smith (2024) documents the result in [the study][smith-2024].\n\n[smith-2024]: https://example.test/study\n",
    "Jones (2024) documents the result in [the study][jones-2024].\n\n[jones-2024]: https://example.test/study\n"
  );

  assert.equal(report.ok, false);
  assert.ok(report.checks.protected.missing.values.includes("Smith (2024)"));
  assert.ok(report.checks.protected.missing.values.includes("[the study][smith-2024]"));
});

// Mutation caught: preserving only the blockquote marker while allowing quoted content to be rewritten.
test("audit rejects changed Markdown blockquote content", () => {
  const report = auditTexts("> Do not deploy.\n", "> Deploy.\n");

  assert.equal(report.ok, false);
  assert.deepEqual(report.checks.protected.missing.values, ["> Do not deploy."]);
});

// Mutation caught: omitting supported quotation forms from exact protected-span comparison.
test("audit preserves supported quotation forms without freezing surrounding prose", () => {
  const source = "In conclusion, \"hold\", 'wait', “pause”, ‘Do not deploy.’, «attendre», 「待つ」, and 『止まる』 are explicit.";
  const rewritten = "\"hold\", 'wait', “pause”, ‘Do not deploy.’, «attendre», 「待つ」, and 『止まる』 are explicit.";
  const unchanged = auditTexts(source, rewritten);
  const changed = auditTexts(source, "\"hold\", 'wait', “pause”, ‘Deploy now.’, «attendre», 「待つ」, and 『止まる』 are explicit.");

  assert.equal(unchanged.ok, true);
  assert.equal(changed.ok, false);
  assert.deepEqual(extractProtectedSpans(source).filter((span) => span.type === "quotation").map((span) => span.value), ["\"hold\"", "'wait'", "“pause”", "‘Do not deploy.’", "«attendre»", "「待つ」", "『止まる』"]);
  assert.ok(changed.checks.protected.missing.values.includes("‘Do not deploy.’"));
});

// Mutation caught: tokenizing locale-formatted quantities into separate digits and accepting punctuation loss.
test("audit preserves locale-formatted quantities while allowing prose rewrites", () => {
  const source = "In conclusion, Version 1,5 kg. Total: 1.234,56 €.";
  const rewritten = "Version 1,5 kg. Total: 1.234,56 €.";
  const corrupted = "Version 1 5 kg. Total: 1 234,56 €.";
  const unchanged = auditTexts(source, rewritten);
  const changed = auditTexts(source, corrupted);

  assert.equal(unchanged.ok, true);
  assert.equal(changed.ok, false);
  assert.ok(changed.checks.numbers.missing.includes("1,5 kg"));
  assert.ok(changed.checks.numbers.missing.includes("1.234,56 €"));
});

// Mutation caught: treating a shortcut reference as ordinary bracketed prose despite its matching definition.
test("audit preserves shortcut reference links while allowing prose rewrites", () => {
  const source = "Opening: [the study].\n\n[the study]: https://example.test/study\n";
  assert.equal(auditTexts(source, "See [the study] here.\n\n[the study]: https://example.test/study\n").ok, true);
  assert.equal(auditTexts(source, "See the study here.\n\n[the study]: https://example.test/study\n").ok, false);
  assert.ok(extractProtectedSpans(source).some((span) => span.type === "markdown-shortcut-reference" && span.value === "[the study]"));
});

// Mutation caught: treating a shortcut image reference as unprotected despite its matching definition.
test("audit preserves shortcut reference images while allowing prose rewrites", () => {
  const source = "![diagram]\n\n[diagram]: image.png\n";
  assert.equal(auditTexts(source, "Diagram: ![diagram]\n\n[diagram]: image.png\n").ok, true);
  assert.equal(auditTexts(source, "Diagram omitted.\n\n[diagram]: image.png\n").ok, false);
  assert.ok(extractProtectedSpans(source).some((span) => span.type === "markdown-shortcut-image" && span.value === "![diagram]"));
});

// Mutation caught: accepting a changed author in a multi-author parenthetical citation.
test("audit preserves multi-author author-year citations while allowing prose rewrites", () => {
  const citation = "(Smith, Jones, & Brown, 2024)", source = `The evidence is ${citation}.`;
  assert.equal(auditTexts(source, `Evidence: ${citation}.`).ok, true);
  assert.equal(auditTexts(source, "The evidence is (Smith, Jones, & Green, 2024).").ok, false);
  assert.ok(extractProtectedSpans(source).some((span) => span.value === citation));
});

// Mutation caught: accepting a changed author in a semicolon-separated author-year citation.
test("audit preserves multi-citation author-year forms while allowing prose rewrites", () => {
  const citation = "(Smith, 2024; Jones, 2023)", source = `The evidence is ${citation}.`;
  assert.equal(auditTexts(source, `Evidence: ${citation}.`).ok, true);
  assert.equal(auditTexts(source, "The evidence is (Smith, 2024; Green, 2023).").ok, false);
  assert.ok(extractProtectedSpans(source).some((span) => span.value === citation));
});

// Mutation caught: preserving only the marked line of a blockquote and not its lazy continuation.
test("audit preserves lazy blockquote continuations while allowing prose rewrites", () => {
  const quote = "> Do not deploy.\nThis remains part of the quote.", source = `${quote}\n\nClosing.`;
  assert.equal(auditTexts(source, `Intro.\n${quote}\n\nRevised closing.`).ok, true);
  assert.equal(auditTexts(source, "> Do not deploy.\nThis is changed.\n\nClosing.").ok, false);
  assert.ok(extractProtectedSpans(source).some((span) => span.type === "blockquote" && span.value === quote));
});

// Mutation caught: allowing a blockquote's lazy span to consume prose after a thematic-break boundary.
test("audit stops lazy blockquotes at thematic breaks", () => {
  const source = "> Keep this.\n---\nClosing prose.";
  assert.equal(auditTexts(source, "> Keep this.\n---\nRevised closing prose.").ok, true);
  assert.equal(auditTexts(source, "> Change this.\n---\nClosing prose.").ok, false);
  assert.ok(extractProtectedSpans(source).some((span) => span.type === "blockquote" && span.value === "> Keep this."));
  assert.equal(auditTexts("> Keep this.\n---not a break", "> Keep this.\n---changed").ok, false);
});

// Mutation caught: omitting German low-high quotation marks from protected quoted material.
test("audit preserves German quotations while allowing prose rewrites", () => {
  const quotation = "„Nicht bereit“", source = `She said ${quotation}.`;
  assert.equal(auditTexts(source, `The note says ${quotation}.`).ok, true);
  assert.equal(auditTexts(source, "She said „Bereit“.").ok, false);
  assert.ok(extractProtectedSpans(source).some((span) => span.type === "quotation" && span.value === quotation));
});

// Mutation caught: splitting a narrow-no-break-space grouped locale quantity into an ungrouped number.
test("audit preserves narrow-no-break-space quantities while allowing prose rewrites", () => {
  const quantity = "1\u202F234,56 €", source = `Total: ${quantity}.`;
  assert.equal(auditTexts(source, `The total is ${quantity}.`).ok, true);
  assert.equal(auditTexts(source, "Total: 1234,56 €.").ok, false);
  assert.ok(extractProtectedSpans(source).some((span) => span.type === "number" && span.value === quantity));
});

// Mutation caught: splitting an ordinary-no-break-space grouped locale quantity into an ungrouped number.
test("audit preserves ordinary-no-break-space quantities while allowing prose rewrites", () => {
  const quantity = "12\u00A0345,67 €", source = `Total: ${quantity}.`;
  assert.equal(auditTexts(source, `The total is ${quantity}.`).ok, true);
  assert.equal(auditTexts(source, "Total: 12 345,67 €.").ok, false);
  assert.ok(extractProtectedSpans(source).some((span) => span.type === "number" && span.value === quantity));
});

// Mutation caught: allowing a prefix currency symbol to change while its numeric value stays the same.
test("audit preserves prefix currency quantities while allowing prose rewrites", () => {
  const quantity = "€1,234.56", source = `The service costs ${quantity}.`;
  assert.equal(auditTexts(source, `Price: ${quantity}.`).ok, true);
  assert.equal(auditTexts(source, "The service costs $1,234.56.").ok, false);
  assert.ok(extractProtectedSpans(source).some((span) => span.type === "number" && span.value === quantity));
});

// Mutation caught: ignoring Markdown table row and column signatures.
test("audit rejects a changed table shape", () => {
  const report = auditTexts(
    "| Name | State |\n| --- | --- |\n| Alpha | Ready |\n",
    "| Name | State | Owner |\n| --- | --- | --- |\n| Alpha | Ready | Lee |\n"
  );

  assert.equal(report.ok, false);
  assert.equal(report.checks.structure.tables.ok, false);
});

// Mutation caught: recognizing only outer-pipe tables and accepting deletion of a standard pipe-delimited table.
test("audit rejects removal of a table without outer pipes", () => {
  const report = auditTexts("Name | State\n--- | ---\nAlpha | Ready\n", "Body.\n");
  assert.equal(report.ok, false);
  assert.equal(report.checks.structure.tables.ok, false);
});
test("audit rejects removed list structure and changed task state", () => {
  const removed = auditTexts("- First action\n- Second action\n", "First action. Second action.\n");
  const completed = auditTexts("- [ ] Review before release\n", "- [x] Review before release\n"); assert.equal(removed.checks.structure.lists.ok, false);
  assert.equal(completed.checks.structure.lists.ok, false);
});
// Mutation caught: allowing a source placeholder-shaped literal to share a run tag with generated placeholders.
test("audit reports a source placeholder collision", () => {
  const text = "Keep ⟦SIS:a1:path:1⟧ unchanged.";
  const report = auditTexts(text, text);

  assert.equal(report.ok, false);
  assert.deepEqual(report.checks.placeholders.sourceCollisions, ["⟦SIS:a1:path:1⟧"]);
  assert.match(report.problems[0].message, /different run tag/);
});

// Mutation caught: recognizing only fully valid placeholders and accepting mutated sentinel residue.
test("audit rejects malformed SIS sentinel residue", () => {
  const report = auditTexts("Use the runbook.", "Use ⟦SIS:tag:path:x⟧.");

  assert.equal(report.ok, false);
  assert.equal(report.checks.placeholders.ok, false);
  assert.deepEqual(report.checks.placeholders.unresolved, ["⟦SIS:tag:path:x⟧"]);
  assert.deepEqual(report.checks.placeholders.malformed, ["⟦SIS:tag:path:x⟧"]);
});

// Mutation caught: failing warnings as hard errors or omitting the required character-rate metrics.
test("audit reports large shrinkage as a non-blocking warning", () => {
  const report = auditTexts("abcdefghij", "abc");

  assert.equal(report.ok, true);
  assert.deepEqual(report.metrics, {
    sourceCharacters: 10,
    finalCharacters: 3,
    lengthDeltaRate: -0.7,
    shrinkageRate: 0.7
  });
  assert.equal(report.warnings[0].check, "metrics.shrinkage");
});

// Mutation caught: using the shrinkage threshold for expansion or accepting an expansion without a warning.
test("audit reports large expansion as a non-blocking warning", () => {
  const report = auditTexts("abc", "abcdef");

  assert.equal(report.ok, true);
  assert.equal(report.metrics.lengthDeltaRate, 1);
  assert.equal(report.metrics.shrinkageRate, 0);
  assert.equal(report.warnings[0].check, "metrics.expansion");
});

// Mutation caught: returning success after leaving a generated protected-span placeholder in the final text.
test("CLI writes a failing report for unresolved placeholders", async (t) => {
  const files = await writeCase(t, "Use the runbook.", "Use ⟦SIS:a1:path:1⟧.");
  const result = spawnSync(process.execPath, [script, "--source", files.source, "--final", files.final, "--report", files.report], { encoding: "utf8" });

  assert.equal(result.status, 1);
  const report = JSON.parse(await readFile(files.report, "utf8"));
  assert.equal(report.checks.placeholders.ok, false);
  assert.deepEqual(report.checks.placeholders.unresolved, ["⟦SIS:a1:path:1⟧"]);
});

// Mutation caught: accepting a legacy array manifest instead of the required { values: [string] } contract.
test("CLI writes a failing report for a malformed protected manifest", async (t) => {
  const files = await writeCase(t, "Use the runbook.", "Use the runbook.", '["runbook"]');
  const result = spawnSync(process.execPath, [script, "--source", files.source, "--final", files.final, "--report", files.report, "--protected", files.protected], { encoding: "utf8" });

  assert.equal(result.status, 1);
  const report = JSON.parse(await readFile(files.report, "utf8"));
  assert.equal(report.ok, false);
  assert.equal(report.problems[0].check, "cli.protected-manifest");
});

// Mutation caught: accepting an otherwise-valid manifest with unsupported fields instead of the exact manifest shape.
test("CLI rejects a protected manifest with extra fields", async (t) => {
  const files = await writeCase(t, "Use the runbook.", "Use the runbook.", '{"values":["runbook"],"mode":"legacy"}');
  const result = spawnSync(process.execPath, [script, "--source", files.source, "--final", files.final, "--report", files.report, "--protected", files.protected], { encoding: "utf8" });

  assert.equal(result.status, 1);
  const report = JSON.parse(await readFile(files.report, "utf8"));
  assert.equal(report.problems[0].check, "cli.protected-manifest");
});

// Mutation caught: exiting without a report when the named input path cannot be read.
test("CLI writes a failing report for an unreadable source file", async (t) => {
  const files = await writeCase(t, "unused", "Use the runbook.");
  const missingSource = join(fileURLToPath(new URL(".", import.meta.url)), "missing-source.md");
  const result = spawnSync(process.execPath, [script, "--source", missingSource, "--final", files.final, "--report", files.report], { encoding: "utf8" });

  assert.equal(result.status, 1);
  const report = JSON.parse(await readFile(files.report, "utf8"));
  assert.equal(report.ok, false);
  assert.equal(report.problems[0].check, "cli.source.read");
});

// Mutation caught: treating a warning-only report as a failing CLI process.
test("CLI exits zero after writing a warning-only report", async (t) => {
  const files = await writeCase(t, "abcdefghij", "abc");
  const result = spawnSync(process.execPath, [script, "--source", files.source, "--final", files.final, "--report", files.report], { encoding: "utf8" });

  assert.equal(result.status, 0);
  const report = JSON.parse(await readFile(files.report, "utf8"));
  assert.equal(report.ok, true);
  assert.equal(report.warnings[0].check, "metrics.shrinkage");
});

// Mutation caught: classifying malformed arguments as a readable audit failure instead of a usage error.
test("CLI exits two for malformed arguments", () => {
  const result = spawnSync(process.execPath, [script, "--source"], { encoding: "utf8" });

  assert.equal(result.status, 2);
  assert.match(result.stderr, /Usage:/);
});

// Mutation caught: exiting two before writing a concrete report when otherwise-valid paths accompany an unknown or duplicate flag.
test("CLI writes an argument report for malformed flags when a report path is available", async (t) => {
  const files = await writeCase(t, "Use the runbook.", "Use the runbook.");
  const cases = [
    ["--unknown", "value"],
    ["--source", files.source]
  ];

  for (const extra of cases) {
    const result = spawnSync(process.execPath, [script, "--source", files.source, "--final", files.final, "--report", files.report, ...extra], { encoding: "utf8" });
    assert.equal(result.status, 2);
    const report = JSON.parse(await readFile(files.report, "utf8"));
    assert.equal(report.ok, false);
    assert.equal(report.problems[0].check, "cli.arguments");
  }
});
