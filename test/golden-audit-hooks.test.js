import assert from "node:assert/strict";
import "./helpers/trust-isolate.js";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { auditLoop } from "../src/audit.js";
import { runAuditorStopHook } from "../src/audit-hooks.js";
import { captureLoop } from "../src/capture.js";
import { createLoop, nextLoop } from "../src/loop.js";


async function auditedRepo() {
  const repo = await mkdtemp(join(tmpdir(), "superloopy-audithook-"));
  await createLoop(repo, ["--brief", "Ship"]);
  await nextLoop(repo);
  await captureLoop(repo, ["--goal-id", "G001", "--criterion-id", "C001", "--", "node", "-e", "process.exit(0)"]);
  const audit = await auditLoop(repo, []);
  return { repo, entry: audit.criteria[0] };
}

async function writeVerdict(repo, verdict, name = "G001-C001-verdict.json") {
  await mkdir(join(repo, ".superloopy", "evidence", "audit"), { recursive: true });
  const rel = `.superloopy/evidence/audit/${name}`;
  await writeFile(join(repo, rel), JSON.stringify(verdict), "utf8");
  return rel;
}

function verdictFor(entry) {
  return {
    criterion: entry.criterion,
    verdict: "pass",
    rerun: { artifact: entry.rerunArtifact, status: entry.rerunStatus, exitCode: entry.rerunExitCode },
    citations: ["re-run reproduced the proof"]
  };
}

test("runAuditorStopHook accepts a verdict bound to Superloopy's recorded re-run", async () => {
  const { repo, entry } = await auditedRepo();
  const rel = await writeVerdict(repo, verdictFor(entry));

  const out = await runAuditorStopHook({
    hook_event_name: "SubagentStop",
    agent_type: "robin",
    cwd: repo,
    last_assistant_message: `reviewed\nSUPERLOOPY_AUDIT: ${rel}`
  });

  assert.equal(out, "");
  const state = JSON.parse(await readFile(join(repo, ".superloopy", "audit-state.json"), "utf8"));
  assert.equal(state.criteria[0].verdict, "pass");
});

test("runAuditorStopHook re-derives the floor and blocks a pass whose command no longer reproduces (forged/stale state cannot survive)", async () => {
  const { repo, entry } = await auditedRepo();
  // Worker forges audit-state to claim a passing floor + hash, AND points the plan
  // criterion at a command that fails on re-run. Accept-time re-derivation ignores the
  // recorded state, re-runs the (now failing) command, and refuses the pass.
  const statePath = join(repo, ".superloopy", "audit-state.json");
  const state = JSON.parse(await readFile(statePath, "utf8"));
  state.criteria[0].rerunArtifactHash = "forged";
  state.criteria[0].floor = "pass";
  await writeFile(statePath, JSON.stringify(state), "utf8");
  const goalsPath = join(repo, ".superloopy", "goals.json");
  const plan = JSON.parse(await readFile(goalsPath, "utf8"));
  plan.goals[0].criteria[0].command = ["node", "-e", "process.exit(1)"];
  await writeFile(goalsPath, JSON.stringify(plan), "utf8");
  const rel = await writeVerdict(repo, verdictFor(entry));

  const out = await runAuditorStopHook({
    hook_event_name: "SubagentStop",
    agent_type: "robin",
    cwd: repo,
    last_assistant_message: `reviewed\nSUPERLOOPY_AUDIT: ${rel}`
  });

  assert.equal(JSON.parse(out).decision, "block");
  assert.match(JSON.parse(out).reason, /audit verdict missing or invalid/i);
  const after = JSON.parse(await readFile(statePath, "utf8"));
  assert.notEqual(after.criteria[0].verdict, "pass"); // never recorded as an accepted pass
  assert.notEqual(after.criteria[0].floor, "pass"); // re-derived floor overwrote the forged one
});

test("runAuditorStopHook blocks when no SUPERLOOPY_AUDIT receipt is present", async () => {
  const { repo } = await auditedRepo();
  const out = await runAuditorStopHook({
    hook_event_name: "SubagentStop",
    agent_type: "robin",
    cwd: repo,
    last_assistant_message: "I reviewed it and it looks fine"
  });
  assert.equal(JSON.parse(out).decision, "block");
});

test("runAuditorStopHook flips the criterion on an accepted fail verdict (re-drive)", async () => {
  const { repo, entry } = await auditedRepo();
  const v = { ...verdictFor(entry), verdict: "fail", citations: ["exit 0 but the risk path is not exercised"], gap: "risk path untested", nextAction: "superloopy loop prove -- npm test" };
  const rel = await writeVerdict(repo, v, "G001-C001-fail.json");

  const out = await runAuditorStopHook({
    hook_event_name: "SubagentStop",
    agent_type: "robin",
    cwd: repo,
    last_assistant_message: `reviewed\nSUPERLOOPY_AUDIT: ${rel}`
  });

  assert.equal(out, ""); // a valid fail verdict is accepted (receipt is well-formed)...
  const plan = JSON.parse(await readFile(join(repo, ".superloopy", "goals.json"), "utf8"));
  assert.equal(plan.goals[0].criteria[0].status, "fail"); // ...and flips the criterion for re-drive
  const state = JSON.parse(await readFile(join(repo, ".superloopy", "audit-state.json"), "utf8"));
  assert.equal(state.auditsAccepted ?? 0, 0); // a fail is not a monotonic accepted audit
});

test("runAuditorStopHook counts an accepted pass verdict as a monotonic audit", async () => {
  const { repo, entry } = await auditedRepo();
  const rel = await writeVerdict(repo, verdictFor(entry));
  await runAuditorStopHook({
    hook_event_name: "SubagentStop", agent_type: "robin", cwd: repo,
    last_assistant_message: `ok\nSUPERLOOPY_AUDIT: ${rel}`
  });
  const state = JSON.parse(await readFile(join(repo, ".superloopy", "audit-state.json"), "utf8"));
  assert.equal(state.auditsAccepted, 1);
});

test("runAuditorStopHook does not double-count a byte-identical verdict re-submitted under a new filename", async () => {
  const { repo, entry } = await auditedRepo();
  const v = verdictFor(entry);
  const rel1 = await writeVerdict(repo, v, "v1.json");
  const rel2 = await writeVerdict(repo, v, "v2.json"); // identical bytes, different path
  await runAuditorStopHook({ hook_event_name: "SubagentStop", agent_type: "robin", cwd: repo, last_assistant_message: `ok\nSUPERLOOPY_AUDIT: ${rel1}` });
  await runAuditorStopHook({ hook_event_name: "SubagentStop", agent_type: "robin", cwd: repo, last_assistant_message: `ok\nSUPERLOOPY_AUDIT: ${rel2}` });
  const state = JSON.parse(await readFile(join(repo, ".superloopy", "audit-state.json"), "utf8"));
  assert.equal(state.auditsAccepted, 1); // content-keyed idempotency: counted once despite the new path
});

test("runAuditorStopHook blocks a criterion at the per-criterion fail cap", async () => {
  const { repo, entry } = await auditedRepo();
  const v = { ...verdictFor(entry), verdict: "fail", citations: ["x"], gap: "g", nextAction: "superloopy loop prove -- x" };
  const rel = await writeVerdict(repo, v, "G001-C001-fail.json");
  const prev = process.env.SUPERLOOPY_AUDIT_MAX_FAILS;
  process.env.SUPERLOOPY_AUDIT_MAX_FAILS = "1";
  try {
    await runAuditorStopHook({
      hook_event_name: "SubagentStop", agent_type: "robin", cwd: repo,
      last_assistant_message: `r\nSUPERLOOPY_AUDIT: ${rel}`
    });
    const plan = JSON.parse(await readFile(join(repo, ".superloopy", "goals.json"), "utf8"));
    assert.equal(plan.goals[0].criteria[0].status, "blocked");
  } finally {
    if (prev === undefined) delete process.env.SUPERLOOPY_AUDIT_MAX_FAILS;
    else process.env.SUPERLOOPY_AUDIT_MAX_FAILS = prev;
  }
});

test("runAuditorStopHook ignores non-auditor subagents", async () => {
  const { repo } = await auditedRepo();
  const out = await runAuditorStopHook({
    hook_event_name: "SubagentStop",
    agent_type: "franky",
    cwd: repo,
    last_assistant_message: "done"
  });
  assert.equal(out, "");
});

test("runAuditorStopHook still enforces the attempt cap when agent_id is missing", async () => {
  const { repo } = await auditedRepo();
  const payload = { hook_event_name: "SubagentStop", agent_type: "robin", cwd: repo, last_assistant_message: "no verdict cited" };
  // No agent_id: the audit cap must still count down rather than block forever.
  assert.equal(JSON.parse(await runAuditorStopHook(payload)).decision, "block");
  assert.equal(JSON.parse(await runAuditorStopHook(payload)).decision, "block");
  assert.equal(JSON.parse(await runAuditorStopHook(payload)).decision, "block");
  assert.equal(await runAuditorStopHook(payload), "");
});

test("runAuditorStopHook records a ledger signal when the audit cap is exhausted", async () => {
  const { repo } = await auditedRepo();
  const payload = { hook_event_name: "SubagentStop", agent_type: "robin", session_id: "s1", agent_id: "a1", cwd: repo, last_assistant_message: "no verdict cited" };
  await runAuditorStopHook(payload);
  await runAuditorStopHook(payload);
  await runAuditorStopHook(payload);
  assert.equal(await runAuditorStopHook(payload), "");
  const ledger = await readFile(join(repo, ".superloopy", "ledger.jsonl"), "utf8");
  assert.match(ledger, /audit_attempt_exhausted/);
});
