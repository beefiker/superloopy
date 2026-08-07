# Say It Straight as the Loopy Default Output Style

Date: 2026-08-05

## Goal

Apply `say-it-straight` by default to user-facing progress reports and the final answer of every full Superloopy loop. Keep task artifacts unchanged unless the user explicitly invokes the full `say-it-straight` editing skill. Let the user disable or re-enable the default for the current loop only.

## Scope

The default applies to full loop routes:

- `loopy` and `루피` solo runs;
- spaced crew forms such as `loopy team`, `loopy crew`, `루피 팀`, and `루피 크루`;
- connected `loopycrew` runs;
- standalone `ultrawork` runs;
- start, resume, automatic continuation, and compaction recovery while the loop remains active;
- the final user-facing completion answer produced for that loop.

Guidance-only aliases (`loopywork`, `lpy`, and `$lpy`) do not activate the default because they do not create or resume a full loop by themselves.

The default does not rewrite code, comments, documentation, evidence artifacts, quoted user text, or other task outputs. Those remain governed by the task and require explicit `$superloopy:say-it-straight` or `/superloopy:say-it-straight` invocation when prose editing is requested.

## Approaches Considered

### 1. Persist the preference in loop state — selected

Each new loop starts with `sayItStraight: true`. An exact manual command updates that loop's state. The setting survives later prompts, automatic continuation, compaction, and scoped-session recovery. A new loop receives the default again.

This matches Superloopy's durable, repo-local state model and the requested current-loop-only opt-out.

### 2. Rely on conversation context

Rejected because a compaction or session recovery could lose the opt-out and silently re-enable the style.

### 3. Use a global preference or environment variable

Rejected because it would outlive the current loop and conflict with the requested scope.

## State Contract

The plan owns a versioned output-style object:

```json
{
  "outputStyle": {
    "sayItStraight": true
  }
}
```

`createLoop` writes the default for global and scoped-session plans. Legacy plans without the field are read as enabled so upgrades receive the new default without a migration write.

Style changes use the existing goals-file lock and atomic plan write. They append a ledger event that records the style name and enabled state. Direct hand-editing of `goals.json` remains unsupported.

Starting a new loop, including an intentional `--force` replacement, writes a fresh enabled default. Completing a loop does not change the recorded value; the preference simply has no authority outside that completed loop.

## Manual Controls

The prompt hook recognizes only these exact, standalone commands after trimming surrounding whitespace and optional terminal punctuation:

- disable: `say-it-straight off`, `직설 모드 끄기`;
- enable: `say-it-straight on`, `직설 모드 켜기`.

Embedded mentions, quoted examples, task prose, and near matches do not change state. A control command requires an existing resumable, incomplete loop. With no active loop, the hook explains that there is no current loop to update and does not create one.

The confirmation states the effective value and its current-loop-only scope. If the locked write fails, the hook reports the failure and leaves the prior value authoritative.

## Output Overlay

The injected overlay is a compact runtime contract derived from the packaged `say-it-straight` output rules:

1. Lead with the result, progress, blocker, or next required action.
2. Include only context needed to use the update correctly.
3. Preserve required evidence, caveats, commands, and validation detail.
4. Stop when the update or final answer is complete.
5. Apply these rules only to user-facing loop communication; do not silently edit task artifacts.

The overlay has lower authority than system, developer, user, safety, task, evidence, validation, and completion requirements. It must never shorten away required detail.

When `i-have-adhd` also applies, ADHD rules own response structure and `say-it-straight` owns wording inside that structure. Korean task-artifact rewriting remains owned by `humanize-korean`; ordinary Korean progress reports may use the language-neutral output overlay without invoking a rewrite workflow.

## Injection Flow

1. A full Loopy trigger injects the enabled overlay before the plan exists and directs loop creation to persist the enabled default.
2. Once the plan exists, start and resume context reads the effective plan preference.
3. Automatic Stop-hook continuation includes the overlay only while enabled.
4. Compaction recovery includes the effective setting so the resumed model does not guess.
5. Completion guidance keeps the effective overlay available for the final answer.
6. A manual off/on command atomically updates the plan and injects an immediate confirmation directive.

Missing or malformed style state fails to the backward-compatible enabled default. A failed mutation never claims that the setting changed.

## Components

- A small output-style module owns defaults, parsing, effective-value reads, state mutation, and compact overlay text.
- `createLoop` initializes the plan field.
- `runUserPromptSubmitHook` handles exact manual controls before ordinary trigger routing.
- The loop engineer, active-loop context, continuation directive, and compaction recovery consume the effective style.
- CLI help and public skill documentation describe the default and current-loop controls where users encounter Loopy activation behavior.

No dependency is added. The existing explicit-only metadata for direct prose editing remains unchanged.

## Testing

TDD coverage must prove:

- new global and scoped loops default to enabled;
- legacy plans without the field read as enabled without mutation;
- exact English and Korean off/on commands update only the active loop and append ledger evidence;
- near matches, quoted commands, and ordinary prose stay inert;
- no-plan, completed-plan, binding-blocked, and write-failure paths do not claim success;
- all full loop trigger variants receive the default overlay;
- guidance-only aliases do not gain full-loop behavior;
- disabled loops omit the overlay across resume, continuation, and compaction recovery;
- re-enabled loops restore it;
- a newly created loop resets to enabled;
- ADHD composition retains structure-first precedence;
- existing explicit `say-it-straight`, `humanize-korean`, trigger, and completion gates remain intact.

Focused tests run before the full dependency-free Node suite, doctor, package dry-run, and diff checks.

## Success Criteria

- Every full Loopy run uses direct, concise, complete user-facing progress and final communication by default.
- Users can disable and re-enable the style for the current loop with exact English or Korean commands.
- The preference survives loop continuation and recovery but never becomes global.
- Task artifacts are unchanged unless separately authorized.
- Existing evidence, validation, specialist ownership, and completion guarantees retain precedence.
