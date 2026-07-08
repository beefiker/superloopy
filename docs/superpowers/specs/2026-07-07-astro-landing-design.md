# Astro Landing Design

## Goal

Replace the current exported landing page shell with an Astro static site that preserves the Superloopy identity, renders quickly on mobile, and deploys to Cloudflare Pages from `site/dist`.

## Architecture

The Astro app lives under `site/` so the Superloopy CLI package remains separate. Astro renders the landing page as static HTML with no React or Next runtime. The only client-side JavaScript is a small page script for the loader, copy buttons, and lazy-loading the orbit iframe after the static fallback is visible.

## Visual Direction

Reading this as a developer-tool landing page for Codex and Claude Code users: sharp editorial, dense proof language, navy/cream contrast, visible product mechanics, and real generated proof imagery. DESIGN_VARIANCE 6, MOTION_INTENSITY 5, VISUAL_DENSITY 7.

## Content

The first shipped Astro page includes:

- Header with GitHub link and locale labels.
- Hero with immediate CSS orbit fallback and lazy vendored orbit iframe.
- Proof cards for evidence, skill lanes, visible progress, and final gate.
- Glass pane crew lane using real local pane assets, not a remote app iframe.
- Install section with Codex and Claude Code command cards.
- Footer CTA with balanced responsive title and GitHub URL.

## Assets

Static images that need optimization live under `site/src/assets`. Astro `Picture` components generate responsive modern formats for the proof and pane imagery. Runtime assets required by the orbit iframe live under `site/public`, copied from the existing `web/` reference.

## Deployment

Cloudflare Pages receives `site/dist` through Wrangler direct upload. The old `web/` folder remains as a reference and rollback artifact until the Astro version has been verified. The Astro site is isolated under `site/` and uses Node `>=22.12.0`; the root Superloopy CLI package remains Node 20 compatible.

## Validation

- Root Node tests check the Astro source contract.
- `npm install` and `npm run build` run inside `site/`.
- Browser screenshots cover 390, 768, and 1280 px.
- Superloopy records command-backed evidence for build and visual QA.
