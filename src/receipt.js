// Host-agnostic receipt recovery for SubagentStop handlers.
//
// Codex puts the worker's final text in `last_assistant_message`; Claude Code omits it but provides
// the subagent's transcript. When the direct field carries content we trust it EXCLUSIVELY (a stale
// token elsewhere must never satisfy THIS stop); otherwise we scan the DECODED text of the worker's
// FINAL TURN in the transcript — the trailing assistant records after the last user/tool-result
// record. Decoding turns an escaped newline back into real whitespace so the path capture is clean,
// and bounding the scan to the final turn keeps a receipt from an earlier attempt out. Both paths
// take the FIRST token (matching the original Codex behavior so that path is unchanged), so the two
// hosts agree. On a miss the caller blocks/retries and the deterministic completion floor still
// gates the loop, exactly as the host contract states.

import { readTranscriptTail } from "./continuation.js";
import { SUPERLOOPY_AGENT_NAMES } from "./agent-names.js";

// Capture the path as any run of non-whitespace, matching the original Codex behavior exactly. Both
// sources we scan are plain text (the Codex direct field, or the DECODED transcript text where an
// escaped newline is already a real whitespace char), so there is no JSON quoting to exclude and no
// need to narrow the class — narrowing would truncate legitimate paths containing quotes/brackets.
const EVIDENCE = /(?:EVIDENCE_RECORDED|SUPERLOOPY_EVIDENCE):\s*(\S+)/u;
const AUDIT = /SUPERLOOPY_AUDIT:\s*(\S+)/u;

// Claude SubagentStop carries the subagent's own transcript separately; prefer it so the fallback
// reads THIS worker's final turn, not a sibling's. Codex uses transcript_path. Exported so the
// hooks' context-pressure guard reads the SAME transcript this receipt recovery does.
export function subagentTranscriptPath(payload) {
  return payload?.agent_transcript_path ?? payload?.transcript_path;
}

function firstMatch(text, regex) {
  if (typeof text !== "string") return null;
  return text.match(regex)?.[1] ?? null;
}

export function receiptFromPayload(payload) {
  return recoverReceipt(payload, EVIDENCE);
}

export function auditReceiptFromPayload(payload) {
  return recoverReceipt(payload, AUDIT);
}

function recoverReceipt(payload, regex) {
  const direct = payload?.last_assistant_message;
  // A present, non-empty direct field is the worker's final message verbatim (Codex): trust it
  // exclusively. An empty/whitespace-only value means the host gave us nothing here, so fall back to
  // the transcript rather than suppressing recovery.
  if (typeof direct === "string" && direct.trim().length > 0) {
    return firstMatch(direct, regex);
  }
  return firstMatch(finalTurnText(subagentTranscriptPath(payload)), regex);
}

// Decoded text of the worker's FINAL TURN: the trailing assistant records, stopping at the first
// user/tool-result record (an earlier turn's boundary) or at an unparseable line (a partial write,
// or a byte-sliced tail that began mid-record). Bounding to the final turn keeps a stale token from
// an earlier attempt out; stopping at an unparseable line fails closed rather than reaching back
// past it. Empty when nothing in the final turn parsed (e.g. a final message larger than the 64KB
// tail window) -> caller treats it as no receipt and re-prompts, never accepting a stale token.
function finalTurnText(transcriptPath) {
  const tail = readTranscriptTail(transcriptPath);
  if (tail.length === 0) return "";
  const lines = tail.split(/\r?\n/);
  const parts = [];
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.length === 0) continue;
    let record;
    try {
      record = JSON.parse(line);
    } catch {
      break; // partial/truncated line -> hard boundary; never reach back past it
    }
    if (isTurnBoundary(record)) break; // start of the final turn reached
    if (!isAssistantRecord(record)) continue;
    const text = assistantRecordText(record);
    if (text.length > 0) parts.push(text);
  }
  if (parts.length === 0) return "";
  parts.reverse();
  return parts.join("\n");
}

// A turn boundary is the user/tool-result record that precedes the worker's final assistant turn.
// Match an explicit user role, or any record carrying a tool_result block even if the host does not
// wrap it in a user record, so the scan never reaches back past the final turn.
function isTurnBoundary(record) {
  if (record === null || typeof record !== "object") return false;
  if (record.type === "user" || record.role === "user" || record.message?.role === "user") return true;
  const content = record.message?.content ?? record.content;
  return Array.isArray(content) && content.some((block) => block?.type === "tool_result");
}

function isAssistantRecord(record) {
  if (record === null || typeof record !== "object") return false;
  return record.type === "assistant" || record.role === "assistant" || record.message?.role === "assistant";
}

// Join the text blocks of an assistant record, tolerating the common transcript shapes: a plain
// string body, an array of {type:"text",text} blocks (Claude), or a bare `text` field. Non-text
// blocks (tool_use/tool_result) contribute nothing.
function assistantRecordText(record) {
  const content = record.message?.content ?? record.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((block) => {
        if (typeof block === "string") return block;
        if (block?.type === "text" && typeof block.text === "string") return block.text;
        return "";
      })
      .filter((part) => part.length > 0)
      .join("\n");
  }
  return typeof record.text === "string" ? record.text : "";
}

const AGENT_NAMES = new Set(SUPERLOOPY_AGENT_NAMES);

export function canonicalAgentType(host, role) {
  if (!AGENT_NAMES.has(role)) return null;
  if (host === "codex") return role;
  if (host === "claude") return `superloopy:${role}`;
  return null;
}

export function matchesAgentType({ host, agentType, role } = {}) {
  const expected = canonicalAgentType(host, role);
  return expected !== null && agentType === expected;
}
