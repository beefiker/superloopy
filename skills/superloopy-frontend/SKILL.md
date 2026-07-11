---
name: superloopy-frontend
description: Use only after explicit Codex `$superloopy:superloopy-frontend` or Claude Code `/superloopy:superloopy-frontend` invocation, a visual task started with a leading `loopy` or `루피`, or an active Superloopy loop explicitly routing a web UI, Qt Widgets, Qt Quick/QML, or other visual-deliverable subtask here. Do not activate from UI, frontend, Qt, QML, Widgets, or other semantic vocabulary alone.
---

# Superloopy Frontend

## Activation

Open your reply with `SUPERLOOPY FRONTEND ENABLED`. If another active Superloopy mode mandates its own first line, print that first and this marker on the next line.

**Explicit activation only.** Engage when the user invokes `$superloopy:superloopy-frontend` in Codex or `/superloopy:superloopy-frontend` in Claude Code, begins a visual task with a leading `loopy` or `루피`, or an already-active Superloopy loop explicitly assigns a visual subtask to this skill. A plain mention of UI, frontend, CSS, layout, responsiveness, or a visible symptom is not authorization to activate this workflow. Diagnose ownership first; backend, API, data, concurrency, infrastructure, and non-visual work stay with their primary workflow unless a visual deliverable is separately requested.

## Inspect and route

Resolve the requested surface, existing stack, target platform, existing styling or tokens, and available validation. For a Qt route, also resolve the minimum Qt version. Ask one question only when a material ambiguity would change the route or result. Load the smallest route-specific set:

| Requested surface | Load |
| --- | --- |
| web UI | [`references/web.md`](references/web.md) |
| Qt Widgets | [`references/qt.md`](references/qt.md), [`references/qt-widgets.md`](references/qt-widgets.md), and [`references/qt-qa.md`](references/qt-qa.md) |
| Qt Quick/QML | [`references/qt.md`](references/qt.md), [`references/qt-quick.md`](references/qt-quick.md), and [`references/qt-qa.md`](references/qt-qa.md) |
| mixed Qt Widgets and Qt Quick/QML | [`references/qt.md`](references/qt.md), [`references/qt-widgets.md`](references/qt-widgets.md), [`references/qt-quick.md`](references/qt-quick.md), and [`references/qt-qa.md`](references/qt-qa.md) |
| mixed web UI and Qt | [`references/web.md`](references/web.md) plus [`references/qt.md`](references/qt.md), the relevant one or both of [`references/qt-widgets.md`](references/qt-widgets.md) and [`references/qt-quick.md`](references/qt-quick.md), and [`references/qt-qa.md`](references/qt-qa.md) |

For a mixed web/Qt task, apply gates and evidence independently for each surface. Web proof cannot substitute for Qt proof, and Qt proof cannot substitute for web proof.

## Shared design gate

`DESIGN.md` owns app-defined semantics. Preserve the project's architecture and existing styling infrastructure. Before using an app-defined color, typography, spacing, radius, depth, motion, or component value that the design contract lacks, add its token to `DESIGN.md`. Platform runtime values remain authoritative when native.

## Build, dispatch, and evidence

Preserve the existing stack. For parallel work, dispatch self-contained crew slices with the relevant requirements and tokens inline, then judge each lane by delivered evidence. Capture real rendered-surface evidence and write `VISUAL_QA.md` under `.superloopy/evidence/frontend/`. Finish with a `SUPERLOOPY_EVIDENCE` artifact and record the final evidence through the active Superloopy loop.

## Completion

Apply only the selected platform checklist. The design contract, interaction states, real rendered-surface evidence, and no weakened UX are mandatory for every route.
