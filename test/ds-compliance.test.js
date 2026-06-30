import assert from "node:assert/strict";
import test from "node:test";

import { parseDesignTokens, scanContent } from "../skills/superloopy-frontend/scripts/ds-compliance.mjs";

const DESIGN = [
  "# DESIGN.md",
  "## Color",
  "- `#2563EB` `--primary`",
  "- `#0F1729` `--fg`",
  "## Spacing",
  "- base 4px scale",
].join("\n");

test("parseDesignTokens collects declared colors (normalized) and the base unit", () => {
  const t = parseDesignTokens(DESIGN);
  assert.equal(t.base, 4);
  assert.equal(t.colors.has("#2563eb"), true);
  assert.equal(t.colors.has("#0f1729"), true);
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
  const css = ".ok { color: #2563eb; padding: 8px 16px; margin: 24px; border: 1px solid #0F1729; }";
  assert.deepEqual(scanContent(css, t, "ok.css"), []);
});
