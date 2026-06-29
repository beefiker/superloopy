// SubagentStop evidence-receipt attempt tracking plus the post-cap ledger signal, factored
// out of hooks.js so each file stays within Loopy's per-file reviewability budget. The 3-attempt
// cap nudges a worker to produce a valid receipt; on exhaustion the hook allows the stop (a free
// pass that never confers a criterion pass) and records a ledger signal so it is observable.

import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { goalsPath, ledgerPath, scopeFromSessionId } from "./store.js";

export const MAX_SUBAGENT_ATTEMPTS = 3;

// Append-only, best-effort ledger signal from the synchronous SubagentStop hook. Surfaces the
// post-cap free pass so an operator can see a worker gave up without evidence.
export function recordSubagentLedger(payload, kind, attempts) {
  try {
    const scope = scopeFromPayload(payload);
    const useScope = scope !== undefined && existsSync(goalsPath(payload.cwd, scope)) ? scope : undefined;
    const path = ledgerPath(payload.cwd, useScope);
    mkdirSync(dirname(path), { recursive: true });
    const entry = { at: new Date().toISOString(), kind, agentType: payload.agent_type ?? null, agentId: payload.agent_id ?? null, attempts };
    appendFileSync(path, `${JSON.stringify(entry)}\n`, "utf8");
  } catch {
    // ledger is advisory; never fail the hook over a write error
  }
}

export function nextAttemptState(payload) {
  const path = attemptStatePath(payload);
  if (path === null) return { attempts: 1, limitReached: false };
  const current = readAttemptState(path);
  if (current >= MAX_SUBAGENT_ATTEMPTS) return { attempts: current, limitReached: true };
  const attempts = current + 1;
  writeAttemptState(path, attempts);
  return { attempts, limitReached: false };
}

export function clearAttemptState(payload) {
  const path = attemptStatePath(payload);
  if (path !== null) rmSync(path, { force: true });
}

function readAttemptState(path) {
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    return Number.isInteger(parsed.attempts) ? parsed.attempts : 0;
  } catch {
    return 0;
  }
}

function writeAttemptState(path, attempts) {
  mkdirSync(dirname(path), { recursive: true });
  const tmpPath = `${path}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmpPath, `${JSON.stringify({ attempts })}\n`, "utf8");
  renameSync(tmpPath, path);
}

function attemptStatePath(payload) {
  if (typeof payload.cwd !== "string") return null;
  // Fall back to a session-only (or cwd-only) key when the host omits agent_id/session_id,
  // so the 3-attempt cap still counts instead of looping forever at "Attempt 1 of 3". Two
  // id-less workers in one session then share a counter — acceptable versus an infinite block.
  const session = typeof payload.session_id === "string" ? sanitizeKey(payload.session_id) : "nosession";
  const agent = typeof payload.agent_id === "string" ? sanitizeKey(payload.agent_id) : "noagent";
  return join(payload.cwd, ".loopy", "subagent-stop", `${session}-${agent}.json`);
}

function scopeFromPayload(payload) {
  return scopeFromSessionId(payload.session_id);
}

function sanitizeKey(value) {
  const sanitized = value.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return sanitized.length > 0 ? sanitized : "missing";
}
