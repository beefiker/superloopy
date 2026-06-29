# Loopy Gate Notes

Loopy keeps strict completion evidence while using Loopy-owned names in code, docs, tests, and public commands.

## Gate Compatibility

- Default gate: `status: "passed"` plus non-empty artifact paths under the active evidence root.
- Review gate: `codeReview`, `manualQa`, `gateReview`, `iteration`, `criteriaCoverage`, and `audit` sections must all validate.
- Matrix gate: `architectReview`, `executorQa`, `iteration`, and `audit` sections must all validate.
- Audit section: `recommendation: "APPROVE"`, a non-empty `verdicts` array of resolvable verdict artifacts, and empty `blockers`. Mandatory for review and matrix gates; opt-in for the default gate via `LOOPY_AUDIT=on`. Structural validation only checks the section is well-formed and the verdict files resolve. **Completion-time provenance** (`audit-gate-verify.js`, wired into `review`/`checkpoint`) then re-derives **every passed criterion's** floor in-process (not just the cited ones) and requires each cited verdict to be a hash-bound pass over that fresh re-run — so a regressed command criterion can't be skipped and a section pointing at hand-written verdict files cannot authorize completion. The deterministic re-run is the source of truth, re-derived at decision time and never trusted from the worker-writable `.loopy/audit-state.json`; the `robin` LLM verdict is advisory and downgrade-only. Scope limit: the deterministic guarantee is strong for **command-backed** criteria (Loopy re-runs the command); a **manual (commandless)** criterion is re-validated for artifact existence only — its correctness rests on the auditor's judgment and human review, not the floor. Prefer command-backed proof.
- Actor fields must be non-empty but are not tied to hard-coded role names.
- Artifact references must resolve inside `.loopy/evidence/` or the active scoped evidence root, must not be symlinks, and must be non-empty files.
- `loopy loop review --artifact` and `loopy loop finish --artifact` write the machine quality gate and require a `.json` path. Human Markdown gate reports, such as a crew final-gate report, must be recorded as separate evidence artifacts.

## Golden Scenarios

`test/golden-hooks.test.js`, `test/golden-review-gate.test.js`, and `test/golden-matrix-gate.test.js` verify:

- context-pressure Stop silence
- strict `create_goal` guard wording
- trigger-scoped context injection on `UserPromptSubmit`
- ordinary prompt silence when active Loopy state exists
- malformed steering fail-closed behavior
- unsafe steering rejection
- invalid target fail-closed behavior
- scoped session isolation
- scoped hook context injection
- scoped steering isolation from global state
- `LOOPY_EVIDENCE` and legacy receipt compatibility
- symlink evidence rejection
- three-attempt subagent receipt state
- five-section review gate acceptance
- weak manual QA quality gate rejection
- `@goal` story splitting
- empty `@goal` block rejection
- matrix gate acceptance
- inline-only executor QA proof rejection
- not-applicable adversarial case rejection
- one-time SessionStart bootstrap for the command wrapper and bundled agents
- quiet default plugin continuation hook registration
- packaged Stop hook that remains runtime opt-in through `LOOPY_STOP_HOOK=on`
- premature native `update_goal status=complete` rejection while Loopy aggregate completion is incomplete
- accepted fleet handoffs requiring active-root evidence artifacts
- crew completion lines staying presentation-only beside handoff and fleet status
- model policy defaults checked by doctor
- commandless manual proof and exhausted-attempt warnings in trace, check, and report

Evidence trace: Loopy's `trace` view shows artifact-backed proof, missing proof, suggested artifact paths, summary counts, and timestamped ledger events.

Evidence report: Loopy writes a portable report artifact with an Evidence Summary section, recorded evidence, artifact capture times, a timestamped timeline, next action, and proof plan.

Evidence warnings: Loopy surfaces commandless manual proof and exhausted worker/auditor attempts as warnings. They do not replace the strict proof floor; they point the parent toward stronger command-backed evidence or a smaller respawned lane.

Flow checklist guide: Loopy's guide and hooks show start or resume, record artifact-backed proof, check evidence, and finish with quality gate.

## Host Contract

Loopy rides the host's native subagents. The precise `SubagentStop` payload contract and the host behaviors Loopy cannot verify (advisory limits) are documented in `docs/loopy-host-contract.md`. Absent host support the hook gates degrade to advisory, while the deterministic completion floor still gates completion on the CLI path.
