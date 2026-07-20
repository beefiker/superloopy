import assert from "node:assert/strict";
import test from "node:test";

import { parseDesignTokens, scanContent } from "../skills/superloopy-frontend/scripts/ds-compliance.mjs";

const DESIGN = [
  "# DESIGN.md",
  "## Color",
  "- `#2563EB` `--primary`",
  "- `#0F1729` `--fg`",
  "- `#6617212B` `--scrim`",
  "- `#abcd` `--compact-alpha`",
  "## Spacing",
  "- base 4px scale",
].join("\n");

test("parseDesignTokens collects declared colors (normalized) and the base unit", () => {
  const t = parseDesignTokens(DESIGN);
  assert.equal(t.base, 4);
  assert.equal(t.colors.has("#2563eb"), true);
  assert.equal(t.colors.has("#0f1729"), true);
  assert.equal(t.colors.has("#6617212b"), true);
  assert.equal(t.colors.has("#aabbccdd"), true);
});

test("scanContent flags undeclared hex and off-scale spacing, not on-system values", () => {
  const t = parseDesignTokens(DESIGN);
  const css = [
    ".a { color: #2563EB; padding: 16px; }",   // both fine
    ".b { background: #ff0000; }",               // undeclared color
    ".c { margin: 13px; }",                      // off-scale spacing
    ".d { border: 1px solid #0f1729; gap: 0; }", // 1px + 0 allowed, color declared
  ].join("\n");
  const v = scanContent(css, t, "x.css");
  const colors = v.filter((x) => x.kind === "undeclared-color");
  const spacing = v.filter((x) => x.kind === "off-scale-spacing");
  assert.equal(colors.length, 1);
  assert.equal(colors[0].value, "#ff0000");
  assert.equal(colors[0].line, 2);
  assert.equal(spacing.length, 1);
  assert.equal(spacing[0].value, "13px");
  assert.equal(spacing[0].line, 3);
});

test("a fully on-system file yields zero violations", () => {
  const t = parseDesignTokens(DESIGN);
  const css = ".ok { color: #2563eb; background: #6617212B; outline-color: #ABCD; padding: 8px 16px; margin: -24px; border: 1px solid #0F1729; }";
  assert.deepEqual(scanContent(css, t, "ok.css"), []);
});

test("scanner handles alpha hex plus fractional and negative spacing without partial matches", () => {
  const t = parseDesignTokens(DESIGN);
  const css = [
    ".a { color: #12345678; }",
    ".b { margin: -3px; gap: 0.5px; padding: -8px; }",
  ].join("\n");
  const violations = scanContent(css, t, "alpha.css");

  assert.deepEqual(
    violations.map(({ kind, value, line }) => ({ kind, value, line })),
    [
      { kind: "undeclared-color", value: "#12345678", line: 1 },
      { kind: "off-scale-spacing", value: "-3px", line: 2 },
      { kind: "off-scale-spacing", value: "0.5px", line: 2 },
    ],
  );
});

test("spacing scan matches exact CSS properties without treating border sides as spacing", () => {
  const t = parseDesignTokens(DESIGN);
  const css = [
    ".frame { border-top: 2px solid #2563EB; border-left-width: 3px; outline-offset: 5px; }",
    ".panel { padding-inline-start: 3px; scroll-margin-block: 6px; }",
  ].join("\n");
  const spacing = scanContent(css, t, "exact.css")
    .filter((entry) => entry.kind === "off-scale-spacing");

  assert.deepEqual(
    spacing.map(({ value, line }) => ({ value, line })),
    [
      { value: "3px", line: 2 },
      { value: "6px", line: 2 },
    ],
  );
});

test("spacing scan covers multiline declarations and reports the value line", () => {
  const t = parseDesignTokens(DESIGN);
  const css = [
    ".panel {",
    "  padding:",
    "    3px 8px;",
    "  margin-block:",
    "    -5px;",
    "}",
  ].join("\n");
  const spacing = scanContent(css, t, "multiline.css")
    .filter((entry) => entry.kind === "off-scale-spacing");

  assert.deepEqual(
    spacing.map(({ value, line }) => ({ value, line })),
    [
      { value: "3px", line: 3 },
      { value: "-5px", line: 5 },
    ],
  );
});
