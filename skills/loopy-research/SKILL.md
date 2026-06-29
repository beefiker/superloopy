---
name: loopy-research
description: Use for explicit Loopy research or deep research requests that need exhaustive Loopy-style investigation across code, web, official docs, and repositories. Triggers on "loopy research", "deep research", "exhaustive research", "ultra-precise investigation", or requests for a cited research report. Do not self-activate for ordinary debugging or implementation context gathering.
---

# Loopy Research

Run exhaustive research with Loopy evidence. The goal is not quick context gathering; it is a cited, auditable answer whose claims can be traced to sources or verification artifacts.

## Activation

Start with `LOOPY RESEARCH ENABLED` when the user explicitly asks for loopy research, deep research, exhaustive research, or a research report. If another active Loopy mode has a required opening line, print that first and this marker next.

Use the active Loopy plan when one exists. For a new substantial research task, create one with `loopy loop begin`, then record artifacts under `.loopy/evidence/research/<slug>/`.

## Evidence Contract

- The orchestrator owns files. Workers return findings and EXPAND leads in message text; do not ask workers to write session files.
- Keep a session directory under `.loopy/evidence/research/<timestamp>-<slug>/`.
- Maintain `expansion-log.md`, one `wave-<n>-<axis>.md` file per worker return, optional `verify-<slug>.md` files, `claim-ledger.md`, and `SYNTHESIS.md`.
- End the completed research with a Loopy artifact record, for example `loopy loop evidence --status pass --artifact .loopy/evidence/research/<slug>/SYNTHESIS.md --notes "<summary>"`.
- When a worker is assigned a report artifact, require its final line to be `LOOPY_EVIDENCE: <path-under-active-evidence-root>`.

## Phase 0 - Scope

Write the research frame before searching:

```text
Core question:
Axes: <3+ orthogonal axes, each with source territory and why it matters>
Codebase relevant: yes/no
External sources: yes/no
Verification likely: yes/no
Report format: markdown/pdf/html/slides/none
```

Use at least three independent axes. Good axes are by product area, code ownership, data source, standards body, competitor, failure mode, or user persona. Avoid vague roles like "web researcher".

## Phase 1 - First Wave

Launch all first-wave searches in parallel when tools allow. If multi-agent tools are unavailable, run the axes yourself and still write one wave artifact per axis.

Each worker prompt must be self-contained:

```text
TASK: research <axis>.
This is an explicit exhaustive-research assignment. Default stop-when-answered rules do not apply.
SCOPE: <sources to inspect and what a complete answer contains>.
PROTOCOL: use official docs, repo code, search operators, issue trackers, changelogs, and source history as relevant. Fetch full pages before relying on snippets.
Return findings with source URLs or file paths.
End with:
## EXPAND
- LEAD: <uninvestigated discovery> - WHY: <why it matters> - ANGLE: <next search>
- DEAD END: <lead explored to exhaustion>
```

For codebase axes, use `rg`, file globs, AST/LSP tools when available, and `git log -S` or `git log --grep` for history. For external axes, prefer official docs, standards, release notes, primary repositories, issue trackers, and dated primary sources.

## Phase 2 - Expand Until Converged

Process worker returns as they land:

1. Write a digest to `wave-<n>-<axis>.md` with findings, citations, and verbatim EXPAND items.
2. Deduplicate every lead against `expansion-log.md`.
3. Immediately investigate new actionable leads in the next wave.
4. Record opened, closed, duplicate, and dead-end leads.

For multi-faceted research, run at least two expansion waves before declaring convergence. Stop only when one condition is true:

- No unchecked leads remain.
- Three consecutive waves produce no new actionable leads.
- Depth reaches five waves. Pause and ask whether to extend.

## Phase 3 - Verify Claims

Use execution for code-shaped claims. Write and run the smallest script or command that proves or refutes the claim, capture stdout and stderr, and save it as `verify-<slug>.md`.

Use `claim-ledger.md` for high-risk non-code claims such as numeric, legal, financial, dated, causal, or market claims. A claim may appear in the synthesis only when it has:

- Two independent source domains.
- One counter-search that looked for refutation.
- A primary source when one should exist.

Anything else belongs in an unresolved or refuted section.

## Phase 4 - Synthesize

Write `SYNTHESIS.md` with:

- Executive answer.
- Findings by theme with citations on every substantive claim.
- Codebase findings with absolute or repo-relative file paths and line references.
- Source list with URL, reliability note, and access date.
- Verification results linked to `verify-*.md`.
- Claim ledger summary.
- Contradictions and how they were resolved.
- Gaps and convergence reason.

Keep direct quotes short and attributed. Do not copy long passages from sources.

## Completion Checklist

- Every axis has a wave artifact.
- Every EXPAND lead is investigated, duplicated, or closed as dead.
- Every high-risk claim is verified, unresolved, or omitted.
- `SYNTHESIS.md` exists and every substantive claim has a citation or verification artifact.
- The final Loopy evidence record points to the synthesis.
