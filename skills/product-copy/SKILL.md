---
name: product-copy
description: Use only after explicit Codex `$superloopy:product-copy` or Claude Code `/superloopy:product-copy` invocation to rewrite or review Korean in-product copy, including product copy, UX copy, error messages, completion messages, settings descriptions, onboarding text, operational notices, and safety-flaunting wording, using only supplied product behavior. Do not activate for ordinary Korean naturalization, AI-tone removal, or readability editing.
disable-model-invocation: true
---

# Product Copy

PRODUCT COPY ENABLED

Rewrite Korean in-product messages into supported outcomes, fallback states, or next actions. Keep this skill explicit-only. The first release validates Korean copy; apply the principles cautiously elsewhere without claiming deterministic coverage for another language.

## Load the rules

Read each packaged reference directly before drafting:

- `references/quick-rules.md` for the compact workflow.
- `references/quality-rubric.md` for PC-1 through PC-4 and review decisions.
- `references/golden-set.md` for calibrated pass, fail, manual-review, and missing-fact cases.

## Establish authority

Treat supplied product behavior as the entire factual boundary. Freeze product names, code, numbers, paths, URLs, quoted text, legal text, and every user-supplied behavior before editing.

Identify the reader's decision: what happened, what remains, what the product will do, or what the reader should do. Map every proposed behavioral clause to the source copy or explicit user context. A safety or accuracy claim does not supply a mechanism.

Never add or invent recovery, encryption, retention, privacy, correctness, or safety facts. Do not turn likely product behavior into copy. If the required behavior is absent, ask for it.

## Apply the gate

### PC-1 — vague reassurance

Remove generic reassurance such as `안전하게 처리합니다`, `안심하고 사용하세요`, `정확하게 계산합니다`, or `정확하고 안전하게 진행됩니다`. Replace it only with a behavior, measurement, or state already supplied. If the message's concrete outcome is already known, state that outcome without decoration.

### PC-2 — incomplete failure outcome

Give a failure message at least one supplied reader-relevant fact: an observable outcome, retained state, active fallback, recovery result, or next action. Reject `저장에 실패해도 이전 버전은 안전하게 남습니다` and equivalent unsupported reassurance.

When the user requests a concrete failure message but supplies none of those facts, stop and ask one precise question naming the missing fact. Do not return a partial draft, alternatives, or a guessed consequence with the question.

### PC-3 — negative-capability wording

Prefer an affirmative state or next action only when it preserves meaning. Preserve verified privacy or legal commitments such as `검색어를 서버로 전송하지 않습니다`; do not convert them into instructions or delete them. Route negative-capability clauses to manual review rather than failing them solely for being negative.

### PC-4 — unsupported reinvention

Reject any new recovery, encryption, retention, privacy, correctness, or safety claim that cannot be traced to the source or explicit context. Ask for the missing product fact instead of making a plausible rewrite.

## Return the result

For a direct rewrite with sufficient facts, return only the rewritten copy. Match the source register and produce the smallest complete message; do not add a heading, rationale, audit status, or completion note.

When a fact required for a safe rewrite is missing, return exactly one precise question in the user's language. Name the fact needed to proceed and stop.

For review-only requests, give the smallest decision the user requested without expanding the product claims. Keep manual-review items visible when the user asks for findings.

## Handle file-backed work

Use file-backed evidence only when files are supplied or an active Superloopy task requires artifacts. Resolve `PRODUCT_COPY_SKILL_DIR` as the absolute directory containing this loaded `SKILL.md`; the packaged audit script lives there, not in the target project.

Record source, final, summary, and audit JSON under the active Superloopy evidence boundary. Run:

```bash
node "$PRODUCT_COPY_SKILL_DIR/scripts/audit-product-copy.mjs" \
  --source "$SOURCE_PATH" \
  --final "$FINAL_PATH" \
  --report "$AUDIT_PATH"
```

Repair a reported problem only from supplied facts. Preserve every `manualReview` item even when `ok` is true. Treat the audit as a lexical gate: it cannot certify that a behavioral, privacy, legal, safety, or accuracy claim is true.
