# Qt Frontend Support Design

## Goal and Scope

Resolve [issue #25](https://github.com/beefiker/superloopy/issues/25) by extending `superloopy-frontend` to C++ Qt 6 desktop interfaces built with Qt Widgets, Qt Quick/QML, or both. Preserve the current web workflow, the detected application stack, and explicit activation.

Modify the existing skill instead of adding a separate Qt skill. Shared design, token, routing, and evidence contracts stay in one place; platform-specific guidance is loaded only when needed. Qt 5, Python bindings, mobile/MCU guidance, a generic Qt linter, and cross-platform pixel identity remain out of scope.

Plain `Qt`, `QML`, `Widgets`, `UI`, or `frontend` vocabulary remains inert. The skill starts only through direct invocation, a leading explicit `loopy`/`루피` visual task, or routing from an active Superloopy loop.

## Router

After activation, inspect the repository for the UI stack, declared minimum Qt version, target platform, existing styling, design tokens, and available validation. Ask one narrow question only when repository evidence cannot resolve a material ambiguity.

| Surface | Load | Exclude |
| --- | --- | --- |
| Web | `web.md` and current web references | No behavior change |
| Qt Widgets | `qt.md`, `qt-widgets.md`, `qt-qa.md` | CSS compliance, Lighthouse, React Doctor, browser breakpoints |
| Qt Quick/QML | `qt.md`, `qt-quick.md`, `qt-qa.md` | CSS compliance, Lighthouse, React Doctor, browser breakpoints |
| Mixed Widgets/QML | Both Qt implementation references and `qt-qa.md` | Validate both surfaces and their embedding boundary |
| Mixed web/Qt | Route each requested surface independently | Never substitute one platform's gate for another |

Every reference is linked directly from `SKILL.md` so agents load only the selected platform guidance.

## File Ownership

- `SKILL.md`: activation, repository inspection, router, shared DESIGN.md/evidence contracts, and platform-neutral completion rules.
- `references/web.md`: existing browser build, visual-QA, compliance, Lighthouse, and performance workflow.
- `references/qt.md`: shared Qt platform, token, version, accessibility, localization, and high-DPI rules.
- `references/qt-widgets.md`: Widgets styling strategies and implementation rules.
- `references/qt-quick.md`: Controls/QML styling and implementation rules.
- `references/qt-qa.md`: native build, test, capture, and completion rules.

Update skill metadata, user-facing skill rows, package/audit inventories, and focused tests without adding dependencies.

## Shared Qt Contract

- `DESIGN.md` owns application-defined semantics; system palette, native style, platform fonts/metrics, and accessibility preferences remain runtime authorities.
- Existing architecture owns implementation boundaries. Target-platform behavior and accessibility are constraints. Product conventions lead app-owned appearance; brand references are inspiration only.
- Use official documentation matching the project's minimum Qt version. Newer APIs require a fallback or an explicit boundary; preview APIs are never the default.
- Do not run the CSS-oriented `ds-compliance.mjs` against C++ or QML. Qt evidence records the token adapter, changed surfaces, and visual findings instead.

## Qt Widgets Contract

Choose one dominant approach:

1. system `QStyle` and `QPalette`, with narrow proxy overrides;
2. an explicit base style with controlled proxy style, delegates, or custom painting;
3. documented QSS when the project is already QSS-led and the affected subtree has no conflicting custom style.

QSS is not “colors only,” but the same subtree must not be both QSS-led and custom-`QStyle`/`QProxyStyle`-led.

The Widgets reference must require scalable layouts and size hints; palette and interaction states with visible keyboard focus; accessible custom painting with matching paint/hit-test geometry; delegates for dynamic item-view content; native chrome unless intentionally owned; and high-DPI, font fallback, CJK, RTL, emoji, and enlarged-font checks.

## Qt Quick/QML Contract

Prefer standard Qt Quick Controls and preserve the selected style. Runtime style selection must happen before loading QML that imports Qt Quick Controls; compile-time style selection remains separate. An intentional custom style uses `QtQuick.Templates` and an appropriate fallback.

Reuse the project's theme layer. For greenfield branded styling without one, prefer a properly registered typed singleton; do not add a global theme merely to satisfy the token gate.

The Quick reference must require valid Layout ownership; states and motion with correct interruption/final behavior; complete accessibility, focus, and keyboard actions for custom items; project-aware `qmllint` and existing Qt Quick tests; localization, font, popup, resizing, clipping/overdraw, and DPR checks; and a separate `QQuickWidget` path because its rendering constraints differ from a standalone Quick window.

## Native QA Contract

Qt completion requires the project's real build/tests and a rendered application artifact under `.superloopy/evidence/frontend/<timestamp>-<slug>/`.

- Run the existing build, Qt tests, and applicable QML lint/tests.
- Capture the real application on the target platform. Client-area or virtual-platform renders do not prove native chrome, dialogs, separate popups, or compositor behavior.
- Exercise relevant interaction, accessibility, localization, theme, resizing, and DPR states.
- Record platform, Qt version, style, DPR, locale, theme, graphics backend, capture method, and unverified native surfaces in `VISUAL_QA.md`.
- Use screenshot diff only for equivalent recorded environments and only as review guidance, never as the verdict.

A Qt surface does not use Lighthouse, React Doctor, CSS token compliance, or the fixed browser viewport matrix as proof. Mixed repositories still use those gates for web surfaces.

## Release Gate

Follow RED → GREEN → REFACTOR. Before changing the skill, run neutral control fixtures against the current version; after the change, rerun the same fixtures. Cover activation, every route, minimum-version guards, Widgets styling paths, Quick styling/layout/motion, mixed embedding, target platforms, accessibility/localization/high DPI, and pressure to use browser or universal screenshot QA.

The 9.5 target requires at least 19/20 treatment fixtures to pass, zero hard-rule failures, unchanged web tests, focused Qt contract tests, the full suite, package-content verification, and a clean `git diff --check`.

## Source Policy

Write the Qt references in original language from official, version-matched Qt and target-platform documentation. The guide linked from issue #25 is problem input, not text to copy. Do not vendor upstream prose, example code, screenshots, icons, or design assets without file-level license review.
