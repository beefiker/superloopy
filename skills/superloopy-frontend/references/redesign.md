# Redesign Protocol

Greenfield rules applied to a living site are how redesigns go wrong: the model overwrites a working brand with its own taste, breaks SEO, and silently renames things analytics depends on. A redesign is evidence-first work — audit what exists, classify the mode, then change the least that satisfies the brief.

## Mode detection (first action)

- **Greenfield** — no existing site, or a full restart is explicitly approved. Normal skill flow applies.
- **Preserve** — modernize without breaking the brand. Audit first, extract the existing tokens into DESIGN.md, evolve gradually.
- **Overhaul** — new visual language over existing content. Treat visuals as greenfield; preserve content and information architecture.

If the mode is ambiguous, ask exactly once: *"Should this redesign preserve the existing brand, or start visually from scratch?"* Misclassifying the mode is the single biggest source of bad redesign output.

## Audit before touching (recorded as evidence)

Write `REDESIGN_AUDIT.md` under the evidence root before proposing changes, covering:

- **Brand tokens** — primary/accent colors, type stack, logo treatment, radii. These seed DESIGN.md; in preserve mode they *are* the token contract's starting values.
- **Information architecture** — page tree, primary nav, key conversion paths.
- **Content blocks** — what exists, what is doing work, what is filler.
- **Patterns to preserve** — signature interactions, a recognizable hero, the copy voice.
- **Patterns to retire** — anti-slop tells, broken layouts, dead links, generic stock imagery, performance traps.
- **Dial reading of the existing site** — infer its current `DESIGN_VARIANCE` / `MOTION_INTENSITY` / `VISUAL_DENSITY`; that reading, not the greenfield baseline, is the starting point.
- **SEO baseline** — ranking pages, meta titles, structured data, OG cards. Losing rankings is the #1 redesign risk.

## Preservation rules

- **Information architecture stays** unless the user asks: page slugs, anchor IDs, and primary nav labels remain stable for SEO and muscle memory.
- **Extract brand colors before applying the anti-slop palette bans.** A brand that is already purple stays purple — that is the named override path, not a violation.
- **Copy voice is preserved** unless a rewrite is requested; visual modernization is not a content rewrite.
- **Existing accessibility wins never regress** — focus states, alt text, keyboard nav, contrast.
- **Analytics contracts hold** — do not rename buttons, form fields, or section IDs that downstream tracking depends on.

## Never change silently (explicit user approval required)

URL structure and route slugs; primary nav labels; form field names or order (breaks analytics and autofill); the brand logo or wordmark; legal, consent, and cookie copy.

## Modernization levers (apply in order, stop when the brief is satisfied)

1. **Typography refresh** — the biggest visual lift per unit of risk.
2. **Spacing and rhythm** — section padding, vertical rhythm.
3. **Color recalibration** — desaturate, unify neutrals, keep the brand accent.
4. **Motion layer** — dial-appropriate micro-interactions on existing components (`references/motion.md`).
5. **Hero and key-section recomposition** — restructure the top of the funnel.
6. **Full block replacement** — only when a block is unsalvageable.

## Decision tree

- IA, content, and SEO are sound → **targeted evolution** (levers 1–4): most of the value at a fraction of the risk.
- Visual debt is structural (broken IA, no design system, broken mobile) → **full redesign** with strict content preservation.
- The brand itself is changing → treat as **greenfield**.

Completion still runs the full skill gates: DESIGN.md contract (seeded from the audit in preserve mode), anti-slop pre-flight, real-browser visual QA at all breakpoints, and the evidence record — plus `REDESIGN_AUDIT.md` proving the before-state was read, not guessed.
