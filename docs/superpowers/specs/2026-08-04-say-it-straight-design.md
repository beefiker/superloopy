# Say It Straight Skill Design

Date: 2026-08-04

## Goal

Add an explicit-only Superloopy presentation skill named `say-it-straight`. It produces precise, concise, natural writing without stock AI phrasing or artificial roughening. It preserves meaning, facts, register, and protected text, and never claims that output is human-authored or detector-safe.

## Research Basis and Provenance Policy

The design follows a global saturation review of public writing skills, prose linters, humanizers, style-transfer systems, validators, datasets, and native-language projects. The useful result is an architecture, not a combined tell list:

- positive output contracts should be the primary prompt shape, with prohibitions limited to diagnosed risks;
- local contextual diagnostics are safer than authorship labels;
- deterministic structure and protected-span checks catch failures semantic scores miss;
- user-owned voice samples provide safer calibration than manufactured roughness;
- native-language rules must remain native modules rather than translated English bans;
- collaborative and adversarially paraphrased text belongs in evaluation.

Use a clean-room MIT policy. Review public projects for ideas and failure modes, but independently author every packaged rule, example, schema, fixture, and line of code. Copy no wording from Wikipedia/CC BY-SA material, unlicensed repositories or gists, deleted-source caches, conflicting-license packages, or detector-bypass products. Record the reviewed source, pinned revision, license, reusable idea, and copy decision in `references/upstream-notice.md`.

## Responsibility Boundary

- `i-have-adhd` owns response shape and scanability: answer first, short sections, and visible actions.
- `say-it-straight` owns general prose quality: direct wording, concrete claims, natural cadence, low repetition, and removal of stock framing or model-process chatter.
- `humanize-korean` owns Korean source-text rewriting, Korean-specific patterns, register, and protected-token behavior.

When skills compose, task, safety, evidence, validation, and direct user instructions remain authoritative. `i-have-adhd` chooses structure; `say-it-straight` improves wording within that structure; `humanize-korean` takes precedence for Korean-specific source edits.

For other languages, `say-it-straight` preserves the requested locale, dialect, code-switching, register, and genre but applies only language-neutral editing principles. It does not manufacture a language module from translated English tell lists. If the requested edit depends on native judgment the skill does not have, it makes only preservation-safe edits and names the limitation.

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

The desired output shape is positive and ordered:

1. answer, result, or necessary action;
2. only the context needed to use it correctly;
3. required evidence, caveats, or steps;
4. stop when the task is complete.

This shape is a default, not a shortening quota. Task completeness, safety, evidence, requested explanation depth, and required code or data remain intact.

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

`references/quick-rules.md` expresses each diagnostic as a four-part record: observable defect, repair shape, legitimate counterexample, and preservation risk. It contains no universal word or punctuation blacklist. The skill edits a span only when the defect is visible in the supplied text or required output.

## Preservation Contract

Before rewriting, freeze or inventory:

- fenced and inline code;
- commands, paths, URLs, identifiers, and file names;
- direct quotations and citations;
- logs and error messages;
- headings, frontmatter, tables, and structured data where structure matters;
- names, dates, quantities, units, formulas, negation, modality, attribution, and uncertainty;
- user-designated immutable text.

Represent frozen content with request-scoped typed placeholders. Each placeholder carries a collision-resistant run tag, span type, and ordinal. Equal source values may share a stable mapping only within the same run; the reverse map never persists beyond the task. Restore by exact value, count, and order. A missing, duplicated, reordered, mutated, or unresolved placeholder is a hard failure.

After rewriting, the audit checks exact protected-span preservation, Markdown/frontmatter structure, heading order, code fences, inline code, links, paths, tables, quotations, citations, identifiers, numbers, user-frozen text, newly introduced numbers, and excessive shrinkage or change. Deterministic checks are gates for what they measure; they do not claim complete semantic equivalence. The agent must separately compare names, claims, negation, modality, attribution, uncertainty, and qualifications.

Embedding or learned similarity scores may be used only as secondary warnings in external experiments. The packaged skill adds no model, dependency, network call, or similarity threshold.

Initial change-budget thresholds are advisory until fixtures establish useful limits. A budget warning triggers review rather than automatic acceptance or rejection.

## Components

### Packaged skill

Add:

- `skills/say-it-straight/SKILL.md`
- `skills/say-it-straight/agents/openai.yaml`
- `skills/say-it-straight/LICENSE`
- `skills/say-it-straight/references/quick-rules.md`
- `skills/say-it-straight/references/preservation.md`
- `skills/say-it-straight/references/quality-rubric.md`
- `skills/say-it-straight/references/upstream-notice.md`

The upstream notice records reviewed revisions, licenses, the idea considered, and the clean-room decision. It states that packaged wording, code, examples, schemas, and fixtures are independently authored. `preservation.md` owns protected-span types, placeholder invariants, claim-review fields, and hard-versus-soft audit outcomes so `SKILL.md` stays short.

### Dependency-free audit

Add `skills/say-it-straight/scripts/audit-output.mjs`. It accepts original and revised text files and returns a nonzero exit code for hard preservation failures. It reports soft diagnostics separately from hard gates and writes a machine-readable JSON report.

The audit is dependency-free and independently implemented from the contract. It strengthens protected-token handling beyond presence-only checks: type, exact value, count, and order matter; exact spans use byte equality where feasible; collisions and unresolved placeholder-shaped text fail closed. It checks only properties it can establish mechanically and never emits an authorship or detector score.

### Package integration

Add the skill to:

- the doctor skill registry and its test fixture;
- plugin package assertions;
- the skill tables in all localized READMEs;
- both repository file inventories.

No runtime dependency is added.

## Runtime Flow

1. The user explicitly invokes `say-it-straight` with a task or source text.
2. The skill builds a small internal target card: audience, purpose, language/locale, register, genre, and required output shape.
3. It freezes protected spans with request-scoped typed placeholders and inventories source claims.
4. It diagnoses only contextual, observable defects and maps each proposed edit to one defect.
5. It rewrites locally, leaving unmatched text alone when editing supplied prose.
6. It restores frozen spans and compares original and revised claims, negation, modality, attribution, and uncertainty.
7. It runs the deterministic audit for file-backed edits. Conversational generation uses the same manual checks without pretending a file audit ran.
8. A hard failure blocks delivery until corrected. Soft findings allow one focused revision pass; stop when the result no longer improves.
9. It returns the result directly. Rationale is included only when requested or when a preservation warning remains.

## Failure Handling

- Missing source text for an edit request: ask for it; do not invent a sample.
- Audit script missing or unreadable: continue only for newly generated conversational output; fail closed for file-backed rewriting that requested validation.
- Protected-span mismatch: restore the exact original span and rerun the audit.
- Possible claim, register, or modality drift not decidable mechanically: preserve the original wording or disclose the unresolved ambiguity.
- Placeholder collision, mutation, duplication, reordering, or unresolved placeholder-shaped text: restore from the run-scoped map; if exact restoration is impossible, fail closed.
- Unsupported language-specific judgment: keep only language-neutral, preservation-safe edits and state the limitation; do not import translated tell rules.
- Conflicting style rules: direct user format, task completeness, safety, and evidence win.
- Composition conflict: Korean-specific preservation rules win for Korean source text; ADHD structure rules remain unless they would remove required content.

## Testing

Use test-driven development.

### Skill behavior baseline

Before writing the skill, run fresh-context scenarios without it and record the failures that actually occur. Cover over-editing already-strong prose, burying the answer, banning legitimate punctuation or jargon, inventing specifics to sound human, deleting caveats, and preserving code or citations. Micro-test the positive contract against a no-guidance control with at least five fresh samples per wording variant. Re-run the same tasks with the skill and retain raw outputs as evaluation evidence rather than embedding a preferred answer in the prompt.

### Skill-contract tests

Verify explicit-only metadata, precedence rules, authorship disclaimers, positive output shape, contextual diagnostics, no-change behavior, unsupported-language behavior, composition boundaries, and required reference files.

### Audit tests

Cover exact preservation and failure cases for code, commands, paths, URLs, identifiers, quotations, citations, numbers with units, repeated protected tokens, token type/count/order, placeholder collision and mutation, unresolved placeholders, frontmatter, heading order, Markdown structure, tables, new-number injection, shrinkage warnings, and unchanged input.

### Writing fixtures

Use paired English and Korean fixtures for:

- stock openings and closings;
- repeated conclusions;
- vague significance and hype;
- model-process narration and citation artifacts;
- legitimate technical jargon, passive voice, transitions, and em dashes that must remain;
- dialect, formality, negation, modality, and uncertainty preservation;
- already strong prose that must remain unchanged.

Add collaborative-edited and adversarial paraphrase fixtures modeled on public benchmark categories: human-only, model-only, polished, continued, paraphrased, and iteratively paraphrased. These fixtures test preservation under increasingly aggressive edits; they never train or validate an authorship classifier.

Fixture assertions prioritize fact retention, protected spans, task completion, claim/qualification retention, and contextual false positives. They must not use detector scores as the acceptance gate.

### Composition and packaging tests

Verify `say-it-straight` alone, with `i-have-adhd`, and with `humanize-korean`; package discovery on both hosts; doctor output; localized documentation; package dry-run; and the full test suite.

### Prompt-shape experiment

Keep the positive-contract advantage as a hypothesis. Compare a compact positive contract with a negative tell list on identical English and Korean fixtures under the same preservation gates. Adopt the better prompt only after measuring task adherence, residual defects, claim retention, and false positives.

## Reference Adoption Matrix

The implementation plan must pin exact revisions and recheck licenses before use. The initial decisions are:

| Reference family | Idea retained | Clean-room decision |
| --- | --- | --- |
| `conorbronsdon/avoid-ai-writing` | local diagnostics, severity, preservation, convergence | independently implement; do not copy catalog wording or code |
| Sentry, Mindrally, UX-writing, Geoffrey, Michael-F-Bryan, Khazix, Rednote | positive audience/voice contracts and user-owned samples | synthesize the design principle only |
| Vale, retext, textlint, Harper | markup-aware and structured lint architecture | implement only the small repository-native audit required here |
| `llm-redactor` and Presidio | typed spans, run-scoped mappings, restoration | independently implement deterministic document-span protection; do not reuse privacy NER logic |
| `im-not-ai`, PT-BR Humanizar, Boileau, `scrittura-italiana`, multilingual `avoid-ai-writing` | native phenomena and false-positive boundaries | keep as language-module research; do not merge their tell lists into the general skill |
| FAID, HLPC, PADBen, RAID, MAGE, PAWS | collaborative, paraphrased, adversarial, genre, and meaning-trap evaluation classes | author small original fixtures; copy no dataset records |
| Wikipedia/`blader` derivative family | provenance hazards and common false positives | copy nothing; use only as counter-brief evidence |
| detector-bypass products, recent humanizer checkpoints, unlicensed/deleted/conflicting sources | failure modes | exclude from production inputs |

## Acceptance Criteria

- Explicit invocation works on Codex and Claude Code; implicit invocation remains disabled.
- Strong input may pass unchanged.
- Every edit corresponds to a contextual defect.
- Protected spans, source claims, register, negation, modality, and uncertainty are preserved.
- The skill adds no facts or artificial imperfections.
- It makes no authorship or detector-evasion claim.
- Composition responsibilities are explicit and tested.
- Reviewed upstream revisions and licenses are documented.
- Every packaged rule, example, fixture, schema, and script is independently authored under the clean-room MIT policy.
- Typed protected spans restore by exact type, value, count, and order and fail closed on collision or mutation.
- Baseline and forward tests show the skill improves the reproduced failures without over-editing already-strong prose.
- Collaborative and iterative-paraphrase fixtures exercise preservation without an authorship classifier.
- No dependency is added.
- Relevant tests and the full repository test suite pass.
