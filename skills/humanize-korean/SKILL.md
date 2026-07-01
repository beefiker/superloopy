---
name: humanize-korean
description: Korean prose humanizer for Codex and Superloopy that rewrites Korean text so it sounds naturally human while preserving meaning, register, facts, protected tokens, and evidence. Use when the user asks to remove Korean AI tells, make Korean copy sound human, fix 번역투, remove ChatGPT/Claude/Gemini tone, polish Korean without changing meaning, or says "AI 티 없애줘", "AI 윤문", "번역투 고쳐", "사람이 쓴 것처럼", "humanize Korean", "한글 AI 티 제거", "글 자연스럽게 다듬어줘". Inspired by Korean AI-tell ideas from https://github.com/epoko77-ai/im-not-ai. Handles Korean rewriting only; not for translation, fact expansion, SEO rewriting, legal drafting, or generic proofreading.
---

# Humanize Korean

SUPERLOOPY HUMANIZE KOREAN ENABLED

## What This Skill Is

Use this skill as a Korean prose post-editor: it takes already-written Korean text and removes AI-like rhythm, translationese, repetitive endings, formulaic transitions, and over-polished phrasing without changing the underlying message.

Shout out to https://github.com/epoko77-ai/im-not-ai for the Korean AI-tell inspiration. This Superloopy version keeps the workflow local, adds protected-span preservation, file-backed audits, and Superloopy evidence receipts.

## Contract

- Rewrite only Korean text.
- Preserve meaning, claims, facts, numbers, dates, URLs, code, product names, model names, acronyms, and quoted spans.
- Preserve register: formal text stays formal, conversational text stays conversational, official text stays official.
- Prefer fewer, sharper edits over broad smoothing.
- Do not add examples, metaphors, facts, citations, or marketing claims that were not in the source.
- Load `references/quick-rules.md` before rewriting.
- Load `references/quality-rubric.md` before grading or finalizing.
- Use `scripts/audit-humanize-output.mjs` to validate any file-backed output.
- If adapting upstream rule text, respect `references/upstream-notice.md`.

## Workflow

1. Identify source text from the prompt or from a `.txt` or `.md` path supplied by the user.
2. Refuse non-Korean source text with `한국어 텍스트만 처리할 수 있습니다.`
3. Estimate genre as `공적`, `리포트`, `블로그`, `칼럼`, or `대화체`; user-provided genre wins.
4. Mark protected spans before editing: numbers, dates, units, URLs, emails, code spans, quoted spans, English acronyms, product names, model names, and legal/article references.
5. Detect AI-tell patterns from `references/quick-rules.md`, prioritizing S1 then repeated S2.
6. Rewrite paragraph by paragraph in this order: protected spans unchanged, signature phrases, translationese, passive/hedging, structure/list rhythm, sentence endings, visual formatting.
7. Keep total character-change rate under 30% whenever possible; stop and report risk above 50%.
8. Write outputs:
   - Active Superloopy loop: `.superloopy/evidence/humanize-korean/<run-id>/source.md`, `final.md`, `summary.md`, `audit.json`.
   - No active loop: `_workspace/humanize-korean/<run-id>/source.md`, `final.md`, `summary.md`, `audit.json`.
9. Run `node skills/humanize-korean/scripts/audit-humanize-output.mjs --source <source.md> --final <final.md> --report <audit.json>`.
10. If audit fails, repair once. If it still fails, keep the safest version and report the failing audit reason.
11. Respond concisely with output path, change rate, grade, preserved-token status, and 3 to 5 before/after highlights. Do not paste the full rewritten body unless the user asks.

## Superloopy Evidence

When a Superloopy loop is active, the final line of the completion note must include:

`SUPERLOOPY_EVIDENCE: .superloopy/evidence/humanize-korean/<run-id>/audit.json`
