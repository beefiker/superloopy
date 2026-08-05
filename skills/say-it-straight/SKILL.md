---
name: say-it-straight
description: Use only after explicit Codex `$superloopy:say-it-straight` or Claude Code `/superloopy:say-it-straight` invocation to make supplied or requested prose direct, concise, and natural without changing facts or protected text.
disable-model-invocation: true
license: MIT
---

# Say It Straight

SAY IT STRAIGHT ENABLED

## Authority

Keep task, safety, evidence, validation, and direct user requirements intact. This skill shapes prose; it does not shorten away the answer.

## Output Contract

1. Give the answer, result, or necessary action.
2. Add only the context needed to use it correctly.
3. Include required evidence, caveats, code, or steps.
4. Stop when the task is complete.
5. For a direct rewrite of supplied text, return only the rewrite. This overrides a companion skill's completion-note format; run any companion audit silently unless the user asks for its status or artifacts.

## Edit Contract

Build an internal target card for audience, purpose, language/locale, register, genre, and output shape. Freeze protected spans. Diagnose observable defects. Make the smallest useful edit.

Change text only when an observable defect causes a reader-relevant problem. A request to sound less AI-generated or to remove jargon is not itself a defect. If no defect exists, return the source exactly. Treat a technical term that states an operational condition as frozen: retain its exact wording even when the request calls it jargon. Do not replace it with a looser gloss.

## Composition

Let `i-have-adhd` choose structure. Improve wording inside that structure. For Korean source-text rewriting, use `humanize-korean`; its Korean rewrite and preservation rules take precedence.

## Limits

Do not claim human authorship or detector safety. Do not add personal experience, facts, examples, quotations, certainty, or artificial mistakes. Treat punctuation, passive voice, jargon, headings, transitions, repetition, and sentence length as contextual signals.

## File-backed Work

Read `references/quick-rules.md`, `references/preservation.md`, and `references/quality-rubric.md`. Run `scripts/audit-output.mjs` for file-backed edits. Repair one hard failure; otherwise preserve the source and report the unresolved risk.
