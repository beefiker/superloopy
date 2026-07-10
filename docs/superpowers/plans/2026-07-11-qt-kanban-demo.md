# Qt Kanban Acceptance Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Record status:** Immutable pre-implementation plan. Completion is recorded in Git history and validation evidence rather than by rewriting this checklist.

**Goal:** Build the interactive Northstar Kanban desktop application at `examples/qt-kanban` as native end-to-end proof of the updated Qt frontend skill.

**Architecture:** A reusable shared QML module (`Northstar.Kanban`) owns Theme, TaskStore, views, and components. A thin Qt Quick executable selects Basic style before loading the module; a separate Quick Test executable imports the same module and registers with CTest. The app uses deterministic in-memory data, original local SVG icons, real cross-column drag, keyboard/accessibility equivalents, and macOS-native window capture.

**Tech Stack:** C++17, CMake 3.21+, Qt 6.11.1 (`Gui`, `Qml`, `Quick`, `QuickControls2`, `QuickTest`, `Svg`), QML, Qt Test, macOS `screencapture`

## Global Constraints

- Task 1 of this plan starts only after `docs/superpowers/plans/2026-07-11-qt-frontend-support.md` passes its release gate.
- Add no dependency beyond the approved Homebrew `qtdeclarative` installation and its `qtbase`/`qtsvg` dependencies.
- Treat the app as a branded light-only desktop UI with native macOS chrome/input behavior, not a native-styled Controls surface and not Windows/Linux proof.
- Use `QQuickStyle::setStyle("Basic")` before any QML imports Qt Quick Controls; application QML imports `QtQuick.Controls`, never `QtQuick.Controls.Basic`.
- Preserve the exact token, breakpoint, interaction, content, and QA contracts in `docs/superpowers/specs/2026-07-11-qt-kanban-demo-design.md`.
- Reuse the platform application font, propagate enlarged base font size, and add no bundled font.
- Keep all task data deterministic and in memory; persistence, networking, auth, undo history, and same-column production reorder remain out of scope.
- Use only original local monochrome SVG icons; no Unicode/emoji icon mixture, external icon dependency, gradient, glow, glass, or decorative shadow stack.
- Functional offscreen tests do not count as native visual evidence.

---

### Task 1: Create a failing reusable-module smoke test, then establish the build graph

**Files:**
- Create: `examples/qt-kanban/CMakeLists.txt`
- Modify: `.gitignore`
- Create: `examples/qt-kanban/src/Northstar/Kanban/CMakeLists.txt`
- Create: `examples/qt-kanban/src/app/CMakeLists.txt`
- Create: `examples/qt-kanban/src/app/main.cpp`
- Create: `examples/qt-kanban/src/Northstar/Kanban/Main.qml`
- Create: `examples/qt-kanban/src/Northstar/Kanban/KanbanView.qml`
- Create: `examples/qt-kanban/src/Northstar/Kanban/Theme.qml`
- Create: `examples/qt-kanban/src/Northstar/Kanban/TaskStore.qml`
- Create: `examples/qt-kanban/tests/quick/CMakeLists.txt`
- Create: `examples/qt-kanban/tests/quick/tst_qtkanban.cpp`
- Create: `examples/qt-kanban/tests/quick/tst_smoke.qml`

**Interfaces:**
- Produces CMake targets: `qtkanban_ui`, `qtkanban`, `tst_qtkanban`, `all_qmllint`, and CTest `qtkanban.quick`
- Produces QML URI: `Northstar.Kanban 1.0`

- [ ] **Step 1: Write the Quick Test entrypoint and failing smoke test first**

`tst_qtkanban.cpp` uses `QUICK_TEST_MAIN_WITH_SETUP`. Its setup object calls `QQuickStyle::setStyle("Basic")` in `applicationAvailable()` before the test engine loads QML. `tst_smoke.qml` imports `Northstar.Kanban` and asserts that an instantiated `KanbanView` has `objectName === "kanbanView"`.

```qml
import QtQuick
import QtTest
import Northstar.Kanban

TestCase {
    id: testCase
    name: "Smoke"
    when: windowShown

    Component { id: viewComponent; KanbanView {} }

    function test_module_is_importable() {
        const view = createTemporaryObject(viewComponent, testCase)
        verify(view)
        compare(view.objectName, "kanbanView")
    }
}
```

- [ ] **Step 2: Configure the test harness and verify RED**

Create the top-level/test CMake files first, pointing `IMPORTS TARGET qtkanban_ui` at the not-yet-defined module. Run:

```bash
qt-cmake -S examples/qt-kanban -B build/qt-kanban -G Ninja -DCMAKE_BUILD_TYPE=Debug
```

Expected: configure FAILS because target/module `qtkanban_ui` and `Northstar.Kanban` do not exist. This is the intended missing-production behavior.

- [ ] **Step 3: Add the minimal reusable module and app**

Use this top-level graph:

```cmake
cmake_minimum_required(VERSION 3.21)
project(QtKanban VERSION 0.1 LANGUAGES CXX)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
find_package(Qt6 6.11.1 EXACT REQUIRED COMPONENTS Gui Qml Quick QuickControls2 QuickTest Svg)
qt_standard_project_setup(REQUIRES 6.11)
enable_testing()
add_subdirectory(src/Northstar/Kanban)
add_subdirectory(src/app)
add_subdirectory(tests/quick)
```

Before `qt_add_qml_module`, mark both singleton QML files with `QT_QML_SINGLETON_TYPE TRUE`. Create `qtkanban_ui` as a `SHARED` QML module with URI `Northstar.Kanban`, link it to Quick/QuickControls2/Svg, and link both executables to `qtkanban_ui`. `main.cpp` sets application name/display name, selects Basic before engine creation, loads `Main` with `engine.loadFromModule("Northstar.Kanban", "Main")`, and exits on object-creation failure.

Minimal QML:

```qml
// Main.qml
import QtQuick
import QtQuick.Controls

ApplicationWindow {
    property int initialWidth: 1600
    property int initialHeight: 1000
    width: initialWidth
    height: initialHeight
    minimumWidth: 900
    minimumHeight: 640
    visible: true
    title: "Northstar"
    KanbanView { anchors.fill: parent }
}
```

```qml
// KanbanView.qml
import QtQuick
Item { objectName: "kanbanView" }
```

Both singleton shells start with `pragma Singleton`, import `QtQuick`, and expose only a temporary `motionEnabled` property (`Theme`) and `reset()` (`TaskStore`) until later tasks. Add `build/` to `.gitignore` before configuring so generated files never enter audit/package inputs.

- [ ] **Step 4: Verify GREEN**

```bash
qt-cmake -S examples/qt-kanban -B build/qt-kanban -G Ninja -DCMAKE_BUILD_TYPE=Debug
cmake --build build/qt-kanban --parallel
ctest --test-dir build/qt-kanban --output-on-failure
```

Expected: configure/build succeed and `qtkanban.quick` passes the import/instantiation smoke test.

- [ ] **Step 5: Commit the build graph**

```bash
git add examples/qt-kanban
git commit -m "feat(qt-kanban): establish reusable QML module"
```

### Task 2: Implement the deterministic TaskStore through tests

**Files:**
- Modify: `examples/qt-kanban/src/Northstar/Kanban/TaskStore.qml`
- Create: `examples/qt-kanban/tests/quick/tst_store.qml`
- Modify: `examples/qt-kanban/tests/quick/CMakeLists.txt`

**Interfaces:**
- Produces properties: `tasks`, `selectedTaskId`, `query`, `priorityFilter`, `revision`, `columnOrder`
- Produces functions: `reset`, `taskIndex`, `taskById`, `matches`, `visibleInColumn`, `countForColumn`, `selectTask`, `clearSelection`, `moveTask`, `moveSelectedAdjacent`, `addTask`

- [ ] **Step 1: Write failing store tests**

Test deterministic seed IDs, initial `task-build-landing` selection, four stable column keys, case-insensitive search, High/Medium/Low/All filtering without role mutation, missing-ID behavior, move success/failure, adjacent movement boundaries, trimmed-title rejection, unique created IDs, revision increments, count changes, and `reset()` isolation.

Representative assertions:

```qml
function init() { TaskStore.reset() }

function test_move_task_updates_count_and_revision() {
    const before = TaskStore.revision
    const ready = TaskStore.countForColumn("ready")
    verify(TaskStore.moveTask("task-build-landing", "ready"))
    compare(TaskStore.taskById("task-build-landing").columnId, "ready")
    compare(TaskStore.countForColumn("ready"), ready + 1)
    compare(TaskStore.revision, before + 1)
}

function test_add_rejects_blank_title() {
    compare(TaskStore.addTask("   ", "backlog", "medium"), "")
}
```

- [ ] **Step 2: Verify RED**

Run: `cmake --build build/qt-kanban && ctest --test-dir build/qt-kanban --output-on-failure`

Expected: FAIL because the singleton lacks the data/properties/functions.

- [ ] **Step 3: Implement the minimal store**

Use one `ListModel` with canonical roles `id`, `title`, `description`, `columnId`, `priority`, `dueDate`, `comments`, `checklistDone`, `checklistTotal`, and `assignee`. `priorityFilter` stores lowercase `all|high|medium|low`. Every mutation increments `revision`; derived functions read it before scanning the model. Seed realistic data including Korean, long text, completed checklist, High priority, and missing optional metadata. `reset()` restores filters, data, initial selection, and a deterministic revision.

- [ ] **Step 4: Verify GREEN**

Run: `cmake --build build/qt-kanban && ctest --test-dir build/qt-kanban --output-on-failure`

Expected: smoke and store tests pass.

- [ ] **Step 5: Commit the store**

```bash
git add examples/qt-kanban/src/Northstar/Kanban/TaskStore.qml examples/qt-kanban/tests/quick
git commit -m "feat(qt-kanban): add deterministic task store"
```

### Task 3: Encode DESIGN.md, Theme, and the local icon family

**Files:**
- Create: `examples/qt-kanban/DESIGN.md`
- Modify: `examples/qt-kanban/src/Northstar/Kanban/Theme.qml`
- Create: `examples/qt-kanban/src/Northstar/Kanban/assets/icons/add.svg`
- Create: `examples/qt-kanban/src/Northstar/Kanban/assets/icons/board.svg`
- Create: `examples/qt-kanban/src/Northstar/Kanban/assets/icons/close.svg`
- Create: `examples/qt-kanban/src/Northstar/Kanban/assets/icons/filter.svg`
- Create: `examples/qt-kanban/src/Northstar/Kanban/assets/icons/help.svg`
- Create: `examples/qt-kanban/src/Northstar/Kanban/assets/icons/inbox.svg`
- Create: `examples/qt-kanban/src/Northstar/Kanban/assets/icons/search.svg`
- Create: `examples/qt-kanban/src/Northstar/Kanban/assets/icons/settings.svg`
- Create: `examples/qt-kanban/src/Northstar/Kanban/assets/icons/timeline.svg`
- Modify: `examples/qt-kanban/src/Northstar/Kanban/CMakeLists.txt`
- Create: `examples/qt-kanban/tests/quick/tst_theme.qml`

**Interfaces:**
- Consumes: inherited `Qt.application.font.pixelSize`
- Produces: typed singleton color, type, spacing, radius, geometry, motion, and breakpoint tokens

- [ ] **Step 1: Write failing Theme tests**

Assert exact approved color values, 4 px spacing scale, 6/9 px radii, 224/72/300 px shell widths, 1560/1180/900 breakpoints, `focus` distinct from `cobalt`, font sizes scaling from a mutable/injected base, and durations becoming zero when `motionEnabled` is false.

- [ ] **Step 2: Verify RED**

Run: `cmake --build build/qt-kanban && ctest --test-dir build/qt-kanban --output-on-failure`

Expected: FAIL because Theme contains only its temporary motion flag.

- [ ] **Step 3: Write the exact design contract and singleton**

Copy the approved 7-section contract from `docs/superpowers/specs/2026-07-11-qt-kanban-demo-design.md`. Theme must expose at least:

```qml
readonly property color canvas: "#F4F7FA"
readonly property color surface: "#FFFFFF"
readonly property color sidebar: "#13202D"
readonly property color ink: "#17212B"
readonly property color muted: "#647184"
readonly property color controlBorder: "#8796A8"
readonly property color cobalt: "#2563EB"
readonly property color focus: "#1D4ED8"
readonly property color greenInk: "#14613F"
readonly property color coralInk: "#9F2F24"
readonly property int space1: 4
readonly property int space2: 8
readonly property int space3: 12
readonly property int space4: 16
readonly property int cardRadius: 9
readonly property int sidebarWide: 224
readonly property int sidebarCompact: 72
readonly property int drawerWidth: 300
readonly property int persistentDrawerBreakpoint: 1560
readonly property int compactSidebarBreakpoint: 1180
property bool motionEnabled: true
readonly property int feedbackDuration: motionEnabled ? 120 : 0
readonly property int transitionDuration: motionEnabled ? 180 : 0
```

Derive type roles from `baseFontPixelSize`, initialized as `Qt.application.font.pixelSize > 0 ? Qt.application.font.pixelSize : 13`; leave that property mutable for enlarged-font tests. Requested weights may resolve to the nearest system weight.

- [ ] **Step 4: Add original SVG resources**

Every icon uses `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `stroke-width="1.75"`, `stroke-linecap="round"`, and `stroke-linejoin="round"`. Use one or two simple paths per icon; no copied library paths. Register all nine resources in the module. Controls consume them through `icon.source` and `icon.color` so one Theme tint applies.

- [ ] **Step 5: Verify GREEN plus lint**

```bash
cmake --build build/qt-kanban --parallel
cmake --build build/qt-kanban --target all_qmllint
ctest --test-dir build/qt-kanban --output-on-failure
```

Expected: Theme tests, lint, smoke, and store tests pass.

- [ ] **Step 6: Commit design primitives**

```bash
git add examples/qt-kanban/DESIGN.md examples/qt-kanban/src/Northstar/Kanban/Theme.qml \
  examples/qt-kanban/src/Northstar/Kanban/assets examples/qt-kanban/tests/quick
git commit -m "feat(qt-kanban): add Northstar design tokens"
```

### Task 4: Build the responsive application shell

**Files:**
- Modify: `examples/qt-kanban/src/Northstar/Kanban/KanbanView.qml`
- Create: `examples/qt-kanban/src/Northstar/Kanban/Sidebar.qml`
- Create: `examples/qt-kanban/src/Northstar/Kanban/KanbanHeader.qml`
- Create: `examples/qt-kanban/src/Northstar/Kanban/BoardView.qml`
- Create: `examples/qt-kanban/tests/quick/tst_responsive.qml`
- Modify: `examples/qt-kanban/src/Northstar/Kanban/CMakeLists.txt`
- Modify: `examples/qt-kanban/tests/quick/CMakeLists.txt`

**Interfaces:**
- Produces stable object names: `kanbanView`, `sidebar`, `kanbanHeader`, `boardView`, `searchField`, `priorityFilter`, `newTaskButton`
- Produces responsive properties: `sidebarWidth`, `drawerPersistent`, `drawerOverlay`, `boardContentWidth`

- [ ] **Step 1: Write failing responsive tests**

Instantiate `KanbanView` at 1600, 1300, 1000, and 900 px. Assert sidebar widths 224/224/72/72, persistent drawer only at 1600, overlay drawer below 1560, column minimum width retained, and horizontal board overflow at compact widths. Assert no direct Layout child also binds anchors or explicit geometry through code review plus `qmllint`.

- [ ] **Step 2: Verify RED**

Run: `cmake --build build/qt-kanban && ctest --test-dir build/qt-kanban --output-on-failure`

Expected: FAIL because responsive properties/components do not exist.

- [ ] **Step 3: Implement Layout-owned shell geometry**

Use a top-level `RowLayout`: Sidebar, main `ColumnLayout`, and persistent drawer slot. The board is a horizontal `Flickable` whose content columns never shrink below Theme's minimum. Overlay drawer support is an `Overlay.modal` child owned by `KanbanView`, not a direct Layout child. Sidebar nonfunctional destinations show one shared restrained toast/status label.

- [ ] **Step 4: Verify GREEN**

```bash
cmake --build build/qt-kanban --parallel
cmake --build build/qt-kanban --target all_qmllint
ctest --test-dir build/qt-kanban --output-on-failure
```

Expected: responsive tests pass at all four widths with clean lint.

- [ ] **Step 5: Commit the shell**

```bash
git add examples/qt-kanban/src/Northstar/Kanban examples/qt-kanban/tests/quick
git commit -m "feat(qt-kanban): build responsive desktop shell"
```

### Task 5: Add columns, cards, selection, search, and filtering

**Files:**
- Create: `examples/qt-kanban/src/Northstar/Kanban/KanbanColumn.qml`
- Create: `examples/qt-kanban/src/Northstar/Kanban/TaskCard.qml`
- Modify: `examples/qt-kanban/src/Northstar/Kanban/BoardView.qml`
- Modify: `examples/qt-kanban/src/Northstar/Kanban/KanbanHeader.qml`
- Create: `examples/qt-kanban/tests/quick/tst_card.qml`
- Create: `examples/qt-kanban/tests/quick/tst_interactions.qml`

**Interfaces:**
- `TaskCard` requires `taskId` and emits `activated(string taskId)`
- Cards expose `objectName: "taskCard-" + taskId`; columns expose `objectName: "column-" + columnId`
- Board consumes `TaskStore.visibleInColumn()` and `TaskStore.revision`

- [ ] **Step 1: Write failing card/board tests**

Assert store-derived counts, stage accents (never fake percentage), variable card content, selected/focus ring distinction, High/Medium/Low mappings, click/Enter/Space sharing one activation signal, CJK/long-text wrapping without zero/clipped height, optional-metadata fallback, case-insensitive search, priority filter, and recoverable empty-search state.

- [ ] **Step 2: Verify RED**

Run: `cmake --build build/qt-kanban && ctest --test-dir build/qt-kanban --output-on-failure`

Expected: FAIL because board/card types and filtering bindings are absent.

- [ ] **Step 3: Implement cards and columns**

Use standard Controls for interactive primitives and one `FocusScope` per card. State precedence is disabled, drag, keyboard focus, selected, pressed, hover, normal. Selection uses a 2 px cobalt outline; focus adds a separate outer focus ring with 2 px gap; High adds the coral leading edge. The card's accessible press action, pointer tap, Enter, and Space all call one `activate()` function. Initials-based avatars expose the full assignee name to accessibility instead of the initials alone.

- [ ] **Step 4: Verify GREEN**

Run build, `all_qmllint`, and CTest. Expected: all card/board/search/filter assertions pass with no QML warnings.

- [ ] **Step 5: Commit board interactions**

```bash
git add examples/qt-kanban/src/Northstar/Kanban examples/qt-kanban/tests/quick
git commit -m "feat(qt-kanban): add searchable Kanban board"
```

### Task 6: Add the detail drawer and new-task dialog

**Files:**
- Create: `examples/qt-kanban/src/Northstar/Kanban/DetailDrawer.qml`
- Create: `examples/qt-kanban/src/Northstar/Kanban/NewTaskDialog.qml`
- Modify: `examples/qt-kanban/src/Northstar/Kanban/KanbanView.qml`
- Modify: `examples/qt-kanban/tests/quick/tst_interactions.qml`

**Interfaces:**
- Drawer consumes `TaskStore.selectedTaskId`, `taskById`, `moveTask`, and `moveSelectedAdjacent`
- Dialog calls `TaskStore.addTask(title, columnId, priority)` and exposes `openFrom(Item invoker)`

- [ ] **Step 1: Write failing drawer/dialog tests**

Assert initial selected task details, persistent empty state after clear selection, full/overlay breakpoint behavior, labeled Move to column control, Control+Shift+Left/Right adjacent movement, blank-title validation, successful creation/count/selection, default Create and cancel semantics, Escape priority, focus containment while modal, and focus restoration to the invoking card/button after close.

- [ ] **Step 2: Verify RED**

Run CTest. Expected: FAIL because drawer/dialog types and focus behavior are absent.

- [ ] **Step 3: Implement modal and persistent behavior**

Use Controls `Drawer`/`Dialog` semantics where they satisfy focus and accessibility; style them against Theme on Basic. The persistent drawer is an in-layout panel at ≥1560. Overlay drawer/dialog use the approved scrim and contain focus only while open. On close, call `forceActiveFocus(Qt.TabFocusReason)` on the saved invoker if it still exists.

- [ ] **Step 4: Verify GREEN**

Run build, lint, and CTest. Expected: drawer/dialog interaction and focus tests pass.

- [ ] **Step 5: Commit details and creation**

```bash
git add examples/qt-kanban/src/Northstar/Kanban examples/qt-kanban/tests/quick
git commit -m "feat(qt-kanban): add task details and creation"
```

### Task 7: Implement cross-column drag with a keyboard equivalent

**Files:**
- Create: `examples/qt-kanban/src/Northstar/Kanban/DragTaskVisual.qml`
- Modify: `examples/qt-kanban/src/Northstar/Kanban/BoardView.qml`
- Modify: `examples/qt-kanban/src/Northstar/Kanban/KanbanColumn.qml`
- Modify: `examples/qt-kanban/src/Northstar/Kanban/TaskCard.qml`
- Create: `examples/qt-kanban/tests/quick/tst_drag.qml`

**Interfaces:**
- Board functions: `beginDrag(taskId, sourceItem, scenePosition)`, `updateDrag(scenePosition)`, `finishDrag()`
- Board properties: `dragActive`, `dragTaskId`, `dragSource`
- Drop key: `northstar-task`

- [ ] **Step 1: Write the failing real pointer-drag test**

After `TaskStore.reset()`, locate a card in Backlog and the Ready `DropArea`; issue mouse press/move/release across the real surface. Assert the task remains Backlog before production drag exists, then define desired assertions: final `columnId === "ready"`, counts change, selection remains stable, drag state settles false, and board Flickable is interactive again.

- [ ] **Step 2: Verify RED**

Run: `ctest --test-dir build/qt-kanban --output-on-failure`

Expected: pointer test FAILS because no drag coordinator/drop behavior exists. Store-level move tests remain green.

- [ ] **Step 3: Implement one drag coordinator**

`TaskCard` starts a `DragHandler`; the card remains in layout. `DragTaskVisual` is reparented to the board overlay, owns `Drag.active`, `Drag.source`, and `Drag.keys: ["northstar-task"]`, and follows scene coordinates. Each column `DropArea` accepts the key and calls `TaskStore.moveTask(drop.source.taskId, columnId)`. Disable horizontal Flickable interaction after the card handler claims the gesture and restore it in every finish/cancel path.

- [ ] **Step 4: Verify GREEN plus keyboard equivalence**

Run build, lint, and CTest. Expected: pointer drag passes, existing Move to column and adjacent keyboard actions call the same store operations, and no binding/layout warnings appear.

- [ ] **Step 5: Commit drag behavior**

```bash
git add examples/qt-kanban/src/Northstar/Kanban examples/qt-kanban/tests/quick
git commit -m "feat(qt-kanban): add accessible cross-column movement"
```

### Task 8: Close accessibility, focus, RTL, font-scale, and motion gaps

**Files:**
- Modify: `examples/qt-kanban/tests/quick/tst_qtkanban.cpp`
- Create: `examples/qt-kanban/tests/quick/tst_accessibility.qml`
- Modify: `examples/qt-kanban/tests/quick/tst_responsive.qml`
- Modify: `examples/qt-kanban/tests/quick/tst_interactions.qml`
- Modify as proven by RED: affected QML components

**Interfaces:**
- Produces C++ `AccessibilityProbe` for accessible name, role, focus, and press action
- Produces stable Tab order: sidebar, search, priority, New task, cards by column, drawer controls

- [ ] **Step 1: Write failing adaptation/accessibility tests**

Assert card Button role/name/focused state/action; icon-only control names; decorative metadata ignored; logical Tab/Shift-Tab order; RTL mirroring and directional-icon behavior; 1.35× inherited base font without clipped labels/targets; `motionEnabled: false` zero durations and deterministic final states; focus restoration; and mouse/keyboard/accessibility selection convergence.

- [ ] **Step 2: Verify RED**

Run CTest. Expected: at least accessibility-probe, RTL, and enlarged-font assertions fail.

- [ ] **Step 3: Implement the minimal fixes proven by tests**

Expose the probe with `QUICK_TEST_MAIN_WITH_SETUP`, set `Accessible` roles/names/actions, mark decoration ignored, add stable object names, use FocusScope/KeyNavigation/`visualFocus`, mirror with `LayoutMirroring`, replace fixed text heights with content-driven implicit sizes, and bind all nonessential durations to Theme motion values.

- [ ] **Step 4: Verify GREEN and run module-aware lint**

```bash
cmake --build build/qt-kanban --parallel
cmake --build build/qt-kanban --target all_qmllint
ctest --test-dir build/qt-kanban --output-on-failure
```

Expected: all Quick tests pass and lint reports no warnings/errors.

- [ ] **Step 5: Commit inclusive behavior**

```bash
git add examples/qt-kanban
git commit -m "fix(qt-kanban): complete adaptive accessibility behavior"
```

### Task 9: Add native launch/capture support and perform visual QA

**Files:**
- Modify: `examples/qt-kanban/src/app/main.cpp`
- Modify: `examples/qt-kanban/src/app/CMakeLists.txt`
- Modify: `examples/qt-kanban/src/Northstar/Kanban/Main.qml`
- Create: `examples/qt-kanban/scripts/capture-macos.sh`
- Create at runtime only: `.superloopy/evidence/frontend/20260711-qt-kanban/DESIGN_TOKENS.md`
- Create at runtime only: `.superloopy/evidence/frontend/20260711-qt-kanban/VISUAL_QA.md`
- Create at runtime only: `.superloopy/evidence/frontend/20260711-qt-kanban/northstar-1600x1000.png`
- Create at runtime only: `.superloopy/evidence/frontend/20260711-qt-kanban/northstar-1000x700.png`

**Interfaces:**
- App options: `--window-size WIDTHxHEIGHT`, `--quit-after-ready`
- Readiness log: `NORTHSTAR_READY`
- Capture script arguments: executable path, width, height, output path

- [ ] **Step 1: Add a failing launch-option test path**

Register two failing CTest cases in app CMake: `qtkanban.launch` runs offscreen with `--window-size 1000x700 --quit-after-ready` and requires `NORTHSTAR_READY 1000x700`; `qtkanban.invalid-size` runs `--window-size 800x600 --quit-after-ready` with `WILL_FAIL TRUE`. Before implementation both fail because the options/readiness contract is absent.

- [ ] **Step 2: Implement deterministic native launch**

Use `QCommandLineParser` to parse `WIDTHxHEIGHT`, validate minimum 900×640, pass `initialWidth`/`initialHeight` through `QQmlApplicationEngine::setInitialProperties`, then load the module. Connect once to the root `QQuickWindow::afterRendering` signal, marshal back to the GUI thread, log `NORTHSTAR_READY WIDTHxHEIGHT`, and quit only when `--quit-after-ready` is set.

- [ ] **Step 3: Implement macOS capture without a new dependency**

The script launches the native app, waits for `NORTHSTAR_READY`, stores the AX window number in `${window_id}`, and calls `screencapture -x -l "${window_id}" "${output_path}"`. If Accessibility/Automation permission prevents AX lookup, fall back to interactive `screencapture -w` and record that manual path in `VISUAL_QA.md`; never substitute an offscreen/client grab for native chrome.

- [ ] **Step 4: Run native visual/interaction QA**

Capture 1600×1000 and 1000×700. Open both images and inspect hierarchy, token use, alignment, selected/focus/High/drag states, overlay behavior, long/Korean text, icon coherence, clipping, and the visible-copy bans (no em dash, AI cliché, emoji icon, fake statistic, or placeholder name). Exercise drag, keyboard move, search/filter, empty search, new task, Escape, Tab order, RTL, enlarged font, motion disabled, and VoiceOver/Accessibility Inspector. Fix any source defect and recapture; do not weaken an interaction to clear a check.

- [ ] **Step 5: Write evidence and record the pass**

Copy the generated mockup into the evidence directory as the target. `VISUAL_QA.md` records platform, macOS/Qt/Basic style, DPR, locale, graphics backend, capture method, window sizes, exercised states, findings/fixes, source paths, accessibility evidence, and any limitation. If an active Superloopy loop exists, record it with:

```bash
superloopy loop evidence --status pass \
  --artifact .superloopy/evidence/frontend/20260711-qt-kanban/VISUAL_QA.md \
  --notes "Qt Kanban native visual QA"
```

Without active loop state, keep the same `VISUAL_QA.md` evidence and do not create unrelated loop state merely to run the command.

- [ ] **Step 6: Commit launch/capture support**

```bash
git add examples/qt-kanban/src/app/main.cpp examples/qt-kanban/scripts/capture-macos.sh
git commit -m "test(qt-kanban): add native visual QA capture"
```

### Task 10: Inventory, final validation, and runnable handoff

**Files:**
- Modify: `docs/superloopy-file-audit.md`
- Modify: `docs/superloopy-loop-golden-set.md`
- Modify: `README.md`
- Modify: `README.ko.md`
- Modify: `test/docs.test.js`
- Test: all Qt and repository tests

**Interfaces:**
- Produces: exact launch path `build/qt-kanban/src/app/qtkanban`
- Produces: documented configure/build/test/run commands and complete file inventories

- [ ] **Step 1: Add failing docs/inventory expectations**

Update `test/docs.test.js` to require the English/Korean README to link `examples/qt-kanban` and show the exact Qt configure/build/run commands. Run docs/file-audit tests before docs changes; expect missing demo documentation/inventory failures.

- [ ] **Step 2: Update user-facing handoff and inventories**

Add a concise Qt Kanban demo section to English/Korean README with:

```bash
qt-cmake -S examples/qt-kanban -B build/qt-kanban -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build/qt-kanban --parallel
build/qt-kanban/src/app/qtkanban --window-size 1600x1000
```

Add one exact golden/file-audit row for every Git-visible example, test, script, and plan file. Describe QML/C++ as original Superloopy demo code and SVGs as original local assets.

- [ ] **Step 3: Run complete Qt validation from a clean build directory**

```bash
qt-cmake -S examples/qt-kanban -B build/qt-kanban-release -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build/qt-kanban-release --parallel
cmake --build build/qt-kanban-release --target all_qmllint
ctest --test-dir build/qt-kanban-release --output-on-failure
```

Expected: fresh configure/build/lint/tests all exit 0 with no QML warnings.

- [ ] **Step 4: Run repository and package validation**

```bash
node --test test/docs.test.js test/file-audit.test.js test/frontend-qt-contract.test.js test/plugin.test.js
npm test
npm pack --dry-run --json
git diff --check
```

Expected: all commands exit 0 and package inspection includes the updated skill references plus the intended example files.

- [ ] **Step 5: Commit the runnable handoff**

```bash
git add README.md README.ko.md docs/superloopy-file-audit.md docs/superloopy-loop-golden-set.md test/docs.test.js
git commit -m "docs: publish runnable Qt Kanban demo"
```
