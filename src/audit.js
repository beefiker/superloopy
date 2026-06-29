// Loopy evidence auditor — the DETERMINISTIC spine.
//
// Loopy owns the trustworthy part: it re-runs each command-backed passed
// criterion in-process (the exact capture path), hashes the result, and records
// it in .loopy/audit-state.json. This is the source of truth. The independent
// LLM judgment is layered on top by a host-dispatched read-only robin
// subagent whose verdict is validated against THIS state (see audit-hooks.js).
//
// The deterministic floor: a re-run that reproduces (exit 0) is "pass" and may
// proceed to LLM judgment; a re-run that does NOT reproduce is "inconclusive"
// (never a silent auto-fail — non-idempotent/flaky commands must not flip a
// legitimately passing criterion). A cache hit (unchanged inputs, prior pass)
// is skipped: no re-run, no LLM.

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { readFlag } from "./args.js";
import { resolveEvidenceArtifact, resolveEvidenceOutputPath } from "./artifacts.js";
import { runCaptured } from "./capture.js";
import { evidenceLoop } from "./loop.js";
import {
  appendLedger,
  auditStatePath,
  evidenceRelativeDir,
  nowIso,
  readPlan,
  scopeFromSessionId,
  withFileLock,
  writeJsonAtomic
} from "./store.js";

export async function auditLoop(cwd, argv) {
  const scope = scopeFromSessionId(readFlag(argv, "--session-id"));
  const onlyGoal = readFlag(argv, "--goal-id");
  const onlyCriterion = readFlag(argv, "--criterion-id");
  const plan = await readPlan(cwd, scope);
  const prior = await readAuditState(cwd, scope);
  const priorByKey = new Map((prior.criteria ?? []).map((entry) => [entry.criterion, entry]));

  const results = [];
  for (const goal of plan.goals) {
    if (onlyGoal && goal.id !== onlyGoal) continue;
    for (const criterion of goal.criteria) {
      if (criterion.status !== "pass") continue;
      if (onlyCriterion && criterion.id !== onlyCriterion) continue;
      results.push(await auditCriterion(cwd, scope, goal, criterion, priorByKey.get(`${goal.id}/${criterion.id}`)));
    }
  }

  const state = { version: 1, sessionId: scope?.sessionId ?? null, auditsAccepted: prior.auditsAccepted ?? 0, updatedAt: nowIso(), criteria: results };
  await writeJsonAtomic(auditStatePath(cwd, scope), state);

  // Append-only audit trail: one entry per non-cached criterion so trace/report
  // and a human can see what the re-run found.
  for (const entry of results) {
    if (entry.cached) continue;
    const kind = entry.floor === "pass" ? "audit_passed" : `audit_${entry.floor}`;
    await appendLedger(cwd, { at: entry.auditedAt, kind, criterion: entry.criterion, rerunStatus: entry.rerunStatus, rerunArtifact: entry.rerunArtifact }, scope);
  }

  // Deterministic floor failure (a manual proof artifact no longer resolves)
  // flips the criterion off pass so the continuation engine re-drives it. A
  // non-reproducing command re-run is inconclusive and never auto-flips.
  const maxFails = auditMaxFails(process.env);
  for (const entry of results.filter((item) => item.floor === "fail" && !item.cached)) {
    const note = resolveEvidenceOutputPath(cwd, `${evidenceRelativeDir(scope)}/audit/${entry.criterion.replace("/", "-")}-floor-fail.txt`, scope);
    await mkdir(dirname(note.absolutePath), { recursive: true });
    const gap = `Audit could not re-validate the recorded proof for ${entry.criterion}; re-prove it.`;
    await writeFile(note.absolutePath, `${gap}\n`, "utf8");
    await recordAuditFailure(cwd, scope, entry.criterion, gap, note.relativePath, entry.failCount, maxFails);
  }

  const pending = results.filter((entry) => entry.floor === "pass" && entry.verdict !== "pass");
  return {
    ok: results.every((entry) => entry.floor === "pass"),
    audited: results.length,
    cached: results.filter((entry) => entry.cached).length,
    inconclusive: results.filter((entry) => entry.floor === "inconclusive").map((entry) => entry.criterion),
    failed: results.filter((entry) => entry.floor === "fail").map((entry) => entry.criterion),
    dispatch: renderAuditDispatch(scope, pending),
    criteria: results
  };
}

async function auditCriterion(cwd, scope, goal, criterion, priorEntry, forceRerun = false) {
  const key = `${goal.id}/${criterion.id}`;
  const sourceHash = await safeFileHash(cwd, criterion.artifact, scope);
  const inputHash = hash(JSON.stringify({ command: criterion.command ?? null, scenario: criterion.scenario, sourceHash }));

  // Cache hit: unchanged inputs AND a prior accepted verdict whose re-run artifact
  // still resolves. forceRerun (accept-time / gate-time re-derivation) bypasses the
  // cache so a fresh, in-process re-run is the source of truth — never recorded state.
  if (!forceRerun && priorEntry && priorEntry.inputHash === inputHash && priorEntry.verdict === "pass" && artifactStillResolves(cwd, priorEntry.rerunArtifact, scope)) {
    return { ...priorEntry, cached: true };
  }

  const base = { criterion: key, scenario: criterion.scenario, inputHash, sourceHash, verdict: null, failCount: priorEntry?.failCount ?? 0, auditedAt: nowIso() };

  if (Array.isArray(criterion.command) && criterion.command.length > 0) {
    const output = resolveEvidenceOutputPath(cwd, `${evidenceRelativeDir(scope)}/audit/${goal.id}-${criterion.id}-rerun.txt`, scope);
    const capture = await runCaptured(cwd, criterion.command, output);
    const reproduced = capture.status === "pass";
    return {
      ...base,
      command: criterion.command,
      rerunStatus: capture.status,
      rerunExitCode: capture.exitCode,
      rerunArtifact: capture.artifact,
      rerunArtifactHash: await safeFileHash(cwd, capture.artifact, scope),
      floor: reproduced ? "pass" : "inconclusive",
      failCount: reproduced ? 0 : (priorEntry?.failCount ?? 0)
    };
  }

  // Manual (no command): there is nothing to re-run, so the floor is an artifact
  // EXISTENCE check only — `pass` means the cited proof still resolves, NOT that it is
  // correct. Manual-criterion correctness rests on the auditor's judgment + human
  // review, not on this deterministic floor (disclosed limit; prefer command-backed
  // proof). forceRerun has no effect here — there is no command to re-execute.
  let resolves = true;
  try {
    resolveEvidenceArtifact(cwd, criterion.artifact, scope);
  } catch {
    resolves = false;
  }
  return {
    ...base,
    command: null,
    rerunStatus: "manual-recheck",
    rerunArtifact: criterion.artifact,
    rerunArtifactHash: sourceHash,
    floor: resolves ? "pass" : "fail",
    failCount: resolves ? 0 : (priorEntry?.failCount ?? 0) + 1
  };
}

// Accept-time / gate-time re-derivation: force a fresh deterministic re-run of ONE
// passed criterion (bypassing the cache) and persist it, so verdict acceptance and
// the completion gate verify against state Loopy just computed IN-PROCESS — never the
// worker-writable recorded audit-state. A forged floor/hash cannot survive because the
// proof must actually reproduce here and the artifact is re-hashed from Loopy's own
// fresh capture. failCount and the last accepted verdictArtifact are carried across
// (they track advisory-fail accumulation + replay, not floor reproduction). Returns
// { state, entry } or null when the criterion is not in the plan.
export async function auditOneCriterion(cwd, scope, criterionKey) {
  // Lock the whole re-derive + persist so a concurrent auditor/gate process cannot
  // interleave its own read-modify-write on audit-state.json and drop this update.
  return withFileLock(auditStatePath(cwd, scope), () => auditOneCriterionLocked(cwd, scope, criterionKey));
}

async function auditOneCriterionLocked(cwd, scope, criterionKey) {
  const [goalId, criterionId] = String(criterionKey ?? "").split("/");
  const plan = await readPlan(cwd, scope);
  const goal = plan.goals.find((item) => item.id === goalId);
  const criterion = goal?.criteria.find((item) => item.id === criterionId);
  if (!goal || !criterion) return null;
  const prior = await readAuditState(cwd, scope);
  const priorEntry = (prior.criteria ?? []).find((item) => item.criterion === criterionKey);
  const entry = await auditCriterion(cwd, scope, goal, criterion, priorEntry, true);
  entry.failCount = priorEntry?.failCount ?? 0;
  entry.verdictArtifact = priorEntry?.verdictArtifact ?? null;
  entry.verdictHash = priorEntry?.verdictHash ?? null;
  const others = (prior.criteria ?? []).filter((item) => item.criterion !== criterionKey);
  const state = {
    version: 1,
    sessionId: scope?.sessionId ?? prior.sessionId ?? null,
    auditsAccepted: prior.auditsAccepted ?? 0,
    updatedAt: nowIso(),
    criteria: [...others, entry]
  };
  await writeJsonAtomic(auditStatePath(cwd, scope), state);
  return { state, entry };
}

// Flips a criterion off pass when an audit fails (deterministic floor or LLM
// verdict). At the per-criterion fail cap it marks the criterion blocked for a
// human instead of fail. Returns the recorded status.
export async function recordAuditFailure(cwd, scope, criterionKey, gap, artifactRelPath, failCount, maxFails) {
  const [goalId, criterionId] = criterionKey.split("/");
  const status = maxFails > 0 && failCount >= maxFails ? "blocked" : "fail";
  const args = ["--goal-id", goalId, "--criterion-id", criterionId, "--status", status, "--artifact", artifactRelPath, "--notes", gap];
  if (scope?.sessionId) args.push("--session-id", scope.sessionId);
  await evidenceLoop(cwd, args);
  await appendLedger(cwd, { at: nowIso(), kind: status === "blocked" ? "audit_blocked" : "audit_failed", criterion: criterionKey, gap, failCount }, scope);
  return status;
}

export function auditMaxFails(env = {}) {
  const raw = env.LOOPY_AUDIT_MAX_FAILS;
  if (raw === undefined || raw === null || raw === "") return 3;
  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 3;
}

function renderAuditDispatch(scope, pending) {
  if (pending.length === 0) return null;
  const sessionFlag = scope?.sessionId ? ` --session-id ${scope.sessionId}` : "";
  const lines = [
    "Loopy audit — independent judgment required",
    "",
    "Loopy re-ran the proof for these criteria and recorded the result. For each, dispatch a read-only auditor to judge whether the re-run actually satisfies the scenario, then it must end with `LOOPY_AUDIT: <verdict-path>`:",
    ""
  ];
  for (const entry of pending) {
    lines.push(`- ${entry.criterion}: \`task(subagent_type="robin", run_in_background=false)\` — cite re-run artifact \`${entry.rerunArtifact}\` against the scenario; write verdict to \`${evidenceRelativeDir(scope)}/audit/${entry.criterion.replace("/", "-")}-verdict.json\`.`);
  }
  lines.push("", `The auditor must be read-only and skeptical. A pass requires citing the re-run artifact. Re-check status with \`loopy loop audit${sessionFlag} --json\`.`);
  return lines.join("\n");
}

async function readAuditState(cwd, scope) {
  try {
    const parsed = JSON.parse(await readFile(auditStatePath(cwd, scope), "utf8"));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
  } catch {
    // absent or unreadable -> fresh state
  }
  return { criteria: [] };
}

async function safeFileHash(cwd, relativePath, scope) {
  try {
    const resolved = resolveEvidenceArtifact(cwd, relativePath, scope);
    return hash(await readFile(resolved.absolutePath));
  } catch {
    return null;
  }
}

function artifactStillResolves(cwd, relativePath, scope) {
  if (typeof relativePath !== "string") return false;
  try {
    resolveEvidenceArtifact(cwd, relativePath, scope);
    return true;
  } catch {
    return false;
  }
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}
