# STORYBOARD.md schema

The storyboard is the video's token contract and timeline in one file. No composition code before it exists; no scene, value, or audio cue that does not trace to it. Author it under the active evidence root (`.superloopy/evidence/video/<timestamp>-<slug>/STORYBOARD.md`).

## 1. Brief

One block, all fields explicit — defaults are stated, not assumed silently:

```
Audience:     <who watches and in what context>
Destination:  <landing page / X / YouTube / internal demo / app store>
Aspect:       16:9 (9:16 only for a named vertical destination)
Duration:     <target seconds, hard cap>
Language:     <narration + caption language>
Tone:         <one committed direction — e.g. "calm dev-tool confidence", "launch-day energy">
```

## 2. Narrative spine

Four labelled stages, one line each: **Hook** (first 2 seconds — why keep watching), **Development** (what is shown/argued), **Payoff** (the moment the promise lands), **Close** (CTA or resolution — a video never just stops). Every beat in section 3 belongs to exactly one stage.

## 3. Beat sheet

The timeline the composition, the crew, and frame-QA all measure against. One line per beat, machine-parseable timestamps:

```
- [t=0s d=2s] Hook card — visual: product wordmark punches in on ink canvas | motion: scale 0.94→1 + opacity, beat-synced | audio: music hit | text: "<hook line>"
- [t=2s d=5.5s] Problem — visual: split layout, pain-point stat left | motion: counter rolls up | audio: VO line 1 | text: "<stat>"
- [t=7.5s d=4s] …
```

Rules:

- `t` is the beat's start in seconds from 0; `d` its duration. Beats are contiguous and ordered; the last beat's `t + d` equals the video duration.
- Every beat carries all four channels: `visual`, `motion`, `audio`, `text` (use `—` for an intentionally empty channel; empty is a decision, not an omission).
- Beat durations must vary — a timeline where every beat has the same `d` is pacing slop (see anti-slop rules).
- `scripts/frame-qa.mjs` parses the `[t=…s d=…s]` markers to extract QA frames; keep the format exact.

## 4. Audio plan

- **VO script, verbatim** — the exact words, per beat. What is generated/recorded must match this text; captions derive from it.
- **Music** — intent (mood, energy curve, named BPM if motion is beat-synced), and where it ducks under narration.
- **SFX** — cue list mapped to beats; silence over one second must be intentional and noted.

## 5. Visual token contract

- **If the repo has `DESIGN.md`** (superloopy-frontend): reference it — list only which tokens this video uses (canvas, ink, accent, type faces/scale, spacing base, motion durations/easings). Colors, type, and spacing MUST trace to it.
- **If not**: declare the video's own minimal set here: canvas + ink + ONE accent, two type faces max with a numbered scale, a spacing base, a motion vocabulary (named easings and duration steps). Same discipline as a DESIGN.md — no raw values in compositions that this section does not declare.

## 6. Acceptance criteria

Map the storyboard to Superloopy criteria so the loop can gate on it, preferring command-backed proof:

```
- lint/validate pass            → superloopy loop prove -- npx hyperframes lint
- render completes at <W×H>,<s> → frame-qa.mjs asserts duration/aspect/audio (exits non-zero)
- every beat frame matches      → manual criterion; artifact: frames/ + VIDEO_QA.md verdict table
- anti-slop pre-flight clean    → manual criterion; artifact: checklist in VIDEO_QA.md
```
