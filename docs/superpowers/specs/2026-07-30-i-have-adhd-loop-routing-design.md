# i-have-adhd Loop Routing Design

Date: 2026-07-30

## Goal

Package the upstream `ayghri/i-have-adhd` output-shaping skill in Superloopy and activate it automatically only when:

1. a leading `loopy` or `루피` prompt wakes the loop engineer; and
2. the cleaned task brief contains a self-selected ADHD-friendly formatting request or a direct statement of execution friction that the overlay addresses.

The routing must improve readability without diagnosing the user from their writing style or weakening Superloopy's planning, safety, evidence, or completion gates.

## Upstream

- Repository: https://github.com/ayghri/i-have-adhd
- Reviewed revision: `07684c4ab625dd7d1ea6e99e065f60bc0ac6a1ba`
- Source skill: `skills/i-have-adhd/SKILL.md`
- License: MIT, copyright 2026 Ayoub Ghriss

Superloopy will preserve the upstream skill name and core ten-rule output contract. It will adapt activation metadata, replace diagnostic assumptions with a non-diagnostic formatting boundary, and document Superloopy precedence.

## Approaches Considered

### 1. Loop-gated hook injection — selected

The existing loop-engineer prompt hook classifies the cleaned `loopy` brief. A qualifying brief receives the packaged skill body in hook context.

Benefits:

- identical routing on Codex and Claude Code;
- limited to actual loop-engineer prompts;
- deterministic and directly testable;
- one packaged `SKILL.md` remains the rule source.

Cost: the qualifying hook response becomes larger because it includes the output-shaping instructions.

### 2. Host implicit invocation

Keep Codex `allow_implicit_invocation: true` and rely on each host to discover the skill.

Rejected because it is not reliably limited to `loopy`, and upstream Codex and Claude activation semantics differ.

### 3. Always enable for every loop

Inject the output style into all `loopy` prompts.

Rejected because users who did not ask for ADHD-friendly formatting would receive an intrusive style change.

## Activation Contract

### Loop-gated automatic activation

Automatic activation requires both predicates:

- `hasEngineerTrigger(prompt)` recognizes a leading complete `loopy` or `루피` engineer token; and
- the brief remaining after `parseInvocation(prompt)` contains a supported output-support cue.

Supported cue categories:

- a self-identifying statement paired with the task, such as `I have ADHD`, or an unambiguous request for ADHD-friendly output;
- a first-person statement about difficulty starting, focusing, or holding the task structure in working memory;
- a first-person statement about feeling overwhelmed by the task or answer;
- a direct request for one step at a time, short numbered steps, action-first output, easy scanning, or an answer that does not bury the next action.

Initial matching covers clear English and Korean forms. The token `ADHD` may occur in any language, but it must participate in a self-identifying statement or formatting request; the token alone is not a cue. The catalog stays small and auditable, and new languages require explicit fixtures rather than broad fuzzy matching.

The matcher is an output-preference classifier, not a medical classifier. Name it accordingly, for example `hasAdhdFriendlyOutputCue`.

### Non-signals

None of these may activate the overlay by themselves:

- typos or misspellings;
- fragmented, terse, or ungrammatical writing;
- repeated punctuation, capitalization, or urgency;
- non-native language use;
- domain discussion of ADHD, attention, focus, accessibility, or cognitive load;
- a general complex task with no output-support request.

The injected context must not say or imply that Superloopy detected, inferred, or diagnosed ADHD.

### Explicit activation

The packaged skill remains directly available:

- Codex: `$superloopy:i-have-adhd`
- Claude Code: `/superloopy:i-have-adhd`

Host-level implicit activation stays disabled:

- `disable-model-invocation: true` in `SKILL.md`;
- `policy.allow_implicit_invocation: false` in `agents/openai.yaml`.

### Persistence and stopping

The automatic hook injection occurs on a qualifying `loopy` prompt. The skill's session instructions then shape later responses in the same conversation until the user says `stop adhd mode` or `normal mode`.

This mode is conversational, matching upstream behavior. It does not add a field to `.superloopy/goals.json`, mutate repository state from the prompt hook, or promise persistence across a new session. A later qualifying `loopy` prompt may activate the overlay again.

## Components

### Packaged skill

Add:

- `skills/i-have-adhd/SKILL.md`
- `skills/i-have-adhd/agents/openai.yaml`
- `skills/i-have-adhd/LICENSE`
- `skills/i-have-adhd/references/upstream-notice.md`

The adapted skill keeps the upstream rules and exceptions while adding:

- no diagnosis or inference claim;
- explicit-only standalone activation;
- system, developer, user, safety, and task requirements take precedence;
- Superloopy's plan and evidence state remain authoritative;
- the overlay creates no evidence artifact by itself.

### Cue classifier and loader

Add a focused dependency-free module under `src/` that:

- accepts only the cleaned engineer brief;
- returns a boolean activation decision;
- rejects stop/normal-mode requests;
- loads the packaged `SKILL.md` only after a positive match;
- strips YAML frontmatter before returning hook context;
- fails closed to normal Superloopy output if the file is missing or unreadable.

The classifier must not inspect repository contents, prior user history, or personal data. It operates only on the current cleaned brief.

### Loop-engineer integration

`src/engineer.js` keeps ownership of leading `loopy` routing. For a qualifying prompt, it appends a clearly delimited `ADHD-friendly output overlay` section to the existing `UserPromptSubmit` additional context.

The overlay affects presentation only. Existing loop commands, criteria, delegation boundaries, safety confirmations, validation, and evidence gates keep their current precedence and behavior.

### Documentation and inventory

Add the skill to:

- the skill table in all five localized READMEs;
- doctor/package skill inventory;
- package and documentation tests.

Documentation must describe both explicit invocation and conditional `loopy` activation without claiming that prompt style reveals a diagnosis.

## Runtime Flow

1. The user submits `loopy <brief>` or `루피 <brief>`.
2. Existing lexical routing confirms a real loop-engineer trigger.
3. Superloopy strips the engineer token and optional team/crew token.
4. The output-cue classifier checks the cleaned brief.
5. No cue: render the existing loop-engineer context unchanged.
6. Cue present: load the packaged skill body and append the overlay context.
7. The agent drives the same Superloopy loop while formatting responses with the overlay.
8. `stop adhd mode` or `normal mode` returns the conversation to normal output style.

## Failure Handling

- A missing or unreadable packaged skill must not prevent the loop engineer from starting or resuming.
- The hook must not print filesystem paths, stack traces, or raw loader errors into user-visible context.
- A phrase that merely discusses ADHD without requesting output support should not activate unless the wording is an explicit self-selected formatting request.
- Destructive-action confirmation, genuine ambiguity, debugging escalation, and host instructions override brevity rules.
- Direct user formatting instructions override the overlay for that response.

## Testing

Use test-driven development.

### Cue-classifier tests

Cover:

- self-selected ADHD-friendly requests and self-identifying task statements;
- focus, overwhelm, action-first, one-step, and easy-scan cues;
- English and Korean positive cases;
- typos, fragments, urgency, terse prose, and unrelated ADHD discussion as negative cases;
- `stop adhd mode` and `normal mode` as negative cases;
- absence of a leading engineer trigger.

### Hook integration tests

Verify:

- qualifying `loopy` and `루피` prompts include the overlay;
- ordinary `loopy` prompts preserve current hook output;
- non-`loopy` prompts never activate this route;
- team/crew briefs are classified after trigger tokens are removed;
- loader failure preserves normal loop-engineer guidance;
- hook execution still does not create `.superloopy/goals.json`.

### Packaging and documentation tests

Verify:

- required skill files and MIT notice are packaged;
- both hosts advertise explicit-only standalone activation;
- the skill contains its core rules, exceptions, non-diagnostic boundary, and Superloopy precedence;
- doctor inventory includes `i-have-adhd`;
- every localized README discovers the skill and conditional route;
- `npm test` and npm package dry-run pass.

## Acceptance Criteria

- A qualifying leading `loopy`/`루피` prompt receives the ADHD-friendly overlay on Codex and Claude Code.
- Ordinary prompts and ordinary loop tasks remain unchanged.
- The implementation never infers ADHD from writing quality or style.
- Standalone host implicit invocation is disabled; explicit invocation works.
- Superloopy evidence and completion behavior is unchanged.
- Upstream MIT attribution ships with the package.
- No dependency is added.
- The full repository test suite passes.
