# Qt Widgets route

Apply [`qt.md`](qt.md), then choose exactly one appearance strategy for each affected widget subtree. Preserve the repository's existing strategy unless the task explicitly changes ownership.

## Strategy quick reference

| Strategy | Use when | Owns appearance |
| --- | --- | --- |
| Native-adaptive | The product is a platform-native app | current `QStyle`, semantic `QPalette`, narrow `QProxyStyle` overrides |
| Branded-deterministic | The app intentionally owns consistent chrome | explicit base style, controlled proxy/delegates/custom paint |
| QSS-led | An existing subtree already uses documented QSS | QSS properties, states, and subcontrols without a custom-style collision |

Write the chosen strategy and its subtree boundary before implementation. One affected subtree has one appearance owner: never make QSS and a custom `QStyle`/`QProxyStyle` co-own the same widget subtree. [Qt explicitly warns that style sheets are unsupported for custom `QStyle` subclasses](https://doc.qt.io/qt-6/qstyle.html#creating-a-custom-style); keep a QSS-led boundary in the documented [Qt Style Sheets](https://doc.qt.io/qt-6/stylesheet.html) surface and use its [property/state/subcontrol reference](https://doc.qt.io/qt-6/stylesheet-reference.html). A native-adaptive proxy stays narrow and delegates everything else to its base [QProxyStyle](https://doc.qt.io/qt-6/qproxystyle.html); a branded-deterministic route names its explicit base style and tests it on every target.

## Layout and state

Use layouts, truthful `sizeHint()`/`minimumSizeHint()`, and `QSizePolicy` to negotiate geometry. Do not position responsive content with fixed rectangles or compensate for a style by hard-coding its current metrics. Let [layout management](https://doc.qt.io/qt-6/layout.html), [size policies](https://doc.qt.io/qt-6/qsizepolicy.html), and the selected [QStyle](https://doc.qt.io/qt-6/qstyle.html) determine usable sizes; verify minimum, preferred, expanded, translated, and enlarged-font cases.

Consume semantic [QPalette](https://doc.qt.io/qt-6/qpalette.html) roles from the effective widget/style palette. Handle and test the `Active`, `Inactive`, and `Disabled` color groups instead of painting one literal "normal" state. Do not assume every native style paints every palette brush; inspect the rendered target when product color ownership is required.

## Interaction and geometry

Initialize the correct `QStyleOption` from the widget or delegate and carry its enabled, active, selected, pressed, direction, and focus state into style drawing. Ask [QStyle](https://doc.qt.io/qt-6/qstyle.html) for metrics, content sizes, sub-element rectangles, and subcontrol rectangles rather than duplicating native geometry.

A custom or composite control must have one semantic part model: the same part identifiers and rectangles drive **paint, event hit-testing, keyboard focus/activation, and accessibility**. A part that is only painted or pointer-clickable is incomplete. Use `QStyleOption` state for visible focus and preserve standard keyboard activation. For a `QStyle::ComplexControl`, make painting and `hitTestComplexControl()` agree; for an ordinary custom widget, use the same geometry in its pointer-event hit testing. Verify both paths at every scale and layout direction.

For dynamic model/view rows, keep data in the model and implement appearance, `sizeHint()`, editing, and hit behavior with [QStyledItemDelegate](https://doc.qt.io/qt-6/qstyleditemdelegate.html). Do not create a persistent child-widget tree per row merely to style repeated content. Initialize and use the supplied style option so selection, focus, enabled state, palette, direction, and the current style remain coherent.

## Native and inclusive behavior

Keep native top-level chrome, menus, standard dialogs, focus conventions, and system shortcuts by default; brand the content area inside that boundary. If custom chrome is an explicit requirement, verify window movement/resizing, system controls, modality, multi-screen behavior, keyboard access, and assistive technology on every named target.

Stock widgets already expose accessibility semantics. Custom widgets and virtual subparts must provide the corresponding `QAccessibleInterface` roles, names, states, values, relationships, and actions, then emit the appropriate accessibility event after state changes. Keep the accessible tree and bounds aligned with the shared paint/hit-test geometry; follow [Accessibility for QWidget Applications](https://doc.qt.io/qt-6/accessible-qwidget.html).

Keep geometry and custom painting device-independent and provide high-density raster/icon assets rather than scaling raw device-pixel assumptions. Layout and paint with font metrics so platform font fallback, CJK, RTL/mirroring, emoji, long translations, and enlarged text can change both width and height without clipping.

## Behavior checks

Use [Qt Test](https://doc.qt.io/qt-6/qtest-overview.html) to exercise behavior, not screenshots alone:

- pointer and keyboard paths trigger the same action exactly once;
- focus traversal, visible focus, shortcuts/mnemonics, enabled/disabled behavior, and cancellation work;
- paint and hit-test boundaries agree in LTR and RTL at representative scale factors;
- `Active`, `Inactive`, and `Disabled` palette groups remain legible under each supported style/theme;
- dynamic rows preserve selection, focus, editing, accessibility, and size hints with long/CJK/emoji text; and
- custom accessibility state/value changes emit the expected events.

Complete the common Qt pre-flight and the Qt QA route on a real named target before claiming native or branded parity.
