# Korean Calque Rules Design (P family)

Date: 2026-09-10
Status: checklist. Tick items as they land; every unchecked item is open work.

## Goal

Stop AI-written Korean technical prose from carrying English adverbs and compound terms across word-for-word (`조용히 실패한다`, `우아하게 종료한다`, `단일 진실 공급원`). Add them to `humanize-korean` as a local lexical family, `P`, next to `K-1` and `M-1`, with repairs expressed as shapes rather than replacement phrases.

This is 번역투 (upstream family A), so it belongs to `humanize-korean`, not to the reassurance gate: `0a52b18` moved reassurance out because it is product-copy policy, and `skills/superloopy-loop/scripts/audit-reassurance-copy.mjs` is invoked only by its tests.

## Evidence (GitHub issues and PRs, measured 2026-09-10)

Counts created before 2022-11-30 versus created in 2026, with the share of 2026 hits carrying a `Generated with Claude Code` footer. Controls: 오류 4.3x, 버그 3.4x, footer share 13.7%.

| Phrase | pre-2022 | 2026 | Growth | Footer |
| --- | --- | --- | --- | --- |
| 조용히 | 214 | 81,575 | 381x | 32.9% |
| 조용한 실패 | 0 | 2,155 | new | 39.8% |
| 단일 진실 공급원 | 1 | 859 | 859x | 15.2% |
| 정본 (canonical sense in all 10 sampled titles) | 5 | 23,157 | 4,631x | 34.7% |
| 우아하게 | 178 | 2,128 | 12x | 14.4% |
| 투명하게 | 289 | 1,737 | 6x | 21.2% |
| 안전하게 실패 | 3 | 2,631 | 877x | 10.1% (below baseline; attribution unproven) |
| 첫날부터 | 25 | 334 | 13x | 28.7% |

Not tells (at or below control growth): 매끄럽게 2.6x, 마법처럼 2.3x, 발자국 4.8x, 방어적으로 (footer 14.7% ≈ baseline). Metaphor idioms are flat or declining (일급 시민 11→4, 사과와 오렌지 9→3, 야크 털 9→1; 낮은 곳에 달린, 손을 더럽히다, 총알을 물다, 후드 아래 at 0–3 total). LLMs localize metaphors; they calque adverbs. Do not add metaphor rules.

Reverse test of candidate repairs (a repair must have human-era use and a footer share near baseline):

| Candidate repair | pre-2022 | Footer | Verdict |
| --- | --- | --- | --- |
| 기준 데이터 · 원본 데이터 · 자동으로 처리 | 163–267 | 10.6–13.8% | usable |
| 에러 없이 · 알림 없이 · 로그 없이 · 경고 없이 | 42–650 | 17.6–22.6% | mixed; never as a stock insert |
| 정상 종료 | 80 | 21.9% | flavored |
| 정본 · 페일세이프 · 그레이스풀 | 0–10 | 35–45% | tells in their own right |
| 아무 표시 없이 · 티 안 나게 · 눈에 띄지 않게 · 사용자가 모르게 | 0–7 | 24–32% | tells |

A fixed replacement phrase becomes the next tell. Repairs are therefore shapes (below), and any stock phrase must pass the reverse test before it enters rule text.

## Rules

Regexes validated 2026-09-10 against 22 real issue titles and 10 human sentences, and against every `after` block in the current golden set (0 hits).

### P-1a — 조용히 + program action (fail)

`조용(?:히|한)\s*(?:[가-힣A-Za-z0-9_.%]+\s+){0,2}(?:실패|무시|누락|중단|종료|사라|잘리|잘린|잘림|잘라|건너뛰|죽|깨지|깨진|멈추|멈춘|멈춤|비어|빠지|빠진|넘어가|삭제|덮어|no-?op|skip)`

16/16 positives, 0/10 negatives.

### P-1b — 조용히 without a human action (warn)

`조용(?:히|한)(?!\s*(?:[가-힣]+\s+){0,2}(?:앉|말|얘기|이야기|대화|속삭|물러|떠나|지내|기다리|듣|들었|웃|울|걷|살|잠|쉬|지켜|바라|생각|읊|읽|되짚|돌아보|살펴|회고|하세요|하자|해라|밤|아침|분위기|공간|마을|동네|사람|성격|목소리))`

Reported as P-1b only where P-1a did not already match. Forms with a copular verb (`조용히 0건이 된다`, `조용히 H2로 기동된다`) land here, not in P-1a: 되다 is not a program-action stem, and broadening P-1a to it would gate literary prose. 8/8 open-class positives (자른다, 틀어질, 되돌린다, 기동된다, 옮긴다), 0/10 negatives. Semantic line for `SKILL.md`, in the N-1 style: 조용히는 사람이 하는 것이다. 프로그램은 조용히 하지 않는다. 무엇을 했고 어떤 신호를 내지 않았는지 쓴다.

### P-2 — 우아하게 (fail)

`우아(?:하게|한)\s*(?:[가-힣]+\s+)?(?:종료|실패|축소|처리|중단|저하|대응|폴백|재시도)`

### P-3 — 투명하게 in the invisible-to-caller sense (warn)

`투명(?:하게|한)\s*(?:[가-힣]+\s+)?(?:처리|동작|작동|지원|전달|연결|통합|전환|교체|대체|적용|마이그레이션|프록시|캐시|재시도|폴백|위임|포워딩|라우팅)`

Skip the sentence when it also contains 배경|색|알파|투명도|이미지|레이어|opacity|png. In developer issues 투명하게 is mostly CSS alpha or disclosure; the calque lives in bodies, so this stays advisory. Meaning note: English "transparently" means unnoticed by the caller; Korean 투명하게 means disclosed. This is a meaning error, not only a style one.

### P-4 — 단일 진실 공급원 (fail)

`단일\s*진실\s*(?:공급원|소스|원천|의\s*원천)`

### P-5 — 정본 in report and developer genres (warn)

`(?<![가-힣])정본`. No trailing lookahead: particles attach directly (정본을, 정본으로), and the leading boundary already excludes 수정본. Legal genre keeps it.

### P-6 — 안전하게 실패, 첫날부터 (warn)

`안전하게\s*실패|(?<![가-힣])첫날부터`. Must not match bare 안전; the L-1 reassurance classifier stays removed.

## Repair Ladder

1. Delete when the verb already implies unnoticed behavior: `조용히 무시된다` → `무시된다`.
2. State the observed symptom with facts the source supplies: `실패해도 에러가 나지 않고 0건으로 집계된다`. This is unique per sentence, so it cannot become stock, and it respects the no-fabrication contract (say-it-straight "unsupported specificity").
3. If neither applies, keep the sentence and let the audit warn for manual review. Never insert 정본, 페일세이프, 그레이스풀, 정상 종료, or an `~없이` phrase automatically.
4. SSOT: 기준 데이터, or state the fact (`설정은 이 파일 하나만 본다`). Developer genres may keep `SSOT` inside backticks, which the span filter excludes (K-1 precedent).
5. 우아하게 종료: delete the adverb and keep the plain verb unless the source states what happens to in-flight work; never assert completion, draining, or cancellation the source does not give (PR #55 review, T6).

## Boundaries

- P rules are lexical counters like K-1 and M-1. N-1 stays semantic guidance with no phrase classifier.
- No genre branching in the audit; it records genre only (`audit-humanize-output.mjs:91,126,160`). The backtick escape is the genre escape.
- Every P id joins `PROSE_SPAN_FILTERED_IDS`: quoted user reports and code spans must not count against a rewrite.
- Advisory ids (P-1b, P-3, P-5, P-6) never affect the grade; they surface in `warnings`.
- `test/humanize-korean.test.js:219,240` keep asserting that L-1 and L-3 are absent.

## Checklist

### A. Rules and audit — `skills/humanize-korean`

- [x] Create `scripts/calque-patterns.mjs` exporting the P regexes and the P-3 alpha-context exclusion, imported by the audit (single source; the Stop-time nudge and any doctor check import the same module).
- [x] `scripts/audit-humanize-output.mjs`: add P-1a, P-2, P-4 to `PATTERNS` and `REQUIRED_S1_PATTERN_IDS` (`:19`).
- [x] Add `ADVISORY_PATTERN_IDS = ["P-1b", "P-3", "P-5", "P-6"]`, excluded from grading like `GRADE_EXEMPT_IDS` (`:21`) and pushed to `warnings` when `after > 0`, each warning naming the ladder step.
- [x] Implement P-1b as tier-B minus tier-A so a P-1a hit is not double-reported.
- [x] Add every P id to `PROSE_SPAN_FILTERED_IDS` (`:22`).
- [x] `references/quick-rules.md`: add P rows to the S1 table after `M-1` (`:45`); add the P-1b semantic line under Superloopy Additions next to N-1 (`:13`); state the repair ladder and the reverse-test bar for stock phrases.
- [x] `SKILL.md`: add the P-1b semantic line beside the N-1 bullet (`:40`); mention P in the detection step (`:52`).
- [x] Keep `audit-humanize-output.mjs` under the 550-line cap (`src/doctor.js:25`); it is 275 today.

### B. Golden set and tests

- [x] `references/golden-set.md` (342 lines today): add pairs G-30 onward, each `### G-NN · P-x · genre` with an `audit:` line:
  - [x] P-1a deletion repair (`조용히 무시된다` → `무시된다`), 리포트.
  - [x] P-1a symptom repair using only facts present in `before`, 리포트.
  - [x] P-2 in-flight-work repair, 리포트.
  - [x] P-4 → 기준 데이터, 리포트.
  - [x] Identical-pair negatives (`audit: none`, `before` == `after`) proving no gating rule fires: human 조용히 (칼럼), backticked `graceful shutdown` (리포트).
- [x] `test/humanize-korean-golden.test.js`: extend the `audit:` grammar with `clear P-3` (assert `after[id] === 0`) so advisory negatives (alpha 투명하게, legal 정본) are provable; update the pair count at `:50,71-72` and the last-pair assertion at `:52-60`.
- [x] `test/humanize-korean.test.js`: before/after counts for each P id; P-1b not reported when P-1a matches; P-3 skipped in an alpha sentence; span filtering for a quoted 조용히; L-1/L-3 guards unchanged.
- [x] Run `node --test test/humanize-korean*.test.js` on Node 22, then full `npm test`.

### C. say-it-straight (language-agnostic altitude)

- [x] `skills/say-it-straight/references/quick-rules.md`: add the row — Defect: idiom stands in for the observable ("fails silently", 조용히 실패). Signal: an idiom or adverb names the failure mode instead of the missing signal. Repair: name the absent signal with supplied facts. Counterexample: the field's term of art (fail-safe, fail-fast, silent install). Risk: invented mechanism detail.
- [x] `test/fixtures/say-it-straight/scenarios.json`: add a scenario whose source says "fails silently"; `must_not_add` includes any log, warning, or exit-code detail absent from the source.
- [x] Confirm `test/say-it-straight.test.js` and `test/say-it-straight-audit.test.js` pass.

### D. Docs and inventories

- [x] `docs/superloopy-file-audit.md`: update the golden-set row (`:321`, "29" and coverage), quick-rules (`:323`), audit (`:325`); add rows for `calque-patterns.mjs` and any new script.
- [x] `docs/superloopy-loop-golden-set.md`: update `:322` ("28 established pairs plus one semantic N-1") and `:324,326`; keep the "no reassurance-policy gates" wording true.
- [x] `test/plugin.test.js`: add new shipped files to the packaging assertions if they must ship (`:89` pattern).
- [x] `references/upstream-notice.md`: record P as a local family pending upstream adoption.
- [x] README skill table: one line on adverb calques if the humanize-korean entry lists rule families.

### E. Write-time nudge (opt-in)

Design note (2026-09-10): a Claude Code `Stop` hook can only reach the model by returning `decision: block`; `additionalContext` is honored on `UserPromptSubmit` and `SessionStart`. The nudge therefore runs at the next `UserPromptSubmit`, reads the previous assistant turn from the transcript tail, and injects advisory context. It is one turn late by construction and never blocks.

- [x] Env gate `SUPERLOOPY_CALQUE_NUDGE=on`, off by default, mirroring `SUPERLOOPY_STOP_HOOK` (`src/hooks.js:210`).
- [x] In `runUserPromptSubmitHook`, read the last assistant text from `payload.transcript_path` with the tail reader at `src/continuation.js:291` (parse JSONL lines, skip a truncated first line, take the last `assistant` text blocks); on Codex prefer `payload.last_assistant_message` when present.
- [x] When that text is mostly Korean and a gating P rule matches, append one additionalContext block naming the matched span and its ladder hint from `CALQUE_REPAIR_HINTS`; advisory ids stay silent here. Never return `decision: block`.
- [x] Tests: off by default; on with a Korean P-1a message; on with a non-Korean message; on with a truncated transcript line; `hooks.json` and the Claude hook manifest need no change because `UserPromptSubmit` is already wired.
- [x] Document the flag next to `SUPERLOOPY_STOP_HOOK` in `docs/superloopy-gate-notes.md:143` and the README hooks paragraph.

### F. Maintainer tooling

- [x] `scripts/calque-reverse-test.mjs`: given phrases, query GitHub search for pre-2022-11-30 count, 2026 count, and footer share; compute the baseline from 오류 in the same run; print pass/fail against pre-2022 ≥ 40 and footer ≤ baseline + 3 points. Not in CI (network).
- [x] Note in quick-rules that a new stock phrase in any P repair must carry a passing reverse-test line in the PR.

### G. Upstream

Dropped 2026-09-10 by J's decision: no upstream issue; the findings apply to Superloopy's own skills only. The drift tool (Section I) still tracks upstream so adaptations stay clean-room.

- [~] ~~File an issue at `epoko77-ai/im-not-ai`~~ proposing A-17+ for 조용히/우아하게/단일 진실 공급원/정본 with the measurements above, citing their own README uses at lines 329, 342, and 350.
- [~] ~~If adopted upstream, alias the upstream ids~~ in `upstream-notice.md` and keep P ids for backward compatibility of reports.

### H. Release

- [x] Independent review of the diff — codex-connector on PR #55: seven findings; T1 (spec inventory row) was already fixed before the review posted, T2–T7 (Q-1 predicate false positive, 실패 noun false positive, fenced code unprotected, injected 결국 unwatched, invented P-2 repair, G-42 typo) fixed with regression tests.
- [x] `superloopy doctor` overall ok; `npm pack --dry-run --json` shows the new files.
- [x] Version 0.19.0 via `scripts/sync-version.mjs`; six GitHub Actions jobs green on PR #55 after a CRLF fix to the after-block sweep (Windows checkouts convert the golden set to CRLF).

### I. Upstream tracking — `epoko77-ai/im-not-ai`

Measured 2026-09-10 with `scripts/upstream-drift.mjs`: **57 commits** since our idea sync `0ac1e84` (2026-08-23), through `9747f03` (2026-09-06). The taxonomy moved v2.4 → v2.7 while the plugin manifest still reads 2.3.2 and the last release tag is v2.3.2 (2026-08-18): upstream ships rule changes without tagging, so tracking is commit-based, never version-based. `upstream-notice.md` keeps `0ac1e84` until the adoption items below land; then it moves to the adopted head.

What changed upstream, and what it means here:

| Upstream change (commit family) | Effect on Superloopy | Decision |
| --- | --- | --- |
| C-8 base-rate correction: n=532 human corpus shows 31 docs with antithesis, 9 docs at 2+ (`0899cc8`); injection ban — fixing C-8 elsewhere must not create a new pair (`d2d1188`) | Our quick-rules C-8 row still claims "upstream's 24-doc human corpus shows zero occurrences"; false now | adopt: fix the claim, keep 2+ threshold and keep-one, add the injection ban |
| A-1 `~에 대해`, A-11 `~을 위해`, A-10 `~할 수 있다` measured **higher in human prose** than AI (`1f8a000`); default preserve, act only on paragraph density 3+ (A-10: 4+, modality-preserving redistribution only) | Our S2 rows still read as remove-when-possible; A-10 is a counted S2 pattern | adopt: rewrite the three rows to density-triggered, default-preserve; A-10 repair stays inside the hedge lexicon |
| Injection bans across D-9 `결국`, D-10 `이유다`, A-24 `더 이상 A가 아니라 B`, C-11 comma re-injection (`2db2b2d`, `fea0e34`, `b25d21a`) | Our audit checks only that S1 counts fall, never that a rewrite *adds* a tell | adopt: generic injection guard — any pattern id with `after > before` warns "injected by the rewrite" |
| A-20 passive progressive `~되고 있다` 3+/paragraph; A-21 `단순한 X를 넘어 Y` (human 0); A-22 `~은 명확하다/분명하다`; A-24 `더 이상 ~ 않다` 2+ (`3c875c9`, `3bb1457`, `bf48b12`) | Lexical, evidence-backed, regex-detectable | adopt as S2 rows with audit counters under upstream ids |
| D-8 cleft `필요한/중요한/핵심은 ~이다` (10x); D-9 `결국 ~로 이어진다`, `~에 직결된다`; D-10 `~하는 이유다`; D-12 empty concession slot `과제도 남아 있다` as a standalone sentence (`7263c28`, `3c875c9`) | Lexical, human near-zero | adopt as S2 rows with counters; D-12 needs the standalone-sentence condition |
| A-23 `발판·토대를 마련하다 / 지평을 열다` — strict-only upstream, past-fact exemption is contextual | Would clip legitimate fact statements in a fast pass | guidance only, no counter |
| D-11 closing-30% time horizon `향후·앞으로`; D-13 essay reflection adverbs; I-7 sourceless `~다는 분석이다` | Position- or genre-conditional | guidance only: D-11 and I-7 as Superloopy Additions bullets; skip D-13 (essay-only, we have no essay genre) |
| D-14 generative-metaphor family with sensory-predicate and running-metaphor subtypes (`1f8a000`, `fe99f06`) | Family-sum judgment, explicitly not a single regex | guidance only; note the boundary with our finding that LLMs do **not** calque English idioms into Korean (P family evidence) — D-14 is about metaphors the model coins, not idioms it translates |
| F-7 generic policy verbs `확대·강화·개선·구축` + catch-all `설계`; noun forms `구조`, `기준` (11x) (`3c875c9`, `1f8a000`) | Density-based; our P-4 repair recommends `기준 데이터`, which F-7 flags `기준` as a generic-noun tell in the abstract sense | adapt: F-7 as guidance; add a note to P-4 that `기준 데이터` is the concrete master-data sense, not the abstract `기준` F-7 targets |
| A-16 retargeted from frequency to context (antecedent count in the previous two sentences), now applies to native Korean (`3bb1457`) | We skipped A-16 as translation-only; that reason is gone | adopt as semantic guidance beside N-1, no counter |
| Chatbot-frame hygiene: strip `물론입니다!`, `다음은 ~입니다:`, `도움이 되셨길 바랍니다`, knowledge-cutoff disclaimers before saving (`b48fa05`) | Common in pasted chatbot output; zero meaning loss | adopt as a local S1 rule with a counter (new local family letter, not P) |
| Rhetorical-quote policy: only speech quotes are immutable; an author's rhetorical self-question is rewritable (`0f8ce24`) | Our span protection freezes every quote | guidance only; the audit cannot tell speech from rhetoric, so keep byte-for-byte protection and let the rewriter decide |
| Modality: P5 became pairwise sentence judgment plus a deterministic local restorer (`853a2de`, `f9fbb83`); comma re-injection stripper (`fea0e34`) | Our audit warns on modality-marker decrease (count-based) | skip the restorer; keep the count warning; note as known gap |
| Observation-only discourse metrics DS-1..DS-6 and false-positive principles (single indicator is not evidence; no solo-metric verdicts; personal-style caveat; "flawless" register is itself a signal) after the Pebblous teardown (`b48fa05`, `a755a68`) | Principles, not rules | adopt the principles into `quality-rubric.md`; nothing else — we issue no document-level AI verdicts |
| Calibration 24 → 60×60 with per-model split, genre cells, task-bias control, corruption engine (`46812f1`, `1764ab8`, `187553e`) | Evidence infrastructure we do not have | skip; cite when quoting upstream numbers |

- [x] `scripts/upstream-drift.mjs` with offline tests and inventory rows; run it at the start of every adaptation pass.
- [x] Fix falsified claims in our text: C-8 row (`quick-rules.md`), and any A-10 wording that reads as tone conversion.
- [x] Rewrite A-1, A-10, A-11 rows as density-triggered, default-preserve.
- [x] Add the generic injection guard to the audit (`after > before` per id → warning) with tests and a golden negative.
- [x] Add S2 rows and counters for A-20, A-21, A-22, A-24, D-8, D-9, D-10, D-12 under upstream ids; golden pairs for each.
- [x] Add guidance bullets for A-16 (context condition), A-23, D-11, F-7 (with the P-4 `기준 데이터` note), I-7, and the rhetorical-quote policy.
- [x] Add the chatbot-frame hygiene rule with a counter and pairs.
- [x] Fold the false-positive principles into `quality-rubric.md`.
- [x] Move `Last idea sync` in `upstream-notice.md` to the adopted head commit and list adopted / not-adapted ids, as the v2.4 line does.
- [x] Record the pass — done in this section rather than a second gitignored spec; the next drift pass gets its own dated section here or a new spec.

## Acceptance Criteria

- Every real title in the 2026-09-10 sample that contains 조용히 with a program action is counted by P-1a or P-1b; none of the ten human sentences is.
- No golden `after` block matches any P rule; the identical-pair negatives pass without a rewrite.
- Grade A/B requires P-1a, P-2, and P-4 at zero; advisory ids never change the grade.
- No stock phrase appears in P repair text without a passing reverse-test line.
- Reassurance classification stays out of `humanize-korean`; L-1/L-3 remain absent.
- The Stop-time nudge is off by default and never blocks.
- Full local suite on Node 22 and current-head CI pass.
- `upstream-notice.md` records a sync commit that `scripts/upstream-drift.mjs` can compare against, and the drift report is under review before any rule text quotes upstream numbers.
