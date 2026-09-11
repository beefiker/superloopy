# Writing comparison app

Side-by-side comparison of one source document against the Humanize Korean (A),
i-have-adhd (B), and Say It Straight (C) rewrites, across fourteen authored samples, plus eight benchmark fixtures whose A, B, and C
versions are the measured skill outputs from `docs/superloopy-skill-benchmark.md`.

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
- `config-sync-review` — 설정 동기화 전환 검토

English samples:

- `release-note-en` — Deployment notice
- `meeting-followup-en` — Meeting follow-up
- `incident-review-en` — Incident review
- `support-reply-en` — Support reply
- `internal-proposal-en` — Internal proposal
- `api-migration-en` — API migration

Benchmark samples (group "Benchmark"; versions are the median-latency delivered run per
skill, regenerated with `node examples/writing-comparison/app/build-benchmark.mjs` for the
numbers page at `benchmark.html`):

- `bench-ko-short`, `bench-ko-mid`, `bench-ko-big`, `bench-ko-huge` — 설정 동기화 전환 검토, model draft at four sizes
- `bench-en-short`, `bench-en-mid`, `bench-en-big`, `bench-en-huge` — API v2 migration guide, model draft at four sizes

Version A is the Korean humanizer, so English samples carry only `original`, `b`,
and `c`. The version selector shows `A · Unavailable` for them.

The remaining parameters select the left and right versions (`original`, `a`, `b`, `c`) and the view (`rendered`, `source`, `unified`). The URL updates as controls change, so the exact comparison can be reloaded or shared locally.

## Deploying to Cloudflare Pages

The production deployment lives at <https://writing-comparison.pages.dev/> (Pages
project `writing-comparison`). The site is fully static: everything the browser
needs is this directory minus the Node-only files (`server.mjs`,
`build-data.mjs`, `README.md`, `test/`). `index.html` references `og.png` by
absolute URL on that origin, so regenerate it if the project ever moves.

```bash
DEPLOY="$(mktemp -d)/site"
mkdir -p "$DEPLOY/data"
cp examples/writing-comparison/app/index.html \
   examples/writing-comparison/app/benchmark.html \
   examples/writing-comparison/app/benchmark.css \
   examples/writing-comparison/app/styles.css \
   examples/writing-comparison/app/favicon.svg \
   examples/writing-comparison/app/og.png \
   examples/writing-comparison/app/apple-touch-icon.png \
   examples/writing-comparison/app/*.mjs "$DEPLOY"
rm "$DEPLOY/build-data.mjs" "$DEPLOY/build-benchmark.mjs" "$DEPLOY/server.mjs"
cp examples/writing-comparison/app/data/*.mjs "$DEPLOY/data"
npx wrangler pages deploy "$DEPLOY" --project-name writing-comparison --branch main
```
