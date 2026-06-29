# Loopy Loop Golden Set

This is Loopy's own long-running loop-engineering golden set. It scores Loopy on explicit criteria, artifact-backed proof, strict continuation, local state, append-only history, repository clarity, and reviewable files.

Inventory scope: Git-visible repository files from `git ls-files --cached --others --exclude-standard`.

## Strict Rules

- Each improvement turn must record a score before claiming completion.
- Each new score must be greater than the previous score.
- Each accepted score must be greater than the previous accepted score for this golden-set version.
- If a turn lowers the score, skip that turn's changes and continue from the last accepted state.
- A score is invalid without command evidence, changed-file evidence, and a short next-turn improvement target.
- Pass evidence must be artifact-backed or test-backed. Narrative-only evidence is not enough.

## Threshold Model

| Score | Meaning |
| ---: | --- |
| 20 | Repository purpose is unclear and outdated references are common. |
| 40 | Runtime names are mostly clear, but docs/tests still expose stale lineage. |
| 60 | Runtime is clear, but public docs or tests still carry stale references. |
| 80 | Public surface is Loopy-owned and compatibility behavior remains covered. |
| 100 | Fresh audit proves stale references are removed, doctor passes, and full tests pass. |

## Score Model

Total: 100 points.

| Category | Points | Strict evidence |
| --- | ---: | --- |
| Repository clarity | 25 | Git-visible files describe Loopy behavior without stale lineage references. |
| Gate compatibility | 20 | Review and matrix gates remain accepted and strict. |
| File inventory discipline | 15 | Every Git-visible file appears here and in `docs/loopy-file-audit.md`. |
| Loop continuity | 15 | Create, next, proof, report, check, finish, trace, and hooks remain covered. |
| Recorded judgment trail | 15 | This file records score history, command evidence, and next-turn targets. |
| Reviewability | 10 | Source, docs, tests, JSON, and YAML stay under the line cap. |

## Long-Running Goldens

| ID | Loop task | Command evidence | Strict pass rule |
| --- | --- | --- | --- |
| LG-01 | Repository inventory stays complete while files change. | `node --test test/audit.test.js test/file-audit.test.js` | Every Git-visible file is listed here and in `docs/loopy-file-audit.md`; stale or incomplete audit rows fail. |
| LG-02 | A long loop can advance through create, next, proof, report, check, and finish. | `node --test test/loop.test.js test/cli-evidence.test.js test/loop-gates.test.js test/report.test.js` | Each command returns the next guide action and refuses completion until pass artifacts exist. |
| LG-03 | Hooks keep long-running work from ending early. | `node --test test/hooks.test.js test/golden-hooks.test.js` | Stop, prompt, receipt, scoped session, and steering hooks are fail-closed and guide-backed. |
| LG-04 | Goal parsing and scoped state stay stable across turns. | `node --test test/goals.test.js test/golden-matrix-gate.test.js` | `@goal` stories, scoped sessions, and matrix gate rows remain deterministic. |
| LG-05 | Quality gates reject weak proof. | `node --test test/golden-review-gate.test.js test/golden-matrix-gate.test.js test/loop-gates.test.js` | Weak QA, not-applicable shortcuts, missing matrix rows, and inline-only proof fail. |
| LG-06 | Public docs and packaging stay executable. | `node --test test/docs.test.js test/plugin.test.js test/doctor.test.js` | Docs describe the real command surface, plugin hooks are valid, and doctor remains dependency-free. |
| LG-07 | Whole-repo health stays strict. | `npm test` and `node src/cli.js doctor --json` | All tests pass, doctor reports `ok: true`, and no file exceeds the reviewability limit. |
| LG-08 | The continuation engine drives bounded multi-iteration work to evidence-backed completion. | `node --test test/golden-continuation.test.js` | Blocks while incomplete and under budget, resets the stall counter only above a recorded-proof high-water mark, and stops blocked-not-complete on a cap or no-progress; aggregate completion clears loop-control state. |
| LG-09 | Crew completion lines stay localized and presentation-only. | `node --test test/crew-lines.test.js test/fleet.test.js` | Terminal known crew handoffs may speak once in a supported catalog language, pending/unknown lanes stay quiet, and evidence/status fields remain authoritative. |

## File Evidence Inventory

| File | Evidence anchor | Strict pass rule |
| --- | --- | --- |
| `.agents/plugins/marketplace.json` | `test/plugin.test.js`, audit coverage. | Must expose the root Loopy plugin as an installable Codex marketplace entry. |
| `.codex/agents/zoro.toml` | `test/docs.test.js`, audit coverage. | Must define the Loopy code-review role, active evidence root, advisory model defaults, and `LOOPY_EVIDENCE` receipt. |
| `.codex/agents/franky.toml` | `test/docs.test.js`, audit coverage. | Must define the bounded Loopy executor role, active evidence root, advisory model defaults, and `LOOPY_EVIDENCE` receipt. |
| `.codex/agents/jinbe.toml` | `test/docs.test.js`, audit coverage. | Must define the Loopy gate-review role, active evidence root, advisory model defaults, and `LOOPY_EVIDENCE` receipt. |
| `.codex/agents/usopp.toml` | `test/docs.test.js`, audit coverage. | Must define the Loopy QA role, active evidence root, advisory model defaults, and `LOOPY_EVIDENCE` receipt. |
| `.codex-plugin/plugin.json` | `test/plugin.test.js`, doctor plugin manifest check. | Must expose `./skills/` and the packaged Loopy hook files, including opt-in Stop. |
| `.gitignore` | Doctor runtime-boundary ignored samples and installed-cache docs coverage. | `.loopy/`, logs, coverage, dependencies, OS noise, and Codex marketplace metadata must stay out of source control. |
| `LICENSE` | Audit coverage and reviewability check. | Must remain a source file with no runtime implementation content. |
| `README.md` | `test/docs.test.js` public-doc assertions. | Must describe actual Loopy install, bootstrap, commands, evidence rules, hooks, gates, doctor checks, and locale links. |
| `README.ko.md` | `test/docs.test.js`, audit coverage. | Must provide the Korean README locale and keep install commands aligned with the root README. |
| `README.zh-CN.md` | `test/docs.test.js`, audit coverage. | Must provide the Simplified Chinese README locale and keep install commands aligned with the root README. |
| `README.ja.md` | `test/docs.test.js`, audit coverage. | Must provide the Japanese README locale and keep install commands aligned with the root README. |
| `README.es.md` | `test/docs.test.js`, audit coverage. | Must provide the Spanish README locale and keep install commands aligned with the root README. |
| `.github/assets/franky.png` | Audit coverage. | Must remain a README documentation image, not runtime plugin logic. |
| `.github/assets/zoro.png` | Audit coverage. | Must remain a README documentation image, not runtime plugin logic. |
| `.github/assets/usopp.png` | Audit coverage. | Must remain a README documentation image, not runtime plugin logic. |
| `.github/assets/jinbe.png` | Audit coverage. | Must remain a README documentation image, not runtime plugin logic. |
| `.github/assets/robin.png` | Audit coverage. | Must remain a README documentation image, not runtime plugin logic. |
| `.github/assets/nami.png` | Audit coverage. | Must remain a README documentation image, not runtime plugin logic. |
| `docs/loopy-design-audit.md` | `src/design-audit.js`, `test/doctor.test.js`. | Must keep required decision rows with reason, effect, and guard. |
| `docs/loopy-crew-lines.md` | `test/docs.test.js`, audit coverage. | Must record the precedent pattern, no-copied-quotes rule, terminal-only behavior, and presentation-only authority boundary. |
| `docs/loopy-file-audit.md` | `test/audit.test.js`, `src/file-audit.js`, doctor file-audit check. | Must list every Git-visible file with non-empty role and compatibility-boundary cells. |
| `docs/loopy-gate-notes.md` | Doctor gate-notes check. | Must keep gate compatibility, native naming, golden scenario, and host contract sections visible. |
| `docs/loopy-host-contract.md` | `test/cli.test.js`, doctor hostContract/gate-notes. | Must document the SubagentStop payload contract and the host behaviors Loopy cannot verify. |
| `docs/loopy-loop-golden-set.md` | `test/docs.test.js` golden-set assertions. | Must list every Git-visible file, score each accepted run, and keep threshold history append-only. |
| `docs/loopy-model-policy.md` | `test/docs.test.js`, `test/doctor.test.js`. | Must record allowed model values and state that model choice is steering, not proof. |
| `hooks/pre-tool-use.json` | `test/plugin.test.js`, doctor hook check. | Must route to `node "${PLUGIN_ROOT}/src/cli.js" hook pre-tool-use`. |
| `hooks/session-start.json` | `test/golden-hooks.test.js`, doctor hook check. | Must route first-launch bootstrap and optional SessionStart context through the Loopy CLI. |
| `hooks/stop.json` | Optional runtime hook file, direct hook tests. | Must route Stop continuation through the Loopy CLI and stay inert unless `LOOPY_STOP_HOOK=on`. |
| `hooks/subagent-stop.json` | `test/plugin.test.js`, doctor hook check. | Must route executor, review, QA, and gate SubagentStop receipt validation through the Loopy CLI. |
| `hooks/subagent-stop-audit.json` | `test/plugin.test.js`, doctor hook check. | Must route robin verdict validation through the Loopy CLI. |
| `hooks/user-prompt-submit.json` | `test/plugin.test.js`, doctor hook check. | Must route prompt steering and trigger-scoped context injection through the Loopy CLI. |
| `package.json` | `npm test`, doctor dependency check. | Must stay dependency-free and expose `loopy`, `test`, and `check` scripts. |
| `skills/loopy-clone/SKILL.md` | `test/plugin.test.js`, audit coverage. | Must describe authorized browser-assisted website cloning with specs, assets, build validation, visual QA, and Loopy evidence receipts. |
| `skills/loopy-clone/agents/openai.yaml` | Audit coverage and reviewability check. | Must remain minimal Loopy discovery metadata for website cloning. |
| `skills/loopy-loop/SKILL.md` | `test/docs.test.js`, doctor skill check. | Must describe guide, proof, capture, evidence, check, finish, gates, and receipt rules accurately. |
| `skills/loopy-loop/agents/openai.yaml` | Audit coverage and reviewability check. | Must remain minimal Loopy discovery metadata. |
| `skills/loopy-research/SKILL.md` | `test/plugin.test.js`, audit coverage. | Must describe exhaustive deep research with EXPAND waves, claim verification, cited synthesis, and Loopy evidence receipts. |
| `skills/loopy-research/agents/openai.yaml` | Audit coverage and reviewability check. | Must remain minimal Loopy discovery metadata for deep research. |
| `.codex/agents/robin.toml` | `test/cli.test.js`, `test/doctor.test.js`, audit coverage. | Must define the robin auditor role, advisory model defaults, and the LOOPY_AUDIT verdict receipt; installed via LOOPY_AGENT_NAMES. |
| `.codex/agents/nami.toml` | `test/cli.test.js`, `test/doctor.test.js`, audit coverage. | Must define the read-only navigator role, advisory fast model defaults, return absolute paths, and write no evidence receipt; installed via LOOPY_AGENT_NAMES and matched by a SubagentStop matcher. |
| `src/agents.js` | `test/cli.test.js`, `test/golden-hooks.test.js`, audit coverage. | Must install bundled Loopy custom agents and command wrapper, skip identical files, and refuse changed local files unless `--force` is used. |
| `src/args.js` | CLI and loop tests using parsed flags/stdin/JSON. | Must parse shared CLI inputs without dependencies. |
| `src/artifacts.js` | Gate and evidence tests. | Must reject missing, empty, symlink, outside-root, and invalid gate artifacts. |
| `src/audit.js` | `test/golden-audit.test.js`. | Must re-run command-backed criteria, cache unchanged work, and mark non-reproducing re-runs inconclusive (never auto-fail). |
| `src/audit-hooks.js` | `test/golden-audit-hooks.test.js`. | Must re-derive the floor in-process and accept only verdicts hash-bound to that fresh re-run; block forged/stale/missing verdicts; idempotent on replay. |
| `src/audit-verdict.js` | `test/golden-audit-verdict.test.js`. | Must enforce structural rules and symmetric floor dominance (the LLM cannot upgrade OR flip a non-reproducing re-run). |
| `src/audit-gate-verify.js` | `test/golden-review-gate.test.js`, `test/golden-matrix-gate.test.js`. | Must re-derive and verify every cited audit verdict at completion; reject hand-written/unbound verdicts (never force-complete). |
| `src/begin.js` | CLI begin tests. | Must create a plan, start the first goal, and return an immediate proof guide. |
| `src/capture.js` | CLI evidence tests. | Must write command transcripts and mark pass/fail from command exit status. |
| `src/check.js` | Loop-gate and CLI evidence tests. | Must be non-mutating and print warnings plus repair commands for every unresolved or invalid proof. |
| `src/cli.js` | CLI, plugin, doctor, and crew-line tests. | Must dispatch install, loop, bin, agents, doctor, hook commands, generic comparison-check flags, symlinked bin execution, and status-safe handoff/fleet text. |
| `src/comparison-similarity.js` | Doctor comparison tests. | Must compare code-shaped files only when an explicit comparison path is provided. |
| `src/continuation.js` | `test/golden-continuation.test.js`. | Must drive bounded continuation toward evidence-backed completion and mark blocked (never complete) on a cap or stall. |
| `src/crew-lines.js` | `test/crew-lines.test.js`, `test/fleet.test.js`. | Must generate original deterministic supported-catalog lines only for known terminal crew handoffs and format them without mutating persisted state. |
| `src/design-audit.js` | Doctor design-audit tests. | Must fail missing sections, decisions, or incomplete guards. |
| `src/doctor.js` | `test/doctor.test.js`, `node src/cli.js doctor --json`. | Must verify package, hooks, skill, audits, comparison status, model policy, and reviewability while ignoring generated Codex marketplace install metadata. |
| `src/engineer.js` | `test/engineer.test.js`, `test/hooks.test.js` engineer-trigger tests. | Must wake the loop engineer on a leading `loopy` keyword without mutating state itself, and escalate to crew fan-out only on `loopy team`/`loopy crew`. |
| `src/file-audit.js` | `test/file-audit.test.js`, doctor file-audit check. | Must fail missing, stale, or incomplete inventory rows. |
| `src/finish.js` | CLI evidence and loop-gate tests. | Must only finalize after all criteria have valid pass artifacts, then write gate and report artifacts. |
| `src/fleet.js` | `test/fleet.test.js`, `test/crew-lines.test.js`. | Must record handoffs under a lock, require evidence for accepted verdicts, reconcile dispatched-vs-outstanding, normalize APPROVE/PASS/REJECT-style verdicts, and decorate terminal known crew lanes for output only. |
| `src/goals.js` | `test/goals.test.js`, loop tests. | Must keep deterministic goal parsing, criteria lookup, completion guards, and evidence collection. |
| `src/guide.js` | CLI, docs, hook, and evidence tests. | Must produce next action, proof target, proof plan, templates, recorded evidence, and blockers. |
| `src/help.js` | CLI help tests. | Must show the shortest evidence-backed flow and pass-artifact rule. |
| `src/hooks.js` | Hook and golden-hook tests. | Must keep startup bootstrap, stop continuation, prompt context, steering, scoped roots, and receipt validation fail-closed. |
| `src/loop.js` | Core loop and CLI tests. | Must preserve lifecycle state, ledger appends, evidence recording, review, checkpoint, status, and steering. |
| `src/matrix-gate.js` | Matrix gate golden tests. | Must validate compatible matrix gate shape through Loopy artifacts only. |
| `src/model-policy.js` | `test/doctor.test.js`. | Must fail doctor when model policy docs or bundled agent TOML defaults drift. |
| `src/plan-summary.js` | Guide and status tests through loop outputs. | Must summarize progress without mutating state. |
| `src/pre-tool-use.js` | `test/pre-tool-use.test.js`, `test/golden-hooks.test.js`. | Must block malformed `create_goal` payloads and premature native `update_goal` completion. |
| `src/prove.js` | CLI evidence tests. | Must record command evidence against the active unresolved criterion and return the next guide. |
| `src/report.js` | Report and CLI evidence tests. | Must write portable evidence reports with summary counts, warnings, timestamps, artifacts, timeline, and next action. |
| `src/review-gate.js` | Review gate golden tests. | Must validate strict five-section review gate shape through Loopy artifacts only. |
| `src/store.js` | Loop, hook, and scoped-session tests. | Must normalize sessions, isolate `.loopy/` state, write JSON atomically, and append ledger entries. |
| `src/subagent-attempts.js` | `npm test`, doctor reviewability. | Must count the 3-attempt cap (with a session/cwd fallback key) and record the exhaustion ledger signal. |
| `src/trace.js` | Loop-gate and CLI evidence tests. | Must show artifact-backed proof, warnings, missing proof, suggested paths, ledger timeline, and evidence summary counts. |
| `test/audit.test.js` | `npm test`. | Must fail if repo files are missing from audit or reviewability limits are exceeded. |
| `test/subagent-receipt.test.js` | `npm test`. | Must prove the attempt cap counts without agent_id and records a ledger signal on exhaustion. |
| `test/cli-evidence.test.js` | `npm test`. | Must cover public evidence commands and finalization behavior end to end. |
| `test/cli.test.js` | `npm test`. | Must cover install, symlinked bin execution, help, create, begin, next, status, guide, and hook smoke paths. |
| `test/concurrency.test.js` | `npm test`. | Must prove withFileLock serializes concurrent writers, re-enters nested same-path calls, reclaims stale locks, and fails closed on timeout. |
| `test/crew-lines.test.js` | `npm test`. | Must prove crew completion lines are original deterministic localized presentation, pending/unknown lanes stay silent, and CLI status remains visible. |
| `test/docs.test.js` | `npm test`. | Must keep README, skill, gate notes, design audit, and this golden set aligned with enforced behavior. |
| `test/doctor.test.js` | `npm test`. | Must cover doctor checks for package, audits, comparison, design decisions, model policy, generated install metadata, and reviewability. |
| `test/file-audit.test.js` | `npm test`. | Must prove the file-audit verifier fails stale inventory rows. |
| `test/fleet.test.js` | `npm test`. | Must prove verdict normalization, artifact-bound accept verdicts, handoff recording/update, fleet reconciliation, crew-line decoration, and the parallel-cap warning. |
| `test/goals.test.js` | `npm test`. | Must keep goal parsing, seeded criteria, lookup, and completion guards strict. |
| `test/golden-helpers.js` | Golden tests. | Must provide Loopy-owned fixtures. |
| `test/golden-continuation.test.js` | `npm test`. | Must keep the continuation engine bounded, progress-gated, and blocked-not-complete on a cap or stall. |
| `test/golden-audit.test.js` | `npm test`. | Must keep audit re-run floor, caching, and inconclusive handling strict. |
| `test/golden-audit-hooks.test.js` | `npm test`. | Must keep verdict-receipt hash binding and fail-closed blocking strict. |
| `test/golden-audit-verdict.test.js` | `npm test`. | Must keep verdict structure and floor-dominance rules strict. |
| `test/golden-hooks.test.js` | `npm test`. | Must keep hook continuation, scoped state, steering, receipts, and manifest behavior strict. |
| `test/golden-matrix-gate.test.js` | `npm test`. | Must keep Loopy's `@goal` and matrix compatibility strict. |
| `test/golden-review-gate.test.js` | `npm test`. | Must keep strict five-section review-gate acceptance and rejection behavior. |
| `test/engineer.test.js` | `npm test`. | Must keep team/crew escalation parsing strict and inject the crew fan-out directive only on `loopy team`. |
| `test/hooks.test.js` | `npm test`. | Must cover hook unit behavior for guards, receipts, steering, context, and stop handling. |
| `test/loop-gates.test.js` | `npm test`. | Must cover gate, report, trace, check, review, finish, and checkpoint behavior. |
| `test/loop.test.js` | `npm test`. | Must cover core lifecycle, evidence recording, steering, and command capture. |
| `test/plugin.test.js` | `npm test`. | Must verify plugin manifest, hook route integrity, and packaged skill metadata. |
| `test/pre-tool-use.test.js` | `npm test`. | Must verify Loopy blocks native complete status until aggregate completion is real. |
| `test/report.test.js` | `npm test`. | Must verify report artifacts remain portable and guide-backed. |

## Run History

| Turn | Score | Command evidence | Changed files | What changed | Next-turn target |
| --- | ---: | --- | --- | --- | --- |
| Turn 0 | 70 | Existing repo had `npm test`, doctor checks, gate notes, and file audit, but inherited names were part of the contract. | None in this file. | Baseline: strict evidence machinery existed, but naming carried visible lineage. | Remove stale names without dropping gate compatibility. |
| Turn 1 | 88 | `npm test`; `node src/cli.js doctor --json`. | `docs/loopy-loop-golden-set.md`, `docs/loopy-file-audit.md`, `test/docs.test.js`, `test/doctor.test.js`. | Added strict golden set and inventory checks. | Raise score by making naming Loopy-native. |
| Turn 2 | 96 | Targeted gate, docs, audit, and doctor tests. | Runtime modules, docs, tests, skill metadata, and doctor contract. | Renamed public/internal contracts to review gate, matrix gate, design audit, and generic comparison scan while preserving strict gates. | Reach 100 with fresh audit, doctor, and full tests. |
| Turn 3 | 100 | Final `rg` audit; final `node src/cli.js doctor --json`; final `npm test`. | Final audit records and inventory rows. | Fresh audit from current files confirms Loopy-owned names and preserved gate compatibility. | Keep docs and doctor checks focused as files change. |
