# Explicit Frontend Activation Design

## Goal

Stop Superloopy from taking over ordinary prompts merely because they mention frontend, UI, or Korean-writing vocabulary. Superloopy's prompt hook should recognize explicit invocation syntax and structured steering, not infer specialist ownership from natural-language keywords.

## Activation Contract

- A plain UI, CSS, landing-page, mixed backend/UI, or Korean-writing prompt does not receive semantic Superloopy hook context.
- A leading `loopy` or `루피` token explicitly starts the general Superloopy loop. The loop may route a genuinely visual deliverable to the frontend skill after it owns the task.
- The documented `loopycrew`, `ultrawork`, `loopywork`, `lpy`, and `$lpy` aliases remain available only as complete leading invocation tokens.
- `$superloopy-frontend` remains the direct explicit skill invocation.
- Existing `SUPERLOOPY_STEER: {...}` directives remain the structured steering path for an active loop.
- Invocation tokens must be complete tokens followed by end-of-input, Unicode whitespace, `:`, or `,`. Korean-particle forms such as `loopy가`, `루피는`, `loopycrew를`, and `ultrawork처럼` are ordinary prose, not invocations. The undocumented connected `루피팀` form is replaced by explicit `루피 팀`.

## Implementation

Delete the semantic frontend and Korean-writing classifiers and their `UserPromptSubmit` branches. Keep compact syntax parsing for explicit Superloopy invocations, but apply one complete-token boundary contract to every public alias. Remove the Codex hook's always-visible status message so an inert check does not look like Superloopy activation.

Narrow `superloopy-frontend` metadata and activation instructions so the host does not independently recreate the removed auto-routing behavior. The skill activates only through direct skill invocation, a leading explicit Superloopy request with a visual deliverable, or an explicit route from an already-active Superloopy loop. Preserve its DESIGN.md, anti-slop, browser QA, and evidence gates unchanged.

Update all user-facing language and audit inventories that currently promise frontend auto-activation. Remove the obsolete `SUPERLOOPY_FRONTEND_STEER` opt-out because there is no longer a default frontend steer to disable.

## Validation

- Regression tests prove mixed backend/UI and plain visual prompts return no frontend hook output.
- Invocation tests prove exact `loopy` and `루피` tokens still work while Korean suffix forms remain inert.
- Packaging tests prove frontend metadata is explicit-only and retains its quality gates.
- Focused engineer, hook, plugin, audit, and documentation tests pass, followed by the complete suite and `git diff --check`.

## Out of Scope

This change does not remove either specialist skill or alter the loop state machine, structured steering schema, visual quality rules, model policy, or Claude/Codex agent defaults. Native/direct invocation of `humanize-korean` remains available; only its semantic prompt-hook steer is removed.
