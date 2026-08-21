# Product Copy Quality Rubric

Evaluate the final Korean in-product message against the supplied copy and behavior facts.

## Hard failures

### PC-1 — vague reassurance remains

Fail when generic safety, reassurance, or accuracy wording remains without an already-supplied behavior, measurement, or state. Examples include `안전하게 처리합니다`, `안심하고 사용하세요`, and `정확하게 계산합니다`.

### PC-2 — failure outcome is incomplete

Fail known vague failure reassurance. A supported failure message names at least one observable outcome, retained state, active fallback, recovery result, or next action. When support is missing, ask one precise question instead of drafting.

### PC-4 — the rewrite reinvents behavior

Fail any recovery, encryption, retention, privacy, correctness, or safety fact absent from the source and explicit context. Plausibility is not support. A supplied safety or accuracy claim does not authorize an invented mechanism.

### Protected content changed

Fail when a product name, code span, number, path, URL, quoted value, legal text, or supplied behavior disappears or changes meaning.

## Manual review

### PC-3 — negative capability

Review negative clauses instead of failing them solely for being negative. Prefer an affirmative state or next action only when meaning stays intact. Preserve verified privacy or legal commitments, including `검색어를 서버로 전송하지 않습니다`.

### PC-5 — misplaced precision

Review `정확한` when it directly modifies a product entity such as a computer, board, system, GPU, or firmware image. The copy should name the supplied measurement, specification, identity, or match instead. Do not flag measurable or informational targets such as `정확한 시간`, `정확한 수치`, `정확한 사양`, or `정확한 정보`.

Also review:

- open-ended failure messages whose completeness cannot be proven mechanically;
- large rewrites;
- any audit result where semantic truth depends on product knowledge outside the supplied facts.

Manual review remains visible even when the audit reports `ok: true`.

## Pass decision

Pass only when every behavioral clause maps to supplied support, all protected content survives, the reader's required decision is complete, the register matches the source, and no smaller complete message says the same thing. If a required fact is missing, the only passing output is one precise question that names it.
