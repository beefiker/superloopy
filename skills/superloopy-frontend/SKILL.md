---
name: superloopy-frontend
description: Use only after explicit Codex `$superloopy:superloopy-frontend` or Claude Code `/superloopy:superloopy-frontend` invocation for supported screen-based application UI across public web, desktop, mobile/tablet, embedded/hybrid, Qt, custom-rendered, or mixed targets, such a task started with a leading `loopy` or `루피`, or an active Superloopy loop explicitly routing it here. Do not activate from UI, frontend, desktop, mobile, or framework vocabulary alone, or for TV, wearable, XR, game UI, TUI, non-interactive visual deliverables, or non-UI work.
---

# Superloopy Frontend

## Activation

Open your reply with `SUPERLOOPY FRONTEND ENABLED`. If another active Superloopy mode mandates its own first line, print that first and this marker on the next line.

**Explicit activation only.** Engage when the user invokes `$superloopy:superloopy-frontend` in Codex or `/superloopy:superloopy-frontend` in Claude Code for a supported screen-based application UI task, begins such a task with a leading `loopy` or `루피`, or an already-active Superloopy loop explicitly routes that task here. A plain mention of UI, frontend, desktop, mobile, SwiftUI, Tauri, Flutter, Qt, QML, Widgets, or a visible symptom is not authorization to activate this workflow. TV, wearable, XR, game UI, TUI, non-interactive visual deliverables, and backend, API, data, concurrency, or infrastructure work stay with their primary workflows.

## Inspect and route

Resolve the facts that determine ownership and proof before choosing references:

- affected users, job, and outcome, marking each as evidence, assumption, or unknown with confidence;
- deployed OS, device, desktop environment, and session;
- public, embedded, native-control, custom-rendered, or mixed composition;
- renderer and its semantic and accessibility model;
- client, shell, service, document, and state ownership;
- framework, runtime, provider, backend, and supported version;
- package, sandbox, update or distribution channel, and persistence boundary; and
- supported input, locale, accessibility services, and target validation capability.

For a Qt route, also resolve the minimum Qt version. Ask one question only when a material ambiguity would change the route or result. Load the smallest applicable union:

| Requested surface | Load |
| --- | --- |
| Public DOM/document Web | [`references/ux.md`](references/ux.md) + [`references/web.md`](references/web.md) |
| Public canvas/custom-rendered Web | [`references/ux.md`](references/ux.md) + [`references/web.md`](references/web.md) + [`references/renderer.md`](references/renderer.md) |
| Embedded HTML on desktop | [`references/ux.md`](references/ux.md) + [`references/web.md`](references/web.md) + [`references/desktop.md`](references/desktop.md) + [`references/hybrid.md`](references/hybrid.md) |
| Embedded HTML on mobile | [`references/ux.md`](references/ux.md) + [`references/web.md`](references/web.md) + [`references/mobile.md`](references/mobile.md) + [`references/hybrid.md`](references/hybrid.md) |
| Native/custom desktop | [`references/ux.md`](references/ux.md) + [`references/desktop.md`](references/desktop.md); add [`references/renderer.md`](references/renderer.md) for engine/custom-rendered UI |
| Qt Widgets | [`references/ux.md`](references/ux.md) + [`references/desktop.md`](references/desktop.md) + [`references/qt.md`](references/qt.md) + [`references/qt-widgets.md`](references/qt-widgets.md) + [`references/qt-qa.md`](references/qt-qa.md) |
| Qt Quick/QML | [`references/ux.md`](references/ux.md) + [`references/desktop.md`](references/desktop.md) + [`references/qt.md`](references/qt.md) + [`references/qt-quick.md`](references/qt-quick.md) + [`references/qt-qa.md`](references/qt-qa.md) |
| Native/cross-platform mobile or tablet | [`references/ux.md`](references/ux.md) + [`references/mobile.md`](references/mobile.md); add [`references/renderer.md`](references/renderer.md) when the renderer changes semantic proof |
| Mixed or multi-target | Union of the applicable references above, beginning with [`references/ux.md`](references/ux.md) |

Route framework names by deployed facts, not by brand. Tauri and pywebview follow the actual desktop or mobile target and embedded client ownership. Electron is a desktop hybrid with bundled Chromium, not an OS WebView. CustomTkinter follows native/custom desktop. Flutter and Compose add renderer and semantics proof where their engine owns pixels or accessibility. React Native follows the actual provider and target. MAUI Hybrid combines a native host with an embedded client. Qt retains the specialized Qt references. Mac Catalyst is UIKit-on-desktop with AppKit augmentation; iPadOS stays on the mobile route with a desktop-capabilities overlay rather than inheriting macOS wholesale.

For mixed or multi-target work, load shared UX once, then require independent, attributable evidence for every owner and target. One surface cannot substitute for another.

## Shared UX and design gate

Apply [`references/ux.md`](references/ux.md) before platform checklists. `DESIGN.md` owns app-defined visual semantics; `UX_CONTRACT.md` owns expanded journeys and high-consequence behavioral claims when the proportional UX contract requires it. Preserve the project's architecture and existing styling infrastructure. Before using an app-defined color, typography, spacing, radius, depth, motion, or component value that the design contract lacks, add its token to `DESIGN.md`. Platform runtime values remain authoritative when native.

## Build, dispatch, and evidence

Preserve the existing stack. For parallel work, dispatch self-contained crew slices with the relevant requirements and tokens inline, then judge each lane by delivered evidence. Capture real rendered-surface evidence and write `VISUAL_QA.md` under `.superloopy/evidence/frontend/`. Match functional, accessibility, usability, renderer, shell, package, and target evidence to the claim; a static policy check proves only that the contract is packaged. Finish with a `SUPERLOOPY_EVIDENCE` artifact and record the final evidence through the active Superloopy loop.

## Completion

Apply only the selected shared, platform, composition, and specialization checklists. The design contract, applicable UX contract, truthful interaction states, real rendered-surface evidence, and no weakened UX are mandatory for every route. Promote simulated work capability by capability only after new real-target evidence.
