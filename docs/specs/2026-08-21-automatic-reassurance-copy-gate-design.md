# Automatic Reassurance Copy Gate Design

Date: 2026-08-21

## Goal

Prevent empty Korean reassurance copy across every Superloopy task that creates or changes user-visible product text. The gate applies automatically inside the Loopy engineer workflow; it is not a user-invoked skill and has no public invocation name.

Keep Korean naturalness separate. Expressions such as `정확한 컴퓨터` are collocation and modifier-target problems owned by `humanize-korean`, not by the reassurance gate.

## Why the Standalone Skill Is Removed

The current `product-copy` skill suggests a general UX or product-copy authoring capability, but issue #44 asks for a narrower policy: stop unsupported safety, accuracy, and negative-capability reassurance from replacing concrete outcomes or actions.

Explicit invocation also misses the original failure mode. The screenshots were created during UI work; the user should not need to know and invoke another skill to prevent the copy defect.

## Activation Contract

Inject the conditional gate into every full Loopy engineer start and resume context. Apply it when the task creates or modifies Korean text that a product user will see, regardless of the platform or owning implementation layer.

In scope:

- errors, warnings, completion and progress messages;
- settings descriptions and option consequences;
- state, recovery, fallback, and destructive-action messages;
- onboarding and operational notices;
- localized resources and fixtures that represent those user-visible messages;
- backend or shared code when its message is ultimately displayed to a user.

Out of scope:

- internal logs, diagnostics, developer-only errors, and test narration;
- code comments and technical documentation;
- quoted user/source text;
- general prose or marketing copy not representing product behavior;
- non-Korean copy in the first release.

Do not activate from keywords such as `안전` or `정확` alone. The condition is artifact ownership: the task changes user-visible Korean product behavior copy.

## Gate Rules

### RC-1 — empty reassurance

Reject unsupported boasts such as `안전하게 처리합니다`, `안심하고 사용하세요`, `정확하게 계산합니다`, and `정확하고 안전하게 진행됩니다`. State a supplied behavior, measurement, or state instead.

### RC-2 — incomplete failure outcome

A failure message names at least one supplied reader-relevant fact: observable outcome, retained state, active fallback, recovery result, or next action. Known vague forms such as `저장에 실패해도 이전 버전은 안전하게 남습니다` fail.

If the task lacks the required product fact, record the missing fact as a blocker or question. Do not invent a recovery result.

### RC-3 — negative-capability wording

Prefer an affirmative state or next action when meaning stays intact. Preserve verified privacy or legal commitments such as `검색어를 서버로 전송하지 않습니다`; route them to manual review rather than deleting them.

### RC-4 — unsupported reinvention

Every recovery, retention, encryption, privacy, correctness, or safety clause maps to supplied behavior. Plausibility is not support.

## Korean Naturalness Boundary

Add a semantic `humanize-korean` rule for misplaced modifiers and collocations:

- Review `정확한 컴퓨터`, `정확한 MSI 보드 확인됨`, and `정확한 펌웨어 이미지`.
- Name the supplied target, model identity, specification, measurement, or match.
- Preserve legitimate phrases such as `정확한 시간`, `정확한 수치`, `정확한 사양`, and `정확한 정보`.
- Keep this rule out of deterministic regex grading because Korean noun-phrase relations cannot be classified reliably from tokens alone.

When a Loopy task changes user-visible Korean product copy, its conditional gate instructs the agent to apply this `humanize-korean` naturalness boundary after the RC checks.

## Runtime Integration

### Engineer context

Add one concise conditional block to every `renderStart` and `renderResume` path in `src/engineer.js`. The block tells the loop engineer to:

1. decide from the affected artifact whether user-visible Korean product copy is changing;
2. add a plan criterion covering RC-1 through RC-4 and the Korean naturalness pass;
3. preserve product facts and report missing behavior;
4. validate file-backed copy with the bundled lexical audit when source/final artifacts exist.

The block is always present as a condition; it does not use lexical prompt classification and does not inject into ordinary non-Loopy prompts.

### Internal reference and audit

Add:

- `skills/superloopy-loop/references/reassurance-copy.md`
- `skills/superloopy-loop/scripts/audit-reassurance-copy.mjs`

The reference owns RC-1 through RC-4. The dependency-free audit moves the observable lexical checks from the removed standalone skill. It may detect known RC-1/RC-2 forms, missing protected tokens, RC-3 manual review, change rate, and line-ending parity. It cannot certify semantic truth or the Korean naturalness rule.

### Remove standalone discovery

Remove:

- `skills/product-copy/`
- its agent metadata and explicit invocation;
- its README skill rows and doctor-required discovery;
- its standalone packaging and integration tests;
- stale `product-copy` design/file/golden inventory claims.

There is no replacement user-facing skill name.

## Evidence and Completion

For an affected Loopy task, the plan criterion is the completion authority. Evidence should include the changed copy and either:

- a command-backed audit over source/final files; or
- manual review evidence when the rule is semantic or the copy is embedded in UI code.

The lexical audit is supporting evidence, not proof that product behavior is true.

## Testing

Use TDD.

### Engineer routing

Verify:

- every Loopy start and resume context contains the conditional gate;
- solo and crew paths receive identical ownership;
- an empty-brief start still carries the condition for the later task;
- ordinary non-Loopy prompts stay quiet;
- no safety/accuracy keyword classifier is introduced.

### Internal audit

Move and rename the existing RC-1 through RC-4 cases. Preserve Windows-safe CLI entry, public report schema, protected product names, Unicode quotes, malformed-input reports, and LF/CRLF parity.

### Humanize boundary

Use fresh-context behavior evaluation to prove the semantic naturalness rule repairs misplaced precision while preserving measurable accuracy. The humanizer audit must not add a brittle phrase regex.

### Packaging and docs

Verify the removed skill is absent from discovery and the package, the new internal reference/script is packaged, doctor stays healthy, README skill tables no longer advertise `product-copy`, and all file/design/golden inventories are exact.

Run the focused suites, full `npm test`, `npm pack --dry-run --json`, independent review, current-head push, and all six GitHub Actions jobs.

## Acceptance Criteria

- No standalone `product-copy` skill, invocation, metadata, or README row remains.
- Every full Loopy task receives the conditional reassurance-copy contract.
- The contract activates only for affected user-visible Korean product copy.
- RC-1/RC-2 violations fail and RC-3 remains visible for manual review.
- Missing behavior is never invented.
- `정확한 컴퓨터`-style naturalness repair belongs to `humanize-korean`, with no deterministic phrase classifier.
- Ordinary non-Loopy prompts and unrelated artifacts are unchanged.
- Version remains `0.17.0`; no dependency is added.
- Full local and current-head cross-platform CI pass.
