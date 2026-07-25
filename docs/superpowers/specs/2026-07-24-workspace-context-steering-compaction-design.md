# Superloopy Workspace Safety and Continuity Design

## Goal

Make Superloopy safer across repository boundaries and more observable across long-running research and compaction without making loop engineering harder to start or continue.

The user should still be able to invoke `loopy <task>` or `loopy team <task>` without selecting a budget, approving another wave, or understanding Superloopy's internal state. Repository identity and steering retries are enforced because they protect correctness. Context and research budgets are advisory because they inform the user and the loop engineer without interrupting useful work.

## Approved Decisions

This design contains four implementation slices:

1. Resolve one canonical workspace root and bind every new plan to that worktree.
2. Measure actual additional context and report advisory research targets and observed usage without blocking.
3. Make structured steering idempotent before adding any general batch format.
4. Restore a compact semantic recovery capsule after host compaction and test its invariants.

Portable export anonymization, `session:<opaque-id>`, generic batch steering, a search broker, and any budget-based denial or approval prompt are explicitly out of scope.

## Product Principles

- **Easy by default.** Budget targets never stop a worker, query, wave, or loop. Crossing a target records and reports an overage; it does not ask the user what to do.
- **Durable state beats transcript prose.** Repository identity, completion state, current proof obligations, and observed research usage come from Superloopy state and artifacts, not a compacted conversation summary.
- **Enforce correctness, observe cost.** A repository mismatch and a duplicate steering retry can corrupt state, so they are prevented. Cost targets are guidance and telemetry only.
- **No new dependency.** Exact character and UTF-8 byte counts use platform APIs. Token counts are clearly labeled estimates.
- **No export work yet.** Internal paths retain their current operational fidelity, and the existing portable report remains unchanged.

## 1. Canonical Workspace Root and Repository Binding

### Current problem

Loop paths are built by joining the received `cwd` with `.superloopy`. Starting in a repository subdirectory therefore misses a plan created at the repository root. Plans also have no checkout identity, so copied or misplaced state can be mutated without detecting that it belongs to another worktree.

The existing command-trust implementation already derives a checkout identity, but that implementation is private to command trust and does not normalize the root used by loop commands or hooks.

### Root resolution

Introduce one shared workspace identity module used by loop CLI commands and every hook path that reads or mutates loop state.

Given a starting directory:

1. Resolve symlinks for the nearest existing directory.
2. If the directory is inside a Git worktree, select that worktree's root.
3. Otherwise, select the nearest ancestor containing a `.superloopy` directory.
4. If neither exists, use the resolved starting directory.

A nested Git repository owns its own state even if an outer directory contains `.superloopy`. A scoped session remains under the selected root at `.superloopy/sessions/<session-id>`.

The loop dispatcher resolves the root once before calling a loop command. Hook handlers also resolve from `payload.cwd` before reading plans, ledgers, evidence, handoffs, attempt state, or audit state. Installation and doctor root-selection behavior are not changed by this loop-specific resolver.

### Checkout identity

Extract the reusable identity logic from command trust into the shared module.

For Git worktrees, the identity is a SHA-256 digest over:

- identity schema version;
- canonical worktree root;
- canonical worktree Git directory;
- a random local UUID persisted in that Git directory.

For non-Git workspaces, the digest uses the canonical root and stable filesystem identity fields already used by command trust.

The binding does not include `HEAD`, branch name, remote URL, or repository name. A plan must survive commits, branch switches, remote changes, and repository renames when the underlying worktree is the same.

New plans use plan schema version 2 and include:

```json
{
  "repositoryBinding": {
    "version": 1,
    "kind": "git-worktree",
    "identity": "<sha256>",
    "rootLabel": "superloopy"
  }
}
```

`rootLabel` is a non-authoritative basename used only for understandable diagnostics. No absolute path is added to portable reports.

### Validation and legacy plans

Every state-changing loop operation verifies the current identity against the plan binding while holding the same plan lock used by the mutation. A mismatch fails before any plan, ledger, evidence, handoff, audit, or receipt mutation.

Read-only status may report a mismatch so the loop engineer can explain it, but it must not describe the plan as safe to resume. Commands that appear read-only but append to the ledger or write a report are treated as mutations.

Version 1 plans are reported as `legacy_unbound`. They are not silently bound by the first arbitrary mutation. The CLI provides one explicit bind/migration command that:

- verifies the selected workspace root;
- validates that all stored plan paths remain relative and confined;
- upgrades the plan atomically to version 2;
- records `repository_bound` in the ledger.

The loop engineer receives the exact migration command and executes it itself. Normal `loopy` usage does not require the user to inspect fingerprints or answer another question.

### Safety boundary

Repository binding protects Superloopy-owned state, evidence paths, recovery capsules, and dispatch bookkeeping. It is not a filesystem sandbox and cannot stop an agent from directly editing another path through a host tool. Prompts continue to tell workers the canonical target root, but that instruction is not represented as stronger enforcement than it is.

## 2. Additional Context Measurement

### Measurement point

Measure the final string placed in `hookSpecificOutput.additionalContext`, after all context sections and the metrics line are assembled. Use a bounded fixed-point formatter so the displayed counts describe the final emitted string, including the metrics line itself.

Each measured injection includes:

```text
Superloopy context cost: 2,468 chars · 2,470 UTF-8 bytes · ~620 estimated tokens
```

The metric is compact and model-visible. It requires no separate UI, settings screen, or state mutation.

Exact fields:

- `characters`: JavaScript Unicode code-point count, not UTF-16 code units;
- `utf8Bytes`: `Buffer.byteLength(text, "utf8")`;
- `estimatedTokens`: a dependency-free heuristic;
- `estimator`: a stable label identifying the heuristic version.

Token cost is never presented as exact. The initial estimator may use a documented mixed-text heuristic and should round to avoid false precision. Tests verify stable arithmetic and labeling, not equivalence with any proprietary tokenizer.

Empty hook output has zero cost and remains empty; Superloopy does not inject a metrics-only message.

### Surfaces

Cost measurement applies to Superloopy-produced additional context from:

- `UserPromptSubmit`;
- `SessionStart`;
- compaction recovery;
- any Superloopy `PreToolUse` or stop feedback that uses `additionalContext`.

It does not estimate the user's prompt, AGENTS instructions, skill contents loaded separately by the host, subagent transcripts, web results, or the model's full context window. The label and documentation must state this boundary.

## 3. Advisory Research Budget

### Intent

Research budgets help the user see amplification and help the loop engineer avoid accidental maximum-saturation behavior. They are not gates.

No Superloopy hook or CLI command may deny, rewrite, delay, or request user approval solely because a worker, query, or wave target was reached. This applies to Codex even though Codex can intercept `Agent` through `PreToolUse`.

### Automatic profile

The research workflow chooses one advisory profile from the research frame without asking the user:

- focused codebase;
- focused web;
- mixed investigation;
- explicit exhaustive or due-diligence.

Each profile provides target counts for total workers, queries, and waves. These are planning targets, not maximums. The exact profile values belong in the implementation plan and tests, but the runtime contract is fixed here:

- a target may be exceeded automatically when unresolved criteria or new material leads justify it;
- every overage records a short machine-readable reason;
- the final synthesis reports target versus observed usage;
- no overage changes completion authority or proof requirements.

The current research skill's worker floors and recursive expansion language are replaced with target-oriented guidance. The skill still supports exhaustive research when explicitly requested, but ordinary research no longer treats spending the maximum available quota as success.

### Observation sources

Observed values carry provenance:

- **workers:** derived from Superloopy handoffs and fleet state when those records exist; otherwise labeled self-reported by the orchestrator;
- **waves:** derived from research expansion journal entries;
- **queries:** counted in the research journal by the orchestrator because hosted search tools are not universally visible to Superloopy hooks.

Unobserved usage is reported as `unknown`, never as zero. Estimated or self-reported query counts are not described as enforced or complete.

Budget telemetry lives in the research evidence root, with the synthesis containing a compact summary such as:

```text
Research usage: workers 9/8 target · queries 37/32 target · waves 3/3 target
Overage: +1 worker to resolve conflicting primary sources
```

The core goals plan does not need a write on every hook or search. This preserves existing guidance-only hook behavior and avoids turning ordinary prompts into hidden plan mutations.

## 4. Idempotent Structured Steering

### Current problem

`SUPERLOOPY_STEER` accepts one typed object and immediately applies it. A host retry of the same `add_goal` request can therefore create duplicate goals. The current per-operation plan lock prevents concurrent lost updates but does not provide retry identity.

### Request identity

Every accepted steering request receives an idempotency key:

1. use an explicit valid `requestId` when supplied;
2. otherwise derive a digest from host, session id, turn id, active scope, and normalized directive;
3. when the host omits a turn id, use the normalized directive digest with a short retry window so immediate hook retries deduplicate while a later intentional repeat remains possible.

The key is scoped to the repository binding and active Superloopy session. The same key in another repository or scoped session is unrelated.

### Application protocol

Under the plan lock:

1. load and verify the repository-bound plan;
2. check the bounded recent steering receipt set;
3. return the prior result with `deduplicated: true` when the request is a retry;
4. validate the full typed directive against a cloned plan;
5. apply it once;
6. store its receipt in the same atomic plan write;
7. append a ledger entry carrying the idempotency key and result.

If the plan write succeeds but the ledger append is interrupted, a retry detects the plan receipt, avoids repeating the mutation, and repairs the missing ledger entry when possible.

Receipt storage is bounded by count and age. Explicit request IDs remain protected for the supported retention window, which is documented and tested rather than implied to be permanent.

### Supported shape

Existing single-operation directives remain compatible. Add optional `requestId` without adding a general `ops` array.

A future research budget adjustment, if needed, is one typed `research_observe` or `research_note_overage` operation containing its related fields. Because budgets are advisory, it never authorizes or blocks execution.

Generic multi-operation batch steering is deferred until a real caller needs multiple unrelated plan mutations to succeed together. Ledger append atomicity across files is not misrepresented as a filesystem transaction.

## 5. Compaction Recovery Capsule

### Runtime behavior

When `SessionStart` reports `source: "compact"` and an active bound plan exists, Superloopy emits a compact recovery capsule even when general `SUPERLOOPY_AUTO_CONTEXT` is off.

The capsule is derived from durable state and contains only:

- repository binding status and non-sensitive root label;
- active Superloopy session and plan mode;
- current goal and unresolved criterion references;
- aggregate completion state;
- next deterministic guide action;
- outstanding handoff summary;
- advisory research usage when a research journal exists;
- the rule that only Superloopy's deterministic gate authorizes completion.

Optional narrative history, completed-goal prose, full evidence lists, and full ledger events are omitted first. The capsule has a fixed character budget and includes its own measured context-cost line.

For `source: "compact"`, a context-pressure marker in the pre-compaction transcript must not suppress recovery. The marker still prevents continuation loops on ordinary prompt and stop paths. Recovery is read-only and must not increment attempts, consume a wave, append a ledger event, or rewrite the plan.

If no plan exists, the compact SessionStart remains quiet. If state is corrupt or repository binding mismatches, the capsule reports the safe diagnostic and does not tell the agent to resume mutation.

### Semantic projection

Expose a small pure function that converts durable state into a structured recovery projection. Rendering is separate. Tests compare projections for meaning and use only minimal string assertions for required warnings and size limits.

The projection includes stable fields for:

- binding status;
- session id;
- active goal id;
- unresolved criterion refs;
- aggregate completion;
- next action;
- outstanding handoff count and ids;
- research target, observed, and provenance fields when present.

### Required regression tests

Add six focused cases:

1. **Semantic preservation:** the recovery projection before and after compact contains the same binding, active goal, unresolved proof, completion, handoff, and advisory budget facts.
2. **Bounded rendering:** an oversized brief, ledger, and completed history cannot evict repository identity, current proof obligations, completion state, or next action.
3. **Durable truth wins:** transcript or prompt text claiming completion cannot override an incomplete durable plan.
4. **Session isolation:** compact recovery for one scoped session never includes another session's goal, handoff, or research usage.
5. **Read-only idempotence:** repeated compact recovery leaves plan, ledger, attempts, handoffs, and research journals byte-identical.
6. **Pressure-marker recovery:** `source: "compact"` still emits the capsule when the transcript tail contains a context-pressure marker, while existing non-compact suppression behavior remains unchanged.

Existing continuation, engineer-trigger, hook, report-portability, and completion-gate tests remain the surrounding regression floor. Do not add a broad line-count golden suite.

## Data and Compatibility

- Plan schema moves from version 1 to version 2 only for repository binding.
- Context metrics are rendered output and do not require plan migration.
- Advisory research usage stays in research evidence artifacts, not the core plan.
- Steering receipts add a bounded optional plan field with backward-compatible readers.
- Existing `SUPERLOOPY_STEER` objects without `requestId` remain accepted.
- Existing evidence reports remain repo-relative and do not gain anonymous IDs.
- No environment flag turns advisory targets into blockers.

## Failure Handling

- Workspace identity cannot be resolved: fail the state mutation with the resolved starting path and no partial writes.
- Binding mismatch: report expected/current fingerprints in abbreviated form and the safe next action; never auto-rebind.
- Legacy plan: provide the exact bind command for the loop engineer to execute.
- Context estimator fails: emit context without a cost line rather than suppressing required loop guidance.
- Research observation unavailable: show `unknown` with provenance, not zero.
- Steering receipt state is corrupt: fail the steering request closed without applying a mutation; ordinary loop status remains available.
- Compact state is unreadable: inject a bounded diagnostic capsule and do not claim that work is complete.

## Validation

Implementation validation must include:

- focused unit tests for workspace root/identity and steering receipts;
- the six compaction semantic tests;
- hook tests proving context metrics are included only when real context exists;
- research-skill contract tests proving targets are advisory and contain no deny/approval language;
- child-directory CLI integration proving root and plan reuse;
- copied-state mismatch integration proving mutation refusal;
- legacy-plan bind migration and path-confinement tests;
- existing hook, continuation, loop gate, report, plugin packaging, and doctor tests;
- `npm pack --dry-run` or the existing package-retention validation so new source/tests/docs required at runtime are not omitted.

## Delivery Order

1. Shared workspace root and checkout identity, plan v2 binding, legacy bind migration.
2. Steering idempotency using the bound repository/session scope.
3. Pure context measurement and compact recovery projection/rendering.
4. Compaction hook behavior and six semantic tests.
5. Advisory research profiles, journal telemetry, and final usage reporting.

Each slice should preserve the existing deterministic completion floor and pass its focused tests before the next slice begins.
