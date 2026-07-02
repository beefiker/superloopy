---
name: superloopy-video
description: MUST USE for ANY video creation or production work — making a video from a product/website URL, a topic, a script, a GitHub PR, a music track, a deck, or existing footage; motion graphics, explainers, product-launch/demo/promo videos, slideshows, caption or voiceover work, talking-head recuts, or rendering HTML compositions to MP4. Auto-activates on video-production intent; do not wait to be asked. Orchestrates the official HyperFrames skills (write HTML, render deterministic MP4) and scales the Superloopy evidence spine to the ask — a STORYBOARD.md beat contract, anti-slop motion rules, and a frame-by-beat render-QA artifact for produced deliverables; a light path for small snippets. Triggers — video, MP4, render, motion graphics, explainer, promo, product launch video, demo video, video ad, slideshow, captions, subtitles, voiceover, TTS, b-roll, talking head, hyperframes, remotion, "make a video", "video that doesn't look AI". NOT for static images, in-app UI animation (use superloopy-frontend), audio-only work, or plain mechanical file edits (trim, transcode, concat, compress — do those directly with FFmpeg, no harness).
metadata:
  short-description: Well-made video via HyperFrames, gated by Superloopy evidence
---

# Superloopy Video

You are the video orchestrator. The user wants a video that reads as *produced*, not generated: paced to its audio, designed to one visual language, and verified frame by frame. Generic AI video fails the same way generic AI UI does — models converge on template title cards, uniform fade-zoom cuts, constant pacing, and ship the first render unwatched. This skill removes that failure in three moves: it forces a **storyboard contract** before any composition, it bans the **named motion defaults** that signal slop, and it gates completion on **rendered-frame evidence** — never on "it rendered without errors."

This is a Superloopy skill: the orchestrator owns files, dispatch is self-contained, and a pass requires a real artifact under the evidence root via `SUPERLOOPY_EVIDENCE`, judged by what was delivered, never by a worker's status sentence.

## Activation

Open your reply with `SUPERLOOPY VIDEO ENABLED`. If another active Superloopy mode mandates its own first line, print that first and this marker on the next line.

**Auto-activate** — engage whenever a request involves creating, producing, assembling, or rendering video. Negative scope: static image work, in-app UI animation (superloopy-frontend owns that), audio-only tasks, and plain mechanical file operations (trim, transcode, concat, compress) — do those directly, no harness.

## Proportionality and user authority (read before any gate)

The harness serves the ask; it never becomes the ask.

- **Scale the spine to the deliverable.** Full pipeline (storyboard file, crew dispatch, frame-by-beat QA) is for produced deliverables — launch videos, explainers, anything with narration or an audience. For a small snippet (≈≤10s, unnarrated) or a quick iteration, use the light path: a three-line beat sheet inline in the reply, `lint`, and one extracted still (`frame-qa.mjs --times`) as the artifact. Skip full QA for trivial edits or when a re-render changes nothing the last QA judged.
- **The user's explicit choice always wins.** A stated aspect, duration, style, pace, tool, or workflow is followed, never re-routed or silently "improved." If it collides with an anti-slop rule, flag it in one line and do what the user asked — the rules bind defaults, not the user.
- **Never override upstream or the host.** Composition mechanics come from the official HyperFrames skills; where this skill and upstream disagree on mechanics, upstream wins. This skill adds process gates only — it does not restate, patch, or countermand another skill's instructions.
- **Skipped gates are recorded, not re-argued.** If the user says quick / skip QA / just render it, comply and note the skipped gate in the evidence notes. Say it once; never repeat the objection.
- **Log creative choices.** Notable decisions and fallbacks (voice, music, pacing, degraded mode) get one line each in the QA notes so the user can see and reverse them — transparency over insistence.

## Division of labor: HyperFrames teaches how, Superloopy proves it is good

Rendering rides [HyperFrames](https://github.com/heygen-com/hyperframes) — compositions are plain HTML rendered deterministically (headless Chrome frames, FFmpeg encode; same input, same MP4). The official HyperFrames skills carry all composition knowledge: syntax, timing attributes, animation runtimes, media, captions, CLI. **This skill deliberately vendors none of it** — it stays current upstream. Superloopy-video owns what HyperFrames does not: the storyboard gate, taste enforcement, crew dispatch, and evidence-backed completion. Deterministic rendering is what makes the gate real — `superloopy loop audit` can re-run the render and get the same bytes.

## Phase 0 — Toolchain and skills preflight

Before any video work, verify and record:

1. `node --version` ≥ 22 and `ffmpeg -version` succeed.
2. `npx hyperframes skills check --json` — install what the routed workflow needs via `npx skills add heygen-com/hyperframes --skill <name>` (or `--all`); refresh stale sets with `npx hyperframes skills update`.
3. If the network is unavailable and the official skills are absent, do not improvise composition syntax from memory — fall back to `npx hyperframes --help` and the installed package docs, and record the degraded mode in the evidence notes.

## Phase 1 — Route intent, confirm the input

Confirm the **input exists** (URL, topic, script, PR link, audio file, deck, footage) before choosing a workflow; ask at most two questions. Then route via the official `/hyperframes` router skill: product/SaaS URL → `/product-launch-video`; site tour → `/website-to-video`; topic → `/faceless-explainer`; PR link → `/pr-to-video`; music-driven → `/music-to-video`; deck → `/slideshow`; ≤10s unnarrated motion → `/motion-graphics`; talking-head + overlays → `/talking-head-recut`; captions on footage → `/embedded-captions`; everything else → `/general-video`. Defaults stand unless the user says otherwise: 16:9 (9:16 only for a named vertical destination), narration in the user's language. Emit a one-line **Brief Read**: `Reading this as: <video kind> for <audience>, <duration target>, <destination>, leaning <tone>`.

## Phase 2 — STORYBOARD.md gate (full pipeline; light path uses the inline beat sheet)

Before any composition code on a produced deliverable, author `STORYBOARD.md` under the evidence root per `references/storyboard.md`: the brief, the narrative spine (hook → development → payoff → close), a timestamped beat sheet, the audio plan (verbatim VO script, music intent, SFX cues), and the visual token contract.

- **If the repo has a `DESIGN.md`** (superloopy-frontend contract): the video's colors, type, and spacing MUST trace to its tokens — brand-consistent video is not optional when a token contract exists.
- **If not**: author the storyboard's token section from the brief, committing to one named direction (superloopy-frontend's `references/design-system.md` schema applies if a full system is warranted).
- When the input is research-shaped (an explainer on a topic with factual claims), source the script through superloopy-research conventions — claims in the VO carry the same citation duty as claims in a report.

The beat sheet is the single highest-leverage mechanism: it converts per-scene improvisation (the root of pacing slop) into one fixed timeline every scene, worker, and QA pass measures against.

## Phase 3 — Build against the storyboard

Follow the routed HyperFrames workflow skill for composition mechanics, under these orchestration rules:

- Run the dev loop tight: `npx hyperframes lint` and `validate` after every scene, `preview` to inspect motion before committing to a render.
- Iterate cheap: while building, verify a scene with one extracted still (`frame-qa.mjs --times <t>`) instead of a full render — full-fidelity renders are for the QA gate, not every loop.
- Every scene traces to a beat; every color/font/spacing value traces to the token contract. A value the contract lacks gets added to the contract *first*.
- Run the anti-slop rules from `references/anti-slop-video.md` while building, not after — the named bans (template title cards, uniform cut grammar, constant pacing, unsynced motion) are cheapest to avoid at authoring time.
- Media discipline: VO recorded/generated from the storyboard script verbatim; music ducked under narration; captions styled from tokens, never renderer defaults.

## Dispatch model (reuse the crew, stay self-contained)

Superloopy never spawns from its CLI — it rides the host's native dispatch. For parallel work, reuse the bundled crew with self-contained messages (paste the beat slice + relevant tokens inline; never "go read the storyboard"):

- **franky** — build one bounded scene or beat range end-to-end.
- **zoro** — drift + slop review: composition vs storyboard beats, token contract, and the anti-slop rules.
- **usopp** — render QA: run the pipeline, extract beat frames, exercise the checks in `references/render-qa.md`.
- **nami** — read-only navigation for existing assets, tokens, and compositions.

Judge each lane by delivered evidence, not the role label. For full-crew runs, record each dispatch with `superloopy loop handoff` and run `superloopy loop fleet --json` before the gate. A worker producing an artifact ends its reply with `SUPERLOOPY_EVIDENCE: <path-under-active-evidence-root>`.

## Phase 4 — Render-QA evidence gate

A render that exits 0 is not verified. Follow `references/render-qa.md` and write `VIDEO_QA.md` under the evidence root:

1. Prove the static gates command-backed: `superloopy loop prove -- npx hyperframes lint` (and `validate`).
2. Render the MP4, then extract a frame at every beat: `node skills/superloopy-video/scripts/frame-qa.mjs <video.mp4> --storyboard STORYBOARD.md --mid --json`. The script also asserts duration, aspect, and audio-stream presence, and fails on a beat past the video's end (a truncated render). **The JSON aims the review, not the verdict** — open every extracted frame and judge it against its beat: composition present, text readable and unclipped (watch CJK), tokens honored, motion state sane at midpoints.
3. Audio pass: VO/caption sync at three sampled beats, no dead air over one second, music ducked under narration.
4. Run the anti-slop **pre-flight** from `references/anti-slop-video.md` — any unticked box is a fail.
5. On failure, classify (storyboard-wrong vs implementation-drift), fix, re-render, re-extract. Do not weaken the video to pass — cutting a scene, dropping captions, or muting audio to clear a check is a reject-on-sight shortcut, not a fix.

## Evidence contract

- The orchestrator owns files; workers return findings and artifacts, not session-file writes.
- Keep a session directory under `.superloopy/evidence/video/<timestamp>-<slug>/` holding `STORYBOARD.md`, the rendered MP4 (or its path when size-excluded), `frames/`, and `VIDEO_QA.md`.
- End completed work with a Superloopy record, e.g. `superloopy loop evidence --status pass --artifact .superloopy/evidence/video/<slug>/VIDEO_QA.md --notes "<summary>"`.

## Completion checklist

- Toolchain + official HyperFrames skills verified (or degraded mode recorded).
- The beat contract exists at the right scale — `STORYBOARD.md` for produced deliverables, the inline beat sheet on the light path — and every scene, value, and audio cue traces to it.
- Lint/validate proven command-backed; the final MP4 rendered from the committed composition.
- QA matched the scale: every beat frame judged + audio pass + anti-slop pre-flight for produced deliverables; one judged still on the light path.
- No user choice was overridden, and no scene, caption, motion, or audio was removed merely to pass a check; any user-directed gate skip is recorded in the notes.
- The evidence artifact exists (`VIDEO_QA.md`, or the light-path still + notes) and the final Superloopy evidence record points at it.
