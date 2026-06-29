import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { reportLoop } from "../src/report.js";
import { runSubagentStopHook } from "../src/hooks.js";
import { createLoop, evidenceLoop, nextLoop } from "../src/loop.js";

async function tempRepo() {
  return mkdtemp(join(tmpdir(), "loopy-report-"));
}

async function writeEvidence(repo, name, content = "proof\n") {
  const evidenceDir = join(repo, ".loopy", "evidence");
  await mkdir(evidenceDir, { recursive: true });
  const path = join(evidenceDir, name);
  await writeFile(path, content, "utf8");
  return `.loopy/evidence/${name}`;
}

test("report artifact includes the current next action and proof plan", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship a CLI loop"]);
  await nextLoop(repo);
  const evidence = await evidenceLoop(repo, [
    "--goal-id",
    "G001",
    "--criterion-id",
    "C001",
    "--status",
    "pass",
    "--artifact",
    await writeEvidence(repo, "g001-c001.txt"),
    "--notes",
    "manual smoke covered"
  ]);

  const result = await reportLoop(repo);
  const report = await readFile(join(repo, ".loopy", "evidence", "report.md"), "utf8");

  assert.equal(result.artifact.relativePath, ".loopy/evidence/report.md");
  assert.match(report, /## Next Action/);
  assert.match(report, /State: `record_evidence`/);
  assert.match(report, /Command: `loopy loop prove -- <validation-command>`/);
  assert.match(report, /Proof target: G001\/C002 pass -> `.loopy\/evidence\/G001-C002.txt`/);
  assert.match(report, /## Evidence Summary\n- 1 artifact-backed criteria\n- 1 missing proof\n- 3 timeline events/);
  assert.match(report, /## Evidence Warnings\n- manual-proof: G001\/C001 is passed with artifact-only proof/);
  assert.match(report, /## Recorded Evidence/);
  assert.match(evidence.criterion.capturedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.match(report, /G001\/C001 pass at \d{4}-\d{2}-\d{2}T.* -> `.loopy\/evidence\/g001-c001.txt` - Happy path works from the real user-facing surface\. - notes: manual smoke covered/);
  assert.match(report, /3\. \d{4}-\d{2}-\d{2}T.* evidence_passed G001\/C001 pass `.loopy\/evidence\/g001-c001.txt` notes: manual smoke covered/);
  assert.match(report, /## Proof Plan/);
  assert.match(report, /G001\/C002 pending capture `loopy loop capture --goal-id G001 --criterion-id C002 --notes "<summary>" -- <validation-command>`/);
});

test("report artifact surfaces exhausted worker attempts as warnings", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship a CLI loop"]);
  const payload = {
    hook_event_name: "SubagentStop",
    agent_type: "franky",
    session_id: "s1",
    agent_id: "a1",
    cwd: repo,
    last_assistant_message: "no receipt"
  };
  runSubagentStopHook(payload);
  runSubagentStopHook(payload);
  runSubagentStopHook(payload);
  assert.equal(runSubagentStopHook(payload), "");

  const result = await reportLoop(repo);
  const report = await readFile(join(repo, ".loopy", "evidence", "report.md"), "utf8");

  assert.equal(result.trace.warnings.some((item) => item.kind === "subagent_attempt_exhausted"), true);
  assert.match(report, /subagent_attempt_exhausted/);
});
