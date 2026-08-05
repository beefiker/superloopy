# Impeccable Frontend A/B/C Evaluation Design

Date: 2026-08-05

## Goal

Evaluate three frontend-authoring instruction sets on the same greenfield product landing page and produce reproducible visual evidence:

- **A — Superloopy:** the released `superloopy-frontend` skill at Superloopy revision `872caa620ae0c3a22174bd230c0699ef14b24acd`.
- **B — Impeccable:** the released Impeccable skill version `4.0.4` at upstream revision `ae5e95101a6979e7f7973a4ff57680b3c7adc1ec`.
- **C — Combined candidate:** Superloopy Frontend plus a narrow, attributed Impeccable reference with explicit ownership boundaries.

The experiment must show the actual rendered differences, not merely compare instruction text. The winner is the strongest balanced product result across distinctiveness, clarity, responsiveness, accessibility, and implementation integrity.

## Hypothesis

Superloopy should provide the strongest platform routing, product truth, responsive behavior, accessibility, and evidence discipline. Impeccable should provide stronger visual direction and refinement vocabulary. A bounded combination should retain Superloopy's engineering guarantees while improving visual specificity and composition.

The experiment may reject that hypothesis. Arm names and detector output must not influence the neutral score.

## Upstream Reference and License

- Repository: https://github.com/pbakaus/impeccable
- Reviewed revision: `ae5e95101a6979e7f7973a4ff57680b3c7adc1ec`
- Reviewed skill release: `4.0.4`
- License: Apache-2.0

Any Impeccable material added to Superloopy must preserve required attribution and identify the pinned source revision. The candidate will borrow only the concepts required by this design, not vendor the upstream CLI, hooks, live-project injection, dependency tree, or entire skill package.

## Experimental Product

All three arms build **Threadmark**, a fictional local-first research workspace with the promise **“Every claim keeps its trail.”** The page targets researchers who need notes, sources, and conclusions to remain visibly connected.

### Fixed page content

Each result must contain the same semantic content:

- Brand: `Threadmark`
- Eyebrow: `Local-first research workspace`
- Headline: `Every claim keeps its trail.`
- Supporting copy: `Capture sources, connect evidence, and write with a visible path back to the original material.`
- Primary action: `Start a workspace`
- Secondary action: `See the evidence flow`
- Product proof heading: `From source to sentence, without losing context.`
- Three capabilities:
  - `Capture the source` — `Save the page, passage, and your first reaction together.`
  - `Connect the evidence` — `Link supporting and conflicting material to the claim it informs.`
  - `Write with traceability` — `Move from notes to prose while every citation stays one step away.`
- Workflow labels in order: `Source`, `Evidence`, `Claim`, `Draft`
- Trust statement: `Your workspace stays local. Export it whenever you want.`
- Final action: `Build your first trail`

No arm may invent users, testimonials, customer logos, usage statistics, awards, pricing, or security certifications. Decorative microcopy may be added only when it does not introduce a product claim or change task scope.

### Fixed implementation constraints

- Static HTML, CSS, and JavaScript only.
- No dependencies, remote assets, analytics, network calls, build step, or framework.
- The deliverable must work from a local static server.
- Semantic landmarks and heading order are required.
- All interactive controls must work with keyboard input and expose visible focus.
- The page must not overflow horizontally at either test viewport.
- `prefers-reduced-motion: reduce` must preserve a complete, legible layout without essential motion.
- Each result must include one meaningful interaction for the evidence-flow explanation; the implementation may differ, but the fixed workflow labels and meaning may not.

## Fair-Run Contract

Each arm runs in a new empty directory. A common harness supplies the exact product brief, fixed content, constraints, model/profile, execution environment, iteration budget, and completion request. The only experimental variable is the frontend instruction set.

The run manifest records:

- Superloopy and Impeccable revisions;
- the combined candidate revision;
- model and reasoning profile;
- complete shared prompt plus arm-specific instruction reference;
- start and finish timestamps;
- command exit status;
- changed-file inventory;
- validation and screenshot results.

No arm may read another arm's generated site. The evaluator may read all completed sites only after generation has ended. A failed run remains a result and is not silently regenerated. One rerun is allowed only for an environmental failure unrelated to the instructions, and its reason must appear in the manifest.

## Arm Definitions

### A — Current Superloopy Frontend

Use the packaged `superloopy-frontend` skill at the pinned base revision without candidate edits. Its current explicit-activation, stack-preservation, Web/Qt/native/hybrid/renderer routing, accessibility, responsive, and proportional-evidence contracts remain intact.

This arm is generated before the candidate skill is modified. Its instruction snapshot and output are retained so later repository changes cannot contaminate it.

### B — Released Impeccable

Use Impeccable skill `4.0.4` from the pinned upstream revision. Do not activate the Impeccable CLI, project hooks, or live tooling. This isolates the authored skill instructions from optional runtime injection and keeps the no-dependency constraint.

### C — Combined Candidate

Use the candidate `superloopy-frontend` skill plus a local, pinned Impeccable reference. Ownership is explicit:

- **Superloopy owns:** activation, platform and renderer routing, existing-stack preservation, user and product truth, responsive and accessibility requirements, dependency approval, evidence proportionality, and completion criteria.
- **Impeccable informs:** visitor mode, visual direction, typography, composition, hierarchy, interaction character, and a bounded refinement pass.

When guidance conflicts, Superloopy and the user's explicit brief win. Impeccable may deepen presentation but may not broaden scope, change the platform, invent product facts, add a dependency, require root-level product/design authority files, inject production comments, install hooks, or turn advisory taste preferences into universal bans.

The candidate adds a two-pass visual workflow:

1. **Direction pass:** identify visitor mode, content hierarchy, visual thesis, typography/composition strategy, and interaction character before implementation.
2. **Refinement pass:** after functional and responsive truth exists, inspect hierarchy, spacing rhythm, typography, color/contrast, interaction feedback, and generic-pattern residue. Apply only improvements supported by the brief and rendered result.

The second pass is bounded. It cannot replace required validation or trigger an open-ended redesign loop.

## Candidate Change Boundary

Implementation may change only the narrow skill/reference, packaging, documentation, and tests needed to expose the combined behavior. It must not change unrelated Superloopy routing or completion logic and must not add a package dependency.

Behavioral tests are written first. They must demonstrate that a fresh frontend run using C:

- states the visitor mode and visual direction before implementation;
- preserves Superloopy's platform and stack ownership;
- performs one bounded refinement pass after functional truth;
- treats imported taste guidance as contextual rather than absolute;
- keeps accessibility, responsive evidence, and completion checks mandatory;
- attributes the pinned upstream source.

Existing contract tests may supplement but not replace behavior-level evidence.

## Visual Evidence

Each arm produces deterministic captures at:

- desktop: `1440 × 1000` CSS pixels;
- mobile: `390 × 844` CSS pixels.

The browser environment, device scale factor, browser version, font availability, color scheme, reduced-motion setting, page-ready condition, and screenshot delay are identical across arms and recorded. Screenshots must use the same full-page or clipped-canvas policy for every arm.

Outputs include:

- six primary screenshots: A/B/C at desktop and mobile;
- a local side-by-side comparison page with arm labels and viewport labels;
- pairwise pixel-difference measurements for A↔B, A↔C, and B↔C at each viewport;
- machine-readable validation and scoring records;
- a human-readable experiment report with the direct winner and rationale.

Pixel difference demonstrates that outputs differ; it does not measure design quality and is excluded from the winner score.

## Functional and Browser Checks

The common evaluator verifies each arm independently:

- required fixed copy and workflow order are present;
- the evidence-flow interaction works with pointer and keyboard input;
- focus is visible on every interactive control;
- landmarks, accessible names, heading structure, and document language are present;
- no horizontal overflow exists at either viewport;
- no uncaught page error or failed local resource request occurs;
- reduced-motion mode preserves content and interaction meaning;
- all assets are local and the page makes no external request.

A check that cannot be automated is marked for explicit manual review rather than assumed to pass.

## Neutral Scorecard

The evaluator scores each category from 0–5 using arm-blind screenshots and browser evidence where practical. Total score is the weighted sum out of 100:

- **Distinctiveness — 20%:** coherent, product-specific visual thesis; avoids generic template residue.
- **Clarity — 25%:** immediate promise, readable hierarchy, understandable evidence flow, and clear actions.
- **Responsiveness — 20%:** intentional desktop/mobile composition with no clipped, crowded, or orphaned content.
- **Accessibility — 20%:** semantic structure, contrast, keyboard/focus quality, motion preference handling, and interaction meaning.
- **Implementation integrity — 15%:** functional interaction, valid local implementation, no forbidden claims/resources, and clean browser execution.

Every score requires a short observation tied to a screenshot or browser result. Critical contract failures are also reported separately and cannot be hidden by a high aesthetic score. The direct winner is the highest total among arms without a critical failure. A tie within two points is reported as a practical tie and resolved by the higher clarity score, then accessibility score.

Impeccable's deterministic detector runs separately against each result. Its findings appear as diagnostic context only and never contribute points, penalties, or tie-breaks because the detector encodes one arm's design preferences. Findings with advisory severity remain advisory in this experiment even if upstream formatting counts them as failures.

## Execution Sequence

1. Verify the clean pinned Superloopy worktree and run the existing test suite.
2. Snapshot the A instructions and run A in an empty directory.
3. Add failing behavior tests for the combined contract and record the RED result.
4. Add the smallest candidate reference, attribution, skill integration, and documentation required for C.
5. Run the focused tests to GREEN, then the full relevant repository gate.
6. Snapshot the B and C instructions and run each in its own empty directory.
7. Serve each result locally and run common browser validation and screenshots.
8. Generate the comparison page, pixel differences, detector report, scorecard, and direct verdict.
9. Verify artifact completeness and repository cleanliness before handoff.

## Failure Handling

- Missing browser or Codex execution capability is reported as a blocker with the completed artifacts retained.
- A generation timeout or non-zero exit is recorded; partial output is not promoted to a complete result.
- Environmental reruns preserve the first attempt and explanation.
- Screenshot or validation failure for one arm does not erase successful evidence for the others.
- Evaluator defects are fixed once in the shared harness and all arms are re-evaluated from unchanged output.
- No generated result is manually polished after the fresh run.

## Deliverable Location and Repository Hygiene

Committed experiment code and durable reports live under repository-owned test, script, documentation, and evidence paths following existing patterns. Large transient browser profiles, local servers, dependency caches, and intermediate captures stay ignored. The report links exact files and records which artifacts are committed versus local-only.

The feature work remains on `codex/impeccable-frontend-abc` in an isolated worktree. It is not pushed or merged without separate authorization.

## Non-Goals

- Replacing Superloopy's frontend routing model.
- Shipping the Impeccable CLI or its dependency tree.
- Declaring one landing page a universal benchmark for either project.
- Testing conversion, retention, or real-user preference without actual participants.
- Adding analytics or deploying the generated pages.
- Treating pixel difference, detector findings, or visual novelty alone as product quality.

## Acceptance Criteria

- A, B, and C are generated from the same fixed product contract with only the instruction set varied.
- C has a tested, documented, attributed, and bounded integration boundary.
- No dependency is added and existing frontend routing remains intact.
- Six required screenshots and a side-by-side comparison page exist.
- Common browser checks, pairwise differences, neutral scores, detector context, and a direct verdict are recorded.
- The exact revisions, prompts, commands, and outcomes are reproducible from the manifest.
- The smallest relevant tests and the repository's full relevant gate pass before completion is claimed.
