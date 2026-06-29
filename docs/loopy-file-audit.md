# Loopy File Audit

This audit records the current Loopy repository surface, why each file exists, and how it stays inside a Loopy-native boundary.

Loopy-native boundary: public names, docs, tests, and runtime modules describe Loopy behavior directly. Loopy does not vendor external harness code, generated runtime state, or hard-code external role names.

## Original Loopy Role

Loopy is its own lightweight loop harness: one small CLI, repo-local `.loopy/` state, artifact-backed criteria, guided next actions, and Codex hooks that reinforce the loop without turning every task into a large orchestration system.

## File Inventory

| File | Original Loopy role | Compatibility boundary |
| --- | --- | --- |
| `.agents/plugins/marketplace.json` | Repo-local Codex marketplace entry that exposes the root Loopy plugin as `loopy@beefiker`. | Uses Codex marketplace metadata only; points at this plugin root without vendoring external code. |
| `.codex/agents/zoro.toml` | Project-scoped Codex reviewer agent for bounded Loopy subagent workflows. | Loopy-native report contract plus advisory model policy; no product edits and no external workflow dependency. |
| `.codex/agents/franky.toml` | Project-scoped Codex executor agent for one criterion or independent slice. | Loopy-native handoff, evidence receipt, and advisory model policy only. |
| `.codex/agents/jinbe.toml` | Project-scoped Codex gate reviewer for final evidence integration. | Uses Loopy evidence, review, QA, audit, criteria coverage, and advisory model policy as the authority. |
| `.codex/agents/usopp.toml` | Project-scoped Codex QA agent for artifact-backed scenario evidence. | Loopy-native QA report contract plus advisory model policy; no product edits. |
| `.codex-plugin/plugin.json` | Local plugin metadata, hook registration, skill entry, and default Loopy prompt. | Uses Codex plugin shape only; no external assets. |
| `.gitignore` | Keeps runtime state, logs, coverage, and dependencies out of source control. | Loopy runtime ignore set only. |
| `LICENSE` | MIT license for this repo. | Standard license text. |
| `README.md` | English public product overview, language switcher, marketplace install flow, bootstrap behavior, command flow, state model, hooks, gates, and doctor checks. | Uses Loopy-native product terms and current install commands. |
| `README.ko.md` | Korean public product overview translated from the root README. | Documentation-only locale surface; mirrors Loopy behavior without adding runtime logic. |
| `README.zh-CN.md` | Simplified Chinese public product overview translated from the root README. | Documentation-only locale surface; mirrors Loopy behavior without adding runtime logic. |
| `README.ja.md` | Japanese public product overview translated from the root README. | Documentation-only locale surface; mirrors Loopy behavior without adding runtime logic. |
| `README.es.md` | Spanish public product overview translated from the root README. | Documentation-only locale surface; mirrors Loopy behavior without adding runtime logic. |
| `.github/assets/franky.png` | README crew-card image for the franky executor agent. | Documentation image only; no executable plugin logic. |
| `.github/assets/zoro.png` | README crew-card image for the zoro reviewer agent. | Documentation image only; no executable plugin logic. |
| `.github/assets/usopp.png` | README crew-card image for the usopp QA agent. | Documentation image only; no executable plugin logic. |
| `.github/assets/jinbe.png` | README crew-card image for the jinbe gate-reviewer agent. | Documentation image only; no executable plugin logic. |
| `.github/assets/robin.png` | README crew-card image for the robin auditor agent. | Documentation image only; no executable plugin logic. |
| `.github/assets/nami.png` | README crew-card image for the nami navigator agent. | Documentation image only; no executable plugin logic. |
| `docs/loopy-design-audit.md` | Doctor-verified decision matrix for naming, compatibility, and threshold records. | Records Loopy decisions, not source-project lineage. |
| `docs/loopy-crew-lines.md` | Crew-line precedent, policy, and runtime contract for presentation-only handoff flavor. | Keeps lines Loopy-original and non-authoritative beside mechanical evidence state. |
| `docs/loopy-file-audit.md` | File-by-file audit and reviewability note. | Proves every Git-visible file has a role and boundary. |
| `docs/loopy-gate-notes.md` | Gate compatibility notes and golden scenario list. | Names review and matrix gates as Loopy contracts. |
| `docs/loopy-host-contract.md` | The host-runtime contract Loopy rides: installable agents, the SubagentStop payload fields, and the host behaviors Loopy cannot verify. | Loopy-native; states advisory limits and the deterministic-floor backstop. |
| `docs/loopy-loop-golden-set.md` | Long-running golden set, threshold model, file evidence inventory, and run history. | Scores Loopy on its own behavior. |
| `docs/loopy-model-policy.md` | Advisory model, reasoning-effort, and service-tier defaults for bundled Loopy agents. | Explicitly treats model choice as steering, not proof. |
| `hooks/pre-tool-use.json` | Registers the PreToolUse guard command. | Thin Loopy hook wrapper. |
| `hooks/session-start.json` | Provides first-launch bootstrap plus optional session-start context injection. | Routes through Loopy CLI; bootstrap installs only the command wrapper and bundled agents, and stays quiet after files are unchanged. |
| `hooks/stop.json` | Provides optional stop continuation guard. | Routes through Loopy CLI when enabled locally. |
| `hooks/subagent-stop.json` | Registers evidence receipt verification for Loopy executor, review, QA, and gate subagents. | Receipts use Loopy evidence roots. |
| `hooks/subagent-stop-audit.json` | Registers robin verdict-receipt validation. | Verdict receipts use Loopy evidence roots. |
| `hooks/user-prompt-submit.json` | Registers steering and trigger-scoped context injection. | Structured `LOOPY_STEER` and explicit Loopy prompt triggers only. |
| `package.json` | Dependency-free Node package metadata, bin, and scripts. | Keeps Loopy small and dependency-free. |
| `skills/loopy-clone/SKILL.md` | Skill instructions for authorized website cloning with browser extraction, component specs, implementation, and visual QA evidence. | Loopy-governed workflow only; no template dependency or bundled external code. |
| `skills/loopy-clone/agents/openai.yaml` | Minimal agent metadata for discovering the Loopy clone skill. | Loopy-native skill metadata only. |
| `skills/loopy-loop/SKILL.md` | Skill instructions for Loopy guide, proof, capture, evidence, check, finish, review, checkpoint, and doctor flow. | Uses Loopy-native workflow terms. |
| `skills/loopy-loop/agents/openai.yaml` | Minimal agent metadata for Loopy discovery. | Search terms are Loopy-native. |
| `skills/loopy-research/SKILL.md` | Skill instructions for deep research with EXPAND waves, claim verification, cited synthesis, and Loopy evidence artifacts. | Loopy-native research workflow; workers return text and parent-owned artifacts remain authoritative. |
| `skills/loopy-research/agents/openai.yaml` | Minimal agent metadata for discovering the Loopy research skill. | Loopy-native skill metadata only. |
| `.codex/agents/robin.toml` | Read-only skeptical evidence-auditor agent, installed so the host can spawn the robin auditor by name. | Loopy-native auditor contract plus advisory model policy. |
| `.codex/agents/nami.toml` | Read-only codebase-navigator agent for subagent-driven work; locates files and code and returns absolute paths, writing no evidence receipt. | Loopy-native read-only search contract with fast advisory model defaults; no product edits and no host coupling. |
| `src/agents.js` | Installs bundled Loopy custom agent TOML files, the command wrapper, and the combined bootstrap used by plugin startup. | Conservative Loopy installer; skips identical files and requires `--force` for changed local files. |
| `src/args.js` | Shared flag/stdin/JSON parsing helpers. | Generic Loopy CLI utility. |
| `src/artifacts.js` | Evidence path confinement, symlink rejection, and quality-gate dispatch. | Dispatches Loopy review, matrix, and default gates. |
| `src/audit.js` | Deterministic evidence auditor: re-runs command-backed criteria, hashes results, records audit-state, caches unchanged work; `auditOneCriterion` force-re-derives one criterion in-process for accept/gate time. | Loopy-owned re-run anchor; never force-completes. |
| `src/audit-hooks.js` | Validates robin verdict receipts by RE-DERIVING the floor in-process (never trusting worker-writable recorded state), then hash-binding and floor-dominance; idempotent on replay. | Loopy-native; LLM verdict advisory and downgrade-only. |
| `src/audit-verdict.js` | Structural verdict + gate-section validators and the symmetric floor-dominance cross-check (a non-pass floor surfaces, is never flipped by the LLM). | Deterministic; independence limits documented. |
| `src/audit-gate-verify.js` | Completion-time provenance: re-derives every cited audit verdict so the deterministic spine actually gates aggregate completion. | Loopy-native; closes the gate-decoupling gap. |
| `src/begin.js` | One-command entrypoint that creates a plan and starts the first goal. | Loopy-specific ease-of-start flow. |
| `src/capture.js` | Runs validation commands and records transcript artifacts as pass/fail evidence. | Loopy evidence convenience layer. |
| `src/check.js` | Non-mutating evidence preflight with summary counts, warnings, repair plan, and exact commands. | Loopy-only strictness layer. |
| `src/cli.js` | Single command dispatcher for install, loop, bin, agents, doctor, hook entrypoints, and handoff/fleet text output; supports symlinked bin execution. | Public doctor scan uses generic comparison paths; install writes only local wrapper and agent files; crew lines remain presentation-only. |
| `src/comparison-similarity.js` | Optional copied-block scanner against a caller-provided folder. | Generic comparison; no named source coupling. |
| `src/continuation.js` | Bounded, progress-gated Stop-hook engine that drives the loop toward evidence-backed completion and marks blocked on a cap or stall. | Loopy-native continuation; never force-completes. |
| `src/crew-lines.js` | Deterministic original localized one-line responses for known crew handoffs with terminal verdicts. | Output-only flavor; pending or unknown lanes stay silent and persisted handoff state is not decorated. |
| `src/design-audit.js` | Verifies Loopy design audit sections and decision rows. | Guards Loopy-native decisions. |
| `src/doctor.js` | Local health check orchestrator for package, hooks, docs, comparison scan, model policy, and reviewability. | Enforces file audits, design audits, and advisory model defaults. |
| `src/engineer.js` | Loop-engineer trigger that turns the `loopy` keyword into a guided drive of begin, prove, check, and finish. | Loopy keyword activation and guide-backed context. |
| `src/file-audit.js` | Row-level file inventory verifier for audit coverage, stale rows, incomplete rows, and native boundary policy. | Checks Loopy audit structure. |
| `src/finish.js` | One-command finalization that writes the default gate, checkpoints remaining goals, writes the report, and returns the complete guide. | Loopy-specific lighter flow. |
| `src/fleet.js` | Parent-side subagent coordination: a handoff registry, artifact-bound accept verdicts, fleet reconciliation, and presentation-only crew-line decoration. | Loopy-native; parent-side only, never spawns or completes. |
| `src/goals.js` | Goal parsing, seeded evidence criteria, lookup, completion guards, and artifact collection. | Original Loopy plan model. |
| `src/guide.js` | Computes next action, proof target, proof plan, recorded evidence, templates, blockers, and paths. | Original navigation layer with flow checklist. |
| `src/help.js` | CLI help text with shortest evidence-backed flow and pass-artifact rule. | Loopy-specific onboarding surface. |
| `src/hooks.js` | Codex hook runtime for bootstrap, receipts, guide-backed context, continuation, and steering. | Loopy hook messages, setup paths, and evidence roots. |
| `src/loop.js` | Core plan lifecycle: create, status, next, evidence, review, checkpoint, and steering. | Original `.loopy` state machine. |
| `src/matrix-gate.js` | Validator for strict matrix quality gates. | Keeps compatible shape under Loopy-native module name. |
| `src/model-policy.js` | Doctor helper that checks model-policy docs and bundled agent TOML defaults. | Advisory policy only; never treats model choice as proof. |
| `src/plan-summary.js` | Compact derived progress summary. | Loopy-only helper. |
| `src/pre-tool-use.js` | PreToolUse guard for malformed `create_goal` calls and premature native `update_goal` completion. | Uses Loopy plan completion as the authority before native goal completion. |
| `src/prove.js` | ID-free proof shortcut for the active next unresolved criterion. | Loopy-specific proof path. |
| `src/report.js` | Writes portable markdown evidence reports with Evidence Summary section, Evidence Warnings section, and next action. | Loopy-only reporting layer. |
| `src/review-gate.js` | Validator for strict five-section review quality gates. | Keeps compatible shape under Loopy-native module name. |
| `src/store.js` | `.loopy/` path construction, session normalization, atomic JSON writes, and ledger appends. | Original storage layer. |
| `src/subagent-attempts.js` | SubagentStop evidence-receipt attempt tracking and the post-cap ledger signal, factored out of hooks.js. | Loopy-native; keeps hooks.js within the reviewability budget. |
| `src/trace.js` | Builds compact evidence trail with summary counts, warnings, missing proof, suggested paths, and timeline. | Loopy-only inspection surface. |
| `test/audit.test.js` | Prevents this audit from missing repository files or reviewability limits. | Tests Loopy file inventory. |
| `test/subagent-receipt.test.js` | SubagentStop attempt-cap robustness and exhaustion ledger-signal tests. | Tests Loopy receipt gate behavior. |
| `test/cli-evidence.test.js` | CLI evidence and completion smoke tests. | Covers public evidence flow. |
| `test/cli.test.js` | CLI and hook smoke tests for install, symlinked bin execution, help, create, status, next, begin, and guide output. | Tests Loopy command surface. |
| `test/concurrency.test.js` | Cross-process file-lock serialization, re-entrancy, stale reclaim, and fail-closed timeout tests. | Tests Loopy shared-state locking. |
| `test/crew-lines.test.js` | Unit and CLI coverage for presentation-only localized crew completion lines. | Prevents crew flavor from replacing status or speaking for pending/unknown lanes. |
| `test/docs.test.js` | Public documentation contract tests for Loopy-native docs and threshold history. | Keeps docs aligned with product contract. |
| `test/doctor.test.js` | Doctor coverage for package, audit, comparison, design audit, and reviewability checks. | Uses synthetic fixtures only. |
| `test/file-audit.test.js` | Direct unit coverage for row-level file audit verifier. | Tests Loopy audit parser. |
| `test/fleet.test.js` | Handoff registry, fleet reconciliation, verdict-normalization, and crew-line decoration tests. | Tests Loopy parent-side coordination without persisting presentation flavor. |
| `test/goals.test.js` | Goal parsing, seeded criteria, lookup, and completion guard tests. | Tests Loopy plan model. |
| `test/golden-helpers.js` | Shared temporary repo, CLI, evidence, and gate fixture helpers for golden tests. | Loopy-owned fixtures. |
| `test/golden-continuation.test.js` | Continuation-engine scenarios: bounded iteration, no-progress and cap blocking, progress reset, context-pressure pause, scoped state, legacy off. | Proves the engine never force-completes. |
| `test/golden-audit.test.js` | Audit re-run scenarios: floor pass, cache hit, inconclusive, manual recheck. | Proves the re-run never auto-fails a passing criterion. |
| `test/golden-audit-hooks.test.js` | Verdict-receipt validation scenarios: in-process re-derivation, hash-bound accept, forged/stale/missing reject, replay idempotency. | Proves a verdict is accepted only when bound to Loopy's fresh re-run. |
| `test/golden-audit-verdict.test.js` | Verdict + cross-check validator unit scenarios. | Proves floor dominance and structural rules. |
| `test/golden-hooks.test.js` | Hook, scoped-state, steering, continuation, receipt, and manifest scenarios. | Exercises Loopy hook behavior. |
| `test/golden-matrix-gate.test.js` | `@goal` and matrix gate scenarios. | Keeps matrix compatibility evidence isolated. |
| `test/golden-review-gate.test.js` | Review gate acceptance and rejection scenarios. | Tests five-section gate compatibility. |
| `test/engineer.test.js` | Loop-engineer trigger tests: team/crew escalation parsing and the baseline vs. crew fan-out directive. | Tests Loopy `loopy`/`loopy team` directive behavior. |
| `test/hooks.test.js` | Focused hook unit tests for guards, receipts, steering, context, and stop behavior. | Tests Loopy hook implementation. |
| `test/loop-gates.test.js` | Gate, report, trace, check, review, finish, and checkpoint tests. | Covers completion evidence flows. |
| `test/loop.test.js` | Core lifecycle and command-capture unit tests. | Tests Loopy state semantics. |
| `test/plugin.test.js` | Plugin manifest, hook route, and packaged-skill tests. | Verifies Loopy packaging and new skill metadata. |
| `test/pre-tool-use.test.js` | Focused unit tests for native goal-tool lifecycle guards. | Prevents premature native completion while Loopy state is incomplete. |
| `test/report.test.js` | Focused report artifact tests. | Tests report portability and guide output. |

## Weight Notes

- Current largest source file: `src/hooks.js`, kept under the reviewability cap.
- No package dependencies are added; `package.json` stays dependency-free and `loopy doctor --json` checks that boundary.
- Runtime state is ignored under `.loopy/`; `loopy doctor --json` verifies runtime samples are ignored and not tracked.
- `loopy doctor --json` checks row-level inventory coverage for every Git-visible repository file, ignores Codex's generated `.codex-marketplace-install.json` cache metadata, fails stale audit rows, verifies role and compatibility-boundary columns, checks gate notes, checks the design audit, checks model policy, and verifies reviewable file sizes.
- `loopy doctor --comparison-path <path> --json` adds an optional generic comparison scan for substantial copied code-shaped blocks.
