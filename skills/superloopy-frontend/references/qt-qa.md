# Qt QA

Apply this evidence gate to Qt Widgets, Qt Quick/QML, and mixed work. A successful build is necessary but does not prove native rendering or interaction.

## Commands

Record and run the repository's exact commands, with the candidate revision and build directory identifiable:

Every implementation or release-proof plan must explicitly name the configure/build, Qt Test/ctest, and repository lint/static gates. When an exact command is not yet known, record it as unresolved; when no relevant repository check exists, record that fact instead of omitting the gate.

Before returning a plan, include a required release-gate step that says to run and pass all three. Merely inventorying the gates or marking their exact commands unresolved does not satisfy this plan requirement.

- **Project configure/build:** the existing CMake, qmake, preset, or wrapper command for the real UI target.
- **Qt Test/ctest:** the affected Qt Test executable or focused `ctest` invocation, followed by the project's required suite.
- **Repository lint/static checks:** the existing formatter, compiler-warning, static-analysis, or other repository-defined command for the changed C++/UI scope. Add module-aware `qmllint` when QML is present; when no relevant check exists, record that fact instead of silently omitting the gate.
- **Module-aware qmllint:** the QML module's generated lint target or `qmllint` with its real import paths and type information; an isolated file with unresolved imports is not a valid pass.
- **Quick Test:** the project's Qt Quick Test executable or its registered test invocation, using the same QML modules and target configuration as the application.

Keep the command output as evidence. Use official [`qmllint`](https://doc.qt.io/qt-6/qtqml-tooling-qmllint.html), [Qt Quick Test](https://doc.qt.io/qt-6/qtquicktest-index.html), and [Qt Test best practices](https://doc.qt.io/qt-6/qttest-best-practices.html) as the command and test-design references.

## State matrix

Exercise every applicable row with both behavior checks and visual inspection:

| Surface/state | Required coverage |
| --- | --- |
| Core control | Normal, hover when supported, pressed, focused, selected/checked, disabled, and inactive |
| Transient/data | Popups/editors and empty, loading, and error states |
| Environment | Localization including CJK/RTL/long text, resizing at minimum and expanded sizes, and representative DPR/mixed-screen movement |

Record a reason for every non-applicable state. Test keyboard, pointer, touch when supported, and assistive-technology actions against the same semantic outcome; interrupt motion and asynchronous state changes before also checking their settled state.

## Capture contract

Capture the real target application built from the candidate revision in the named platform, style, theme, graphics backend, locale, and DPR. Wait for fonts, data, layout, transitions, and scene-graph presentation to settle, then show the exercised state rather than a replica or isolated mock.

Use an OS-level capture for native window chrome, platform dialogs, IME/candidate UI, native menus, and separate-window popups. A `QQuickWidget::grabFramebuffer()`, `QQuickWindow`/client grab, offscreen renderer, virtual display, or headless image is functional evidence for the pixels it contains; **offscreen capture is not native evidence** and cannot verify surfaces outside that client/framebuffer boundary. If OS capture of a required target is unavailable, list that surface as unverified rather than substituting a browser or synthetic frame.

## `VISUAL_QA.md` fields

Create `VISUAL_QA.md` under the active evidence root and fill every field:

```markdown
Platform:
Qt version:
Style:
DPR:
Locale:
Theme:
Graphics backend:
Capture method:
Window size:
Exercised states:
Findings/fixes:
Unverified surfaces:
```

For each artifact, identify the application surface and state it proves. Do not mark a finding fixed until the matching behavior check and recapture both pass.

## Screenshot interpretation

Compare screenshots only when platform, Qt version, style, theme, locale, DPR, graphics backend, capture boundary, and window dimensions are equivalent. A dimension mismatch is non-comparable, not a failed similarity score.

Pixel diffs and ranked hotspots are **screenshot guidance, never a verdict**. They direct human review toward clipping, stale state, palette drift, focus errors, or rendering changes; they do not decide pass/fail, excuse a visible defect, or prove interaction and accessibility. Record the human finding and confirm its cause in the running application.

## Qt exclusions

Lighthouse is not Qt proof. React Doctor, CSS compliance, and a browser viewport matrix are also not evidence for a Qt surface. Use them only for a separately scoped web route; never substitute them for Qt build/tests, real-target interaction, or native capture.

The Qt gate passes only when the commands succeed, applicable states are exercised, findings are fixed and recaptured, and every uncaptured target surface is disclosed under `Unverified surfaces`.
