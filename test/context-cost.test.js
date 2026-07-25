import assert from "node:assert/strict";
import test from "node:test";
import { appendContextCost, formatMeasuredAdditionalContext, measureContext } from "../src/context-cost.js";

test("context measurement counts Unicode code points and UTF-8 bytes", () => {
  const value = "루피🙂";
  const result = measureContext(value);
  assert.equal(result.characters, 3);
  assert.equal(result.utf8Bytes, Buffer.byteLength(value, "utf8"));
  assert.equal(result.estimator, "mixed-v1");
  assert.ok(result.estimatedTokens > 0);
});

test("measured additional context describes the final emitted text", () => {
  const output = JSON.parse(formatMeasuredAdditionalContext("UserPromptSubmit", "body"));
  const context = output.hookSpecificOutput.additionalContext;
  const measured = measureContext(context);
  assert.match(context, new RegExp(`${measured.characters.toLocaleString("en-US")} chars`, "u"));
  assert.match(context, new RegExp(`${measured.utf8Bytes.toLocaleString("en-US")} UTF-8 bytes`, "u"));
});

test("empty context remains empty", () => {
  assert.equal(appendContextCost(""), "");
  assert.equal(formatMeasuredAdditionalContext("SessionStart", ""), "");
});
