# DESIGN

## Atmosphere / Signature

This landing follows the reference source site shell: sharp editorial typography, high-contrast white/navy bands, and motion-led layouts. The intentional deviations are limited to Superloopy copy, the first viewport, proof-oriented replacement imagery, crew member illustrations, and replacement WebGL scenes where the cloned ornaments felt too close to the source brand.

## Color

- Background light: `#f0f0f0` neutral gray with a faint 56px dot grid / `--source-bg-light`
- Background navy: `#232c5b` (reference brand navy) / `--source-bg-navy`
- Loops band gradient: `#202855` to `#1e2651` / `--superloopy-loops-band-start`, `--superloopy-loops-band-end`
- Accent lilac: `#ddbef0` (timeline rail, nodes, carousel deck) / `--superloopy-lilac`
- Accent lavender: source hero and form gradient color / `--source-accent-lavender`
- Hero orbit base: `#f0f0f0` / `--superloopy-hero-bg`
- Hero orbit deep node: `#b03c78` / `--superloopy-orbit-node-deep`
- Hero badge shadow: `rgba(27, 29, 32, 0.28)` / `--superloopy-hero-badge-shadow`
- Install section cool base: `#e6eeec` / `--superloopy-command-section-bg`
- Install section paper middle: `#f5f5ee` / `--superloopy-command-section-paper`
- Install section warm edge: `#f2e0d4` / `--superloopy-command-section-warm`
- Install command surface: `#ffffff` / `--superloopy-command-card`
- Install command line: `#101217` / `--superloopy-command-line`
- Install command ink: `#101217` / `--superloopy-command-ink`
- Install command code ink: `#f7f5ef` / `--superloopy-command-code-ink`
- Install command muted: `#5f6872` / `--superloopy-command-muted`
- Install command prompt: `#8ed081` / `--superloopy-command-prompt`
- Install copy button: `#fff7e5` / `--superloopy-command-copy-bg`
- Install copy button ink: `#101217` / `--superloopy-command-copy-ink`
- Install accent: `#e8774f` / `--superloopy-command-accent`
- Start CTA base: `#101217` / `--superloopy-cta-bg`
- Start CTA lift: `#293752` / `--superloopy-cta-bg-alt`
- Start CTA accent: `#e8774f` / `--superloopy-cta-accent`
- Start CTA accent glow: `rgba(232, 119, 79, 0.42)` / `--superloopy-cta-accent-glow`
- Start CTA warm edge: `#3a261f` / `--superloopy-cta-warm`
- Start CTA border: `rgba(255, 247, 229, 0.38)` / `--superloopy-cta-border`
- Start CTA shine: `rgba(255, 247, 229, 0.24)` / `--superloopy-cta-shine`
- Start CTA shadow: `rgba(17, 25, 43, 0.22)` / `--superloopy-cta-shadow`
- Proof image wash: `#f8efe0` / `--superloopy-proof-image-bg`
- Eye scene base: `#fff0cf` / `--superloopy-eye-bg`
- Eye scene frame: `#c9f2ec` / `--superloopy-eye-frame-bg`
- Eye scene frame start: `#d6f6ee` / `--superloopy-eye-frame-start`
- Eye scene frame end: `#b4c3ff` / `--superloopy-eye-frame-end`
- Eye scene glow: `rgba(255, 255, 255, 0.76)` / `--superloopy-eye-glow`
- Eye scene soft glow: `rgba(189, 239, 232, 0.64)` / `--superloopy-eye-glow-soft`
- Eye scene shadow: `rgba(9, 11, 17, 0.16)` / `--superloopy-eye-frame-shadow`
- Eye scene progress rail: `rgba(16, 18, 23, 0.18)` / `--superloopy-eye-progress-bg`
- Loading overlay surface: `#fff0cf` / `--superloopy-loader-bg`
- Loading rail: `rgba(16, 18, 23, 0.14)` / `--superloopy-loader-rail`
- Loading rail fill: `rgba(16, 18, 23, 0.86)` / `--superloopy-loader-fill`
- Loading viewport gutter: `clamp(1.6rem, 4vw, 5.6rem)` / `--superloopy-loader-gutter`
- Loading orbit size: `min(74rem, 72vw)` / `--superloopy-loader-orbit-size`
- Loading mobile orbit size: `min(48rem, 126vw)` / `--superloopy-loader-orbit-mobile-size`
- Loading rail width: `min(34rem, 58vw)` / `--superloopy-loader-rail-width`
- Loading CTA preview width: `clamp(24rem, 27vw, 35rem)` / `--superloopy-loader-cta-width`
- Media radius: `10px` (reference card radius; captions use 8px, CTA blocks 5px) / `--superloopy-media-radius`
- Glass pane dim amount: `0.34` / `--superloopy-glass-pane-dim-amount`
- Glass pane sheen amount: `0.16` / `--superloopy-glass-pane-sheen-amount`
- Proof row surface: `#ffffff` / `--superloopy-proof-row-surface`
- Model accent: `#ff69b4` hot pink used by the ring and star WebGL scenes (legacy compiled-chunk parity)
- Install command card shadow: `rgba(18, 22, 27, 0.08)` / `--superloopy-command-card-shadow`
- Install command copy border: `rgba(255, 247, 229, 0.14)` / `--superloopy-command-copy-border`
- Install command copy inner line: `rgba(255, 247, 229, 0.08)` / `--superloopy-command-copy-inner`
- Install command copy shadow: `rgba(16, 18, 23, 0.12)` / `--superloopy-command-copy-shadow`
- Foreground dark: source computed black text / `--source-fg-dark`
- Foreground light: `#ffffff` / `--source-fg-light`
- Border: source currentColor opacity borders / `--source-border`

## Typography

- Font stack: original Next-hosted woff2 files served from `/fonts` (Astro app) and `/_next/static/media` (legacy page).
- Display: "Superloopy Display" = Unbounded (400 `7fc63d81`, 500 `c610bdeb`, 700 `5efb1f4c`), matching reference fontSecondary.
- Body: "Superloopy Text" = Helvetica Neue LT Pro (400 `edfa2454`, 500 `0ce88599`), matching reference fontPrimary; body/labels are 16px/1.2, labels uppercase 500.
- Display tracking: hero/band titles `-0.07em` / `--superloopy-display-tracking`; sentence headings `-0.04em` / `--superloopy-heading-tracking`; sub-headings `-0.02em`.
- Footer CTA title size: `clamp(6.4rem, calc(4.8rem + 2.15vw), 7.95rem)` capped by `6.25vw` / `--superloopy-footer-title-size` and `--superloopy-footer-title-desktop-cap`
- Footer CTA title mobile size: `clamp(3.4rem, 10.6vw, 7.6rem)` / `--superloopy-footer-title-mobile-size`
- Footer CTA mobile top clearance: `7.2rem` / `--superloopy-footer-mobile-top-clearance`
- Footer CTA link size: `clamp(1.9rem, calc(1.25rem + 1.25vw), 2.75rem)` capped by `2.05vw` / `--superloopy-footer-link-size` and `--superloopy-footer-link-desktop-cap`
- Footer CTA link mobile size: `clamp(1.5rem, 4.5vw, 2.35rem)` / `--superloopy-footer-link-mobile-size`
- Loading brand size: `clamp(2rem, 2.6vw, 3.2rem)` / `--superloopy-loader-brand-size`
- Loading hero preview title size: `clamp(5.6rem, 10.2vw, 12.4rem)` / `--superloopy-loader-headline-size`
- Loading hero preview title mobile size: `clamp(4.4rem, 14.2vw, 6.4rem)` / `--superloopy-loader-headline-mobile-size`

## Spacing

- Spacing scale: original utility classes and CSS bundles are preserved verbatim.
- Container/gutters: source `.container` rules from `/_next/static/css`.
- Section rhythm: source `pt-*`, `pb-*`, grid, and gap utility classes are preserved in the DOM.

## Components

- Header/menu: original server-rendered DOM, CSS, and Next runtime chunks, with one compact EN/DE/KR/ES locale control, GitHub icons for social links, and a plain GitHub text link injected after hydration.
- Hero: original split heading spans, CTA, and scroll cue, with the first-section video layer hidden and replaced by the vendored `landing-orb` WebGL iframe. The original lavender whirl is replaced by the supplied transparent Superloopy badge image at `/assets/superloopy-hero-badge.png`.
- Start CTA: original button DOM with a dark ink base, warm accent light, subtle shine pass, and preserved arrow affordance.
- Orbit loader: a full-viewport warm hero preview with Superloopy wordmark, ghosted first-viewport headline, oversized CSS-only orbit, CTA skeleton, and one indeterminate linear rail. It appears immediately, clears after the orbit iframe load event, and falls back to a timed dismiss so users never get trapped.
- Content sections: original CMS image blocks, cards, counters, case metrics, and step list, rewritten where visible copy needs to describe Superloopy.
- Crew imagery: cloned person imagery is swapped after hydration for local crew member assets under `/crew`, cropped to fill the media frame instead of floating inside it.
- Proof imagery: the four feature cards use generated, non-person images for evidence receipts, skill lanes, visible progress, and the final gate.
- Eye scene: the steps section embeds `/eye.html`, a host page that runs the vendored WebGL runtime pinned to the biology eye composition (the exact reference eye: teal ball, iris fibers, hex shell). The parent drives it over postMessage (`superloopy-eye-motion` progress + pointer); the host feeds Lenis synthetic wheel deltas through captured handlers with a closed-loop correction on the biology section rect. A rendered preview image stays as the fallback until the iframe reports ready.
- Dead proof link: the `/proof` open-proof CTA is hidden because the static clone has no proof page to open.
- Install command section: the original partner form DOM is replaced after hydration with two terminal-style command cards for Codex and Claude Code, each with a right-side copy button wired to the clipboard.
- FAQ/footer: original DOM and runtime interactions, with the final CTA title and GitHub URL sized as separate responsive territories so the two-column desktop footer does not collide.

## Motion

- Original Next runtime and bundled animation code are retained outside the first hero media layer.
- GLTF/GLB models under `/models` and `/webgl/models` are mirrored locally so the original runtime (orbit hero and eye host page) can draw from local assets. The eye host maps section scroll progress to the runtime's own biology scroll animation, with pointer movement forwarded into the runtime pointer store. Both iframes pause offscreen.
- Orbit loader motion uses transform and opacity only across the scan line, orbit ring, core pulse, nodes, and rail. Reduced-motion switches the loader to a static filled state.
- The Astro site's crew glass scene is a first-party WebGL canvas (no iframe): six textured panes in a mosaic with pointer tilt parallax, hover brightening, and a slow specular sheen. It mounts on intersection, pauses its frame loop offscreen, caps device pixel ratio at 2, and keeps the static pane grid as the reduced-motion and no-WebGL fallback.
- The Astro site's loops-band gyroscope (circles.gltf) and footer star (star.gltf) are three.js ports of the reference scenes: same MeshStandardMaterial parameters, ambient + front/back point lights, GLTF cameras (zoom 1.35/1.0), and the legacy pink palette (`ambient #df1178, base #ff69b4, points #96647f/#fba7d4`). The gyroscope scrubs its baked GLTF clip with scroll (ScrollTrigger scrub); the star plays its clips continuously. Frame loops pause offscreen; reduced motion renders a still frame.
- Page motion is the reference system verbatim: Lenis smooth scroll feeding ScrollTrigger, masked line reveals on display copy (`.line-w > .line`, from yPercent 110 to 0, stagger 0.15, 1.1s power3.out, start "top bottom-=5%"), staggered fades on content blocks (0.1 stagger, 1.2s power2.out, start "top bottom-=10%"), a scroll-scrubbed lilac timeline fill, and the case-deck carousel (scale 1-0.075t, x -20t px, yPercent 110 in/out at power2.inOut). Reduced motion skips Lenis and all reveal tweens.

## Depth

- Depth comes from the original page plus targeted Superloopy layers: WebGL orbit/eye scenes, flat editorial cards, generated proof boards, crew image blocks, and source CSS shadows/borders.
- New styling is constrained to documented Superloopy tokens above.
