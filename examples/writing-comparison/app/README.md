# Writing comparison app

Side-by-side comparison of one source document against the Humanize Korean (A),
i-have-adhd (B), and Say It Straight (C) rewrites, across thirteen samples.

Regenerate the embedded data after editing anything under `samples/`:

```bash
node examples/writing-comparison/app/build-data.mjs
```

From the repository root, start the loopback-only static server on the canonical port:

```bash
PORT=57777 node examples/writing-comparison/app/server.mjs
```

Open the canonical Original → Say It Straight rendered comparison:

```
http://127.0.0.1:57777/?sample=release-note&left=original&right=c&mode=rendered
```

The dock's sample control groups these by language (한국어, English). Choose one
directly with the `sample` query parameter:

- `release-note` — 주간 배포 안내
- `meeting-followup` — 회의 후속 메모
- `incident-review` — 장애 회고
- `support-reply` — 고객 지원 답변
- `internal-proposal` — 내부 제안서
- `api-migration` — API 전환 안내
- `llm-wiki` — LLM 위키 도입 검토

English samples:

- `release-note-en` — Deployment notice
- `meeting-followup-en` — Meeting follow-up
- `incident-review-en` — Incident review
- `support-reply-en` — Support reply
- `internal-proposal-en` — Internal proposal
- `api-migration-en` — API migration

Version A is the Korean humanizer, so English samples carry only `original`, `b`,
and `c`. The version selector shows `A · Unavailable` for them.

The remaining parameters select the left and right versions (`original`, `a`, `b`, `c`) and the view (`rendered`, `source`, `unified`). The URL updates as controls change, so the exact comparison can be reloaded or shared locally.
