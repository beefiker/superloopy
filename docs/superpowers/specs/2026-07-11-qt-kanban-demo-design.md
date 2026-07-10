# Qt Kanban Demo Design

## Goal

Build a polished, runnable Qt Quick/QML Kanban desktop application that serves as the end-to-end acceptance fixture for Superloopy's Qt frontend workflow. The demo must prove the updated skill can route Qt correctly, produce a coherent branded desktop surface with native macOS chrome/input behavior, and validate it without browser-only gates.

The application lives at `examples/qt-kanban` and builds with the installed Qt 6.11.1 toolchain. It uses only Qt modules already supplied by `qtbase`, `qtdeclarative`, and `qtsvg`.

## Visual Target

Use the generated Northstar mockup as the image-first target:

`/Users/robster/.codex/generated_images/019f4be4-aebe-7231-85eb-b7f1b714ad13/exec-cb5102b0-b8a1-40cd-9973-66f3a7b4bc8d.png`

Translate its hierarchy and density into a real application rather than reproducing generated text or faces. The result uses real QML text, initials-based avatars, standard native window chrome, and deterministic application data.

**Design Read:** a desktop planning instrument for product teams, calm editorial language, cool paper and graphite with one cobalt signal.

- `DESIGN_VARIANCE`: 6
- `MOTION_INTENSITY`: 4
- `VISUAL_DENSITY`: 7

## Architecture

- CMake configures a reusable `qtkanban_ui` QML module, a thin Qt Quick executable, and a Qt Quick Test executable that imports the same module.
- `main.cpp` calls `QQuickStyle::setStyle("Basic")` before creating the engine. Application QML imports `QtQuick.Controls`, never `QtQuick.Controls.Basic` directly.
- `Theme.qml` is a registered singleton containing application-owned visual tokens. It does not replace system font, accessibility, or input behavior.
- `TaskStore.qml` is a registered singleton containing deterministic in-memory task data and operations for selection, search, filtering, creation, column moves, and test reset.
- `Main.qml` owns only the `ApplicationWindow`; `KanbanView.qml` owns the embeddable responsive shell used by both the app and Quick Test.
- Focused components own the sidebar, header, columns, cards, detail drawer, and task-creation dialog.

Persistence, networking, authentication, undo history, and production drag reordering within the same column are out of scope. Cross-column drag, keyboard selection, search, filtering, and adding a task are in scope.

## DESIGN.md Contract

The implementation creates `examples/qt-kanban/DESIGN.md` with these exact application tokens.

### Atmosphere

Cool-paper planning desk. Dense information remains breathable through hairline structure, precise alignment, and tonal separation. Cobalt marks selection and action; coral and green are semantic only. No gradients, glow, glass, oversized pills, or decorative shadows.

### Color

| Token | Value | Role |
| --- | --- | --- |
| `canvas` | `#F4F7FA` | board background |
| `surface` | `#FFFFFF` | cards, header, drawer |
| `sidebar` | `#13202D` | navigation chrome |
| `sidebarActive` | `#263748` | selected navigation item |
| `ink` | `#17212B` | primary text |
| `muted` | `#647184` | secondary text |
| `border` | `#DCE3EA` | hairlines and card borders |
| `borderStrong` | `#C5CFDA` | active dividers |
| `controlBorder` | `#8796A8` | essential control boundary |
| `cobalt` | `#2563EB` | primary action, focus, selection |
| `cobaltSoft` | `#E8F0FF` | selected and medium-priority surfaces |
| `onCobalt` | `#FFFFFF` | primary-action text/icon |
| `focus` | `#1D4ED8` | keyboard focus ring |
| `green` | `#2F9D67` | Review stage accent and completed checklist |
| `greenSoft` | `#E7F5ED` | low-emphasis success surface |
| `greenInk` | `#14613F` | success text on `greenSoft` |
| `coral` | `#E45B4B` | High priority only |
| `coralSoft` | `#FDECE9` | High-priority surface |
| `coralInk` | `#9F2F24` | High text on `coralSoft` |
| `neutralSoft` | `#EEF2F6` | Low-priority and neutral tags |
| `neutralInk` | `#445163` | text on `neutralSoft` |
| `sidebarText` | `#F4F7FA` | sidebar text and icons |
| `hover` | `#EDF3FF` | interactive hover surface |
| `pressed` | `#D8E5FF` | interactive pressed surface |
| `disabledSurface` | `#E8EDF2` | disabled control surface |
| `disabledInk` | `#7A8796` | disabled content |
| `scrim` | `#6617212B` | modal overlay scrim, ARGB |

All primary text pairs meet WCAG AA contrast. Semantic tags use their darker ink tokens on soft surfaces, essential control boundaries meet 3:1, and state is never communicated by color alone.

### Typography

Use the inherited platform application font and scale every role from its effective base pixel size so enlarged system/application fonts propagate. At the default base, targets are `title 26/650`, `section 16/600`, `cardTitle 14/600`, `body 13/400`, `label 12/550`, and `meta 11/500`, with line heights between 1.2 and 1.45. Requested weights may resolve to the nearest system-font weight. Do not introduce a bundled font.

### Spacing and Geometry

Use a 4 px base scale: 4, 8, 12, 16, 20, 24, and 32. Sidebar width is 224 px, persistent detail drawer width is 300 px, board gutter is 12 px, column width is 244-280 px, and card padding is 14 px. Radii are 6 px for controls/tags and 9 px for cards/panels. Borders are 1 px.

At 1560 px and wider, show the 224 px sidebar and persistent 300 px detail drawer. From 1180-1559 px, keep the full sidebar and overlay the drawer. From 900-1179 px, use a 72 px icon-and-initial sidebar and overlay the drawer. Overlay drawers use the scrim, contain focus, and restore focus to the invoking card when closed. The minimum supported window size is 900 x 640; the board scrolls horizontally rather than crushing columns.

### Components and States

- Sidebar: workspace identity, Board/Timeline/Inbox navigation, team initials, settings, and help. Only Board is functional; other entries show a restrained status message.
- Header: board title, date range, search, priority filter, collaborators, and cobalt New task action.
- Column: title, store-derived count, fixed full-width stage accent, drop target, task stack, and Add task affordance. The accent communicates workflow stage, never fake progress.
- Card: variable-height title/content, priority, due date, comments/checklist, assignee initials, selected outline, keyboard focus, and drag state. Cards, columns, header controls, drawer, and dialog expose stable `objectName` values for tests.
- Detail drawer: selected task title, status, assignee, due date, checklist, activity, and close action.
- New task dialog: title, column, priority, default Create action, cancel action, contained focus, and validation.
- Icon family: local monochrome SVGs at 16 and 20 px, 1.75 px stroke, round caps/joins, and consistent optical bounds. Controls tint icons from Theme tokens and expose accessible names. Do not mix Unicode symbol icons, emoji, or unrelated icon styles.

Every interactive control implements normal, hover where available, pressed, keyboard-focus, disabled, and selected/checked states as applicable. Focus and selection are distinct: selection uses the cobalt outline; keyboard focus adds an outer `focus` ring with a 2 px gap. State precedence is disabled, drag, keyboard focus, selected, pressed, hover, normal. Custom card interaction exposes accessible button semantics and Enter/Space activation.

### Motion

Use 120 ms for press/focus feedback and 180 ms for drawer/card transitions with standard ease-out. Drag feedback uses scale and opacity only. Motion is interruptible and reaches deterministic final state. A `motionEnabled` theme setting disables nonessential transitions.

### Depth

Use borders and tonal surface shifts. Selected cards receive a 2 px cobalt outline; High-priority cards receive a 3 px coral leading edge. Do not add drop-shadow stacks.

## Content

Seed four columns with stable keys: `backlog`, `ready`, `inProgress`, and `review`. Use realistic product-launch tasks and names. Include one Korean task title, one long English title, one completed checklist, one High-priority task, and one card without optional metadata to exercise fallback layouts.

Visible copy contains no em dash, AI marketing cliché, emoji icon, fake statistic, or placeholder name.

## Interaction

- `TaskStore` keeps stable task IDs and canonical roles for `id`, `title`, `description`, `columnId`, `priority`, `dueDate`, `comments`, `checklistDone`, `checklistTotal`, and `assignee`. Priority is one of High, Medium, or Low. Selection, query, priority filter, and a monotonically increasing `revision` property make derived views reactive.
- Clicking or pressing Enter/Space on a card selects it and opens the drawer. The initial selection is `task-build-landing`.
- Dragging uses QML `Drag`/`DropArea`, stable column keys, and a separate drag visual so the column layout does not fight delegate geometry. Horizontal board scrolling does not start once a card drag is claimed.
- Dropping calls `moveTask(id, columnId)`, updates store-derived counts, and preserves stable selection. Keyboard and accessibility users move the selected card through a labeled Move to column control in the drawer; `Control+Shift+Left/Right` provides the same adjacent-column action.
- Search filters titles/descriptions and priority filter supports All, High, Medium, and Low without mutating task roles.
- New task validates a non-empty title, adds to the chosen column, selects it, and closes the dialog.
- Escape closes the dialog first, then the drawer. With no selection the persistent drawer shows an intentional empty state. Dialog and overlay drawer trap focus until dismissed and expose default/cancel semantics.
- Tab order is sidebar navigation, search, priority filter, New task, board cards by column, drawer controls. Shift-Tab reverses it, and closing modal UI restores focus to its invoker.

## Native QA

- Configure and build with CMake, run the generated `all_qmllint` target, register Quick Test with CTest, and run it once through `ctest`.
- Capture the real macOS application at 1600 x 1000 and 1000 x 700 after rendering settles. Evidence proves macOS only and does not imply Windows/Linux parity.
- Unit-test `moveTask()` and other store operations, then verify one real pointer drag plus search, filtering, creation, selection, drawer behavior, keyboard traversal, and Escape handling. Reset the singleton store between tests.
- Verify normal, selected, High, disabled, focus, empty-search, long-text, Korean text, RTL mirroring, enlarged-font, motion-disabled, and resized states. The branded demo is light-only; dark-theme parity is out of scope.
- Wait for `windowShown`, activation, polish, and rendering; disable nonessential motion for assertions. Record macOS version, Qt version, Basic style, DPR, locale, graphics backend, capture method, and any unverified native surface in `VISUAL_QA.md`.
- Verify each custom card's accessible name, Button role, focused state, and press action through tests plus macOS Accessibility Inspector or VoiceOver evidence. Mouse, keyboard, and accessibility activation share one selection path.
- Use the target image only for hierarchy and drift review. Generated faces/text and exact pixels are not acceptance criteria.

## Acceptance

The demo passes only when it builds and runs as a real Qt application, focused tests pass, `qmllint` is clean, the interaction checks succeed, the native screenshots are visually reviewed against this contract, and no browser-only validation is used as Qt proof.
