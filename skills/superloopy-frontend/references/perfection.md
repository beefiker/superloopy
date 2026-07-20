# Measured Quality Gate (Perfection)

"Looks good" is subjective; this gate makes specific UI claims measurable. It has two layers: a **partial color/spacing token lint** (Superloopy-native, dependency-free) and a **real-browser Lighthouse protocol** (run via `npx`, so nothing is added to Superloopy's dependency-free `package.json`). Both produce evidence under `.superloopy/evidence/frontend/`, but neither substitutes for renderer or native-shell proof.

## Layer 1 — Partial color/spacing token lint (runnable, no deps)

Run the compatibility filename `ds-compliance.mjs` and record its result:

```
superloopy loop prove -- node skills/superloopy-frontend/scripts/ds-compliance.mjs DESIGN.md <built CSS/TSX files…>
```

It exits non-zero on any **undeclared hex color** or **off-scale spacing** (px not on the base unit; 0 and 1px allowed), with file:line. "Lighthouse 100 but 14 undeclared hex codes and 8 magic spacing values = NOT DONE." A pass proves only those two checks; it says nothing about typography, component rules, semantics, accessibility, or overall system adoption.

## Layer 2 — Lighthouse (real browser, surface-selected categories)

Select Lighthouse categories by the deployed surface. Performance, accessibility, and best practices stay applicable when Lighthouse can observe a production-equivalent browser surface. SEO applies only to a separately deployed crawlable public surface. HTML/CSS, WebView, canvas, or an embedded browser engine never makes SEO applicable by itself.

- **Choose categories before running.** For a separately deployed crawlable public surface, audit `performance,accessibility,best-practices,seo`. Otherwise omit SEO and record `SEO: N/A — reason: no separately deployed crawlable public surface exists`. If Lighthouse cannot represent the deployed client, record why and use renderer or target-native proof for that claim.
- **Measure through a real browser, never the CLI headless-shell or a dev server.** Build for production first, then audit the served build: `npx --yes lighthouse <url> --output=json --output-path=.superloopy/evidence/frontend/lighthouse.json --only-categories=<selected-categories>`. (`npx` fetches at runtime; do not add Lighthouse to `package.json`.)
- **Floor is high.** Aim 100 in every selected category; treat <90 as broken and 90-99 as work remaining. A 100 forces real fixes such as semantic HTML, contrast, focus order, ARIA, sized media (CLS), LCP, and, only when SEO was selected, public-surface metadata.
- **Discipline:** choose representative mobile and/or desktop profiles from the deployed-surface contract; run 3-5 times and take the median; parse the JSON `audits[*].score < 1` programmatically to locate offenders instead of eyeballing.
- **React:** for React projects, run `npx react-doctor@latest --json` (static render-perf scan) first and treat perf findings as blockers; optionally inject react-scan/lite to assert zero unnecessary renders.

## Anti-gaming (reject-on-sight — never weaken UX to win the number)

A metric is only as good as its ungameable-ness. These are failures, not fixes:

- Reporting a CLI/headless-shell score instead of a real-browser one, or measuring the dev server.
- Removing an animation/transition to fix INP; swapping the hero image for a placeholder to fix LCP; disabling JS for a route; `display:none` to dodge an audit.
- Declaring victory after one run, or scoring localhost without re-measuring the deployed build.

Win the score *in the architecture* (bundle splitting, hydration strategy, asset pipeline, off-main-thread work), so the page stays both fast AND fully featured.

## Evidence

Record a `PERF.md` under the evidence root summarizing: partial color/spacing token lint result, selected Lighthouse categories and applicability reasons, median scores per representative profile, the specific audits fixed, and links to `lighthouse.json`. Close with the Superloopy evidence record pointing at it. A performance claim without the artifact is inconclusive, never a pass.
