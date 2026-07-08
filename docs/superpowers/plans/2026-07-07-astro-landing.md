# Astro Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a fast Astro static landing page for Superloopy.

**Architecture:** Add an isolated `site/` Astro app. Keep static content server-rendered, use Astro image assets for generated images, and keep only the hero orbit as a lazy client visual island.

**Tech Stack:** Astro 7.0.6, Node 22.12.0 for the site build, TypeScript-free Astro components, CSS through a single global stylesheet, Cloudflare Pages direct upload.

## Global Constraints

- Keep the root Superloopy CLI package dependency surface unchanged.
- Keep `site/` on Node `>=22.12.0`; the root CLI package remains Node 20 compatible.
- Do not delete `web/`; it remains the legacy reference.
- Every new visible design value must trace to `DESIGN.md`.
- No runtime Next or Nuxt chunks in the Astro page HTML.
- Validate with tests, build, browser screenshots, and Superloopy proof commands.

---

### Task 1: Astro Contract Tests

**Files:**
- Modify: `test/web-orbit-shell.test.js`

**Interfaces:**
- Produces: root test coverage for the new Astro app source contract.

- [x] Add tests that fail before `site/` exists.
- [x] Run `node --test test/web-orbit-shell.test.js` and confirm failure.

### Task 2: Astro Project Skeleton

**Files:**
- Create: `site/package.json`
- Create: `site/astro.config.mjs`
- Create: `site/src/pages/index.astro`
- Create: `site/src/styles/global.css`
- Create: `site/src/scripts/landing.js`

**Interfaces:**
- Produces: `npm run build` in `site/` writes static output to `site/dist`.

- [ ] Add Astro 7.0.6 package metadata and scripts.
- [ ] Configure static output and responsive image styles.
- [ ] Build the first static page with real sections and no framework runtime.
- [ ] Add a small script for loader dismissal, copy buttons, and lazy orbit iframe.

### Task 3: Assets

**Files:**
- Create: `site/src/assets/generated/*`
- Create: `site/src/assets/panes/*`
- Create: `site/public/orbit.html`
- Create: `site/public/models/*`
- Create: `site/public/_nuxt/*`
- Create: `site/public/favicon/*`

**Interfaces:**
- Consumes: existing local assets from `web/`.
- Produces: assets reachable from the Astro build and runtime iframe.

- [ ] Copy only the image and orbit assets the Astro page uses.
- [ ] Keep obsolete `_next` chunks out of `site/public`.

### Task 4: Validation and Deploy

**Files:**
- Create: `.superloopy/evidence/frontend/20260707-astro-landing/VISUAL_QA.md`
- Create: `.superloopy/evidence/frontend/20260707-astro-landing/PERF.md`

**Interfaces:**
- Consumes: built `site/dist`.
- Produces: verified Cloudflare Pages deployment.

- [ ] Run root focused tests and full tests.
- [ ] Run `npm install` and `npm run build` in `site/`.
- [ ] Serve `site/dist` locally and capture mobile, tablet, and desktop screenshots.
- [ ] Deploy `site/dist` to Cloudflare Pages.
- [ ] Verify `superloopy.dev` serves the Astro build.
