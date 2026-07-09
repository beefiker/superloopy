import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  hasLoosePromptTrigger,
  parseSteeringDirective,
  runPreToolUseHook,
  runStopHook,
  runSubagentStopHook,
  runUserPromptSubmitHook
} from "../src/hooks.js";
import { hasEngineerTrigger } from "../src/engineer.js";
import { TRANSCRIPT_TAIL_BYTES } from "../src/continuation.js";
import { checkpointLoop, createLoop, evidenceLoop, nextLoop, statusLoop } from "../src/loop.js";

async function tempRepo() {
  return mkdtemp(join(tmpdir(), "superloopy-hooks-"));
}

async function writeEvidence(repo, name, content = "proof\n") {
  const evidenceDir = join(repo, ".superloopy", "evidence");
  await mkdir(evidenceDir, { recursive: true });
  const path = join(evidenceDir, name);
  await writeFile(path, content, "utf8");
  return `.superloopy/evidence/${name}`;
}

async function writeSessionEvidence(repo, sessionId, name, content = "proof\n") {
  const evidenceDir = join(repo, ".superloopy", "sessions", sessionId, "evidence");
  await mkdir(evidenceDir, { recursive: true });
  const path = join(evidenceDir, name);
  await writeFile(path, content, "utf8");
  return `.superloopy/sessions/${sessionId}/evidence/${name}`;
}

async function withStopHookEnabled(fn) {
  const previous = process.env.SUPERLOOPY_STOP_HOOK;
  process.env.SUPERLOOPY_STOP_HOOK = "on";
  try {
    return await fn();
  } finally {
    if (previous === undefined) delete process.env.SUPERLOOPY_STOP_HOOK;
    else process.env.SUPERLOOPY_STOP_HOOK = previous;
  }
}

test("runPreToolUseHook denies create_goal payloads with token budget", () => {
  const output = runPreToolUseHook({
    hook_event_name: "PreToolUse",
    tool_name: "create_goal",
    tool_input: { objective: "Ship", token_budget: 1000 }
  });

  const parsed = JSON.parse(output);
  assert.equal(parsed.hookSpecificOutput.permissionDecision, "deny");
  assert.match(parsed.hookSpecificOutput.additionalContext, /objective/);
});

test("runPreToolUseHook allows create_goal payloads with objective only", () => {
  const output = runPreToolUseHook({
    hook_event_name: "PreToolUse",
    tool_name: "create_goal",
    tool_input: { objective: "Ship" }
  });

  assert.equal(output, "");
});

test("runSubagentStopHook allows non-empty receipt under .superloopy/evidence", async () => {
  const repo = await tempRepo();
  const artifact = await writeEvidence(repo, "receipt.txt");

  const output = runSubagentStopHook({
    hook_event_name: "SubagentStop",
    agent_type: "franky",
    cwd: repo,
    last_assistant_message: `done\nSUPERLOOPY_EVIDENCE: ${artifact}`
  });

  assert.equal(output, "");
});

test("runSubagentStopHook validates Superloopy review worker receipts", async () => {
  const repo = await tempRepo();
  const artifact = await writeEvidence(repo, "review-report.txt");

  const output = runSubagentStopHook({
    hook_event_name: "SubagentStop",
    agent_type: "zoro",
    cwd: repo,
    last_assistant_message: `reviewed\nSUPERLOOPY_EVIDENCE: ${artifact}`
  });

  assert.equal(output, "");
});

test("runSubagentStopHook uses scoped evidence root when session_id is present", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--session-id", "sess.1", "--brief", "Scoped"]);
  const globalArtifact = await writeEvidence(repo, "global-receipt.txt");
  const scopedArtifact = await writeSessionEvidence(repo, "sess.1", "scoped-receipt.txt");

  const globalOutput = runSubagentStopHook({
    hook_event_name: "SubagentStop",
    agent_type: "franky",
    session_id: "sess.1",
    cwd: repo,
    last_assistant_message: `done\nEVIDENCE_RECORDED: ${globalArtifact}`
  });
  const scopedOutput = runSubagentStopHook({
    hook_event_name: "SubagentStop",
    agent_type: "franky",
    session_id: "sess.1",
    cwd: repo,
    last_assistant_message: `done\nEVIDENCE_RECORDED: ${scopedArtifact}`
  });

  const globalBlock = JSON.parse(globalOutput).reason;
  assert.match(globalBlock, /receipt missing or invalid/);
  assert.match(globalBlock, /active evidence root/);
  assert.match(globalBlock, /\.superloopy\/sessions\/sess\.1\/evidence/);
  assert.match(globalBlock, /EVIDENCE_RECORDED: <path-under-active-evidence-root>/);
  assert.equal(scopedOutput, "");
});

test("runSubagentStopHook suppresses on a context-pressure marker in the transcript tail", async () => {
  const repo = await tempRepo();
  const transcript = join(repo, "transcript.txt");
  await writeFile(transcript, `${"earlier turn\n".repeat(50)}... context compacted ...\n`, "utf8");

  const output = runSubagentStopHook({
    hook_event_name: "SubagentStop",
    agent_type: "franky",
    cwd: repo,
    transcript_path: transcript,
    last_assistant_message: "done"
  });

  assert.equal(output, "");
});

test("runSubagentStopHook ignores a marker outside the bounded transcript tail", async () => {
  const repo = await tempRepo();
  const transcript = join(repo, "transcript.txt");
  // Marker only in the head, followed by more than the tail window of filler:
  // the bounded read must not see it, so the hook still blocks for a receipt.
  await writeFile(transcript, `context compacted\n${"x".repeat(TRANSCRIPT_TAIL_BYTES + 4096)}`, "utf8");

  const output = runSubagentStopHook({
    hook_event_name: "SubagentStop",
    agent_type: "franky",
    cwd: repo,
    transcript_path: transcript,
    last_assistant_message: "done"
  });

  assert.match(JSON.parse(output).reason, /receipt missing or invalid/);
});

test("parseSteeringDirective accepts annotate-only directives", () => {
  const directive = parseSteeringDirective(
    'please SUPERLOOPY_STEER: {"kind":"annotate","evidence":"found blocker","rationale":"capture context"}'
  );

  assert.deepEqual(directive, {
    kind: "annotate",
    evidence: "found blocker",
    rationale: "capture context"
  });
});

test("hasLoosePromptTrigger recognizes only leading complete Superloopy aliases", () => {
  assert.equal(hasLoosePromptTrigger("loopywork ship the feature"), true);
  assert.equal(hasLoosePromptTrigger("$lpy ship the feature"), true);
  assert.equal(hasLoosePromptTrigger("lpy ship the feature"), true);
  assert.equal(hasLoosePromptTrigger("$loopywork ship the feature"), false);
  assert.equal(hasLoosePromptTrigger("please lpy ship the feature"), false);
  assert.equal(hasLoosePromptTrigger("lpy가 왜 켜졌지?"), false);
  assert.equal(hasLoosePromptTrigger("loopywork처럼 실행해"), false);
  assert.equal(hasLoosePromptTrigger("edit loopywork_helper.ts"), false);
  assert.equal(hasLoosePromptTrigger("deploy_lpy_module"), false);
});

test("hasEngineerTrigger fires only on a leading loopy keyword", () => {
  assert.equal(hasEngineerTrigger("loopy ship the login fix"), true);
  assert.equal(hasEngineerTrigger("loopy"), true);
  assert.equal(hasEngineerTrigger("@loopy: ship it"), true);
  assert.equal(hasEngineerTrigger("loopywork ship it"), false);
  assert.equal(hasEngineerTrigger("please loopy this"), false);
  assert.equal(hasEngineerTrigger("loopy가 왜 켜졌지?"), false);
  assert.equal(hasEngineerTrigger("루피는 뭐야?"), false);
  assert.equal(hasEngineerTrigger("loopy loop begin --brief x"), false);
  assert.equal(hasEngineerTrigger("loopy loop begin: explain the command"), false);
  assert.equal(hasEngineerTrigger("loopy loop begin, explain the command"), false);
  // A real task whose first word is "loop" must still wake the engineer — only an actual
  // `loopy loop <subcommand>` prompt-shaped command references are suppressed.
  assert.equal(hasEngineerTrigger("loopy loop over the array and sum it"), true);
  assert.equal(hasEngineerTrigger("loopy loop through the users and dedupe"), true);
  assert.equal(hasEngineerTrigger("loopy loop the animation on hover"), true);
});

test("runUserPromptSubmitHook wakes the loop engineer on the loopy keyword without mutating state", async () => {
  const repo = await tempRepo();
  const output = await runUserPromptSubmitHook({
    hook_event_name: "UserPromptSubmit",
    cwd: repo,
    prompt: "loopy add proof-backed login"
  });
  const parsed = JSON.parse(output);
  assert.equal(parsed.hookSpecificOutput.hookEventName, "UserPromptSubmit");
  assert.match(parsed.hookSpecificOutput.additionalContext, /Superloopy loop engineer/);
  assert.match(parsed.hookSpecificOutput.additionalContext, /superloopy loop begin --brief 'add proof-backed login'/);
  assert.equal(existsSync(join(repo, ".superloopy", "goals.json")), false);
});

test("runUserPromptSubmitHook turns loose trigger into starter guidance without mutating state", async () => {
  const repo = await tempRepo();

  const output = await runUserPromptSubmitHook({
    hook_event_name: "UserPromptSubmit",
    cwd: repo,
    prompt: "loopywork add proof-backed login"
  });

  const parsed = JSON.parse(output);
  assert.equal(parsed.hookSpecificOutput.hookEventName, "UserPromptSubmit");
  assert.match(parsed.hookSpecificOutput.additionalContext, /Loopywork trigger/);
  assert.match(parsed.hookSpecificOutput.additionalContext, /guidance only/);
  assert.match(parsed.hookSpecificOutput.additionalContext, /superloopy loop begin --brief 'add proof-backed login' --mode light --json/);
  assert.equal(existsSync(join(repo, ".superloopy", "goals.json")), false);
});

test("runUserPromptSubmitHook points loose trigger at existing Superloopy state", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);

  const output = await runUserPromptSubmitHook({
    hook_event_name: "UserPromptSubmit",
    cwd: repo,
    prompt: "$lpy continue"
  });

  const context = JSON.parse(output).hookSpecificOutput.additionalContext;
  assert.match(context, /Loopywork trigger/);
  assert.match(context, /Use existing repo-local Superloopy state/);
  assert.match(context, /Superloopy context/);
  assert.match(context, /superloopy loop next --json/);
});

test("runUserPromptSubmitHook stays quiet for ordinary prompts even when Superloopy state exists", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);

  const output = await runUserPromptSubmitHook({
    hook_event_name: "UserPromptSubmit",
    cwd: repo,
    prompt: "continue"
  });

  assert.equal(output, "");
});

test("runUserPromptSubmitHook appends annotate steering to ledger", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);

  const output = await runUserPromptSubmitHook({
    hook_event_name: "UserPromptSubmit",
    cwd: repo,
    prompt: 'SUPERLOOPY_STEER: {"kind":"annotate","evidence":"fact","rationale":"keep note"}'
  });
  const ledger = await readFile(join(repo, ".superloopy", "ledger.jsonl"), "utf8");
  const parsed = JSON.parse(output);

  assert.equal(parsed.kind, "steering_annotated");
  assert.equal(parsed.guide.state, "start_goal");
  assert.equal(parsed.guide.nextAction.command, "superloopy loop next --json");
  assert.match(ledger, /steering_annotated/);
});

test("runUserPromptSubmitHook can add a goal through structured steering", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "- First"]);

  const output = await runUserPromptSubmitHook({
    hook_event_name: "UserPromptSubmit",
    cwd: repo,
    prompt: 'SUPERLOOPY_STEER: {"kind":"add_goal","title":"Second","objective":"Ship the second slice","rationale":"new user requirement"}'
  });
  const status = await statusLoop(repo);
  const ledger = await readFile(join(repo, ".superloopy", "ledger.jsonl"), "utf8");
  const parsed = JSON.parse(output);

  assert.equal(parsed.kind, "goal_added");
  assert.equal(parsed.guide.state, "start_goal");
  assert.equal(parsed.guide.nextAction.command, "superloopy loop next --json");
  assert.equal(status.plan.goals.length, 2);
  assert.equal(status.plan.goals[1].id, "G002");
  assert.equal(status.plan.goals[1].criteria.length, 2);
  assert.match(ledger, /goal_added/);
});

test("runUserPromptSubmitHook can revise a criterion through structured steering", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);

  const output = await runUserPromptSubmitHook({
    hook_event_name: "UserPromptSubmit",
    cwd: repo,
    prompt:
      'SUPERLOOPY_STEER: {"kind":"revise_criterion","goalId":"G001","criterionId":"C002","scenario":"Risk path covers invalid config rollback.","rationale":"risk changed"}'
  });
  const status = await statusLoop(repo);
  const criterion = status.plan.goals[0].criteria[1];

  assert.match(output, /criterion_revised/);
  assert.equal(criterion.scenario, "Risk path covers invalid config rollback.");
  assert.equal(criterion.status, "pending");
  assert.equal(criterion.artifact, null);
});

test("runUserPromptSubmitHook can reorder only pending goals through structured steering", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "- First\n- Second\n- Third"]);

  const output = await runUserPromptSubmitHook({
    hook_event_name: "UserPromptSubmit",
    cwd: repo,
    prompt: 'SUPERLOOPY_STEER: {"kind":"reorder_pending","goalIds":["G003","G002"],"rationale":"third is the prerequisite"}'
  });
  const status = await statusLoop(repo);

  assert.match(output, /goals_reordered/);
  assert.deepEqual(status.plan.goals.map((goal) => goal.id), ["G001", "G003", "G002"]);
});

test("runStopHook stays quiet by default when the optional Stop hook is not enabled", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);

  const output = await runStopHook({
    hook_event_name: "Stop",
    cwd: repo,
    stop_hook_active: false
  });

  assert.equal(output, "");
});

test("runStopHook blocks a normal stop when Superloopy has unresolved active work", async () => withStopHookEnabled(async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);

  const output = await runStopHook({
    hook_event_name: "Stop",
    cwd: repo,
    stop_hook_active: false
  });
  const parsed = JSON.parse(output);

  assert.equal(parsed.decision, "block");
  assert.match(parsed.reason, /Superloopy continuation/);
  assert.match(parsed.reason, /superloopy loop next --json/);
  assert.match(parsed.reason, /.superloopy\/goals.json/);
}));

test("runStopHook includes command templates for an active evidence criterion", async () => withStopHookEnabled(async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  await nextLoop(repo);

  const output = await runStopHook({
    hook_event_name: "Stop",
    cwd: repo,
    stop_hook_active: false
  });

  assert.match(JSON.parse(output).reason, /Capture template: `superloopy loop capture --goal-id G001 --criterion-id C001 --notes "<summary>" -- <validation-command>`/);
  assert.match(JSON.parse(output).reason, /Evidence template: `superloopy loop evidence --goal-id G001 --criterion-id C001 --status pass --artifact .superloopy\/evidence\/G001-C001.txt --notes "<summary>" --json`/);
  assert.match(JSON.parse(output).reason, /Proof target: G001\/C001 pass -> `.superloopy\/evidence\/G001-C001.txt`/);
  assert.match(JSON.parse(output).reason, /Produce a real artifact under `.superloopy\/evidence` before recording criterion evidence/);
  assert.match(JSON.parse(output).reason, /Flow checklist:\n- \[complete\] Start or resume goal: `superloopy loop next --json`\n- \[current\] Record artifact-backed proof: `superloopy loop prove -- <validation-command>`\n- \[anytime\] Check evidence: `superloopy loop check --json`/);
  assert.match(JSON.parse(output).reason, /Proof plan:/);
  assert.match(JSON.parse(output).reason, /G001\/C002 pending capture `superloopy loop capture --goal-id G001 --criterion-id C002 --notes "<summary>" -- <validation-command>`/);
}));

test("runUserPromptSubmitHook includes evidence template for active work", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  await nextLoop(repo);

  const output = await runUserPromptSubmitHook({
    hook_event_name: "UserPromptSubmit",
    cwd: repo,
    prompt: "$lpy continue"
  });

  const context = JSON.parse(output).hookSpecificOutput.additionalContext;
  assert.match(context, /Evidence template: `superloopy loop evidence --goal-id G001 --criterion-id C001 --status pass --artifact .superloopy\/evidence\/G001-C001.txt --notes "<summary>" --json`/);
  assert.match(context, /Record criterion evidence only with a non-empty artifact under `.superloopy\/evidence`/);
  assert.match(context, /Flow checklist:\n- \[complete\] Start or resume goal: `superloopy loop next --json`\n- \[current\] Record artifact-backed proof: `superloopy loop prove -- <validation-command>`\n- \[anytime\] Check evidence: `superloopy loop check --json`/);
  assert.match(context, /Proof plan:/);
  assert.match(context, /G001\/C002 pending capture `superloopy loop capture --goal-id G001 --criterion-id C002 --notes "<summary>" -- <validation-command>`/);
});

test("hook context includes recorded evidence for already-passed criteria", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  await nextLoop(repo);
  const artifact = await writeEvidence(repo, "c1.txt");
  await evidenceLoop(repo, [
    "--goal-id",
    "G001",
    "--criterion-id",
    "C001",
    "--status",
    "pass",
    "--artifact",
    artifact,
    "--notes",
    "manual smoke covered"
  ]);

  const output = await runUserPromptSubmitHook({
    hook_event_name: "UserPromptSubmit",
    cwd: repo,
    prompt: "$lpy continue"
  });

  const context = JSON.parse(output).hookSpecificOutput.additionalContext;
  assert.match(context, /Recorded evidence:/);
  assert.match(context, /G001\/C001 pass at \d{4}-\d{2}-\d{2}T.* -> `.superloopy\/evidence\/c1.txt` - Happy path works from the real user-facing surface\. - notes: manual smoke covered/);
});

test("runStopHook stays silent when Superloopy aggregate is complete", async () => withStopHookEnabled(async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  const c1 = await writeEvidence(repo, "c1.txt");
  const c2 = await writeEvidence(repo, "c2.txt");
  await evidenceLoop(repo, ["--goal-id", "G001", "--criterion-id", "C001", "--status", "pass", "--artifact", c1]);
  await evidenceLoop(repo, ["--goal-id", "G001", "--criterion-id", "C002", "--status", "pass", "--artifact", c2]);
  await writeFile(join(repo, ".superloopy", "evidence", "gate.json"), JSON.stringify({ status: "passed", artifacts: [c1, c2] }), "utf8");
  await checkpointLoop(repo, [
    "--goal-id",
    "G001",
    "--status",
    "complete",
    "--evidence",
    "done",
    "--quality-gate",
    ".superloopy/evidence/gate.json"
  ]);

  const output = await runStopHook({
    hook_event_name: "Stop",
    cwd: repo,
    stop_hook_active: false
  });

  assert.equal(output, "");
}));

test("runStopHook engine keeps driving even when a prior stop is active", async () => withStopHookEnabled(async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);

  const output = await runStopHook({
    hook_event_name: "Stop",
    cwd: repo,
    stop_hook_active: true
  });

  assert.equal(JSON.parse(output).decision, "block");
}));

test("runStopHook honors SUPERLOOPY_CONTINUATION=off as the legacy single-continuation brake", async () => withStopHookEnabled(async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);

  const previous = process.env.SUPERLOOPY_CONTINUATION;
  process.env.SUPERLOOPY_CONTINUATION = "off";
  try {
    const output = await runStopHook({
      hook_event_name: "Stop",
      cwd: repo,
      stop_hook_active: true
    });
    assert.equal(output, "");
  } finally {
    if (previous === undefined) delete process.env.SUPERLOOPY_CONTINUATION;
    else process.env.SUPERLOOPY_CONTINUATION = previous;
  }
}));
