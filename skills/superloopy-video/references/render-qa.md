# Render-QA protocol

A render that exits 0 proves encoding, not quality. This protocol turns "the video is good" into artifacts: extracted frames judged against the storyboard, audio spot checks, and a written verdict. It is the video instance of Superloopy's evidence gate — usopp lanes execute it; the orchestrator records it.

**Scale it to the deliverable.** The full protocol below is for produced deliverables. On the light path (small unnarrated snippet, quick iteration), steps 1–2 plus one judged still from `frame-qa.mjs --times` suffice; skip re-QA entirely when a re-render changes nothing the last QA judged. A user-directed skip is complied with and recorded, never re-argued.

## 1. Static gates (command-backed)

```
superloopy loop prove -- npx hyperframes lint
superloopy loop prove -- npx hyperframes validate
```

Both must pass from the committed composition — not from a scratch copy.

## 2. Render

Render the final MP4 from the same committed composition. HyperFrames renders deterministically (same input → same MP4), which is what lets `superloopy loop audit` re-derive this criterion later. Render the real thing: final resolution and full duration — never QA a low-res or truncated proxy.

## 3. Frame extraction (aimed, then judged)

```
node skills/superloopy-video/scripts/frame-qa.mjs <video.mp4> \
  --storyboard STORYBOARD.md --mid --require-audio --out <evidence-root>/frames --json
```

The script parses the storyboard's `[t=…s d=…s]` beat markers, extracts a frame at each beat start (and midpoint with `--mid`), and asserts container facts: duration matches the last beat's end (±0.5s), aspect matches the brief, and — pass `--require-audio` whenever the storyboard has an audio plan — an audio stream exists (an unnarrated snippet is legitimately silent). It exits non-zero on a beat past the video's end — the signature of a truncated render. **Its JSON aims the review; it is not the verdict.**

Then open EVERY extracted frame and judge it against its beat line:

- The beat's `visual` is present and composed as storyboarded.
- All `text` is fully on screen, readable, unclipped — check CJK and descenders explicitly.
- Colors, type, spacing trace to the token contract (no orphan values that slipped past review).
- Midpoint frames show motion mid-state, not a stuck first frame (a seek-unsafe animation renders frozen).

## 4. Audio pass

- VO matches the storyboard script verbatim; captions match the VO.
- Sync check at three sampled beats: the caption and the spoken line coincide with the beat's visual.
- Music ducked under narration; no dead air over one second unless storyboarded.
- Quick silence probe: `ffmpeg -i <video.mp4> -af silencedetect=d=1 -f null -` — every reported gap must map to an intentional storyboard pause.

## 5. Verdict artifact

Write `VIDEO_QA.md` under the evidence root:

```
| Beat | t | Frame | Visual | Text | Tokens | Motion | Verdict |
| ---- | - | ----- | ------ | ---- | ------ | ------ | ------- |
```

…one row per beat with PASS/FAIL per column, followed by the audio-pass notes, the anti-slop pre-flight (every box shown, ticked or not), and the frame-qa JSON summary. A single FAIL row means the gate fails — classify it (storyboard-wrong vs implementation-drift), fix at the right layer, re-render, re-extract, re-judge. Frames are cheap; shipping a bad beat is not.

## Anti-gaming list

Reject-on-sight shortcuts — each "passes" the check by deleting the thing being checked:

- Shortening the video or cutting a scene to dodge a failing beat.
- Dropping captions, VO, or music to clear a sync or mix check.
- Replacing a seek-unsafe animation with a static frame instead of fixing seekability.
- QA-ing preview screenshots instead of frames extracted from the rendered MP4.
- Editing STORYBOARD.md after the fact so the render "matches" — storyboard changes are legitimate only before re-render, stated in the QA notes.
