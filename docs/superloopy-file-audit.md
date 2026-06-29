# Superloopy File Audit

This audit records the current Superloopy repository surface, why each file exists, and how it stays inside a Superloopy-native boundary.

Superloopy-native boundary: public names, docs, tests, and runtime modules describe Superloopy behavior directly. Superloopy does not vendor external harness code, generated runtime state, or hard-code external role names.

## Original Superloopy Role

Superloopy is its own lightweight loop harness: one small CLI, repo-local `.superloopy/` state, artifact-backed criteria, guided next actions, and Codex hooks that reinforce the loop without turning every task into a large orchestration system.

## File Inventory

| File | Original Superloopy role | Compatibility boundary |
| --- | --- | --- |
| `.agents/plugins/marketplace.json` | Repo-local Codex marketplace entry that exposes the root Superloopy plugin as `superloopy@beefiker`. | Uses Codex marketplace metadata only; points at this plugin root without vendoring external code. |
| `.codex/agents/zyro.toml` | Project-scoped Codex reviewer agent for bounded Superloopy subagent workflows. | Superloopy-native report contract plus advisory model policy; no product edits and no external workflow dependency. |
| `.codex/agents/fronk.toml` | Project-scoped Codex executor agent for one criterion or independent slice. | Superloopy-native handoff, evidence receipt, and advisory model policy only. |
| `.codex/agents/jumbo.toml` | Project-scoped Codex gate reviewer for final evidence integration. | Uses Superloopy evidence, review, QA, audit, criteria coverage, and advisory model policy as the authority. |
| `.codex/agents/usk.toml` | Project-scoped Codex QA agent for artifact-backed scenario evidence. | Superloopy-native QA report contract plus advisory model policy; no product edits. |
| `.codex-plugin/plugin.json` | Local plugin metadata, hook registration, skill entry, and default Superloopy prompt. | Uses Codex plugin shape only; no external assets. |
| `.gitignore` | Keeps runtime state, logs, coverage, and dependencies out of source control. | Superloopy runtime ignore set only. |
| `LICENSE` | MIT license for this repo. | Standard license text. |
| `README.md` | English public product overview, language switcher, marketplace install flow, bootstrap behavior, command flow, state model, hooks, gates, and doctor checks. | Uses Superloopy-native product terms and current install commands. |
| `README.ko.md` | Korean public product overview translated from the root README. | Documentation-only locale surface; mirrors Superloopy behavior without adding runtime logic. |
| `README.zh-CN.md` | Simplified Chinese public product overview translated from the root README. | Documentation-only locale surface; mirrors Superloopy behavior without adding runtime logic. |
| `README.ja.md` | Japanese public product overview translated from the root README. | Documentation-only locale surface; mirrors Superloopy behavior without adding runtime logic. |
| `README.es.md` | Spanish public product overview translated from the root README. | Documentation-only locale surface; mirrors Superloopy behavior without adding runtime logic. |
| `.github/assets/fronk.png` | README crew-card image for the fronk executor agent. | Documentation image only; no executable plugin logic. |
| `.github/assets/zyro.png` | README crew-card image for the zyro reviewer agent. | Documentation image only; no executable plugin logic. |
| `.github/assets/usk.png` | README crew-card image for the usk QA agent. | Documentation image only; no executable plugin logic. |
| `.github/assets/jumbo.png` | README crew-card image for the jumbo gate-reviewer agent. | Documentation image only; no executable plugin logic. |
| `.github/assets/rovyn.png` | README crew-card image for the rovyn auditor agent. | Documentation image only; no executable plugin logic. |
| `.github/assets/nomi.png` | README crew-card image for the nomi navigator agent. | Documentation image only; no executable plugin logic. |
| `.github/assets/transferloom-clone-reference.png` | README clone-demo screenshot showing the validated Transferloom.com Superloopy clone reference. | Documentation image only; generated from the local clone output and contains no executable plugin logic. |
| `web/README.md` | Static web demo deployment notes for the Superloopy landing page. | Documentation-only web surface; no runtime plugin logic. |
| `web/_headers` | Static hosting header rules for the web demo. | Web-hosting metadata only; does not affect CLI/runtime behavior. |
| `web/assets/fronk.png` | Web crew-card image for the fronk executor agent. | Website image only; no executable plugin logic. |
| `web/assets/zyro.png` | Web crew-card image for the zyro reviewer agent. | Website image only; no executable plugin logic. |
| `web/assets/usk.png` | Web crew-card image for the usk QA agent. | Website image only; no executable plugin logic. |
| `web/assets/jumbo.png` | Web crew-card image for the jumbo gate-reviewer agent. | Website image only; no executable plugin logic. |
| `web/assets/rovyn.png` | Web crew-card image for the rovyn auditor agent. | Website image only; no executable plugin logic. |
| `web/assets/nomi.png` | Web crew-card image for the nomi navigator agent. | Website image only; no executable plugin logic. |
| `web/assets/loopi.jpg` | Web landing-page hero image for Loopi. | Website image only; no executable plugin logic. |
| `web/index.html` | Static Superloopy landing page using owned role names and image assets. | Web demo only; package/runtime behavior stays in CLI, hooks, and skills. |
| `docs/superloopy-design-audit.md` | Doctor-verified decision matrix for naming, compatibility, and threshold records. | Records Superloopy decisions, not source-project lineage. |
| `docs/superloopy-crew-lines.md` | Crew-line precedent, policy, and runtime contract for presentation-only handoff flavor. | Keeps lines Superloopy-original and non-authoritative beside mechanical evidence state. |
| `docs/superloopy-file-audit.md` | File-by-file audit and reviewability note. | Proves every Git-visible file has a role and boundary. |
| `docs/superloopy-gate-notes.md` | Gate compatibility notes and golden scenario list. | Names review and matrix gates as Superloopy contracts. |
| `docs/superloopy-host-contract.md` | The host-runtime contract Superloopy rides: installable agents, the SubagentStop payload fields, and the host behaviors Superloopy cannot verify. | Superloopy-native; states advisory limits and the deterministic-floor backstop. |
| `docs/superloopy-loop-golden-set.md` | Long-running golden set, threshold model, file evidence inventory, and run history. | Scores Superloopy on its own behavior. |
| `docs/superloopy-model-policy.md` | Advisory model, reasoning-effort, and service-tier defaults for bundled Superloopy agents. | Explicitly treats model choice as steering, not proof. |
| `hooks/pre-tool-use.json` | Registers the PreToolUse guard command. | Thin Superloopy hook wrapper. |
| `hooks/session-start.json` | Provides first-launch bootstrap, marketplace update notices, and optional session-start context injection. | Routes through Superloopy CLI; bootstrap installs only the command wrapper and bundled agents, and update checks never run npx self-update for marketplace or checkout installs. |
| `hooks/stop.json` | Provides optional stop continuation guard. | Routes through Superloopy CLI when enabled locally. |
| `hooks/subagent-stop.json` | Registers evidence receipt verification for Superloopy executor, review, QA, and gate subagents. | Receipts use Superloopy evidence roots. |
| `hooks/subagent-stop-audit.json` | Registers rovyn verdict-receipt validation. | Verdict receipts use Superloopy evidence roots. |
| `hooks/user-prompt-submit.json` | Registers steering and trigger-scoped context injection. | Structured `SUPERLOOPY_STEER` and explicit Superloopy prompt triggers only. |
| `package.json` | Dependency-free Node package metadata, bin, and scripts including manifest version sync. | Keeps Superloopy small and dependency-free. |
| `scripts/sync-version.mjs` | Release helper that stamps `package.json` and `.codex-plugin/plugin.json` from one authoritative Superloopy version. | Superloopy release metadata only; no runtime dependency or publishing side effect. |
| `skills/superloopy-clone/SKILL.md` | Skill instructions for authorized website cloning with browser extraction, component specs, implementation, and visual QA evidence. | Superloopy-governed workflow only; no template dependency or bundled external code. |
| `skills/superloopy-clone/agents/openai.yaml` | Minimal agent metadata for discovering the Superloopy clone skill. | Superloopy-native skill metadata only. |
| `skills/superloopy-loop/SKILL.md` | Skill instructions for Superloopy guide, proof, capture, evidence, check, finish, review, checkpoint, and doctor flow. | Uses Superloopy-native workflow terms. |
| `skills/superloopy-loop/agents/openai.yaml` | Minimal agent metadata for Superloopy discovery. | Search terms are Superloopy-native. |
| `skills/superloopy-research/SKILL.md` | Skill instructions for deep research with EXPAND waves, claim verification, cited synthesis, and Superloopy evidence artifacts. | Superloopy-native research workflow; workers return text and parent-owned artifacts remain authoritative. |
| `skills/superloopy-research/agents/openai.yaml` | Minimal agent metadata for discovering the Superloopy research skill. | Superloopy-native skill metadata only. |
| `.codex/agents/rovyn.toml` | Read-only skeptical evidence-auditor agent, installed so the host can spawn the rovyn auditor by name. | Superloopy-native auditor contract plus advisory model policy. |
| `.codex/agents/nomi.toml` | Read-only codebase-navigator agent for subagent-driven work; locates files and code and returns absolute paths, writing no evidence receipt. | Superloopy-native read-only search contract with fast advisory model defaults; no product edits and no host coupling. |
| `src/agents.js` | Installs bundled Superloopy custom agent TOML files, the command wrapper, and the combined bootstrap used by plugin startup. | Conservative Superloopy installer; skips identical files and requires `--force` for changed local files. |
| `src/args.js` | Shared flag/stdin/JSON parsing helpers. | Generic Superloopy CLI utility. |
| `src/artifacts.js` | Evidence path confinement, symlink rejection, and quality-gate dispatch. | Dispatches Superloopy review, matrix, and default gates. |
| `src/auto-update.js` | SessionStart update checker: detects install flow, throttles checks, records update state, starts npx self-update only for explicit npx-local snapshots, and reports marketplace upgrade notices. | Adapted to Superloopy distribution boundaries; marketplace and checkout installs are never auto-updated through npx. |
| `src/auto-update-plan.js` | Semver comparison, latest/current version resolution, install-flow routing, and default update command construction. | Superloopy-owned planning logic; npm lookup is advisory and can be overridden by environment for tests or future release channels. |
| `src/auto-update-state.js` | Auto-update state, log, and lock file helpers. | Writes under Superloopy data paths or explicit env overrides; used only by the update checker. |
| `src/audit.js` | Deterministic evidence auditor: re-runs command-backed criteria, hashes results, records audit-state, caches unchanged work; `auditOneCriterion` force-re-derives one criterion in-process for accept/gate time. | Superloopy-owned re-run anchor; never force-completes. |
| `src/audit-hooks.js` | Validates rovyn verdict receipts by RE-DERIVING the floor in-process (never trusting worker-writable recorded state), then hash-binding and floor-dominance; idempotent on replay. | Superloopy-native; LLM verdict advisory and downgrade-only. |
| `src/audit-verdict.js` | Structural verdict + gate-section validators and the symmetric floor-dominance cross-check (a non-pass floor surfaces, is never flipped by the LLM). | Deterministic; independence limits documented. |
| `src/audit-gate-verify.js` | Completion-time provenance: re-derives every cited audit verdict so the deterministic spine actually gates aggregate completion. | Superloopy-native; closes the gate-decoupling gap. |
| `src/begin.js` | One-command entrypoint that creates a plan and starts the first goal. | Superloopy-specific ease-of-start flow. |
| `src/capture.js` | Runs validation commands and records transcript artifacts as pass/fail evidence. | Superloopy evidence convenience layer. |
| `src/check.js` | Non-mutating evidence preflight with summary counts, warnings, repair plan, and exact commands. | Superloopy-only strictness layer. |
| `src/cli.js` | Single command dispatcher for install, loop, bin, agents, doctor, hook entrypoints, and handoff/fleet text output; supports symlinked bin execution. | Public doctor scan uses generic comparison paths; install writes only local wrapper and agent files; crew lines remain presentation-only. |
| `src/comparison-similarity.js` | Optional copied-block scanner against a caller-provided folder. | Generic comparison; no named source coupling. |
| `src/continuation.js` | Bounded, progress-gated Stop-hook engine that drives the loop toward evidence-backed completion and marks blocked on a cap or stall. | Superloopy-native continuation; never force-completes. |
| `src/crew-lines.js` | Deterministic original localized one-line responses for known crew handoffs with terminal verdicts. | Output-only flavor; pending or unknown lanes stay silent and persisted handoff state is not decorated. |
| `src/design-audit.js` | Verifies Superloopy design audit sections and decision rows. | Guards Superloopy-native decisions. |
| `src/doctor.js` | Local health check orchestrator for package, hooks, docs, comparison scan, model policy, and reviewability. | Enforces file audits, design audits, and advisory model defaults. |
| `src/engineer.js` | Loop-engineer trigger that turns the `loopy` keyword into a guided drive of begin, prove, check, and finish. | Superloopy keyword activation and guide-backed context. |
| `src/file-audit.js` | Row-level file inventory verifier for audit coverage, stale rows, incomplete rows, and native boundary policy. | Checks Superloopy audit structure. |
| `src/finish.js` | One-command finalization that writes the default gate, checkpoints remaining goals, writes the report, and returns the complete guide. | Superloopy-specific lighter flow. |
| `src/fleet.js` | Parent-side subagent coordination: a handoff registry, artifact-bound accept verdicts, fleet reconciliation, and presentation-only crew-line decoration. | Superloopy-native; parent-side only, never spawns or completes. |
| `src/goals.js` | Goal parsing, seeded evidence criteria, lookup, completion guards, and artifact collection. | Original Superloopy plan model. |
| `src/guide.js` | Computes next action, proof target, proof plan, recorded evidence, templates, blockers, and paths. | Original navigation layer with flow checklist. |
| `src/help.js` | CLI help text with shortest evidence-backed flow and pass-artifact rule. | Superloopy-specific onboarding surface. |
| `src/hooks.js` | Codex hook runtime for bootstrap, receipts, guide-backed context, continuation, and steering. | Superloopy hook messages, setup paths, and evidence roots. |
| `src/install-flow.js` | Distinguishes marketplace, checkout, future npx-local snapshot, and unknown install states. | Prevents unsafe npx self-update when Superloopy was installed from marketplace or checkout. |
| `src/loop.js` | Core plan lifecycle: create, status, next, evidence, review, checkpoint, and steering. | Original `.superloopy` state machine. |
| `src/matrix-gate.js` | Validator for strict matrix quality gates. | Keeps compatible shape under Superloopy-native module name. |
| `src/model-policy.js` | Doctor helper that checks model-policy docs and bundled agent TOML defaults. | Advisory policy only; never treats model choice as proof. |
| `src/plan-summary.js` | Compact derived progress summary. | Superloopy-only helper. |
| `src/pre-tool-use.js` | PreToolUse guard for malformed `create_goal` calls and premature native `update_goal` completion. | Uses Superloopy plan completion as the authority before native goal completion. |
| `src/prove.js` | ID-free proof shortcut for the active next unresolved criterion. | Superloopy-specific proof path. |
| `src/report.js` | Writes portable markdown evidence reports with Evidence Summary section, Evidence Warnings section, and next action. | Superloopy-only reporting layer. |
| `src/review-gate.js` | Validator for strict five-section review quality gates. | Keeps compatible shape under Superloopy-native module name. |
| `src/store.js` | `.superloopy/` path construction, session normalization, atomic JSON writes, and ledger appends. | Original storage layer. |
| `src/spawn-command.js` | Cross-platform process invocation helper for npm/npx command shims. | Minimal Superloopy utility used by update planning only. |
| `src/subagent-attempts.js` | SubagentStop evidence-receipt attempt tracking and the post-cap ledger signal, factored out of hooks.js. | Superloopy-native; keeps hooks.js within the reviewability budget. |
| `src/trace.js` | Builds compact evidence trail with summary counts, warnings, missing proof, suggested paths, and timeline. | Superloopy-only inspection surface. |
| `test/audit.test.js` | Prevents this audit from missing repository files or reviewability limits. | Tests Superloopy file inventory. |
| `test/auto-update.test.js` | Auto-update contract tests for marketplace skip notices, checkout skip behavior, npx-local snapshot behavior, semver planning, install-flow detection, and Windows npx shims. | Tests Superloopy's adapted LazyCodex-style update flow without requiring an npm publish. |
| `test/subagent-receipt.test.js` | SubagentStop attempt-cap robustness and exhaustion ledger-signal tests. | Tests Superloopy receipt gate behavior. |
| `test/cli-evidence.test.js` | CLI evidence and completion smoke tests. | Covers public evidence flow. |
| `test/cli.test.js` | CLI and hook smoke tests for install, symlinked bin execution, help, create, status, next, begin, and guide output. | Tests Superloopy command surface. |
| `test/concurrency.test.js` | Cross-process file-lock serialization, re-entrancy, stale reclaim, and fail-closed timeout tests. | Tests Superloopy shared-state locking. |
| `test/crew-lines.test.js` | Unit and CLI coverage for presentation-only localized crew completion lines. | Prevents crew flavor from replacing status or speaking for pending/unknown lanes. |
| `test/docs.test.js` | Public documentation contract tests for Superloopy-native docs and threshold history. | Keeps docs aligned with product contract. |
| `test/doctor.test.js` | Doctor coverage for package, audit, comparison, design audit, and reviewability checks. | Uses synthetic fixtures only. |
| `test/file-audit.test.js` | Direct unit coverage for row-level file audit verifier. | Tests Superloopy audit parser. |
| `test/fleet.test.js` | Handoff registry, fleet reconciliation, verdict-normalization, and crew-line decoration tests. | Tests Superloopy parent-side coordination without persisting presentation flavor. |
| `test/goals.test.js` | Goal parsing, seeded criteria, lookup, and completion guard tests. | Tests Superloopy plan model. |
| `test/golden-helpers.js` | Shared temporary repo, CLI, evidence, and gate fixture helpers for golden tests. | Superloopy-owned fixtures. |
| `test/golden-continuation.test.js` | Continuation-engine scenarios: bounded iteration, no-progress and cap blocking, progress reset, context-pressure pause, scoped state, legacy off. | Proves the engine never force-completes. |
| `test/golden-audit.test.js` | Audit re-run scenarios: floor pass, cache hit, inconclusive, manual recheck. | Proves the re-run never auto-fails a passing criterion. |
| `test/golden-audit-hooks.test.js` | Verdict-receipt validation scenarios: in-process re-derivation, hash-bound accept, forged/stale/missing reject, replay idempotency. | Proves a verdict is accepted only when bound to Superloopy's fresh re-run. |
| `test/golden-audit-verdict.test.js` | Verdict + cross-check validator unit scenarios. | Proves floor dominance and structural rules. |
| `test/golden-hooks.test.js` | Hook, scoped-state, steering, continuation, receipt, and manifest scenarios. | Exercises Superloopy hook behavior. |
| `test/golden-matrix-gate.test.js` | `@goal` and matrix gate scenarios. | Keeps matrix compatibility evidence isolated. |
| `test/golden-review-gate.test.js` | Review gate acceptance and rejection scenarios. | Tests five-section gate compatibility. |
| `test/engineer.test.js` | Loop-engineer trigger tests: team/crew escalation parsing and the baseline vs. crew fan-out directive. | Tests Superloopy `loopy`/`loopy team` directive behavior. |
| `test/hooks.test.js` | Focused hook unit tests for guards, receipts, steering, context, and stop behavior. | Tests Superloopy hook implementation. |
| `test/loop-gates.test.js` | Gate, report, trace, check, review, finish, and checkpoint tests. | Covers completion evidence flows. |
| `test/loop.test.js` | Core lifecycle and command-capture unit tests. | Tests Superloopy state semantics. |
| `test/plugin.test.js` | Plugin manifest, hook route, and packaged-skill tests. | Verifies Superloopy packaging and new skill metadata. |
| `test/pre-tool-use.test.js` | Focused unit tests for native goal-tool lifecycle guards. | Prevents premature native completion while Superloopy state is incomplete. |
| `test/report.test.js` | Focused report artifact tests. | Tests report portability and guide output. |
| `test/sync-version.test.js` | Release-helper tests for stamping package and plugin manifests from one version. | Tests Superloopy release metadata sync only. |

## Weight Notes

- Current largest source file: `src/hooks.js`, kept under the reviewability cap.
- No package dependencies are added; `package.json` stays dependency-free and `superloopy doctor --json` checks that boundary.
- Marketplace update checks are advisory and self-update only runs for a future npx-local snapshot; current marketplace and checkout installs keep their documented update commands.
- Runtime state is ignored under `.superloopy/`; `superloopy doctor --json` verifies runtime samples are ignored and not tracked.
- `superloopy doctor --json` checks row-level inventory coverage for every Git-visible repository file, ignores Codex's generated `.codex-marketplace-install.json` cache metadata, fails stale audit rows, verifies role and compatibility-boundary columns, checks gate notes, checks the design audit, checks model policy, and verifies reviewable file sizes.
- `superloopy doctor --comparison-path <path> --json` adds an optional generic comparison scan for substantial copied code-shaped blocks.
