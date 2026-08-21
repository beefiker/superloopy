# Product Copy Gate Design

Date: 2026-08-21

## Goal

Move issue #44 out of `humanize-korean` and ship an explicit-only `product-copy` skill for Korean in-product messages. The gate rewrites vague reassurance into supported outcomes, fallback states, or next actions without inventing product behavior.

`humanize-korean` keeps ownership of Korean AI-tone removal. It must no longer fail or grade text based on safety, accuracy, recovery, privacy, or negative-capability policy.

## Approaches Considered

### 1. Independent `product-copy` skill — selected

Add a packaged skill, deterministic audit, calibration cases, and tests. Disable implicit invocation so a user must explicitly request product-copy work.

Benefits:

- keeps product-message policy separate from Korean naturalness;
- gives issue #44 a reusable home with its own evidence and tests;
- allows stronger product-copy gating without changing ordinary humanization;
- can grow independently if later feedback adds product-message rules.

Cost: one more packaged skill and audit surface.

### 2. Product-copy profile inside `humanize-korean`

Rejected because genre detection would still mix rewriting authority with product policy and make future scope drift likely.

### 3. Add the rules to `say-it-straight`

Rejected because directness/compression does not own product behavior, recovery state, privacy commitments, or missing product facts.

## Activation Contract

The skill is explicit-only:

- Codex: `$superloopy:product-copy`
- Claude Code: `/superloopy:product-copy`
- `disable-model-invocation: true` in `SKILL.md`
- `policy.allow_implicit_invocation: false` in `agents/openai.yaml`

Ordinary requests such as “AI 티 없애줘”, “한국어를 자연스럽게 다듬어줘”, or “이 앱 문구를 읽기 좋게 고쳐줘” do not activate the gate. The user must explicitly request product-copy, UX-copy, error-message, completion-message, safety-flaunting, or in-product wording review through the skill invocation.

The first release validates Korean copy. The principles are language-neutral, but the deterministic patterns and calibration set must not claim coverage for other languages.

## Input and Output Contract

Input is supplied Korean in-product copy plus any known product behavior. Typical surfaces include errors, completion messages, settings descriptions, onboarding text, and operational notices.

The skill must:

1. freeze product names, code, numbers, paths, URLs, quoted text, legal text, and user-supplied behavior;
2. identify the reader’s decision: what happened, what remains, what the product will do, or what the reader should do;
3. replace vague reassurance only when the source already supplies the concrete behavior;
4. request the missing product fact instead of inventing recovery, security, privacy, or correctness claims;
5. return the smallest complete rewrite at the source register.

For a direct rewrite with sufficient facts, return only the rewritten copy. If required behavior is absent, stop with one precise question naming the missing fact. File-backed work records source, final, summary, and audit JSON under the normal Superloopy evidence boundary.

## Gate Rules

### PC-1 — vague reassurance

Reject generic boasts such as `안전하게 처리합니다`, `안심하고 사용하세요`, `정확하게 계산합니다`, and `정확하고 안전하게 진행됩니다` when they remain in final product copy.

Repair with an already-supported behavior, measurement, or state. A supplied safety or accuracy claim is not permission to invent its mechanism.

### PC-2 — incomplete failure outcome

A failure message must give at least one reader-relevant fact already supported by the input:

- observable outcome;
- retained state;
- active fallback;
- recovery result; or
- next action.

Known vague forms such as `저장에 실패해도 이전 버전은 안전하게 남습니다` fail. Open-ended failure wording that a deterministic script cannot classify becomes manual review rather than an automatic pass.

### PC-3 — negative-capability wording

Prefer an affirmative state or next action when it preserves meaning. `자동으로 수정하지 않습니다` may become an instruction; `서버로 전송하지 않습니다` may be a privacy commitment and must not be deleted automatically.

The audit reports these clauses for manual review. They do not fail solely because they are negative.

### PC-4 — unsupported reinvention

Never add a recovery, encryption, retention, privacy, correctness, or safety fact absent from the source or user-provided context. Missing support blocks the rewrite rather than encouraging plausible copy.

## Deterministic Audit Boundary

Add `skills/product-copy/scripts/audit-product-copy.mjs` with no dependency. It accepts `--source`, `--final`, and `--report`.

The report contains:

- `ok`;
- `problems` for missing protected content and known PC-1/PC-2 violations;
- `manualReview` for negative-capability clauses, large rewrites, and failure messages whose completeness cannot be proven mechanically;
- pattern counts before and after;
- protected-token preservation and change rate.

The script may reject observable lexical forms. It must not certify that a recovery, safety, privacy, or legal claim is true. Manual-review items remain visible even when `ok` is true.

## Packaged Components

Add:

- `skills/product-copy/SKILL.md`
- `skills/product-copy/agents/openai.yaml`
- `skills/product-copy/references/quick-rules.md`
- `skills/product-copy/references/quality-rubric.md`
- `skills/product-copy/references/golden-set.md`
- `skills/product-copy/scripts/audit-product-copy.mjs`
- `test/product-copy.test.js`

Use the repository’s skill initializer, then replace every placeholder. Add only these resources; no README, dependency, license, or upstream notice is needed because the content is Superloopy-native.

## `humanize-korean` Reconciliation

Retain the PR’s CRLF parser normalization, Korean AI-tell improvements, em-dash rule, protected-span behavior, change-rate correction, and non-L golden examples.

Remove from `humanize-korean`:

- L-1/L-2/L-3 patterns and grading;
- failure/recovery semantic regular expressions;
- safety/reassurance contract text;
- issue-#44 product-copy tests;
- product-copy golden pairs and product-copy-specific audit tags.

The new skill owns the moved examples and rules. `humanize-korean` may mention `product-copy` only as an explicit companion when the user separately invokes it.

## Packaging and Documentation

Update:

- plugin packaging tests and doctor skill discovery;
- all localized skill tables that enumerate packaged skills;
- `docs/superloopy-design-audit.md`;
- `docs/superloopy-file-audit.md`;
- `docs/superloopy-loop-golden-set.md`;
- PR #49 title, summary, test plan, and issue-#44 scope.

Keep version `0.17.0` and the existing dependency set.

## Testing

Use test-driven development for both the skill and the script.

### Skill behavior evaluations

Establish a baseline without the skill, then forward-test the packaged skill on at least these cases:

1. vague success copy with no supplied mechanism;
2. a failure message with a supplied fallback state;
3. a privacy commitment that must remain factual rather than become an instruction;
4. a request that lacks the recovery fact needed for a safe rewrite.

The skill passes when it removes unsupported reassurance, states supplied behavior directly, preserves privacy/legal meaning, and asks for missing facts instead of inventing them.

### Audit tests

Cover:

- PC-1 generic safety and accuracy boasts fail;
- the issue’s vague failure sentence fails;
- a concrete supplied fallback passes without safety decoration;
- negative privacy commitments produce manual review rather than failure;
- protected values cannot disappear;
- source/final change rate is reported and large rewrites receive manual review without failing solely on size;
- malformed arguments and unreadable files write useful failure reports;
- LF and CRLF inputs behave identically.

### Repository gates

Run the focused product-copy and humanize suites, skill validation, full `npm test`, `npm pack --dry-run --json`, independent review, push, and the complete GitHub Actions matrix.

## Acceptance Criteria

- Issue #44 is implemented by an explicit-only `product-copy` skill, not by general Korean humanization.
- Ordinary `humanize-korean` runs have no safety, accuracy, negative-capability, recovery, or privacy gate.
- The new skill never invents missing product behavior.
- Known vague reassurance and incomplete failure copy fail the product-copy audit.
- Privacy/legal negative claims receive manual review rather than automatic deletion.
- The CRLF Windows repair remains covered.
- No dependency is added.
- Packaging, documentation, focused tests, the full suite, and GitHub CI pass.
