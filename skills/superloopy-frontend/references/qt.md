# Qt common route

Load this contract before the Qt Widgets, Qt Quick/QML, or mixed route. It assumes a Qt 6 C++ desktop application unless the boundary section says otherwise. Preserve the repository's architecture and use the Qt route's evidence gates, not the web route's browser gates.

## Establish the repository and target facts

Before editing UI code, record:

- whether the build uses CMake, qmake, or both, and which targets own the UI;
- whether the surface is Widgets, QML, or mixed, including each technology boundary;
- the declared **minimum Qt version**, taken from repository configuration rather than the locally installed SDK;
- every target OS and desktop environment, including the display server when it affects behavior;
- the selected Qt style, where it is selected, and whether users or deployment can change it;
- existing unit, interaction, accessibility, and visual tests; and
- the command and real target environment available for rendering and capture.

Do not infer an unknown fact from the development machine. Ask one focused question when an unknown would change the implementation strategy; otherwise disclose it and constrain the claim.

## Authority and ownership

Resolve conflicts in this order: existing architecture; target behavior and accessibility; product appearance expressed by `DESIGN.md`; version-matched Qt documentation; the target platform's HIG; optional visual inspiration. A lower authority may refine a decision but cannot overturn a higher one.

`DESIGN.md` owns app-defined semantic roles for color, spacing, type, and motion. Map those roles at component boundaries and keep runtime-owned values live: do not freeze the **system palette, platform font, native metrics, focus geometry, or accessibility preferences** into product tokens. Use [QGuiApplication](https://doc.qt.io/qt-6/qguiapplication.html) palette and font only as application defaults, not as substitutes for the effective values after component inheritance or overrides.

- **Widgets** use the effective [QPalette](https://doc.qt.io/qt-6/qpalette.html) of the widget or style option and the current [QStyle](https://doc.qt.io/qt-6/qstyle.html) for style-owned geometry and metrics.
- **Quick** resolves each live value at the type that owns it: palette comes from the effective [Item](https://doc.qt.io/qt-6/qml-qtquick-item.html#palette-prop), [Window](https://doc.qt.io/qt-6/qml-qtquick-window.html#palette-prop), [Control](https://doc.qt.io/qt-6/qml-qtquick-controls-control.html), or [ApplicationWindow](https://doc.qt.io/qt-6/qml-qtquick-controls-applicationwindow.html), while font comes from a concrete font-owning `Control`, `ApplicationWindow`, or [Text](https://doc.qt.io/qt-6/qml-qtquick-text.html) type. Combine those effective values with the selected Controls style, truthful [implicit sizes](https://doc.qt.io/qt-6/qml-qtquick-item.html#implicitWidth-prop), and [`Layout.*`](https://doc.qt.io/qt-6/qtquicklayouts-overview.html) constraints. A generic `Item` or `Window` must not be assumed to expose a font property.
- A **pure Quick** route must not add a Qt Widgets dependency or consult `QStyle` for style metrics. Keep Quick geometry and metrics inside the selected Controls style, implicit-size, and Qt Quick Layout contracts.

Read only properties actually exposed by [QStyleHints](https://doc.qt.io/qt-6/qstylehints.html) for supported platform and accessibility hints; check each one against the declared minimum Qt version and provide a guarded fallback before use. Product accents and internal rhythm may be deterministic, but user and platform settings remain authoritative unless the product requirement explicitly owns them; follow Qt's [accessibility guidance](https://doc.qt.io/qt-6/accessible.html).

## Version and fallback contract

Check every referenced API and style behavior against the declared minimum Qt version. For an API introduced later, add the appropriate build/runtime guard and a named fallback before using it. Keep the fallback behind the same component boundary, preserve the existing or native behavior, and never silently raise the minimum version or drop keyboard/accessibility semantics. Platform support is a capability to verify, not a promise inferred from a newer documentation page.

## Common behavior contract

- **Focus and keyboard:** Preserve a logical focus chain, a visible focus indicator, standard activation keys, mnemonics/shortcuts where appropriate, and parity between pointer and keyboard actions. Derive platform timing, hover, activation, and focus behavior from [QStyleHints](https://doc.qt.io/qt-6/qstylehints.html) instead of hard-coded desktop assumptions.
- **Accessibility:** Prefer controls with built-in accessibility. Every custom interactive element must expose its role, name, state, value, and available action, and must notify assistive technology when those change. Color, sound, animation, or pointer input cannot be the only carrier of meaning; see Qt's [accessibility guidance](https://doc.qt.io/qt-6/accessible.html).
- **Text and direction:** Layouts must survive CJK line breaking, RTL and mixed-direction text, emoji, font fallback, translations longer than the source, and enlarged text. Use logical alignment and locale direction; do not encode left/right assumptions or fixed text boxes. Follow Qt's [internationalization guidance](https://doc.qt.io/qt-6/internationalization.html).
- **High DPI:** Keep UI geometry in device-independent coordinates, provide suitable image/icon representations, and test mixed-density multi-screen movement without assuming adjacent physical-pixel coordinates. Follow Qt's [High DPI model](https://doc.qt.io/qt-6/highdpi.html).
- **Motion and native chrome:** Motion must not carry required state and must honor the platform's available motion/accessibility preference; an older-version fallback removes nonessential motion. Keep top-level window chrome and platform dialogs native by default. A deliberate custom replacement must retain move, resize, system-menu, focus, keyboard, accessibility, and target-platform behavior.

## Disclosed boundaries

This reference does not silently generalize across Qt editions or targets:

- **Qt 5:** use its archived, version-matched documentation and audit every Qt 6 assumption and guard;
- **language bindings:** verify binding names, ownership/lifetime, threading, and packaging in that binding's official documentation;
- **mobile or Qt for MCUs:** replace desktop interaction, windowing, and HIG assumptions with target-specific guidance and device evidence;
- **unknown Linux desktop:** identify desktop environment, style/theme, display server, scale, and input method before claiming native behavior. If they remain unknown, test stated representative combinations and mark the rest unverified.

## Qt pre-flight

This checklist replaces the web anti-slop, browser-breakpoint, and Lighthouse checklist for Qt work:

- [ ] Build system, surface type, minimum Qt version, targets, selected style, tests, and capture path are recorded.
- [ ] One appearance owner is selected for each surface, with mixed Widgets/QML boundaries explicit.
- [ ] Newer APIs have guards, a fallback, and a testable boundary.
- [ ] `DESIGN.md` maps app semantics without freezing the system palette, platform font, native metrics, or accessibility preferences.
- [ ] Pointer and keyboard activation, focus order/visibility, and assistive-technology semantics agree.
- [ ] CJK, RTL, emoji/font fallback, long translations, and enlarged text remain usable.
- [ ] High-DPI and mixed-screen behavior use device-independent geometry and suitable assets.
- [ ] Motion preferences and native top-level chrome are preserved or an explicit replacement is fully verified.
- [ ] Validation runs on the named target style/platform and produces a real Qt capture plus behavioral evidence.
