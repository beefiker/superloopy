# Anti-slop rules for video

AI-generated video is recognizable because models converge on the same defaults and ship the first render unwatched. These rules name the defaults, make quality countable, and end in a pre-flight checklist. They bind every scene the orchestrator or a franky lane produces; zoro reviews against them; the pre-flight blocks the gate.

These rules govern **defaults, not the user**. When the user explicitly asks for something a rule bans (uniform cuts as a style, constant pacing, a text-heavy scene), flag the trade-off in one line, follow the user, and note the choice in the QA notes — a rule invoked against an explicit instruction is drift, not discipline.

## Named-default bans (reject on sight)

1. **The template title card** — product name centered in a default sans over a purple/indigo gradient. Title cards use the token contract's canvas, type, and accent like every other scene.
2. **Uniform cut grammar** — the same fade or zoom on every transition ("Ken Burns everything"). Transition choice follows the narrative: hard cut for energy, motion-matched for continuity, one signature transition used sparingly.
3. **Constant pacing** — every beat the same length. Beat durations must vary at least 2× between the shortest and longest; a hook beat and an explainer beat are not the same size.
4. **Motion unsynced to audio** — animation that ignores the music's grid or the VO's phrasing. When music drives, moves land on bars; when narration drives, text appears with its spoken line, not before or after.
5. **Wall-of-text scenes** — a paragraph on screen while VO reads something else. Text on screen is a headline, a stat, or a label; the VO carries sentences.
6. **Renderer-default captions** — unstyled captions in the engine's fallback font. Caption type, size, and placement trace to the token contract and survive the smallest destination screen.
7. **Emoji as icons; stock-glyph confetti** — same ban as superloopy-frontend: use the contract's icon language or none.
8. **Dead air** — more than one second with no VO, no music movement, and no visual change, unless the storyboard marks the pause intentional.
9. **The stopped ending** — video ends mid-energy with no close. The last beat is a CTA or a resolution, storyboarded like any other beat.
10. **Layout-property animation** — animating width/height/top/left. Motion is transform/opacity/filter only; it must be seek-safe or the deterministic render will expose it.

## Countable rules

- Hook within the first 2 seconds — something moves, lands, or asks a question.
- At least 3 distinct scene layouts per 30 seconds; no layout used twice in a row.
- ONE accent color across the whole video; canvas and ink from the contract.
- Any text on screen stays readable for at least `max(1.5, chars/15)` seconds.
- All beat timings sit on the storyboard grid (multiples of 0.25s, or musical bars when music-driven).
- Two type faces maximum, sizes only from the contract's scale.
- Music ducks at least 6dB under narration; VO never fights the mix.

## Consistency locks

- Every color, face, size, spacing, easing, and duration traces to the storyboard's token contract — improvised values are drift even when they look good.
- One motion vocabulary: the same named easings and duration steps everywhere; a new easing is a contract change first.
- Scene-to-scene continuity: recurring elements (wordmark, captions, lower thirds) hold position and style across beats.

## Pre-flight checklist

Run before the gate; any unticked box is a fail:

- [ ] No named-default ban above is present in the final render.
- [ ] Hook lands within 2 seconds; close beat exists.
- [ ] Beat durations vary ≥2×; all timings on the grid.
- [ ] Every on-screen text meets the readability floor at the destination's smallest screen.
- [ ] One accent; two faces max; all values trace to the contract.
- [ ] Motion is transform/opacity/filter only and beat/VO-synced.
- [ ] Captions styled from tokens and in sync at three sampled beats.
- [ ] No dead air over one second unless storyboarded.
