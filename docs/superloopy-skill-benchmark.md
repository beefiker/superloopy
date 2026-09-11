# Superloopy Skill Cost and Latency Benchmark

Measured 2026-09-11 on headless Claude Code 2.1.268 (`claude -p`), model `claude-opus-5[1m]` at list price, `--effort high` pinned, from this repository at 0.19.0. Comparators: our `humanize-korean` and `i-have-adhd`, `epoko77-ai/im-not-ai` at `9747f03` (2026-09-07), and `ayghri/i-have-adhd` at `6f1f982` (2026-09-10). Every number is a real API measurement. The size series cost $35.93 for 208 runs; the earlier pilot cost $3.60; token counting and fixture generation about $2.

Raw per-run data, fixture hashes, and the effort probe are in `docs/benchmarks/2026-09-11-skill-benchmark-runs.json`; the eight fixtures are in `docs/benchmarks/fixtures/`.

## Summary

**What say-it-straight costs, per call, over no skill** (SKILL body only, the way it loads on invocation; medians of three cached runs; a fixture rewrite task):

| Text | Baseline | say-it-straight | Added seconds | Latency | Added USD | Cost |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| English short (73 words) | 6.1 s, $0.006 | 8.6 s, $0.017 | +2.5 | 1.40× | +$0.010 | 2.56× |
| English mid (265 words) | 10.1 s, $0.016 | 16.5 s, $0.032 | +6.5 | 1.64× | +$0.015 | 1.95× |
| English big (992 words) | 21.8 s, $0.051 | 23.8 s, $0.057 | +1.9 | 1.09× | +$0.006 | 1.11× |
| English huge (2,732 words) | 57.0 s, $0.143 | 61.4 s, $0.147 | +4.3 | 1.08× | +$0.005 | 1.03× |
| Korean short (510 chars) | 9.0 s, $0.016 | 14.7 s, $0.033 | +5.7 | 1.63× | +$0.017 | 2.01× |
| Korean mid (1,239 chars) | 15.9 s, $0.035 | 17.9 s, $0.038 | +2.0 | 1.13× | +$0.003 | 1.09× |
| Korean big (5,526 chars) | 48.6 s, $0.113 | 58.5 s, $0.131 | +9.9 | 1.20× | +$0.018 | 1.16× |
| Korean huge (17,237 chars) | 145.5 s, $0.378 | 173.1 s, $0.443 | +27.6 | 1.19× | +$0.065 | 1.17× |

The overhead is a roughly fixed amount of extra reasoning per call (300 to 900 thinking tokens on English, 600 to 2,100 on Korean) plus a 1,571-token prefix. It is heaviest in relative terms on short texts and fades to 1.1 to 1.2× on big and huge ones, where the rewrite itself dominates. The file-backed variant, which also loads the three reference files, thinks more on long texts and costs 1.4 to 1.8× the baseline at big sizes (English big 39.8 s versus 21.8 s).

**Against the other skills** (delivered runs only):

- **i-have-adhd, ours and upstream,** is cheaper and faster than no skill on 13 of 16 cells because it compresses: English big and huge outputs are 24 to 48 percent of the source length. The fact tokens survive (6 or 7 of 7) but the document does not.
- **humanize-korean (ours)** costs 1.4 to 2.6× the baseline and is the only condition that cleared every Korean calque, jargon, and dash id at short, mid, and big size in 3 of 3 runs. At huge it left 안전하게 실패 and 첫날부터 in all three runs, and it thought for 5,000 to 16,000 tokens per big or huge run.
- **im-not-ai** costs 2.1 to 8.8× the baseline where it delivers, thinks for 2,700 to 22,000 tokens regardless of size, and returned only a status or insight block instead of a rewrite in 10 of 24 measured Korean runs, including all three big runs of its Codex path. Where it did rewrite it left the same residue as no skill.
- **The plain model** kept the chatbot greeting in 7 of the 9 Korean runs whose fixture had one and the closing line in 7 of 12; every skill condition removed both in every delivered run, with two exceptions on the huge text.

## Method

- **Harness.** Each condition's skill body (frontmatter stripped, one host line saying the user invoked it, reference files appended where the SKILL says to load them) is the system prompt; the task is the user prompt. Tools, MCP servers, hooks, and settings are off: `--tools "" --strict-mcp-config --mcp-config '{"mcpServers":{}}' --setting-sources "" --no-session-persistence --output-format json`. `--effort high` is passed explicitly and the parent session's `CLAUDE_EFFORT` is removed from the environment.
- **Runs.** For every condition × language × size cell, one warm-up run writes the prompt cache, then three measured runs. Medians are over the measured runs; cost medians use only fully cached runs (the third pass of 46 cells re-ran on a second account after the first account hit its monthly spend limit, and those runs wrote a cold cache). Latency medians use all delivered runs. Min and max are printed beside every median.
- **Metrics.** Per-model usage from `modelUsage` for the main model: prompt tokens (input + cache creation + cache read), output tokens, thinking tokens (billed as output), cost, and `duration_api_ms`. Print mode also makes a small Haiku side-call per run; it is excluded from all figures.
- **Delivered.** A run counts as a delivered rewrite when its reply carries at least half of the fixture's fact tokens and contains no tool-call markup. Undelivered runs are excluded from cost and latency medians and reported separately.
- **Quality.** Each delivered output is audited against its fixture: fact retention (fixture fact tokens present), the humanize-korean audit for residual rule ids (Korean), the say-it-straight audit for numbers, Markdown structure, and protected spans, and a frame check (does the first line still open with 안녕하세요, does the last line still close with 감사합니다, 말씀해 주세요, 좋겠습니다, or 바랍니다).
- **Price basis**, derived from the runs: $5 per million uncached input tokens, $10 per million one-hour cache write, $0.50 per million cache read, $25 per million output tokens.
- **Tasks.** Korean: 다음 글을 다듬어 주세요. 다듬은 글만 출력하세요. English: "Rewrite the following text. Output only the rewrite." The Korean-only skills were not run on English.

## Validity review of the pilot

The pilot (previous section) established the method but had three weaknesses, each fixed in the size series:

| Weakness in the pilot | Effect | Fix in the size series |
| --- | --- | --- |
| Runs inherited this session's `CLAUDE_EFFORT=xhigh` | Thinking volumes reflect an unusually high effort setting, not a default install | `--effort high` pinned on every call, parent variable removed from the environment |
| The first run of each condition wrote the prompt cache and the next two read it, and all three fed one median | Cost medians mixed two price bases | A separate warm-up pass writes the cache; only the three cached runs feed the medians; the warm-up cost is reported on its own |
| One text per language, n=3 | Claims such as "faster than baseline on Korean" rested on ranges that overlapped | Four sizes per language (short, mid, big, huge), n=3 per cell, min–max published beside every median, and no ordinal claim is made where ranges overlap |

Two smaller issues stand: the im-not-ai Claude path is still a single-context emulation (a lower bound on its cost), and the Korean prompt still asks for the polished text only. Both are unchanged so the series stays comparable with the pilot.


### Effort is the largest single variable

The same Korean mid fixture, no skill, three effort levels, one run each:

| `--effort` | Thinking tokens | Output tokens | API seconds |
| --- | ---: | ---: | ---: |
| low | 0 | 910 | 11 |
| high | 595 | 1,495 | 18 |
| xhigh | 2,193 | 3,093 | 35 |

The effort setting alone spans a 3× latency range, which is as large as any skill effect in this document. Every series number below is at `high`; the pilot in the appendix ran at the inherited `xhigh` and its absolute numbers are not comparable.

## Fixtures for the size series

All eight fixtures were written by the same model (`claude-opus-5[1m]`, `--effort high`, no skill) from one fact list per language, asked to answer "the way ChatGPT would, polite and thorough, with a greeting and a closing" at a target length. Size is the only intended variable. The model undershoots and overshoots targets, so sizes are reported as measured; three fixtures (Korean big and huge, English short) were regenerated once with adjusted targets to keep roughly geometric spacing; the first drafts were discarded. Facts: the config-sync migration review (Korean) and the API v2 partner migration guide (English), both taken from the writing-comparison samples.

| fixture | chars | words | Korean tell ids firing (count) | tells per 1,000 chars | Q-1 frame | P family |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| en-big | 6151 | 992 | n/a | n/a | n/a | n/a |
| en-huge | 16903 | 2732 | n/a | n/a | n/a | n/a |
| en-mid | 1684 | 265 | n/a | n/a | n/a | n/a |
| en-short | 520 | 73 | n/a | n/a | n/a | n/a |
| ko-big | 5526 | 1595 | 9 ids (48) | 8.7 | 0 | P-1a:2 P-6:3 |
| ko-huge | 17237 | 4945 | 15 ids (83) | 4.8 | 0 | P-1b:1 P-6:8 |
| ko-mid | 1239 | 332 | 3 ids (6) | 4.8 | 0 | P-6:1 |
| ko-short | 510 | 138 | 2 ids (2) | 3.9 | 0 | P-6:1 |

The Korean fixtures carry 3.9 to 8.7 firing rule hits per 1,000 characters, against 32 per 1,000 in the hand-authored pilot text (49 hits in 1,515 characters). The dominant ids are connective commas (C-11), em dashes (M-1), and 안전하게 실패 or 첫날부터 (P-6); 조용히 with a program action appears twice in the big fixture; the huge one has a single 조용히 outside the program-action list (P-1b). No fixture carries 단일 진실 공급원 or 우아하게. The model's own drafts are cleaner than the ChatGPT-era pattern set assumes, which limits how much any skill can show on them and is reported as such.


## Context cost per skill

Tokens a skill adds to the context when it is invoked, before any task text. The description row is the always-on cost: it sits in the skill listing of every turn while the skill is installed.

| Skill | What is loaded | Tokens | USD first load (cache write) | USD cached load |
| --- | --- | ---: | ---: | ---: |
| say-it-straight (ours) | SKILL.md body | 1,571 | 0.016 | 0.0008 |
| say-it-straight (ours), file-backed | SKILL.md + quick-rules + preservation + quality-rubric | 4,129 | 0.041 | 0.0021 |
| i-have-adhd (ours) | SKILL.md body | 2,406 | 0.024 | 0.0012 |
| i-have-adhd (ayghri upstream) | SKILL.md body | 2,378 | 0.024 | 0.0012 |
| humanize-korean (ours) | SKILL.md + quick-rules + quality-rubric | 10,746 | 0.107 | 0.0054 |
| humanize-korean (ours), with golden set | + golden-set.md | 16,809 | 0.168 | 0.0084 |
| im-not-ai, Codex single-call path | codex SKILL.md + quick-rules | 9,664 | 0.097 | 0.0048 |
| im-not-ai, Claude light path | orchestrator SKILL.md 13,438 + monolith agent 4,757 + quick-rules 7,861, across two contexts | 26,056 | 0.261 | 0.013 |
| im-not-ai, Claude standard path | light + diagnostician agent 2,747 + diagnosis-rules 7,862 | 36,665 | 0.367 | 0.018 |
| im-not-ai, Claude heavy path | standard + finalizer agent 2,815 | 39,480 | 0.395 | 0.020 |
| im-not-ai, full taxonomy if opened | ai-tell-taxonomy.md alone | 58,805 | 0.588 | 0.029 |

| Always-on description | Tokens |
| --- | ---: |
| say-it-straight (ours) | 74 |
| i-have-adhd (ayghri upstream) | 83 |
| i-have-adhd (ours) | 158 |
| humanize-korean (ours) | 291 |
| im-not-ai humanize-korean | 619 |

Korean prose tokenizes at about 0.47 tokens per byte against 0.33 for English prose, which is why the Korean-language upstream files are heavier than their byte counts suggest.

Per-file counts: say-it-straight SKILL 1,571, quick-rules 1,853, preservation 392, quality-rubric 313; i-have-adhd SKILL 2,406 (upstream 2,378); humanize-korean SKILL 2,734, quick-rules 6,631, quality-rubric 1,381, golden-set 6,063; im-not-ai orchestrator SKILL 13,438, codex SKILL 1,803, `/humanize` entry 669, quick-rules 7,861, diagnosis-rules 7,862, rewriting-playbook 7,526, taxonomy 58,805, monolith agent 4,757, diagnostician 2,747, finalizer 2,815.

## Size series: cost and latency

Delivered runs only. "(cached)" is how many of the delivered runs read the whole prompt from cache; "[n]" is how many measured runs were undelivered. Prompt tokens include the fixture and the 1,425-token print-mode overhead.

| lang | size | condition | delivered runs (cached) [undelivered] | prompt tok | output tok (med) | thinking med (min–max) | API s med (min–max) | USD med, cached runs | USD warm-up run |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| en | short | baseline | 3 (2) | 644 | 256 | 24 (24–237) | 6.1 (5–7) | 0.006 | 0.012 |
| en | short | sis-skill | 3 (2) | 2229 | 467 | 310 (148–613) | 8.6 (6–11) | 0.017 | 0.018 |
| en | short | sis-full | 3 (2) | 4828 | 526 | 370 (131–435) | 7.6 (7–9) | 0.013 | 0.017 |
| en | short | adhd-ours | 3 (2) | 3064 | 360 | 129 (71–131) | 6.8 (6–8) | 0.011 | 0.015 |
| en | short | adhd-upstream | 3 (2) | 3036 | 247 | 47 (40–75) | 5.4 (5–7) | 0.008 | 0.017 |
| en | mid | baseline | 3 (2) | 1087 | 615 | 0 (0–0) | 10.1 (7–10) | 0.016 | 0.027 |
| en | mid | sis-skill | 3 (2) | 2672 | 1331 | 747 (524–834) | 16.5 (14–18) | 0.032 | 0.036 |
| en | mid | sis-full | 3 (2) | 5271 | 1252 | 682 (452–1470) | 16.5 (13–26) | 0.031 | 0.047 |
| en | mid | adhd-ours | 3 (2) | 3507 | 473 | 0 (0–69) | 8.8 (8–9) | 0.014 | 0.022 |
| en | mid | adhd-upstream | 3 (2) | 3479 | 474 | 0 (0–100) | 8.2 (8–9) | 0.015 | 0.025 |
| en | big | baseline | 3 (2) | 2455 | 2014 | 68 (67–314) | 21.8 (21–24) | 0.051 | 0.079 |
| en | big | sis-skill | 3 (2) | 4040 | 2252 | 367 (306–565) | 23.8 (23–25) | 0.057 | 0.081 |
| en | big | sis-full | 3 (2) | 6639 | 3134 | 1421 (1408–2031) | 39.8 (37–42) | 0.081 | 0.117 |
| en | big | adhd-ours | 3 (2) | 4875 | 1021 | 0 (0–505) | 13.3 (12–20) | 0.027 | 0.046 |
| en | big | adhd-upstream | 3 (2) | 4847 | 941 | 96 (0–128) | 12.9 (12–15) | 0.026 | 0.057 |
| en | huge | baseline | 3 (2) | 5993 | 5483 | 311 (93–1627) | 57.0 (48–60) | 0.143 | 0.203 |
| en | huge | sis-skill | 3 (2) | 7578 | 6120 | 928 (734–1160) | 61.4 (54–61) | 0.147 | 0.235 |
| en | huge | sis-full | 3 (2) | 10177 | 7424 | 2925 (938–3309) | 80.9 (59–90) | 0.171 | 0.232 |
| en | huge | adhd-ours | 3 (2) | 8413 | 3257 | 431 (137–894) | 34.8 (35–41) | 0.090 | 0.129 |
| en | huge | adhd-upstream | 3 (2) | 8385 | 1778 | 121 (108–1184) | 24.3 (21–32) | 0.046 | 0.091 |
| ko | short | baseline | 3 (3) | 947 | 635 | 0 (0–48) | 9.0 (9–10) | 0.016 | 0.027 |
| ko | short | sis-skill | 3 (3) | 2532 | 1264 | 814 (503–860) | 14.7 (13–18) | 0.033 | 0.025 |
| ko | short | sis-full | 3 (3) | 5131 | 768 | 365 (335–465) | 10.4 (10–12) | 0.022 | 0.046 |
| ko | short | adhd-ours | 3 (3) | 3367 | 505 | 0 (0–0) | 7.0 (6–7) | 0.014 | 0.030 |
| ko | short | adhd-upstream | 3 (3) | 3339 | 541 | 0 (0–94) | 8.4 (8–9) | 0.015 | 0.025 |
| ko | short | hk-ours | 3 (3) | 11736 | 1147 | 720 (414–1242) | 13.9 (12–21) | 0.035 | 0.038 |
| ko | short | imnotai-codex | 3 (2) | 10639 | 4263 | 3737 (3104–6949) | 55.6 (50–98) | 0.144 | 0.132 |
| ko | short | imnotai-light | 2 (1) [1] | 27553 | 3604 | 3128 (1372–4883) | 48.7 (23–74) | 0.059 | 0.037 |
| ko | mid | baseline | 3 (2) | 1604 | 1316 | 411 (57–501) | 15.9 (13–19) | 0.035 | 0.049 |
| ko | mid | sis-skill | 3 (2) | 3189 | 1528 | 581 (462–944) | 17.9 (17–24) | 0.038 | 0.053 |
| ko | mid | sis-full | 3 (2) | 5788 | 1639 | 689 (546–712) | 19.2 (18–20) | 0.042 | 0.076 |
| ko | mid | adhd-ours | 3 (2) | 4024 | 1246 | 283 (150–362) | 14.5 (14–15) | 0.031 | 0.048 |
| ko | mid | adhd-upstream | 3 (2) | 3996 | 966 | 33 (0–339) | 11.2 (10–14) | 0.026 | 0.040 |
| ko | mid | hk-ours | 3 (2) | 12393 | 1724 | 809 (704–866) | 21.8 (20–22) | 0.048 | 0.084 |
| ko | mid | imnotai-codex | 2 (2) [1] | 11296 | 3602 | 2701 (2256–3146) | 48.6 (42–55) | 0.096 | 0.115 |
| ko | mid | imnotai-light | 0 of 3 delivered | | | | | | |
| ko | big | baseline | 3 (2) | 5699 | 4348 | 638 (473–1739) | 48.6 (48–49) | 0.113 | 0.172 |
| ko | big | sis-skill | 3 (2) | 7284 | 5244 | 1046 (654–2331) | 58.5 (52–71) | 0.131 | 0.196 |
| ko | big | sis-full | 3 (2) | 9883 | 6810 | 2622 (1536–2826) | 72.1 (62–76) | 0.162 | 0.272 |
| ko | big | adhd-ours | 3 (2) | 8119 | 4443 | 911 (652–1232) | 53.9 (48–56) | 0.125 | 0.164 |
| ko | big | adhd-upstream | 3 (2) | 8091 | 4006 | 145 (0–879) | 42.6 (39–47) | 0.101 | 0.161 |
| ko | big | hk-ours | 3 (2) | 16488 | 10727 | 6463 (5036–7622) | 124.1 (97–130) | 0.293 | 0.334 |
| ko | big | imnotai-codex | 0 of 3 delivered | | | | | | |
| ko | big | imnotai-light | 1 (0) [2] | 32811 | 8782 | 4775 (4775–4775) | 103.7 (104–104) | 0.299 | 0.392 |
| ko | huge | baseline | 3 (2) | 16549 | 14466 | 383 (373–3606) | 145.5 (144–149) | 0.378 | 0.520 |
| ko | huge | sis-skill | 3 (2) | 18134 | 17491 | 2095 (1967–4847) | 173.1 (173–206) | 0.443 | 0.593 |
| ko | huge | sis-full | 3 (2) | 20733 | 17432 | 2682 (2432–2785) | 175.7 (174–183) | 0.446 | 0.570 |
| ko | huge | adhd-ours | 3 (2) | 18969 | 11933 | 696 (0–1211) | 126.3 (123–132) | 0.326 | 0.506 |
| ko | huge | adhd-upstream | 3 (2) | 18941 | 11346 | 1084 (593–1199) | 121.4 (107–126) | 0.299 | 0.391 |
| ko | huge | hk-ours | 3 (2) | 27338 | 22496 | 7450 (5701–16356) | 237.7 (211–328) | 0.551 | 0.672 |
| ko | huge | imnotai-codex | 3 (2) | 26241 | 37538 | 22141 (18990–24802) | 394.7 (366–438) | 0.907 | 1.091 |
| ko | huge | imnotai-light | 3 (2) | 42649 | 29632 | 14678 (12854–16910) | 312.1 (284–326) | 0.791 | 0.998 |


### Ratios against no skill

| lang | size | condition | API s (skill / baseline) | latency ratio | +seconds | USD (skill / baseline) | cost ratio | +USD | thinking med (skill / baseline) |
| --- | --- | --- | --- | ---: | ---: | --- | ---: | ---: | --- |
| en | short | sis-skill | 8.6 / 6.1 | 1.40× | 2.5 | 0.017 / 0.006 | 2.56× | 0.010 | 310 / 24 |
| en | short | sis-full | 7.6 / 6.1 | 1.24× | 1.4 | 0.013 / 0.006 | 1.94× | 0.006 | 370 / 24 |
| en | short | adhd-ours | 6.8 / 6.1 | 1.11× | 0.7 | 0.011 / 0.006 | 1.63× | 0.004 | 129 / 24 |
| en | short | adhd-upstream | 5.4 / 6.1 | 0.89× | -0.7 | 0.008 / 0.006 | 1.29× | 0.002 | 47 / 24 |
| en | mid | sis-skill | 16.5 / 10.1 | 1.64× | 6.5 | 0.032 / 0.016 | 1.95× | 0.015 | 747 / 0 |
| en | mid | sis-full | 16.5 / 10.1 | 1.64× | 6.5 | 0.031 / 0.016 | 1.90× | 0.015 | 682 / 0 |
| en | mid | adhd-ours | 8.8 / 10.1 | 0.88× | -1.2 | 0.014 / 0.016 | 0.83× | -0.003 | 0 / 0 |
| en | mid | adhd-upstream | 8.2 / 10.1 | 0.81× | -1.9 | 0.015 / 0.016 | 0.93× | -0.001 | 0 / 0 |
| en | big | sis-skill | 23.8 / 21.8 | 1.09× | 1.9 | 0.057 / 0.051 | 1.11× | 0.006 | 367 / 68 |
| en | big | sis-full | 39.8 / 21.8 | 1.82× | 17.9 | 0.081 / 0.051 | 1.59× | 0.030 | 1421 / 68 |
| en | big | adhd-ours | 13.3 / 21.8 | 0.61× | -8.6 | 0.027 / 0.051 | 0.52× | -0.025 | 0 / 68 |
| en | big | adhd-upstream | 12.9 / 21.8 | 0.59× | -8.9 | 0.026 / 0.051 | 0.51× | -0.025 | 96 / 68 |
| en | huge | sis-skill | 61.4 / 57.0 | 1.08× | 4.3 | 0.147 / 0.143 | 1.03× | 0.005 | 928 / 311 |
| en | huge | sis-full | 80.9 / 57.0 | 1.42× | 23.9 | 0.171 / 0.143 | 1.20× | 0.029 | 2925 / 311 |
| en | huge | adhd-ours | 34.8 / 57.0 | 0.61× | -22.2 | 0.090 / 0.143 | 0.63× | -0.053 | 431 / 311 |
| en | huge | adhd-upstream | 24.3 / 57.0 | 0.43× | -32.7 | 0.046 / 0.143 | 0.33× | -0.096 | 121 / 311 |
| ko | short | sis-skill | 14.7 / 9.0 | 1.63× | 5.7 | 0.033 / 0.016 | 2.01× | 0.017 | 814 / 0 |
| ko | short | sis-full | 10.4 / 9.0 | 1.15× | 1.4 | 0.022 / 0.016 | 1.33× | 0.005 | 365 / 0 |
| ko | short | adhd-ours | 7.0 / 9.0 | 0.78× | -2.0 | 0.014 / 0.016 | 0.88× | -0.002 | 0 / 0 |
| ko | short | adhd-upstream | 8.4 / 9.0 | 0.93× | -0.7 | 0.015 / 0.016 | 0.93× | -0.001 | 0 / 0 |
| ko | short | hk-ours | 13.9 / 9.0 | 1.53× | 4.8 | 0.035 / 0.016 | 2.11× | 0.018 | 720 / 0 |
| ko | short | imnotai-codex | 55.6 / 9.0 | 6.15× | 46.6 | 0.144 / 0.016 | 8.81× | 0.128 | 3737 / 0 |
| ko | short | imnotai-light | 48.7 / 9.0 | 5.39× | 39.7 | 0.059 / 0.016 | 3.60× | 0.043 | 3128 / 0 |
| ko | mid | sis-skill | 17.9 / 15.9 | 1.13× | 2.0 | 0.038 / 0.035 | 1.09× | 0.003 | 581 / 411 |
| ko | mid | sis-full | 19.2 / 15.9 | 1.21× | 3.4 | 0.042 / 0.035 | 1.21× | 0.007 | 689 / 411 |
| ko | mid | adhd-ours | 14.5 / 15.9 | 0.92× | -1.3 | 0.031 / 0.035 | 0.88× | -0.004 | 283 / 411 |
| ko | mid | adhd-upstream | 11.2 / 15.9 | 0.70× | -4.7 | 0.026 / 0.035 | 0.74× | -0.009 | 33 / 411 |
| ko | mid | hk-ours | 21.8 / 15.9 | 1.37× | 5.9 | 0.048 / 0.035 | 1.37× | 0.013 | 809 / 411 |
| ko | mid | imnotai-codex | 48.6 / 15.9 | 3.06× | 32.7 | 0.096 / 0.035 | 2.73× | 0.061 | 2701 / 411 |
| ko | big | sis-skill | 58.5 / 48.6 | 1.20× | 9.9 | 0.131 / 0.113 | 1.16× | 0.018 | 1046 / 638 |
| ko | big | sis-full | 72.1 / 48.6 | 1.48× | 23.6 | 0.162 / 0.113 | 1.43× | 0.049 | 2622 / 638 |
| ko | big | adhd-ours | 53.9 / 48.6 | 1.11× | 5.3 | 0.125 / 0.113 | 1.10× | 0.012 | 911 / 638 |
| ko | big | adhd-upstream | 42.6 / 48.6 | 0.88× | -6.0 | 0.101 / 0.113 | 0.89× | -0.012 | 145 / 638 |
| ko | big | hk-ours | 124.1 / 48.6 | 2.56× | 75.6 | 0.293 / 0.113 | 2.60× | 0.180 | 6463 / 638 |
| ko | big | imnotai-light | 103.7 / 48.6 | 2.13× | 55.1 | 0.299 / 0.113 | 2.65× | 0.186 | 4775 / 638 |
| ko | huge | sis-skill | 173.1 / 145.5 | 1.19× | 27.6 | 0.443 / 0.378 | 1.17× | 0.065 | 2095 / 383 |
| ko | huge | sis-full | 175.7 / 145.5 | 1.21× | 30.2 | 0.446 / 0.378 | 1.18× | 0.068 | 2682 / 383 |
| ko | huge | adhd-ours | 126.3 / 145.5 | 0.87× | -19.2 | 0.326 / 0.378 | 0.86× | -0.051 | 696 / 383 |
| ko | huge | adhd-upstream | 121.4 / 145.5 | 0.83× | -24.2 | 0.299 / 0.378 | 0.79× | -0.078 | 1084 / 383 |
| ko | huge | hk-ours | 237.7 / 145.5 | 1.63× | 92.2 | 0.551 / 0.378 | 1.46× | 0.173 | 7450 / 383 |
| ko | huge | imnotai-codex | 394.7 / 145.5 | 2.71× | 249.1 | 0.907 / 0.378 | 2.40× | 0.530 | 22141 / 383 |
| ko | huge | imnotai-light | 312.1 / 145.5 | 2.14× | 166.6 | 0.791 / 0.378 | 2.09× | 0.413 | 14678 / 383 |

## Size series: what the rewrites did

Delivered runs only. "facts kept" lists each run's retained fixture fact tokens over the fact tokens the fixture contains. "residual ids" counts runs in which the humanize-korean audit still finds the id (P family = calques, Q-1 = chatbot frame, K-1 = 멱등성, M-1 = em dash). The three integrity columns count runs in which the say-it-straight audit saw a change in numbers, Markdown structure, or protected spans; at big and huge size every condition changes these because the fixtures carry numbered section headings and long lists that any rewrite renumbers or merges, so those columns separate conditions only at short and mid size.

| lang | size | condition | delivered | facts kept (runs) | length ratio med | residual ids (runs) | numbers changed | structure changed | protected changed | fully intact |
| --- | --- | --- | ---: | --- | ---: | --- | ---: | ---: | ---: | ---: |
| en | short | baseline | 3/3 | 6/6 6/6 6/6 | 1.35 | none | 3 | 0 | 3 | 0 |
| en | short | sis-skill | 3/3 | 6/6 6/6 6/6 | 0.97 | none | 1 | 0 | 1 | 2 |
| en | short | sis-full | 3/3 | 6/6 6/6 6/6 | 0.97 | none | 0 | 0 | 0 | 3 |
| en | short | adhd-ours | 3/3 | 6/6 6/6 6/6 | 1.32 | none | 3 | 3 | 3 | 0 |
| en | short | adhd-upstream | 3/3 | 6/6 6/6 6/6 | 1.16 | none | 3 | 3 | 3 | 0 |
| en | mid | baseline | 3/3 | 5/6 6/6 6/6 | 1.05 | none | 2 | 2 | 2 | 1 |
| en | mid | sis-skill | 3/3 | 6/6 6/6 6/6 | 0.96 | none | 0 | 0 | 0 | 3 |
| en | mid | sis-full | 3/3 | 6/6 6/6 6/6 | 0.93 | none | 1 | 0 | 1 | 2 |
| en | mid | adhd-ours | 3/3 | 6/6 6/6 6/6 | 0.84 | none | 3 | 3 | 3 | 0 |
| en | mid | adhd-upstream | 3/3 | 6/6 6/6 6/6 | 0.81 | none | 3 | 3 | 3 | 0 |
| en | big | baseline | 3/3 | 7/7 7/7 7/7 | 0.95 | none | 1 | 3 | 3 | 0 |
| en | big | sis-skill | 3/3 | 7/7 7/7 7/7 | 0.92 | none | 0 | 1 | 3 | 0 |
| en | big | sis-full | 3/3 | 7/7 7/7 7/7 | 0.84 | none | 3 | 1 | 3 | 0 |
| en | big | adhd-ours | 3/3 | 7/7 7/7 7/7 | 0.48 | none | 3 | 3 | 3 | 0 |
| en | big | adhd-upstream | 3/3 | 7/7 6/7 7/7 | 0.4 | none | 3 | 3 | 3 | 0 |
| en | huge | baseline | 3/3 | 7/7 7/7 7/7 | 0.95 | none | 3 | 3 | 3 | 0 |
| en | huge | sis-skill | 3/3 | 7/7 7/7 7/7 | 0.88 | none | 3 | 2 | 3 | 0 |
| en | huge | sis-full | 3/3 | 7/7 7/7 7/7 | 0.87 | none | 3 | 3 | 3 | 0 |
| en | huge | adhd-ours | 3/3 | 7/7 7/7 7/7 | 0.44 | none | 3 | 3 | 3 | 0 |
| en | huge | adhd-upstream | 3/3 | 7/7 7/7 6/7 | 0.24 | none | 3 | 3 | 3 | 0 |
| ko | short | baseline | 3/3 | 10/11 10/11 11/11 | 1.38 | P-6×3 K-1×3 | 0 | 3 | 3 | 0 |
| ko | short | sis-skill | 3/3 | 11/11 11/11 11/11 | 0.91 | P-6×3 K-1×3 | 0 | 0 | 1 | 2 |
| ko | short | sis-full | 3/3 | 11/11 11/11 11/11 | 0.9 | P-6×3 K-1×3 | 0 | 0 | 0 | 3 |
| ko | short | adhd-ours | 3/3 | 11/11 10/11 11/11 | 1.1 | P-6×3 K-1×3 M-1×1 | 2 | 2 | 3 | 0 |
| ko | short | adhd-upstream | 3/3 | 10/11 11/11 11/11 | 1.17 | P-6×3 K-1×3 | 0 | 3 | 3 | 0 |
| ko | short | hk-ours | 3/3 | 11/11 11/11 11/11 | 1 | none | 2 | 0 | 3 | 0 |
| ko | short | imnotai-codex | 3/3 | 11/11 11/11 11/11 | 1.12 | P-6×3 K-1×3 | 0 | 3 | 3 | 0 |
| ko | short | imnotai-light | 2/3 | 11/11 11/11 | 1.1 | P-6×2 K-1×2 | 0 | 1 | 2 | 0 |
| ko | mid | baseline | 3/3 | 10/10 10/10 10/10 | 0.98 | P-6×3 K-1×3 | 0 | 0 | 3 | 0 |
| ko | mid | sis-skill | 3/3 | 10/10 10/10 10/10 | 0.87 | P-6×3 K-1×3 | 0 | 0 | 3 | 0 |
| ko | mid | sis-full | 3/3 | 10/10 10/10 10/10 | 0.87 | P-6×3 K-1×3 | 0 | 0 | 3 | 0 |
| ko | mid | adhd-ours | 3/3 | 10/10 10/10 10/10 | 0.85 | P-6×3 K-1×3 | 1 | 0 | 3 | 0 |
| ko | mid | adhd-upstream | 3/3 | 10/10 10/10 10/10 | 0.86 | P-6×3 K-1×3 | 0 | 0 | 3 | 0 |
| ko | mid | hk-ours | 3/3 | 10/10 10/10 10/10 | 0.8 | none | 3 | 0 | 3 | 0 |
| ko | mid | imnotai-codex | 2/3 | 10/10 10/10 | 0.8 | P-6×2 K-1×2 | 0 | 1 | 2 | 0 |
| ko | mid | imnotai-light | 0/3 | - | - | none | 0 | 0 | 0 | 0 |
| ko | big | baseline | 3/3 | 10/10 10/10 10/10 | 0.74 | P-1a×2 P-6×3 K-1×3 M-1×2 | 3 | 3 | 3 | 0 |
| ko | big | sis-skill | 3/3 | 10/10 10/10 10/10 | 0.84 | P-1a×2 P-6×3 K-1×3 M-1×2 | 3 | 3 | 3 | 0 |
| ko | big | sis-full | 3/3 | 10/10 10/10 10/10 | 0.81 | P-6×3 K-1×3 M-1×3 | 3 | 3 | 3 | 0 |
| ko | big | adhd-ours | 3/3 | 10/10 10/10 10/10 | 0.74 | P-1a×2 P-6×3 K-1×3 M-1×3 | 3 | 3 | 3 | 0 |
| ko | big | adhd-upstream | 3/3 | 10/10 10/10 10/10 | 0.68 | P-1a×2 P-6×3 K-1×3 M-1×3 | 3 | 3 | 3 | 0 |
| ko | big | hk-ours | 3/3 | 10/10 10/10 10/10 | 0.81 | none | 3 | 3 | 3 | 0 |
| ko | big | imnotai-codex | 0/3 | - | - | none | 0 | 0 | 0 | 0 |
| ko | big | imnotai-light | 1/3 | 10/10 | 0.77 | P-6×1 K-1×1 M-1×1 | 1 | 1 | 1 | 0 |
| ko | huge | baseline | 3/3 | 10/10 10/10 10/10 | 0.88 | P-1b×2 P-6×3 K-1×3 M-1×3 | 3 | 3 | 3 | 0 |
| ko | huge | sis-skill | 3/3 | 10/10 10/10 10/10 | 0.95 | P-1b×2 P-6×3 K-1×3 M-1×3 | 1 | 2 | 3 | 0 |
| ko | huge | sis-full | 3/3 | 10/10 10/10 10/10 | 0.94 | P-6×3 K-1×3 M-1×3 | 3 | 2 | 3 | 0 |
| ko | huge | adhd-ours | 3/3 | 10/10 10/10 10/10 | 0.71 | P-1b×2 P-6×3 K-1×3 M-1×3 | 3 | 3 | 3 | 0 |
| ko | huge | adhd-upstream | 3/3 | 10/10 10/10 10/10 | 0.63 | P-1b×3 P-6×3 K-1×3 M-1×3 | 3 | 3 | 3 | 0 |
| ko | huge | hk-ours | 3/3 | 10/10 10/10 10/10 | 0.9 | P-6×3 K-1×2 | 3 | 3 | 3 | 0 |
| ko | huge | imnotai-codex | 3/3 | 10/10 10/10 10/10 | 0.93 | P-1b×3 P-6×3 K-1×3 M-1×3 | 2 | 2 | 3 | 0 |
| ko | huge | imnotai-light | 3/3 | 10/10 10/10 10/10 | 0.94 | P-1b×3 P-6×3 K-1×3 M-1×3 | 3 | 2 | 3 | 0 |

### Chatbot frame removal (Korean, delivered runs)

The Q-1 counter does not match the frames these fixtures carry (see the rule finding below), so this table checks the first and last lines directly. The big fixture has no opener.

| size | condition | delivered | opener kept | closer kept |
| big | adhd-ours | 3 | 0 | 0 |
| big | adhd-upstream | 3 | 0 | 0 |
| big | baseline | 3 | 0 | 0 |
| big | hk-ours | 3 | 0 | 0 |
| big | imnotai-light | 1 | 0 | 0 |
| big | sis-full | 3 | 0 | 0 |
| big | sis-skill | 3 | 0 | 0 |
| huge | adhd-ours | 3 | 0 | 0 |
| huge | adhd-upstream | 3 | 0 | 0 |
| huge | baseline | 3 | 2 | 2 |
| huge | hk-ours | 3 | 0 | 0 |
| huge | imnotai-codex | 3 | 1 | 2 |
| huge | imnotai-light | 3 | 0 | 0 |
| huge | sis-full | 3 | 0 | 0 |
| huge | sis-skill | 3 | 2 | 1 |
| mid | adhd-ours | 3 | 0 | 0 |
| mid | adhd-upstream | 3 | 0 | 0 |
| mid | baseline | 3 | 2 | 2 |
| mid | hk-ours | 3 | 0 | 0 |
| mid | imnotai-codex | 2 | 0 | 0 |
| mid | sis-full | 3 | 0 | 0 |
| mid | sis-skill | 3 | 0 | 0 |
| short | adhd-ours | 3 | 0 | 0 |
| short | adhd-upstream | 3 | 0 | 0 |
| short | baseline | 3 | 3 | 3 |
| short | hk-ours | 3 | 0 | 0 |
| short | imnotai-codex | 3 | 0 | 0 |
| short | imnotai-light | 2 | 0 | 0 |
| short | sis-full | 3 | 0 | 0 |
| short | sis-skill | 3 | 0 | 0 |

## Findings

1. **say-it-straight's cost is a near-constant per-call surcharge, not a multiplier.** Added latency was 2 to 10 seconds on seven of eight cells and 28 seconds on Korean huge; added cost $0.003 to $0.018 on seven cells and $0.065 on Korean huge. Relative to no skill that is 1.4 to 1.6× on short texts and 1.1 to 1.2× at big and huge. The surcharge is thinking: 310 to 928 tokens on English and 581 to 2,095 on Korean, against 0 to 638 for no skill on the same texts. The pilot's 2.3 to 2.8× figure was measured at `xhigh` effort on a denser hand-authored text; at `high` the same skill costs 1.1 to 1.6×.
2. **Loading the references changes the size curve.** File-backed say-it-straight is cheaper than SKILL-only on short texts (its defect table gives the model a checklist and it thinks less: 365 versus 814 tokens on Korean short) but more expensive on long ones (1,421 to 2,925 thinking tokens on English big and huge; 39.8 s versus 21.8 s baseline on English big). It also removed 조용히 실패 in 3 of 3 Korean big runs where the SKILL-only variant left it in 2 of 3: the idiom row lives in `references/quick-rules.md`.
3. **say-it-straight is the only condition with fully intact numbers, structure, and protected spans on short and mid texts:** English short 3 of 3 (file-backed) and 2 of 3, English mid 3 of 3 and 2 of 3, Korean short 3 of 3 and 2 of 3, against 0 to 1 of 3 for every other condition including no skill. At big and huge size no condition passes that check, because the fixtures' numbered headings and lists are renumbered or merged by every rewrite; fact retention stays 7 of 7 and 10 of 10 there for all delivered runs except two upstream i-have-adhd runs at 6 of 7.
4. **i-have-adhd trades content for speed.** Both variants beat no skill on cost and latency on 13 of 16 cells (0.4 to 0.9×) because the output is shorter: English big 40 to 48 percent of the source, English huge 24 to 44 percent, Korean 63 to 86 percent. Fact tokens survive; the prose around them does not. The two variants differ by 28 tokens of text and their medians overlap on every cell.
5. **humanize-korean clears the Korean tells that no one else does, at 1.4 to 2.6× the cost.** It is the only condition with zero residual P, K-1, and M-1 ids at short, mid, and big size in 3 of 3 runs. Its thinking grows with input: 720 tokens at short, 809 at mid, 6,463 at big, 7,450 at huge (one huge run 16,356), which makes big the worst cell (124 s, $0.293, 2.6× baseline) and leaves 안전하게 실패 and 첫날부터 uncorrected on huge in 3 of 3 runs.
6. **im-not-ai needs its tools.** In 10 of 24 measured Korean runs it returned a status or "insight" block and no rewrite (0 fact tokens), twice with literal `<invoke name="Bash">` markup: the orchestrator tried to run its Python shim and subagents in a harness that has none, and the Codex single-call path tried to write `_workspace/final.md` instead of inlining. Where it did deliver, it cost 2.1 to 8.8× no skill and took 2.1 to 6.2× as long (Korean short: 55.6 s and $0.144 for a 510-character text, 3,737 thinking tokens) and left the same residue as no skill (P-6, K-1, M-1, P-1b). Its Claude light path, emulated in one context, reached 312 s and $0.79 per run on huge. These are lower bounds for its native multi-context path and an upper bound on its usefulness in a tool-less rewrite.
7. **No skill leaves the chatbot frame in place.** With the neutral prompt, the plain model kept 안녕하세요 and the closing line in 3 of 3 short, 2 of 3 mid, and 2 of 3 huge Korean runs, and dropped the closer on big in 3 of 3. Every skill removed both in every delivered run except say-it-straight SKILL-only on huge (2 openers, 1 closer kept) and im-not-ai Codex on huge (1 opener, 2 closers).
8. **Deterministic layers are free.** Our two audits and im-not-ai's two gate scripts all run in 70 to 180 ms on a 1.5-kilobyte sample; every second in the tables is model time.

## Rule finding: Q-1 does not see the frames this model writes

Every Korean fixture opens or closes with an assistant frame, and the Q-1 counter matched none of them (0 hits on all four):

- openers: 안녕하세요! 요청하신 검토안을 아래와 같이 정리했습니다. / 안녕하세요! 요청하신 **'…'** 문서를 아래와 같이 정리해 드렸습니다. 확인해 보시고 참고해 주세요. / 안녕하세요. 요청하신 **…** 문서를 정리해 드립니다.
- closers: 참고가 되시면 좋겠습니다! / 이상으로 검토 문서를 마칩니다. … 편하게 말씀해 주세요. 감사합니다! / 검토에 도움이 되었기를 바랍니다. 감사합니다! 🙌

Q-1 was written from ChatGPT-era phrasing (물론입니다!, 다음은 ~입니다:, 도움이 되셨길 바랍니다, 추가 질문이 있으시면). The 요청하신 branch allows only 20 characters before 정리해 드리, so a bolded title defeats it; 되었기를 is not in the 도움이 되 branch; 안녕하세요 as an opener, 이상으로 … 마칩니다, and 편하게 말씀해 주세요 are absent. Candidate additions, each position-anchored to the first or last line: `^안녕하세요[.!]`, `요청하신 .{0,60}(정리했습니다|정리해 드(렸|립)니다)`, `이상으로 .{0,30}마칩니다`, `도움이 되(었기를|셨기를) 바랍니다`, `참고가 되시면 좋겠습니다`, `편하게 말씀해 주세요`.

## Audit finding: protected-token heuristic (from the pilot)

The humanize-korean audit's Korean product-name heuristic (`collectKoreanProductNameCandidates`, second pattern) protects any word that precedes 앱, 서비스, 플랫폼, 도구, 브라우저, 메신저, 뷰어, or 에디터, including its particle and even sentence punctuation. In the `config-sync-review` original this made 파일은 (from 설정 파일은 서비스마다), 문제는 (from 문제는 도구가 아니라), and in two outputs 있습니다. into protected tokens. Any rewrite that touches those sentences fails with "Protected tokens changed" at grade D; all 24 Korean outputs did, including three produced under our own skill. The sample's own A version passed only because it kept both sentences verbatim. Fix: strip trailing punctuation and particles (은 는 이 가 을 를 도 의 에 와 과 로) before the length and stoplist checks, and skip candidates whose stem is in the stoplist (파일 and 문제 already are).

Cross-check in the other direction: im-not-ai's `verify_gates.py` on our A version reported one lost deontic sentence (`FAIL — 서법 소실 1문장`). Its pairwise aligner matched the source sentence 서비스별 예외 설정을 어떻게 다룰지는 아직 정해지지 않았으며, 이 부분은 2단계 전에 논의를 통해 결정할 필요가 있습니다 against only the first half of our split; the second sentence keeps 결정할 필요가 있습니다, and its own totals show deontic 3 before and 3 after. Sentence splits confuse a pairwise modality check; our count-based warning does not have that failure mode, and has the opposite one.

## Caveats

- n=3 per cell. Min and max are printed beside every median; thinking counts vary up to 3× between runs of the same cell, and single-run cells (Korean big im-not-ai light) are one observation.
- Two accounts. The third measured pass of 46 cells ran on a second account after the first hit its monthly spend limit; same model and price, cold cache. Cost medians exclude those runs; latency medians include them.
- Fixtures were written by the same model that rewrites them, which is the realistic input for an AI-tell remover but means the tells present are the ones Opus 5 produces at `high` effort, not the ChatGPT-era set the rules were built from.
- im-not-ai's Claude path is a tool-driven multi-agent orchestration emulated in one tool-less context. Its costs here are lower bounds and its delivery failures are a property of the emulation as much as of the skill.
- The Korean prompt asks for the polished text only, which suppresses im-not-ai's status-line contract and lowers its output tokens relative to normal use.
- One model, one day, list pricing, `--effort high`. The ordering and the size curve are the durable results; absolute seconds depend on server load and the effort setting.

## Appendix: pilot run (2026-09-11, inherited `xhigh` effort, one text per language)

The pilot used the hand-authored `config-sync-review` original (1,515 characters, 26 rule ids firing) and `support-reply-en`, n=3 with the first run writing the cache. It is kept for the record; its cost and latency claims are superseded by the series above. Its residual-tell table remains informative because that fixture carries the whole P family.

### Pilot task runs

Medians of three runs. Prompt tokens include the 1,425-token print-mode overhead and the task text. Cost is the main model only; the Haiku side-call added $0.0013 (English) or $0.0025 (Korean) per run. The median run read the prompt from cache; the last column is the first run, which wrote it.

| Condition | Task | Prompt tok | Output tok | of which thinking | API seconds | USD per run (median, cached) | USD first run |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| baseline (no skill) | en | 1,803 | 323 | 0 | 5.5 | 0.009 | 0.026 |
| i-have-adhd (ayghri) | en | 4,195 | 308 | 67 | 5.5 | 0.010 | 0.050 |
| i-have-adhd (ours) | en | 4,223 | 352 | 60 | 6.2 | 0.011 | 0.054 |
| say-it-straight, SKILL only | en | 3,388 | 1,127 | 798 | 12.7 | 0.031 | 0.048 |
| say-it-straight, file-backed | en | 5,987 | 1,270 | 956 | 15.4 | 0.036 | 0.092 |
| i-have-adhd (ayghri) | ko | 5,288 | 1,298 | 266 | 16.6 | 0.045 | 0.062 |
| i-have-adhd (ours) | ko | 5,316 | 2,280 | 1,304 | 25.4 | 0.070 | 0.087 |
| say-it-straight, SKILL only | ko | 4,481 | 2,720 | 1,640 | 32.2 | 0.070 | 0.144 |
| baseline (no skill) | ko | 2,896 | 3,199 | 2,202 | 39.3 | 0.081 | 0.117 |
| say-it-straight, file-backed | ko | 7,080 | 3,721 | 2,713 | 42.0 | 0.099 | 0.139 |
| humanize-korean (ours) | ko | 13,685 | 3,966 | 2,899 | 45.0 | 0.136 | 0.165 |
| im-not-ai, Codex single-call | ko | 12,588 | 5,200 | 4,014 | 60.0 | 0.136 | 0.286 |
| im-not-ai, Claude light (single-context emulation) | ko | 28,996 | 8,139 | 6,930 | 103.8 | 0.218 | 0.512 |

Per-run API seconds, in run order: baseline en 6/6/5, ko 42/38/39; say-it-straight SKILL-only en 9/13/15, ko 48/30/32; file-backed en 15/15/13, ko 33/42/43; i-have-adhd ours en 8/5/6, ko 25/14/33; ayghri en 5/6/7, ko 17/22/12; humanize-korean ko 15/45/59; im-not-ai codex ko 84/60/55; im-not-ai light ko 110/70/104.

### Pilot residual tells and protected-span integrity

Korean output was audited against the original with the humanize-korean audit. The table lists which P-family and Q-1 ids survived, plus K-1 (멱등성) because the two skills disagree about it by design. Protected-span integrity is the say-it-straight audit's verdict on the same output (numbers, code spans, headings, tables, lists unchanged).

| Condition | Task | Runs | P-1a | P-2 | P-3 | P-4 | P-5 | P-6 | Q-1 | K-1 | Protected spans intact |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| humanize-korean (ours) | ko | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 of 3 |
| baseline (no skill) | ko | 3 | 0 | 0 | 0 | 0 | 3 | 3 | 0 | 3 | 3 of 3 |
| say-it-straight, SKILL only | ko | 3 | 0 | 2 | 2 | 3 | 3 | 3 | 0 | 3 | 3 of 3 |
| say-it-straight, file-backed | ko | 3 | 0 | 0 | 0 | 3 | 3 | 3 | 0 | 3 | 2 of 3 |
| i-have-adhd (ours) | ko | 3 | 1 | 0 | 0 | 2 | 3 | 3 | 0 | 3 | 3 of 3 |
| i-have-adhd (ayghri) | ko | 3 | 0 | 0 | 0 | 3 | 3 | 3 | 0 | 3 | 3 of 3 |
| im-not-ai, Codex single-call | ko | 3 | 0 | 0 | 1 | 3 | 3 | 3 | 0 | 3 | 3 of 3 |
| im-not-ai, Claude light | ko | 3 | 0 | 0 | 0 | 2 | 3 | 3 | 0 | 3 | 3 of 3 |
| say-it-straight, SKILL only | en | 3 | | | | | | | | | 3 of 3 |
| say-it-straight, file-backed | en | 3 | | | | | | | | | 3 of 3 |
| baseline (no skill) | en | 3 | | | | | | | | | 2 of 3 |
| i-have-adhd (ours) | en | 3 | | | | | | | | | 0 of 3 |
| i-have-adhd (ayghri) | en | 3 | | | | | | | | | 0 of 3 |

Numbers in the P and K columns are the count of runs (out of three) in which at least one instance survived.

Every Korean output also kept between three and eight connective-ending commas (C-11), including humanize-korean's, and the humanize-korean audit graded all 24 Korean outputs D for a reason unrelated to the rewrites (see the audit finding below).

## Reproduction

Build one system-prompt file per condition (skill body with frontmatter stripped, references appended in the order the SKILL names them, one host line "The user explicitly invoked the skill below for this request. Apply it."), one prompt file per fixture (task line, blank line, `---`, blank line, fixture), then for each cell run a warm-up and three measured runs:

```bash
env -u CLAUDE_EFFORT claude -p --effort high --system-prompt-file conds/<condition>.txt \
  --tools "" --strict-mcp-config --mcp-config '{"mcpServers":{}}' --setting-sources "" \
  --no-session-persistence --output-format json < prompts/<lang>-<size>.txt \
  > results/<condition>--<lang>-<size>--<run>.json
```

Read `modelUsage` for the non-Haiku model: prompt tokens are `inputTokens + cacheCreationInputTokens + cacheReadInputTokens`, thinking is `thinkingTokens`, cost is `costUSD`; `duration_api_ms` is the latency. Judge delivery by fixture fact tokens (Korean: 12개, 4건, 38분, config.yaml, settings 테이블, schemas/settings.v2.json, settings_history, 90일, 2026-10-15, 2026-11-05, 10개; English: 2026-09-30, X-API-Version, Authorization, docs.example.com/api/v2, api.example.com/orders, staging, production) counted against the tokens the fixture itself contains, plus absence of `<invoke name=` markup. Audit delivered outputs with `skills/humanize-korean/scripts/audit-humanize-output.mjs` and `skills/say-it-straight/scripts/audit-output.mjs` against `docs/benchmarks/fixtures/<lang>-<size>.md`. For token counts, load one file as the system prompt with the user prompt "Reply with the single word OK." and subtract the same call made with a one-line system prompt. Write runners as bash scripts: the interactive tool shell here is zsh, which has no `export -f` and does not word-split unquoted variables.
