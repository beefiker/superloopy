import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
export async function tempRepo() {
  return mkdtemp(join(tmpdir(), "loopy-golden-"));
}

export function runCli(args, options = {}) {
  return spawnSync(process.execPath, [join(process.cwd(), "src/cli.js"), ...args], {
    cwd: options.cwd ?? process.cwd(),
    encoding: "utf8",
    env: options.env ?? process.env,
    input: options.input,
    timeout: 10_000
  });
}

export async function writeEvidence(repo, name, content = "proof\n") {
  const evidenceDir = join(repo, ".loopy", "evidence");
  await mkdir(evidenceDir, { recursive: true });
  const path = join(evidenceDir, name);
  await writeFile(path, content, "utf8");
  return `.loopy/evidence/${name}`;
}

export async function writeQualityGateArtifacts(repo) {
  return {
    codeReview: await writeEvidence(repo, "code-review.md", "APPROVE\n"),
    gateReview: await writeEvidence(repo, "gate-review.md", "APPROVE\n"),
    cliPass: await writeEvidence(repo, "cli-pass.txt", "PASS\n"),
    malformedReject: await writeEvidence(repo, "malformed-reject.txt", "rejected\n"),
    auditVerdict: await writeEvidence(repo, "review-audit-verdict.json", '{"verdict":"pass"}\n')
  };
}

export async function writeMatrixGateArtifacts(repo) {
  return {
    cliRun: await writeEvidence(repo, "matrix-cli-run.txt", "CLI replay and regression evidence\n"),
    redTeam: await writeEvidence(repo, "matrix-risk-probe.txt", "Malformed steering and weak evidence rejection passed\n"),
    auditVerdict: await writeEvidence(repo, "matrix-audit-verdict.json", '{"verdict":"pass"}\n')
  };
}

function auditSection(paths) {
  return { recommendation: "APPROVE", verdicts: [paths.auditVerdict], blockers: [] };
}

// Writes a GENUINE audit verdict bound to a manual (no-command) criterion's proof
// artifact, so it survives completion-time re-derivation (enforceAuditProvenance). The
// criterion re-derives to floor:pass / rerunStatus:"manual-recheck" and the cited
// artifact hash matches Loopy's fresh re-run of that same artifact.
export async function writeGenuineAuditVerdict(repo, { criterion = "G001/C001", artifact, name = "genuine-audit-verdict.json" } = {}) {
  const verdict = {
    criterion,
    verdict: "pass",
    rerun: { artifact, status: "manual-recheck", exitCode: null },
    citations: [`Re-derived manual proof for ${criterion}.`]
  };
  await mkdir(join(repo, ".loopy", "evidence", "audit"), { recursive: true });
  const rel = `.loopy/evidence/audit/${name}`;
  await writeFile(join(repo, rel), JSON.stringify(verdict), "utf8");
  return rel;
}

export function reviewStyleQualityGate(paths, overrides = {}) {
  return {
    codeReview: {
      by: "zoro",
      recommendation: "APPROVE",
      codeQualityStatus: "CLEAR",
      reportPath: paths.codeReview,
      evidence: "Reviewed the diff and found no blocking quality issues.",
      blockers: []
    },
    manualQa: {
      by: "usopp",
      status: "passed",
      evidence: "Executed CLI golden scenarios and captured artifact-backed outcomes.",
      surfaceEvidence: [
        {
          id: "surface-cli-pass",
          criterionRef: "C001",
          surface: "cli",
          invocation: "node --test test/golden-review-gate.test.js",
          verdict: "passed",
          artifactRefs: ["artifact-cli-pass"]
        }
      ],
      adversarialCases: [
        {
          id: "adv-malformed-steering",
          criterionRef: "C002",
          scenario: "malformed steering marker",
          expectedBehavior: "hook returns empty output",
          verdict: "passed",
          artifactRefs: ["artifact-malformed-reject"]
        }
      ],
      artifactRefs: [
        {
          id: "artifact-cli-pass",
          kind: "cli-transcript",
          description: "CLI transcript for valid golden test run.",
          path: paths.cliPass
        },
        {
          id: "artifact-malformed-reject",
          kind: "log",
          description: "Log proving malformed steering is rejected.",
          path: paths.malformedReject
        }
      ]
    },
    gateReview: {
      by: "jinbe",
      recommendation: "APPROVE",
      reportPath: paths.gateReview,
      evidence: "Rechecked reviewer reports and manual QA artifacts.",
      blockers: []
    },
    iteration: {
      fullRerun: true,
      status: "passed",
      rerunCommands: ["npm test"],
      evidence: "Full suite rerun passed."
    },
    criteriaCoverage: {
      totalCriteria: 2,
      passCount: 2,
      originalIntent: "Build a strict but lighter Loopy loop harness.",
      desiredOutcome: "Artifact-backed completion with prompt-injection and hook guardrails.",
      userOutcomeReview: "The user-visible loop behavior is covered by golden tests.",
      adversarialClassesCovered: ["malformed_input", "prompt_injection", "stale_state"]
    },
    audit: auditSection(paths),
    ...overrides
  };
}

export function matrixStyleQualityGate(paths) {
  return {
    architectReview: {
      architectureStatus: "CLEAR",
      productStatus: "CLEAR",
      codeStatus: "CLEAR",
      recommendation: "APPROVE",
      evidence: "Architect review covered architecture, product behavior, and code changes.",
      commands: ["architect-review"],
      blockers: []
    },
    executorQa: {
      status: "passed",
      e2eStatus: "passed",
      redTeamStatus: "passed",
      evidence: "Executor QA covered the CLI surface and adversarial failure modes.",
      e2eCommands: ["node --test test/golden-matrix-gate.test.js"],
      redTeamCommands: ["node --test test/golden-matrix-gate.test.js"],
      artifactRefs: [
        {
          id: "cli-run",
          kind: "cli-transcript",
          path: paths.cliRun,
          description: "CLI transcript for the user-facing Loopy flow."
        },
        {
          id: "red-team",
          kind: "failure-mode-test",
          path: paths.redTeam,
          description: "Adversarial evidence for malformed and weak-proof rejection."
        }
      ],
      contractCoverage: [
        {
          id: "contract-loop",
          contractRef: "approved-plan:loop",
          obligation: "Loopy must complete only with artifact-backed verification.",
          status: "covered",
          surfaceEvidenceRefs: ["surface-cli"],
          adversarialCaseRefs: ["case-malformed"]
        }
      ],
      surfaceEvidence: [
        {
          id: "surface-cli",
          surface: "cli",
          contractRef: "approved-plan:loop",
          invocation: "node --test test/golden-matrix-gate.test.js",
          verdict: "passed",
          artifactRefs: ["cli-run"]
        }
      ],
      adversarialCases: [
        {
          id: "case-malformed",
          contractRef: "approved-plan:loop",
          scenario: "Malformed steering or weak completion proof is supplied.",
          expectedBehavior: "Loopy fails closed and requires real evidence.",
          verdict: "passed",
          artifactRefs: ["red-team"]
        }
      ],
      blockers: []
    },
    iteration: {
      status: "passed",
      evidence: "Full verification reran after the final audit.",
      fullRerun: true,
      rerunCommands: ["npm test"],
      blockers: []
    },
    audit: auditSection(paths)
  };
}

export function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

export function hookPayload(overrides = {}) {
  return {
    hook_event_name: "Stop",
    session_id: "sess.1",
    turn_id: "turn.1",
    transcript_path: "",
    cwd: "/missing",
    model: "gpt-5",
    permission_mode: "default",
    stop_hook_active: false,
    ...overrides
  };
}
