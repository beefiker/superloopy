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

## Edit Contract

Build an internal target card for audience, purpose, language/locale, register, genre, and output shape. Freeze protected spans. Diagnose observable defects. Make the smallest useful edit. Leave strong prose unchanged.

## Composition

Let `i-have-adhd` choose structure. Improve wording inside that structure. For Korean source-text rewriting, use `humanize-korean`; its Korean rules and audit take precedence.

## Limits

Do not claim human authorship or detector safety. Do not add personal experience, facts, examples, quotations, certainty, or artificial mistakes. Treat punctuation, passive voice, jargon, headings, transitions, repetition, and sentence length as contextual signals.

## File-backed Work

Read `references/quick-rules.md`, `references/preservation.md`, and `references/quality-rubric.md`. Run `scripts/audit-output.mjs` for file-backed edits. Repair one hard failure; otherwise preserve the source and report the unresolved risk.
