# Execution Discipline and Repeated-Failing-Proof Design

Date: 2026-10-13
Status: implemented. Text rules R1–R3 are unmeasured nudges until the before/after run in "Follow-up Measurement" lands; keep or remove each rule by its pre-registered result.

## Goal

Cut the avoidable execution cost that a component-level harness study attributes to strong coding models, without adding a hook, a dependency, or a new blocking gate. The source is arXiv 2609.20804, "An Empirical Study of Harness Design for Coding Agents" (submitted 2026-09-17). Its findings that apply here:

1. For strong models, planning mostly saves cost by cutting redundant post-edit verification (about −30% cost).
2. Bash-capable strong models get cheaper when they batch operations and avoid repeated re-patching; weak models need dedicated tools and a narrow scope.
3. Cheap elision of bulky output beats recall machinery; a structured summary should carry errors and the next step.
4. Stuck detection on identical repeated failing calls, with a "repeating it will not work; read the error and change approach" reminder.

Superloopy already covered most of finding 3: `loop prove` writes command output to an artifact and returns only metadata, and SessionStart(compact) injects a recovery capsule. Stop-level stall caps already existed. This change covers the rest.

## Baseline Evidence (measured 2026-10-13, before this change)

Two read-only sources on the maintainer's machine. Only aggregates were kept; no transcript or ledger content left the analysis scripts, which were deleted afterwards.

**Superloopy ledgers** (`.superloopy/**/ledger.jsonl`, 70 files, 3 byte-identical copies and copied events removed, 61 with proof events). The ledger is the only reliable record of failed proofs, because `loop prove` exits 0 when the proof fails.

| Metric | Value |
| --- | --- |
| Proofs / criteria | 217 / 160 (1.36 per criterion) |
| Re-proof of an already-passing criterion | 11 (5.4% of passes) |
| Failing proofs | 15 (6.9%) |
| Same criterion failing twice in a row | 3 |
| Same criterion failing three times in a row | 0 |

**Host transcripts** (Codex, Claude Code, and omp; 3,198 files, 0 unparseable). LOOPY = 88 sessions started with `loopy`/`루피` or invoking `superloopy loop`; 88,411 tool calls, 88% from Codex.

| Rule | Metric | LOOPY | Sessions affected |
| --- | --- | --- | --- |
| R1 | Identical validation command re-run after it passed, nothing changed since | 23 (0.67% of 3,445 validation runs) | 10% |
| R1 | Broad suite run between two `loop prove` calls | 28 | 5 of 22 multi-prove sessions |
| R2 | Identical failing shell command re-run with no change in between | 19, none reaching 3 in a row | 12.5% |
| R2 | Same command failing with identical output tail despite edits, 3+ in a row | 15 runs | – |
| R3 | Excess edits in runs of 3+ consecutive edits to one file | 1,133 (21.7% of edit calls in such runs) | 40% |
| R3 | Same, with only read-only calls between the edits | 397 | 30% |
| R3 | Serial single-read turns that could have been one call | 1.5% of turns (omp non-loop sessions: 14%) | 61% |

Lower-bound waste: (R2 strict + R1 pure re-runs + R3 excess) / tool calls = 1.33% of LOOPY tool calls, 0.50% with the tight R3 variant. These count calls, not tokens; one redundant `xcodebuild` or `gradle` suite costs far more than one edit call.

Caveats that bound every number above:

- 43.9% of LOOPY shell calls have unknown exit status, mostly Codex code-mode cells, so R1 and R2 counts are lower bounds.
- The R3 count includes legitimate edit→test→edit cycles and incremental notes (38% of excess is on `.md`/`.txt`); the tight variant is the better estimate of pure re-patching.
- Only `prove`/`capture`/`evidence` reach the ledger. Raw shell test runs between proofs appear only in transcripts.

What the baseline supports: R3 most, R1 modestly (rare but expensive suites), R2 least. The `repeated-failing-proof` warning would have fired 0 times in either source. It ships as a cheap advisory guardrail, not as a measured saving.

## Design

### Execution-discipline rules (text)

`src/engineer.js` injects three rules into every `loopy` start (with or without a brief) and every resume:

- R1: prove each criterion once with the narrowest deciding command; do not re-run passing proof or broad suites between criteria, because `loop finish` re-runs every passed command-backed criterion before it completes.
- R2: on a failed proof, read the failing part of the capture artifact and change the code or the proof command before proving again; a wrong criterion goes back to the user as a `revise_criterion` steer.
- R3: batch independent reads and shell steps; land each file change as one coherent edit.

Crew mode adds one lane-sizing line: the `fast`-profile `pathfinder` gets one concrete lookup with named targets and the host's dedicated read/search tools (finding 2's weak-model half), and editors run their VERIFY command once per slice. The Stop continuation directive (`src/hooks.js`) carries R1/R2 as numbered steps. The same text is in `skills/superloopy-loop/SKILL.md` under "Execution discipline".

Every runtime claim in that text was traced and run: `loop finish` → `reviewLoop` → `enforceAuditProvenance` re-runs each passed criterion with the audit cache bypassed (trusted commands only; commandless proof gets an artifact-existence check), and `loop check` re-runs nothing.

### Failure signature

`src/failure-signature.js` hashes the command, exit status, signal, spawn error, and the normalized stdout and stderr tails (first 16 hex digits of SHA-256). Only failing captures get a signature, and only the ledger stores it; `goals.json` is unchanged.

Normalization rewrites run-to-run noise to fixed placeholders: ANSI escapes, CRLF, UUIDs, ISO and clock times, durations with units (including xcodebuild's `in 0.012 (0.015) seconds`), labeled values (`pid`, `port`, `seed`, `duration_ms`, `elapsed`, `took`), `0x` addresses, `:line:col` stack positions, `line N`, hex runs of 7+ characters containing a digit and a letter, macOS/Linux/Windows temp paths, and numbers of 10+ digits (epoch seconds, milliseconds, nanosecond clocks). Every other number stays significant, so a changed assertion value, even `12345` versus `99999`, or a changed pass/fail count is a different failure. An unlabeled 5–9 digit PID therefore breaks a streak; that errs toward silence rather than a false "nothing changed".

The window is cut after normalization and aligned to a line boundary: 64KB raw, then 8KB normalized. Cutting raw text first would shift the window whenever earlier noise changes length, so long outputs would never match. A single line longer than the window keeps its last 8KB instead of being dropped as a partial line. Every rule is linear on 64KB of hostile input; a late-failing Windows temp-path rule measured 1.1s and was replaced with whole-token matching.

### Streak detection

`repeatedFailureWarnings(ledger)` in `src/trace.js` walks the ledger in order per `goalId/criterionId`. A `criterion_fail` entry with a signature extends the streak when the signature matches and starts a new one otherwise. Any other entry carrying that criterion's ids ends it: a pass, a manual `loop evidence --status fail` (no signature), an audit failure, or `criterion_revised`. Three in a row raise `repeated-failing-proof`.

Surfaces: `trace`, `check`, and `report` through the shared `collectWarnings`; `prove` and `capture` return the captured criterion's warning in `warnings` and print it above the guide. The compaction capsule lists each failing criterion with its recorded artifact so the agent re-reads it instead of re-running the command.

## Decisions

| Decision | Reason |
| --- | --- |
| Threshold 3, not the paper's 5 | A proof is a whole validation run, not one tool call; 3 matches `DEFAULT_MAX_STALLED`, the subagent receipt cap, and `SUPERLOOPY_AUDIT_MAX_FAILS`. |
| Advisory only; no termination at 8 | The Stop hook's no-progress cap (with `SUPERLOOPY_STOP_HOOK=on`) already marks a stalled loop `blocked` for a human. |
| No PostToolUse hook | Shell re-runs outside `prove` would need per-call interception across three hosts; the baseline shows R2 is the least-supported rule, which does not justify a new hook surface. |
| Crew guidance in the parent's dispatch text, not `agents/*.md` or `.codex/agents/*.toml` | Legacy-migration tests SHA-match the generated agent files against `legacy-agent-manifests.json`. |
| Targeted noise rules instead of collapsing all digits | Collapsing digits called `expected 3` and `expected 5` the same failure and told the agent re-running was pointless after a real change. |

## Boundaries

- The signature never decides pass/fail and never blocks; exit status remains the only proof verdict.
- No new dependency; `node:crypto` only.
- The warning names the user-side `revise_criterion` steer because `SUPERLOOPY_STEER` is parsed only from user prompts.

## Acceptance Criteria

- `test/failure-signature.test.js`: noise keeps one signature; a changed assertion value, failing test, pass/fail count, exit status, or command changes it; long output keeps a stable window; hostile output normalizes in linear time.
- `test/loop.test.js`: the third identical noisy failure warns through `prove` and `trace`; with the command held fixed, a moved assertion resets the streak, the same failure three times warns again, and a pass clears it.
- `test/compaction-recovery.test.js`: the capsule lists failing proof with its artifact path, and a fresh loop has no such line.
- `npm test` passes, including the 550-line reviewability audit and both file inventories.

## Follow-up Measurement (pre-registered)

Run the same task set before (`4bb19dd`) and after this change on one model, 3 repetitions each: 6–10 small tasks from local repos with fixed validation commands and a known-correct end state. Recount with the transcript metrics above.

- Primary: R3 tight excess edits per edit call. Keep R3 if it drops by at least 20% with an equal or higher task pass rate.
- Secondary: R1 pure re-runs plus broad-suite runs between proofs, per task. Keep R1 if they do not rise and total validation runs per task drop.
- R2: keep the warning while it costs nothing measurable. Remove its directive sentence if the after-run shows no fires and no unchanged re-runs to prevent.
- A rule that misses its bar is removed in the next release, as `0.22.3` did for an unsupported rule.

## Open Items Outside This Change

- `loop finish` re-derives every passed criterion twice: once in `reviewLoop` and again in the final checkpoint preflight. On a smoke run, two proofs became six command runs. This is the redundant verification finding 1 targets and may save more than the text rules.
- `loop prove` exits 0 when the proof fails, so transcript-based measurement cannot see proof failures; only the ledger can.
