---
name: loopy-clone
description: Use when the user asks for Loopy clone or asks to clone, rebuild, reverse-engineer, replicate, or copy a website or page into a Loopy-governed implementation. Triggers on "loopy clone", target URLs plus requests such as "clone this site", "rebuild this page", "make a copy of this website", "pixel-perfect clone", or "AI website clone". Requires browser automation and records component specs, assets, implementation, build output, and visual QA as Loopy evidence.
---

# Loopy Clone

Reverse-engineer a target URL into a working local implementation with audit artifacts. Use this only for authorized cloning, migration, learning, or recovery work. Do not help with phishing, deceptive impersonation, credential capture, or evading a site's terms.

## Loopy Contract

- Create or reuse a Loopy plan. Use an evidence root like `.loopy/evidence/website-clone/<hostname>/`.
- Preserve extraction artifacts: screenshots, topology, behavior notes, component specs, asset inventory, validation output, and visual QA notes.
- Record final proof with `LOOPY_EVIDENCE: <path-under-active-evidence-root>` when a worker is involved, or `loopy loop evidence` when recording from the parent.
- Do not add dependencies without asking. If a clone needs a package for parity, explain why and get approval first.

## Preflight

1. Verify browser automation is available. Prefer Chrome or Playwright-style tools. If none are available, ask for a browser tool before proceeding.
2. Normalize and validate each target URL. Confirm the page loads.
3. Inspect the local app stack and existing commands before editing. Run the smallest existing check that proves the baseline, such as `npm run build`, `npm run typecheck`, or `npm test`.
4. Create research folders if needed: `docs/research/`, `docs/research/components/`, `docs/design-references/`, and the Loopy evidence root.
5. State authorization assumptions if the target is a third-party site.

## Phase 1 - Reconnaissance

Capture the original before building:

- Full-page desktop screenshot at about 1440px.
- Mobile screenshot at about 390px.
- `PAGE_TOPOLOGY.md` listing sections from top to bottom, fixed layers, z-index relationships, and each section's interaction model.
- `BEHAVIORS.md` from scroll, click, hover, time, and responsive sweeps.
- `DESIGN_TOKENS.md` with fonts, colors, spacing, radii, shadows, animation timings, and global page behavior.
- `ASSETS.md` listing images, videos, background images, SVGs, favicons, fonts, and local target paths.

Use computed styles, DOM inspection, and real assets. Do not estimate colors, spacing, text, or breakpoints when the browser can provide them.

## Phase 2 - Foundation

Build the shared foundation before sections:

- Fonts and metadata.
- Global CSS tokens and keyframes.
- Shared icon components from extracted SVGs.
- Content/type shapes for repeated section data.
- Downloaded assets under the project's existing public asset structure.

Run the relevant build or typecheck after the foundation change and save the output under the Loopy evidence root.

## Phase 3 - Component Specs

Before building each section, write a component spec at `docs/research/components/<component>.spec.md`. The spec is the contract for implementation and must include:

- Target component file.
- Screenshot path.
- DOM structure.
- Exact computed styles for the container and important children.
- Interaction model: static, click-driven, scroll-driven, hover-driven, time-driven, or mixed.
- States and behaviors, including trigger, before/after values, transition, and implementation approach.
- Real text content.
- Assets with local paths.
- Responsive behavior for desktop, tablet, and mobile.

If a spec grows beyond one focused component, split it. Builders should not guess.

## Phase 4 - Build

Implement one bounded section or component at a time. For parallel workers, send the full spec inline with:

```text
TASK: build <component> from this spec.
TARGET: <file path>
SCOPE: only this component and directly required local assets.
VERIFY: run the focused typecheck/build command.
DELIVERABLE: report artifact under <active evidence root> and end with LOOPY_EVIDENCE: <artifact>.
```

After each merge or parent implementation pass:

- Run the focused validation command.
- Fix type, lint, or build errors immediately.
- Record the output as evidence.

## Phase 5 - Assembly

Wire sections into the page after their components pass local validation:

- Preserve the page topology from `PAGE_TOPOLOGY.md`.
- Implement page-level scrolling, sticky layers, section transitions, and responsive layout.
- Keep real content and assets connected through props or local data.
- Run the project build or closest available full check.

## Phase 6 - Visual QA

Do not declare completion after the build alone. Compare original and clone:

- Desktop screenshot comparison.
- Mobile screenshot comparison.
- Scroll, click, hover, and timed behavior checks.
- Section-by-section discrepancy list.

For every mismatch, decide whether extraction was wrong or implementation drifted. Re-extract, update the spec, and fix the component. Save `VISUAL_QA.md` under the evidence root.

## Completion Report

Report:

- Target URLs.
- Sections built.
- Components created or changed.
- Spec files written.
- Assets downloaded or recreated.
- Validation commands and results.
- Visual QA result and remaining gaps.
- Final Loopy evidence artifact.
