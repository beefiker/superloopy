# Qt Frontend Support Design

## Goal

Resolve [issue #25](https://github.com/beefiker/superloopy/issues/25) by making the existing `superloopy-frontend` skill effective for C++ Qt 6 desktop interfaces built with Qt Widgets, Qt Quick/QML, or both. Preserve the current web workflow and explicit-activation contract while preventing browser, CSS, Lighthouse, and fixed-web-breakpoint gates from leaking into Qt work.

The release target is a **9.5/10 observed acceptance score**: at least 19 of 20 frozen fresh-agent runs pass, with zero hard failures, all static contract tests green, and the original web route unchanged. This is a 95% pass rate for the defined fixture set, not statistical confidence or a guarantee that every Qt application will be excellent.

## Decision

Extend `superloopy-frontend`; do not add a second top-level Qt skill.

Design quality, token discipline, visual direction, crew routing, and evidence ownership are common concerns. A separate skill would duplicate those contracts and create ambiguous ownership for mixed web/Qt repositories. The existing skill instead becomes a lean platform router with isolated web and Qt playbooks.

This change does not broaden activation. The skill still starts only through direct `$superloopy:superloopy-frontend` or `/superloopy:superloopy-frontend` invocation, a leading explicit `loopy`/`루피` visual task, or an explicit route from an active Superloopy loop. Plain `Qt`, `QML`, `Widgets`, `UI`, or `frontend` vocabulary remains inert.

## Scope

The first supported baseline is C++ Qt 6 desktop UI:

- Qt Widgets, including item views, delegates, custom painting, `QStyle`, `QProxyStyle`, `QPalette`, and deliberately scoped style sheets;
- Qt Quick/QML using Qt Quick Controls, Layouts, custom control styles, states, transitions, and a QML theme layer;
- mixed applications such as Widgets hosting QML or Qt Quick surfaces beside native widgets;
- Windows, macOS, and Linux desktop targets, using the actual target platform and project conventions as constraints;
- existing projects and greenfield UI work, without changing the application's chosen Qt stack merely for visual polish.

Qt 5-specific guarantees, Python bindings, Qt for MCUs, mobile HIG coverage, and a generic Qt source-code linter are out of scope for this first pass. The router may recognize those cases and disclose the boundary, but it must not silently apply unverified Qt 6 C++ instructions to them.

## Platform Router

After explicit activation, inspect the repository before selecting a playbook. Read the build files, representative UI files, existing design tokens, styling code, tests, and platform configuration. Resolve:

1. UI stack: web, Qt Widgets, Qt Quick/QML, or mixed;
2. minimum supported Qt version from explicit `find_package` constraints, CI/toolchain/container configuration, project documentation, or qmake deployment metadata; APIs already present are corroborating evidence, and the locally installed Qt version is not the project minimum;
3. target operating system or desktop environment;
4. current styling strategy and component conventions;
5. available build, lint, test, accessibility, and capture paths.

If the repository supplies enough evidence, route without asking. If the stack or target is materially ambiguous, ask one narrow question rather than choosing a framework or platform on the user's behalf.

| Detected surface | Required references | Inapplicable gates |
| --- | --- | --- |
| Web | `web.md`, `anti-slop.md`, plus the current task-specific references | None; preserve the current browser workflow |
| Qt Widgets | `qt.md`, `qt-widgets.md`, `qt-qa.md` | CSS compliance, Lighthouse, React Doctor, browser breakpoints |
| Qt Quick/QML | `qt.md`, `qt-quick.md`, `qt-qa.md` | CSS compliance, Lighthouse, React Doctor, browser breakpoints |
| Mixed Qt Widgets/QML | `qt.md`, both Qt implementation references, `qt-qa.md` | Validate each surface and the embedding boundary: focus, keyboard/IME input, resizing, DPR changes, popup stacking, and palette/theme synchronization |
| Mixed web/Qt repository | Route each requested surface independently | Never substitute one platform's gate for another |

All references remain one hop from `SKILL.md`. The router loads only the selected platform material, so browser instructions cannot dominate a Qt task and Qt instructions cannot perturb the existing web route.

## File Architecture

### `skills/superloopy-frontend/SKILL.md`

Keep only the explicit activation boundary, common design principles, repository inspection, platform routing, DESIGN.md contract, shared evidence ownership, crew dispatch, and platform-neutral completion rules. Change browser-only claims such as “real-browser evidence” to “real rendered-surface evidence,” with each platform reference defining the concrete proof.

### `references/web.md`

Move the existing web build, responsive-state, browser capture, compliance, Lighthouse, and performance protocol here without weakening it. `anti-slop.md`, `image-first.md`, `design-system.md`, `perfection.md`, the brand index, and `ds-compliance.mjs` remain part of the web route. `visual-diff.mjs` is optional shared PNG-analysis tooling whose admissible inputs and interpretation remain platform-specific.

### `references/qt.md`

Define common Qt discovery, platform hierarchy, token realization, framework-preservation, version guards, accessibility, internationalization, high-DPI behavior, and the Qt-native pre-flight. `SKILL.md` links this and every variant reference directly; `qt.md` may cross-reference the selected variants but does not create a second loading hop.

### `references/qt-widgets.md`

Define Qt Widgets implementation choices, layout and size-hint discipline, palette/state handling, item delegates, custom painting, interaction, focus, animation, and performance rules.

### `references/qt-quick.md`

Define Qt Quick Controls style architecture, QML theme tokens, layouts, component states, transitions, accessibility, linting, and scene-graph performance rules.

### `references/qt-qa.md`

Define native build/test commands, real-application capture, state and platform matrices, screenshot interpretation, evidence structure, and completion criteria.

### Tests and inventories

Add a focused Qt skill-contract test and durable forward-test fixtures. Update `agents/openai.yaml`, the English and Korean README skill rows, `docs/superloopy-loop-golden-set.md`, `docs/superloopy-file-audit.md`, and `docs/superloopy-design-audit.md` so discovery, packaging, and provenance describe both web and Qt without changing explicit activation.

## Shared Design Contract

`DESIGN.md` remains the source of truth, but a token is a semantic design decision rather than a CSS variable. The selected platform adapter realizes the same roles:

| Design role | Web | Qt Widgets | Qt Quick/QML |
| --- | --- | --- | --- |
| Color/state | CSS custom properties | `QPalette` roles/state groups and named app-owned theme values | selected-style `Palette`/attached properties for system state; optional typed theme singleton for app-owned brand semantics |
| Spacing/geometry | CSS tokens | style metrics, layout margins/spacing, size hints | typed theme values consumed by Layouts/components |
| Typography | font tokens | application/widget fonts and style metrics | theme font properties and control inheritance |
| Components | CSS/component primitives | standard widgets, delegates, `QStyle`/`QProxyStyle`, focused custom paint | Qt Quick Controls and a real custom style when needed |
| Motion | CSS/WAAPI framework conventions | bounded `QPropertyAnimation`; respect `QStyle::SH_Widget_Animation_Duration` (`0` disables animation) plus any project-level preference | `Transition`, `Behavior`, or Animator types selected by state and render-loop semantics, with a project/platform motion preference |

`DESIGN.md` owns application-defined decisions only. The effective system palette, active native style, platform font and metrics, and accessibility preferences remain runtime authorities; a native-adaptive design contract references those semantic roles instead of freezing their literal values.

Do not run the CSS-oriented `ds-compliance.mjs` against C++ or QML. For Qt, `VISUAL_QA.md` must identify the token adapter, list changed semantic tokens, and trace each changed surface to those tokens. A generic regex scanner for C++/QML would create false confidence and is not part of this design. `QPalette` mapping expresses intent but does not prove every native style will render a requested brush, so each supported style must be inspected. A QSS-led subtree must not simultaneously rely on `setPalette()` or a project `QProxyStyle` for conflicting appearance.

Brand teardowns remain optional inspiration. Existing application conventions and the target platform HIG outrank a web-brand reference; a named brand must not force web card geometry or CSS interaction patterns into a native desktop application.

## Qt Widgets Strategy

Every Widgets task selects and records one dominant strategy before implementation:

1. **Native-adaptive**: system `QStyle` and `QPalette`, with a narrowly scoped `QProxyStyle` only when standard metrics or drawing need adjustment.
2. **Branded-deterministic**: an explicit base style plus controlled `QProxyStyle`, delegates, or custom painting for a consistent branded surface.
3. **Style-sheet-led**: documented Qt style-sheet selectors, pseudo-states, subcontrols, and box-model properties where the project already commits to QSS and no conflicting custom `QStyle` path is present.

QSS is not “colors only”; Qt documents geometry, states, and subcontrols. It is also not a universal component engine. Treat a project `QProxyStyle` as a custom `QStyle` for Qt's style-sheet compatibility warning: an affected widget subtree must not be both QSS-led and custom-style-led. Layout/form structure belongs in `QLayout`/`QFormLayout`; native metrics and complex-control geometry belong in `QStyle`/`QStyleOption`; item rendering belongs in `QStyledItemDelegate`; genuinely custom visuals belong in bounded `QPainter` code.

Widgets guidance must also require:

- layouts, size hints, size policies, and height-for-width for child geometry; a deliberate initial top-level window size is allowed, but fixed child geometry or fixed sizing must be justified;
- `Active`, `Inactive`, and `Disabled` palette groups and visible keyboard focus;
- standard interaction semantics before decorative custom painting;
- custom-painted interactive controls must initialize `QStyleOption` from the widget, honor state/palette/direction, use the current style for focus and native subparts, share one geometry calculation between painting and hit testing, preserve painter state, and implement size hints, focus policy, keyboard behavior, and accessibility;
- dynamic item-view content must use `QStyledItemDelegate`, call `initStyleOption()`, honor `option.rect/state/palette/direction`, and restore painter state; `setIndexWidget()` is only for static visible content, and one delegate instance must not be shared across views;
- preserve native top-level chrome unless the project already owns custom chrome or the user requests it; custom chrome requires target-platform verification of move, resize, snap, system menus, window controls, focus, and accessibility;
- use device-independent widget geometry and never manually multiply coordinates by DPR; supply SVG/native-theme icons with fallbacks or correct `@Nx` assets, then exercise multiple DPRs and cross-screen movement;
- inherit system/application fonts where possible, prefer point sizes and `QFontMetricsF`, and use `QTextLayout` for custom shaped or interactive text; test long strings, CJK, RTL, emoji, fallback fonts, and enlarged fonts without measuring complex scripts character-by-character;
- provide localized accessible names for icon-only controls and the appropriate roles, relationships, action/value/text/table interfaces, state-change events, keyboard behavior, and visible focus for custom controls; names/descriptions alone are insufficient for a composite custom widget.

## Qt Quick/QML Strategy

Use standard Qt Quick Controls first because they already carry keyboard and accessibility behavior, and preserve the project's selected style. Runtime selection imports `QtQuick.Controls` and configures `QQuickStyle` before loading QML. Compile-time selection imports exactly one style before other Controls imports, declares its fallback in `qmldir`, and does not also use `QQuickStyle`. A custom style is rooted in `QtQuick.Templates`, must not import `QtQuick.Controls` from its implementation, and normally supplies a documented fallback such as Basic. Native Windows and macOS styles are not arbitrary customization bases.

Native-adaptive Quick surfaces inherit Controls palette and font behavior rather than inventing a global color layer to satisfy the token gate. When the existing or deliberately branded design needs global app-owned tokens, use a registered, typed, mostly immutable singleton with grouped `readonly` properties. A file merely named `Theme.qml` is not enough: register it with `pragma Singleton` and `QT_QML_SINGLETON_TYPE` before `qt_add_qml_module()`, or an equivalent `qmldir` entry. Use attached-property propagation only when a scoped override genuinely needs to cross components, popups, or windows.

Qt Quick guidance must also require:

- a top-level Layout may anchor to a non-layout parent, but an immediate child of `RowLayout`, `ColumnLayout`, or `GridLayout` must not use anchors or bind `x/y/width/height`;
- semantic states with `Transition` for state-driven changes; use `Behavior` for ordinary property changes only after checking interruption/base-state behavior, and use Animators only when delayed property updates, non-reversible transitions, and the active render loop are acceptable;
- a project/platform motion signal when the detected Qt/platform exposes one, otherwise a project-level preference; Animators do not repair blocked GUI-thread work;
- standard Controls or, for custom interactive Items, `Accessible` name/role/state/actions, focusability, `FocusScope`, `KeyNavigation`, and `Control.visualFocus` where applicable; pointer and accessibility actions must invoke the same application action;
- CMake-generated `*_qmllint`/`all_qmllint` only when QML is registered through `qt_add_qml_module`; otherwise use the project command with correct import/type metadata, run existing Qt Quick Test targets when present, and respect repository qmlformat configuration;
- Korean, Japanese, Simplified/Traditional Chinese, mixed Latin/digits/emoji, long translations, enlarged fonts, and RTL fixtures, with optional Qt 6.8+ context-font merging only after evidence and with bundled-font licensing checked;
- live checks for clipping, overdraw, text fallback, mirroring, popup behavior, multiple DPRs, and resizing, using the QML Profiler or scene-graph diagnostics before prescribing rendering rewrites.

Mixed applications require a `QQuickWidget` branch. Its offscreen render pass disables the threaded render loop, so the skill must not promise render-thread or Animator benefits. Validate the host/Quick boundary and capture through `QQuickWidget::grabFramebuffer()`, the host widget, or the operating system rather than treating its offscreen `QQuickWindow` as a normal standalone target.

Qt StyleKit and `LayoutItemProxy` remain optional, excluded from baseline guidance while documented as Technology Preview. Version-sensitive APIs must be guarded by the repository's minimum Qt version; the references call out known thresholds rather than assuming the latest documentation applies.

## Platform and Version Hierarchy

Resolve each concern against its correct authority:

- existing stack and architecture own implementation boundaries;
- target-platform accessibility, behavior, input, window integration, and native conventions are constraints;
- existing product conventions lead application-owned appearance;
- version-matched official Qt documentation is the technical authority;
- Qt examples demonstrate mechanisms, never a mandatory aesthetic;
- KDE or GNOME HIG applies only when that desktop is a declared target; generic Linux does not silently become either one;
- brand references remain optional inspiration.

The implementation must derive or confirm the minimum Qt version. The references must explicitly guard at least `QQuickAttachedPropertyPropagator` and read-only `QStyleHints::colorScheme` (6.5), `QPalette::Accent` and initializer-list `QWidget::setTabOrder` (6.6), `QIcon::ThemeIcon` (6.7), context-font merging and application fallback fonts (6.8), `QWidget::accessibleIdentifier` (6.9), and newer accessibility relationships/contrast hints (6.10). StyleKit is 6.11 Technology Preview. Every newer API needs a compatible older-Qt route or an explicit boundary, and claims must use documentation matching the supported Qt minor version rather than projecting the current `qt-6` page backward.

## Native QA and Evidence

A Qt build is complete only with a rendered application artifact and a written `VISUAL_QA.md` under `.superloopy/evidence/frontend/<timestamp>-<slug>/`.

The Qt route uses the project's real commands and available Qt tools:

- configure and build through the existing CMake/qmake workflow;
- run existing `ctest`/Qt Test targets, including `QSignalSpy` and `QTRY_*` patterns where applicable;
- run generated `*_qmllint` or `all_qmllint` targets only when the CMake project registers QML appropriately, otherwise use its configured lint command/import paths; run existing Qt Quick Test targets when present;
- show the real application and wait for exposure, polish, rendering, font/image readiness, and animation settlement before capture. `QWidget::grab()`, `QQuickWindow::grabWindow()`, and asynchronous `QQuickItem::grabToImage()` prove content rendering within their documented limits, not native chrome, native dialogs, compositor behavior, or separately rendered menus/tooltips/popups; use application/OS capture when those surfaces are under review and record omissions;
- treat `-platform offscreen`, `minimal`, and other virtual-platform renders as functional evidence only, never target-platform native visual evidence; settle animations, carets, timers, and other nondeterministic regions with exposure/signals/`QTRY_*`, not arbitrary sleeps;
- for each changed control, exercise normal, hover when the platform supports it, pressed, keyboard-focused, checked/current/selected where applicable, disabled, and inactive states, plus relevant popups/editors, empty/loading/error, resized, light/dark, high-contrast, localization, and DPR states.

Screenshots are review evidence, not a universal pixel-perfect oracle. Fonts, native style, theme, window manager, Qt version, DPR, locale, and graphics backend can legitimately change pixels. Exact image comparison is allowed only when that environment is frozen and recorded. `visual-diff.mjs` may compare only captures with recorded equivalent environments; a dimension mismatch makes its score non-comparable, and tolerance or masked dynamic regions must be recorded. Hotspots guide human review and never decide pass/fail.

A Qt surface never substitutes Lighthouse, React Doctor, CSS token compliance, or the fixed 390/768/1280 browser matrix for native validation. It records relevant window sizes, platform, Qt version, style, DPR, locale, theme, graphics backend, and capture method instead. A mixed repository may still run the web gates for its web surfaces.

## 9.5/10 Forward-Test Acceptance Gate

Skill changes follow RED → GREEN → REFACTOR.

### RED: control before editing the skill

Freeze 20 neutral prompt/fixture runs before RED. For each run, store activation state, required and forbidden observable behaviors, mapped hard failures, and binary scoring instructions separately from the prompt. Preserve the control output verbatim with model/version, reasoning settings, tools, date, run ID, and fixture revision. Blind graders score anonymized outputs against the frozen rubric; changing a rubric requires rerunning its control and treatment.

The 20-run set is arranged as ten two-variant families:

1. plain unactivated Qt/UI vocabulary versus explicit skill activation;
2. native-adaptive Widgets on Windows versus macOS;
3. an existing QSS-led subtree versus a custom `QProxyStyle` subtree;
4. a custom-painted interactive widget versus a dynamic item-view delegate;
5. runtime Quick style selection versus compile-time custom style/singleton registration;
6. Layout-child geometry/Technology Preview pressure versus interrupted `Behavior`/Animator pressure;
7. standalone Qt Quick versus a `QQuickWidget` embedding boundary;
8. an older Qt 6 minimum versus an unsupported/ambiguous Qt 5, Python, or mobile case;
9. KDE/Kirigami versus generic or GNOME Linux, with independently scored accessibility, keyboard, localization, font, and DPR observables across the set;
10. browser/offscreen QA pressure versus a universal golden-image/visual-diff verdict.

Every intended safety rule must be tied either to an observed control gap or to an explicit primary-source requirement backed by a failing deterministic contract test. A source-mandated hard gate receives a fixture even when an initial model happens to comply, preventing benchmark overfitting.

### GREEN: minimal routed implementation

Add only the router, references, tests, fixtures, and inventory/documentation changes required to correct the observed failures. Do not add dependencies, a new top-level skill, a Qt code generator, or a speculative linter.

### REFACTOR: close leakage and rationalizations

Run the same 20 frozen prompts in fresh agent sessions with the modified skill. Preserve and blind-grade them exactly like the controls. Record new rationalizations, tighten only the rules that failed, and rerun the affected control/treatment pair if its rubric changes. Independently review the references for official-source accuracy, web-regression risk, unsupported API claims, and accidental copying.

Each treatment run receives one binary result; a run passes only when every required observable passes. No treatment output may contain one of these hard failures:

- activating from plain Qt/UI vocabulary;
- prescribing browser-only validation for a Qt surface;
- migrating Widgets to QML or QML to Widgets without user intent;
- combining QSS and custom `QStyle` as an unsupported default;
- prescribing APIs above the detected minimum Qt version without a guard;
- claiming completion without real native rendered evidence;
- treating a cross-platform screenshot diff as a universal verdict;
- treating a virtual-platform render as native evidence or a client-area grab as proof of native chrome, dialogs, popups, or compositor behavior;
- recommending dynamic `setIndexWidget()` content instead of a delegate;
- accepting custom-painted interaction without matched painting/hit testing, keyboard focus, and accessibility;
- interpreting a visual-diff score when dimensions or recorded environments differ;
- omitting accessibility, keyboard, localization, font fallback, or high-DPI checks when the fixture places them in scope.

The 9.5/10 observed acceptance target requires at least 19/20 treatment passes, zero hard failures, all static tests green, and an independent source/provenance review. Any hard failure blocks release regardless of the numeric score.

## Automated Validation

Add focused tests that prove:

- the explicit activation metadata and hook behavior remain unchanged;
- the router recognizes web, Widgets, Quick, and mixed routes after activation;
- every routed reference exists in the packaged skill;
- the web reference retains browser capture, anti-slop, compliance, and Lighthouse gates;
- the Qt route explicitly replaces browser-only gates with native build/test/capture evidence;
- Widgets guidance includes strategy selection, `QPalette` groups, `QStyle`/QSS compatibility, delegates, focus, accessibility, and high DPI;
- Widgets guidance treats `QProxyStyle` as custom `QStyle` for QSS compatibility, restricts `setIndexWidget()` to static content, and requires matched paint/hit-test geometry for custom controls;
- QML guidance covers runtime/compile-time Controls styling, valid singleton registration, layout ownership, state/motion caveats, accessibility actions, `qmllint` metadata, Qt Quick Test, scene-graph diagnosis, and `QQuickWidget` limits;
- Qt QA distinguishes client-area and virtual-platform renders from native evidence, waits for stable rendering, and rejects dimension/environment-mismatched visual-diff verdicts;
- version-contract tests cover the documented Qt 6 minor thresholds and compatible fallbacks;
- README, golden-set, design-audit, and file-audit inventories describe the new files and provenance.

Validation order:

1. watch the new focused tests fail against the current skill;
2. implement the minimum references/router and watch them pass;
3. run existing frontend/plugin/docs/audit/compliance/visual-diff tests;
4. run the full test suite;
5. run `npm pack --dry-run --json` and confirm every new reference/fixture intended for distribution is present;
6. run `git diff --check`.

## Source and Provenance Policy

Technical claims should be independently authored from primary sources. The issue's linked guide is useful problem evidence, not a replacement for Qt documentation. Do not copy upstream prose, tables, screenshots, icons, or example code into the skill without file-level license review and attribution.

Primary references:

- [Qt QStyle](https://doc.qt.io/qt-6/qstyle.html), [QProxyStyle](https://doc.qt.io/qt-6/qproxystyle.html), [QPalette](https://doc.qt.io/qt-6/qpalette.html), and [QStyleHints](https://doc.qt.io/qt-6/qstylehints.html)
- [Qt Style Sheets overview](https://doc.qt.io/qt-6/stylesheet.html), [reference](https://doc.qt.io/qt-6/stylesheet-reference.html), and [QStyledItemDelegate](https://doc.qt.io/qt-6/qstyleditemdelegate.html)
- [Layout Management](https://doc.qt.io/qt-6/layout.html), [QSizePolicy](https://doc.qt.io/qt-6/qsizepolicy.html), [QStyleOption](https://doc.qt.io/qt-6/qstyleoption.html), and [QStylePainter](https://doc.qt.io/qt-6/qstylepainter.html)
- [QAbstractItemView](https://doc.qt.io/qt-6/qabstractitemview.html), [Keyboard Focus in Widgets](https://doc.qt.io/qt-6/focus.html), [QWidget accessibility](https://doc.qt.io/qt-6/accessible-qwidget.html), and [QAbstractItemModelTester](https://doc.qt.io/qt-6/qabstractitemmodeltester.html)
- [QIcon](https://doc.qt.io/qt-6/qicon.html), [QFont](https://doc.qt.io/qt-6/qfont.html), [QFontMetrics](https://doc.qt.io/qt-6/qfontmetrics.html), [QTextLayout](https://doc.qt.io/qt-6/qtextlayout.html), and [Animation Framework](https://doc.qt.io/qt-6/animation-overview.html)
- [Styling Qt Quick Controls](https://doc.qt.io/qt-6/qtquickcontrols-styles.html), [customization](https://doc.qt.io/qt-6/qtquickcontrols-customize.html), [QML singletons](https://doc.qt.io/qt-6/qml-singleton.html), [Palette](https://doc.qt.io/qt-6/qml-qtquick-palette.html), and the [Flat Style example](https://doc.qt.io/qt-6/qtquickcontrols-flatstyle-example.html)
- [Qt Quick best practices](https://doc.qt.io/qt-6/qtquick-bestpractices.html), [performance](https://doc.qt.io/qt-6/qtquick-performance.html), [responsive layouts](https://doc.qt.io/qt-6/qtquicklayouts-responsive.html), and [QQuickWidget](https://doc.qt.io/qt-6/qquickwidget.html)
- [Qt Accessibility](https://doc.qt.io/qt-6/accessible.html), [High DPI](https://doc.qt.io/qt-6/highdpi.html), [`qmllint`](https://doc.qt.io/qt-6/qtqml-tooling-qmllint.html), [Qt Test best practices](https://doc.qt.io/qt-6/qttest-best-practices.html), and [Qt Quick Test](https://doc.qt.io/qt-6/qtquicktest-index.html)
- [Windows design guidance](https://learn.microsoft.com/windows/apps/design/), [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/), [GNOME HIG](https://developer.gnome.org/hig/), and [KDE HIG](https://develop.kde.org/hig/)

The implementation maintains a source ledger recording each material claim, primary URL, Qt/document version, access date, introduced-version threshold where relevant, license, and paraphrase/copy status. Qt documentation is GFDL-1.3 and official Qt examples use BSD-3-Clause; KDE HIG content is CC-BY-SA-4.0. Platform design kits and assets have separate terms and remain unbundled. The implementation links to sources and writes original operational guidance rather than vendoring their content.

The issue-linked MIT guide is pinned to commit [`3df61e5`](https://github.com/115dkk/make-interfaces-feel-better/blob/3df61e5ec66cbd4f73b8e4c05b0ac1d1f2f897be/skills/make-interfaces-feel-better/qt.md) and remains problem input, not copied skill content.

## Failure Safety

- If stack detection is inconclusive, ask one narrow question and do not rewrite architecture.
- If the minimum Qt version is unknown, avoid version-sensitive prescriptions until confirmed.
- If the target platform cannot be exercised locally, report that missing evidence explicitly; do not substitute a browser mock or claim native parity.
- If native capture is unavailable, preserve build/test evidence and mark visual verification blocked rather than fabricating screenshots.
- If project conventions conflict only with generic aesthetic guidance, preserve the project and explain the tradeoff. If they conflict with documented Qt correctness, accessibility, or required target-platform behavior, surface the conflict and do not silently preserve the defect.

## Out of Scope

This design does not change Superloopy hook routing, add semantic Qt activation, replace the existing web quality gates, add dependencies, vendor Qt/KDE assets, guarantee identical rendering across platforms, or promise a perfect UI outcome. It creates a testable, native-aware process whose release bar is a 9.5/10 observed acceptance score on the frozen fixture set.
