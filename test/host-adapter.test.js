import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { auditReceiptFromPayload, normalizeAgentType, receiptFromPayload } from "../src/receipt.js";
import { bootstrapSuperloopy, isClaudeHost } from "../src/agents.js";

async function transcript(lines) {
  const dir = await mkdtemp(join(tmpdir(), "superloopy-receipt-"));
  const path = join(dir, "transcript.jsonl");
  await writeFile(path, lines.join("\n"), "utf8");
  return path;
}

test("receiptFromPayload reads last_assistant_message directly (Codex path)", () => {
  const r = receiptFromPayload({ last_assistant_message: "done\nSUPERLOOPY_EVIDENCE: .superloopy/evidence/a.md" });
  assert.equal(r, ".superloopy/evidence/a.md");
});

test("receiptFromPayload reads the subagent's FINAL assistant message on the Claude path", async () => {
  const path = await transcript([
    JSON.stringify({ role: "assistant", content: "SUPERLOOPY_EVIDENCE: .superloopy/evidence/old.md" }),
    JSON.stringify({ role: "user", content: "retry" }),
    JSON.stringify({ role: "assistant", content: "done\nSUPERLOOPY_EVIDENCE: .superloopy/evidence/final.md" })
  ]);
  const r = receiptFromPayload({ agent_transcript_path: path }); // no last_assistant_message
  assert.equal(r, ".superloopy/evidence/final.md");
});

test("receiptFromPayload keeps the path clean when a newline follows the receipt (Claude JSONL escapes it) [regression]", async () => {
  // Claude stores transcript text JSON-escaped, so a worker that ends its message with the receipt
  // line + newline writes `\` + `n`. Realistic Claude record: message.content is an array of blocks.
  const path = await transcript([
    JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "All done.\nSUPERLOOPY_EVIDENCE: .superloopy/evidence/report.md\n" }] } })
  ]);
  assert.equal(receiptFromPayload({ transcript_path: path }), ".superloopy/evidence/report.md");
});

test("receiptFromPayload keeps the path clean when prose follows the receipt (Claude) [regression]", async () => {
  const path = await transcript([
    JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "SUPERLOOPY_EVIDENCE: .superloopy/evidence/report.md\nThanks!" }] } })
  ]);
  assert.equal(receiptFromPayload({ transcript_path: path }), ".superloopy/evidence/report.md");
});

test("receiptFromPayload trusts last_assistant_message exclusively; a stale transcript token cannot satisfy the stop (Codex) [regression]", async () => {
  // Codex provides last_assistant_message. When THIS attempt's final message carries no receipt,
  // the stop must NOT be satisfied by an older token lingering in the transcript tail.
  const path = await transcript([
    JSON.stringify({ role: "assistant", content: "SUPERLOOPY_EVIDENCE: .superloopy/evidence/old-attempt.md" })
  ]);
  assert.equal(
    receiptFromPayload({ last_assistant_message: "I could not finish; no receipt this attempt.", transcript_path: path }),
    null
  );
});

test("receiptFromPayload ignores an earlier turn's receipt on Claude when the final message has none [regression]", async () => {
  const path = await transcript([
    JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "SUPERLOOPY_EVIDENCE: .superloopy/evidence/old.md" }] } }),
    JSON.stringify({ type: "user", message: { role: "user", content: [{ type: "tool_result", content: "ok" }] } }),
    JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "I still could not produce evidence." }] } })
  ]);
  assert.equal(receiptFromPayload({ transcript_path: path }), null);
});

test("auditReceiptFromPayload keeps the path clean with a trailing newline on the Claude path [regression]", async () => {
  const path = await transcript([
    JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "SUPERLOOPY_AUDIT: .superloopy/evidence/audit/v.json\n" }] } })
  ]);
  assert.equal(auditReceiptFromPayload({ transcript_path: path }), ".superloopy/evidence/audit/v.json");
});

test("receiptFromPayload fails closed (null) when the final message exceeds the 64KB tail window, never accepting a stale token [regression]", async () => {
  // The final record is one JSON line larger than the tail window, so readTranscriptTail returns a
  // fragment that starts mid-record and never parses. The code must NOT fall back to scanning the raw
  // tail (which would pick the stale earlier token); it returns null and the worker is re-prompted.
  const huge = "X".repeat(70000);
  const path = await transcript([
    JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "SUPERLOOPY_EVIDENCE: .superloopy/evidence/stale.md" }] } }),
    JSON.stringify({ type: "user", message: { role: "user", content: [{ type: "tool_result", content: "ok" }] } }),
    JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: `${huge}\nSUPERLOOPY_EVIDENCE: .superloopy/evidence/big.md\n` }] } })
  ]);
  assert.equal(receiptFromPayload({ transcript_path: path }), null);
});

test("receiptFromPayload extracts the receipt from a mixed text+tool_use final record [regression]", async () => {
  const path = await transcript([
    JSON.stringify({ type: "assistant", message: { role: "assistant", content: [
      { type: "text", text: "Recorded.\nSUPERLOOPY_EVIDENCE: .superloopy/evidence/mixed.md" },
      { type: "tool_use", name: "Bash", input: {} }
    ] } })
  ]);
  assert.equal(receiptFromPayload({ transcript_path: path }), ".superloopy/evidence/mixed.md");
});

test("receiptFromPayload recovers a receipt when a closing line follows it as a separate record in the same turn [regression]", async () => {
  const path = await transcript([
    JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "SUPERLOOPY_EVIDENCE: .superloopy/evidence/split.md" }] } }),
    JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "Done — total cost 1234 tokens." }] } })
  ]);
  assert.equal(receiptFromPayload({ transcript_path: path }), ".superloopy/evidence/split.md");
});

test("receiptFromPayload fails closed on a partial (mid-write) final line, never reaching a prior turn's receipt [regression]", async () => {
  const dir = await mkdtemp(join(tmpdir(), "superloopy-receipt-"));
  const path = join(dir, "transcript.jsonl");
  const good = JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "SUPERLOOPY_EVIDENCE: .superloopy/evidence/stale.md" }] } });
  const partial = '{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"still writin'; // truncated, invalid JSON
  await writeFile(path, `${good}\n${partial}`, "utf8");
  assert.equal(receiptFromPayload({ transcript_path: path }), null);
});

test("receiptFromPayload picks the same (first) token on both hosts for identical final output [regression]", async () => {
  const finalText = "SUPERLOOPY_EVIDENCE: .superloopy/evidence/a.md then SUPERLOOPY_EVIDENCE: .superloopy/evidence/b.md";
  const codex = receiptFromPayload({ last_assistant_message: finalText });
  const path = await transcript([
    JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: finalText }] } })
  ]);
  assert.equal(codex, ".superloopy/evidence/a.md"); // first token, matching main's original Codex behavior
  assert.equal(receiptFromPayload({ transcript_path: path }), codex); // host parity: first token on both
});

test("receiptFromPayload captures a path containing brackets/quotes whole, matching main's \\S+ behavior [regression]", () => {
  // The capture must not narrow below main's \S+, or paths with brackets/quotes get truncated.
  assert.equal(
    receiptFromPayload({ last_assistant_message: "EVIDENCE_RECORDED: .superloopy/evidence/run(1).md" }),
    ".superloopy/evidence/run(1).md"
  );
});

test("receiptFromPayload treats an empty last_assistant_message as absent and falls back to the transcript [regression]", async () => {
  const path = await transcript([
    JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "SUPERLOOPY_EVIDENCE: .superloopy/evidence/fromtx.md" }] } })
  ]);
  assert.equal(receiptFromPayload({ last_assistant_message: "   ", transcript_path: path }), ".superloopy/evidence/fromtx.md");
});

test("receiptFromPayload preserves a backslash in the receipt path on the plain-text path [regression]", () => {
  // The direct/decoded path must not truncate a token that legitimately contains a backslash
  // (Windows / non-normalized path); backslash exclusion is confined to the raw JSON-escaped fallback.
  const r = receiptFromPayload({ last_assistant_message: "SUPERLOOPY_EVIDENCE: C:\\evidence\\report.md" });
  assert.equal(r, "C:\\evidence\\report.md");
});

test("receiptFromPayload accepts the EVIDENCE_RECORDED compatibility alias", () => {
  const r = receiptFromPayload({ last_assistant_message: "EVIDENCE_RECORDED: .superloopy/evidence/b.md" });
  assert.equal(r, ".superloopy/evidence/b.md");
});

test("receiptFromPayload uses transcript_path when agent_transcript_path is absent", async () => {
  const path = await transcript([JSON.stringify({ role: "assistant", content: "SUPERLOOPY_EVIDENCE: .superloopy/evidence/c.md" })]);
  assert.equal(receiptFromPayload({ transcript_path: path }), ".superloopy/evidence/c.md");
});

test("receiptFromPayload returns null when no receipt is anywhere (gate stays unsatisfied)", async () => {
  const path = await transcript([JSON.stringify({ role: "assistant", content: "no receipt here" })]);
  assert.equal(receiptFromPayload({ agent_transcript_path: path }), null);
  assert.equal(receiptFromPayload({}), null);
});

test("auditReceiptFromPayload mirrors the same direct/transcript fallback for SUPERLOOPY_AUDIT", async () => {
  assert.equal(
    auditReceiptFromPayload({ last_assistant_message: "SUPERLOOPY_AUDIT: .superloopy/evidence/audit/v.json" }),
    ".superloopy/evidence/audit/v.json"
  );
  const path = await transcript([
    JSON.stringify({ role: "assistant", content: "SUPERLOOPY_AUDIT: .superloopy/evidence/audit/v2.json" })
  ]);
  assert.equal(auditReceiptFromPayload({ agent_transcript_path: path }), ".superloopy/evidence/audit/v2.json");
});

test("normalizeAgentType strips a host namespace so SubagentStop matchers fire on both hosts", () => {
  assert.equal(normalizeAgentType("franky"), "franky"); // Codex bare
  assert.equal(normalizeAgentType("superloopy:franky"), "franky"); // Claude plugin-namespaced
  assert.equal(normalizeAgentType("robin"), "robin");
  assert.equal(normalizeAgentType(undefined), undefined);
});

test("bootstrapSuperloopy is a clean no-op on Claude Code (no ~/.codex install)", async () => {
  const home = await mkdtemp(join(tmpdir(), "superloopy-claude-home-"));
  assert.equal(isClaudeHost({ CLAUDE_PLUGIN_ROOT: "/plugins/superloopy" }), true);
  assert.equal(isClaudeHost({}), false);
  const result = await bootstrapSuperloopy(process.cwd(), [], { env: { CLAUDE_PLUGIN_ROOT: "/plugins/superloopy" }, homeDir: home });
  assert.equal(result.host, "claude");
  assert.equal(result.ok, true);
  assert.deepEqual(result.agents.agents, []);
});
