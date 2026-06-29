// Parent-side coordination for subagent-driven mode. Superloopy does not spawn or schedule workers,
// but the parent (Loopi) can record one handoff per dispatched worker and later reconcile the
// fleet: which assignments are outstanding, and a SINGLE normalized verdict across the workers'
// three different vocabularies (reviewer APPROVE/CHANGES_REQUESTED, QA PASS/FAIL, gate
// APPROVE/REJECT). This is additive and parent-side — it never spawns and never completes.

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { readFlag } from "./args.js";
import { resolveEvidenceArtifact } from "./artifacts.js";
import { decorateHandoffWithCrewLine } from "./crew-lines.js";
import { briefPath, ensureSuperloopyDirs, superloopyRelativeDir, nowIso, scopeFromSessionId, withFileLock, writeJsonAtomic } from "./store.js";

// Map each worker vocabulary onto one accept/reject/needs-context/pending enum so the parent
// integrates worker output mechanically instead of by hand. Lifecycle verdicts are deliberate:
// a still-running child (working/in_progress) stays outstanding (pending), and an unresolved
// child (inconclusive/timeout/ack_only) normalizes to needs-context — NEVER accept. A silent or
// ack-only lane is not an approval; the parent must close it and respawn the missing deliverable.
const VERDICT_MAP = new Map([
  ["approve", "accept"], ["pass", "accept"], ["passed", "accept"], ["done", "accept"],
  ["changes_requested", "reject"], ["fail", "reject"], ["failed", "reject"], ["reject", "reject"], ["rejected", "reject"],
  ["needs_context", "needs-context"], ["blocked", "needs-context"],
  ["inconclusive", "needs-context"], ["timeout", "needs-context"], ["ack_only", "needs-context"],
  ["working", "pending"], ["in_progress", "pending"], ["running", "pending"]
]);

export function normalizeVerdict(value) {
  if (typeof value !== "string") return "pending";
  const key = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return VERDICT_MAP.get(key) ?? "pending";
}

function handoffsPath(cwd, scope) {
  return join(cwd, superloopyRelativeDir(scope), "handoffs.json");
}

async function readHandoffs(cwd, scope) {
  try {
    const parsed = JSON.parse(await readFile(handoffsPath(cwd, scope), "utf8"));
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.handoffs)) return parsed;
  } catch {
    // absent or unreadable -> empty registry
  }
  return { version: 1, sessionId: scope?.sessionId ?? null, handoffs: [] };
}

export async function handoffLoop(cwd, argv) {
  const scope = scopeFromSessionId(readFlag(argv, "--session-id"));
  const language = readFlag(argv, "--language") ?? process.env.SUPERLOOPY_CREW_LANGUAGE;
  const id = readFlag(argv, "--id");
  // Distinguish "flag absent" (undefined) from a supplied value so an --id update MERGES only
  // the supplied fields instead of wiping the rest to null.
  const agent = readFlag(argv, "--agent")?.trim();
  const assignment = readFlag(argv, "--assignment")?.trim();
  const status = readFlag(argv, "--status");
  const verdict = readFlag(argv, "--verdict");
  const artifact = readFlag(argv, "--artifact");
  const handoff = await withFileLock(handoffsPath(cwd, scope), async () => {
    await ensureSuperloopyDirs(cwd, scope);
    const state = await readHandoffs(cwd, scope);
    const now = nowIso();
    let entry = id ? state.handoffs.find((item) => item.id === id) : undefined;
    if (id && entry === undefined) throw new Error(`No handoff with id ${id}.`);
    if (entry === undefined) {
      if (!agent) throw new Error("Missing --agent.");
      if (!assignment) throw new Error("Missing --assignment.");
      const normalizedVerdict = normalizeVerdict(verdict ?? null);
      entry = {
        id: `H${String(state.handoffs.length + 1).padStart(3, "0")}`,
        agent,
        assignment,
        status: status ?? "dispatched",
        verdict: verdict ?? null,
        normalizedVerdict,
        artifact: normalizeAcceptedArtifact(cwd, scope, normalizedVerdict, artifact),
        recordedAt: now,
        updatedAt: now
      };
      state.handoffs.push(entry);
    } else {
      // agent/assignment are identity: overwrite only with a non-empty value, never wipe to ""
      // (the create path also rejects empty), while status/verdict/artifact stay clearable.
      if (agent) entry.agent = agent;
      if (assignment) entry.assignment = assignment;
      if (status !== undefined) entry.status = status;
      const nextNormalizedVerdict = verdict !== undefined ? normalizeVerdict(verdict) : entry.normalizedVerdict;
      const nextArtifact = artifact !== undefined ? artifact : entry.artifact;
      if (verdict !== undefined) {
        entry.verdict = verdict;
        entry.normalizedVerdict = nextNormalizedVerdict;
      }
      if (artifact !== undefined || nextNormalizedVerdict === "accept") {
        entry.artifact = normalizeAcceptedArtifact(cwd, scope, nextNormalizedVerdict, nextArtifact);
      }
      entry.updatedAt = now;
    }
    await writeJsonAtomic(handoffsPath(cwd, scope), state);
    return entry;
  });
  const languageHints = await readCrewLineLanguageHints(cwd, scope);
  const decoratedHandoff = decorateHandoffWithCrewLine(handoff, { language, languageHints });
  return { ok: true, kind: "handoff_recorded", handoff: decoratedHandoff, crewLine: decoratedHandoff.crewLine ?? null };
}

export async function fleetLoop(cwd, argv) {
  const scope = scopeFromSessionId(readFlag(argv, "--session-id"));
  const language = readFlag(argv, "--language") ?? process.env.SUPERLOOPY_CREW_LANGUAGE;
  const state = await readHandoffs(cwd, scope);
  const languageHints = await readCrewLineLanguageHints(cwd, scope);
  const handoffs = state.handoffs.map((handoff) => decorateHandoffWithCrewLine(handoff, { language, languageHints }));
  const byVerdict = { accept: 0, reject: 0, "needs-context": 0, pending: 0 };
  for (const handoff of state.handoffs) {
    // Guard against an out-of-enum verdict (only possible via a hand-edited file): count it as
    // pending rather than producing a NaN bucket.
    const key = Object.prototype.hasOwnProperty.call(byVerdict, handoff.normalizedVerdict) ? handoff.normalizedVerdict : "pending";
    byVerdict[key] += 1;
  }
  const outstanding = handoffs
    .filter((handoff) => (handoff.normalizedVerdict ?? "pending") === "pending")
    .map((handoff) => ({ id: handoff.id, agent: handoff.agent, assignment: handoff.assignment }));
  const attention = handoffs
    .filter((handoff) => ["reject", "needs-context"].includes(handoff.normalizedVerdict ?? "pending"))
    .map((handoff) => ({
      id: handoff.id,
      agent: handoff.agent,
      assignment: handoff.assignment,
      verdict: handoff.verdict,
      normalizedVerdict: handoff.normalizedVerdict,
      crewLine: handoff.crewLine ?? null
    }));
  const result = { ok: true, kind: "fleet", summary: { dispatched: state.handoffs.length, byVerdict }, outstanding, attention, handoffs };
  const cap = Number.parseInt(process.env.SUPERLOOPY_MAX_PARALLEL ?? "", 10);
  if (Number.isInteger(cap) && cap > 0 && outstanding.length > cap) {
    result.warning = `${outstanding.length} outstanding handoffs exceed SUPERLOOPY_MAX_PARALLEL=${cap}; collect some before dispatching more.`;
  }
  return result;
}

async function readCrewLineLanguageHints(cwd, scope) {
  try {
    return [await readFile(briefPath(cwd, scope), "utf8")];
  } catch {
    return [];
  }
}

function normalizeAcceptedArtifact(cwd, scope, normalizedVerdict, artifact) {
  if (normalizedVerdict !== "accept") return artifact ?? null;
  if (typeof artifact !== "string" || artifact.trim().length === 0) {
    throw new Error("Accepted handoffs require a non-empty --artifact under the active evidence root.");
  }
  try {
    return resolveEvidenceArtifact(cwd, artifact, scope).relativePath;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Accepted handoffs require a valid evidence artifact: ${detail}`);
  }
}
