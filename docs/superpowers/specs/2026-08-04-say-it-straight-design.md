# Say It Straight Skill Design

Date: 2026-08-04

## Goal

Add an explicit-only Superloopy presentation skill named `say-it-straight`. It produces precise, concise, natural writing without stock AI phrasing or artificial roughening. It preserves meaning, facts, register, and protected text, and never claims that output is human-authored or detector-safe.

## Responsibility Boundary

- `i-have-adhd` owns response shape and scanability: answer first, short sections, and visible actions.
- `say-it-straight` owns general prose quality: direct wording, concrete claims, natural cadence, low repetition, and removal of stock framing or model-process chatter.
- `humanize-korean` owns Korean source-text rewriting, Korean-specific patterns, register, and protected-token behavior.

When skills compose, task, safety, evidence, validation, and direct user instructions remain authoritative. `i-have-adhd` chooses structure; `say-it-straight` improves wording within that structure; `humanize-korean` takes precedence for Korean-specific source edits.

## Approaches Considered

### 1. Explicit presentation overlay with preservation audit — selected

Package a focused skill and a dependency-free audit. The skill activates only when named. It diagnoses contextual prose defects, makes the smallest useful edits, and validates protected content after rewriting.

Benefits:

- distinct responsibility and predictable composition;
- testable quality and preservation contracts;
- no detector-evasion framing;
- no behavior change for ordinary Superloopy users.

Cost: users must invoke the skill explicitly.

### 2. Chain `i-have-adhd` and `humanize-korean`

Rejected because the two skills solve different problems. ADHD formatting does not cover prose quality, while Korean humanization is language- and source-editing-specific.

### 3. One automatic multilingual humanizer

Rejected because silent routing conflicts with current explicit-activation conventions. A large negative taxonomy also creates rule conflicts, provenance risk, and pressure to make unsupported detector claims.

## Activation Contract

The skill is explicit-only:

- Codex: `$superloopy:say-it-straight`
- Claude Code: `/superloopy:say-it-straight`

Host-level implicit invocation is disabled in both skill metadata formats. The first release adds no automatic `loopy` routing and no persistent conversation mode.

The skill may edit supplied prose or shape a new answer. If the user provides no text and no task requiring prose output, it asks for the missing input instead of inventing content.

## Writing Contract

The skill must:

1. State the answer or useful result early.
2. Use the fewest words that preserve required meaning, context, caveats, and steps.
3. Prefer concrete verbs, nouns, consequences, and evidence over vague importance claims.
4. Remove redundant setup, repeated conclusions, canned transitions, hype, decorative emphasis, and model-process narration.
5. Vary sentence structure only when it improves flow; sentence-length variance is not a target by itself.
6. Preserve the requested language, register, dialect, and degree of formality unless the user requests conversion.
7. Add no facts, examples, dates, sources, quotations, opinions, metaphors, certainty, or personal experience.
8. Make the smallest useful edit. Text with no diagnosed defect may pass unchanged.

The skill must not:

- promise human authorship, detector evasion, or “undetectable” output;
- treat a word, punctuation mark, sentence length, readability score, or tell count as proof of authorship;
- ban em dashes, passive voice, adverbs, transitions, headings, or jargon universally;
- add typos, slang, Unicode tricks, anecdotes, or fake imperfections;
- normalize legitimate dialect or multilingual usage into one generic voice.

## Diagnostic Model

Every proposed edit maps to at least one observable defect:

- buried answer or delayed action;
- repeated premise, thesis, summary, or conclusion;
- vague significance, generic praise, hype, or unsupported authority;
- stock opener, closer, transition, contrast, or call to action;
- process narration, knowledge-cutoff disclaimer, citation artifact, placeholder, or leaked tracking parameter;
- excessive abstraction or jargon inappropriate for the named audience;
- monotonous sentence openings or cadence when it harms readability;
- excessive headings, fragments, or formatting that obscures the content;
- unsupported specificity or fake quotation;
- register mismatch.

Diagnostics are contextual style signals, not authorship labels. Intentional repetition, technical terminology, passive voice, genre conventions, and user voice are valid carve-outs.

## Preservation Contract

Before rewriting, freeze or inventory:

- fenced and inline code;
- commands, paths, URLs, identifiers, and file names;
- direct quotations and citations;
- logs and error messages;
- headings, frontmatter, tables, and structured data where structure matters;
- names, dates, quantities, units, formulas, negation, modality, attribution, and uncertainty;
- user-designated immutable text.

After rewriting, the audit checks exact protected-span preservation, Markdown structure, newly introduced numbers, removed source tokens, and excessive shrinkage or change. Deterministic checks are gates for what they measure; they do not claim complete semantic equivalence. The agent must still compare claims and qualifications.

Initial change-budget thresholds are advisory until fixtures establish useful limits. A budget warning triggers review rather than automatic acceptance or rejection.

## Components

### Packaged skill

Add:

- `skills/say-it-straight/SKILL.md`
- `skills/say-it-straight/agents/openai.yaml`
- `skills/say-it-straight/LICENSE`
- `skills/say-it-straight/references/quick-rules.md`
- `skills/say-it-straight/references/quality-rubric.md`
- `skills/say-it-straight/references/upstream-notice.md`

The upstream notice records reviewed revisions, licenses, and whether each rule was copied, adapted, or independently derived. Do not copy from repositories without a license or from CC BY-SA material without a separate provenance decision.

### Dependency-free audit

Add `skills/say-it-straight/scripts/audit-output.mjs`. It accepts original and revised text files and returns a nonzero exit code for hard preservation failures. It reports soft diagnostics separately from hard gates.

The audit reuses local repository patterns but must strengthen protected-token handling beyond presence-only checks: count and order matter, and exact spans use byte equality where feasible.

### Package integration

Add the skill to:

- the doctor skill registry and its test fixture;
- plugin package assertions;
- the skill tables in all localized READMEs;
- both repository file inventories.

No runtime dependency is added.

## Runtime Flow

1. The user explicitly invokes `say-it-straight` with a task or source text.
2. The skill identifies the audience, purpose, language, register, and required output shape from the request.
3. It freezes protected spans and inventories source claims.
4. It diagnoses only contextual, observable defects.
5. It rewrites locally, leaving unmatched text alone when editing supplied prose.
6. It compares original and revised claims and runs the deterministic audit when files are available.
7. A hard failure blocks delivery until corrected. Soft findings guide one focused revision pass.
8. It returns the result directly. Rationale is included only when requested or when a preservation warning remains.

## Failure Handling

- Missing source text for an edit request: ask for it; do not invent a sample.
- Audit script missing or unreadable: continue only for newly generated conversational output; fail closed for file-backed rewriting that requested validation.
- Protected-span mismatch: restore the exact original span and rerun the audit.
- Possible claim, register, or modality drift not decidable mechanically: preserve the original wording or disclose the unresolved ambiguity.
- Conflicting style rules: direct user format, task completeness, safety, and evidence win.
- Composition conflict: Korean-specific preservation rules win for Korean source text; ADHD structure rules remain unless they would remove required content.

## Testing

Use test-driven development.

### Skill-contract tests

Verify explicit-only metadata, precedence rules, authorship disclaimers, no-change behavior, composition boundaries, and required reference files.

### Audit tests

Cover exact preservation and failure cases for code, commands, paths, URLs, identifiers, quotations, citations, numbers with units, repeated protected tokens, token order, Markdown structure, new-number injection, shrinkage warnings, and unchanged input.

### Writing fixtures

Use paired English and Korean fixtures for:

- stock openings and closings;
- repeated conclusions;
- vague significance and hype;
- model-process narration and citation artifacts;
- legitimate technical jargon, passive voice, transitions, and em dashes that must remain;
- dialect, formality, negation, modality, and uncertainty preservation;
- already strong prose that must remain unchanged.

Fixture assertions prioritize fact retention, protected spans, task completion, and contextual false positives. They must not use detector scores as the acceptance gate.

### Composition and packaging tests

Verify `say-it-straight` alone, with `i-have-adhd`, and with `humanize-korean`; package discovery on both hosts; doctor output; localized documentation; package dry-run; and the full test suite.

### Prompt-shape experiment

Keep the positive-contract advantage as a hypothesis. Compare a compact positive contract with a negative tell list on identical English and Korean fixtures under the same preservation gates. Adopt the better prompt only after measuring task adherence, residual defects, claim retention, and false positives.

## Acceptance Criteria

- Explicit invocation works on Codex and Claude Code; implicit invocation remains disabled.
- Strong input may pass unchanged.
- Every edit corresponds to a contextual defect.
- Protected spans, source claims, register, negation, modality, and uncertainty are preserved.
- The skill adds no facts or artificial imperfections.
- It makes no authorship or detector-evasion claim.
- Composition responsibilities are explicit and tested.
- Reviewed upstream revisions and licenses are documented.
- No dependency is added.
- Relevant tests and the full repository test suite pass.
