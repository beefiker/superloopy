# Northstar Kanban Design Contract

## Atmosphere

Cool-paper planning desk. Dense information remains breathable through hairline structure, precise alignment, and tonal separation. Cobalt marks selection and action; coral and green are semantic only. No gradients, glow, glass, oversized pills, or decorative shadows.

## Color

| Token | Value | Role |
| --- | --- | --- |
| `canvas` | `#F4F7FA` | board background |
| `surface` | `#FFFFFF` | cards, header, drawer |
| `sidebar` | `#13202D` | navigation chrome |
| `sidebarActive` | `#263748` | selected navigation item |
| `sidebarFocus` | `#93C5FD` | keyboard focus on dark navigation |
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

## Typography

Use the inherited platform application font and scale every role from its effective base pixel size so enlarged system/application fonts propagate. At the default base, targets are `title 26/650`, `section 16/600`, `cardTitle 14/600`, `body 13/400`, `label 12/550`, and `meta 11/500`, with line heights between 1.2 and 1.45. Requested weights may resolve to the nearest system-font weight. Do not introduce a bundled font.

## Spacing and Geometry

Use a 4 px base scale: 4, 8, 12, 16, 20, 24, and 32. Sidebar width is 224 px, persistent detail drawer width is 300 px, board gutter is 12 px, column width is 244-280 px, and card padding is 14 px. Radii are 6 px for controls/tags and 9 px for cards/panels. Borders are 1 px.

At 1560 px and wider, show the 224 px sidebar and persistent 300 px detail drawer. From 1180-1559 px, keep the full sidebar and overlay the drawer. From 900-1179 px, use a 72 px icon-and-initial sidebar and overlay the drawer. Overlay drawers use the scrim, contain focus, and restore focus to the invoking card when closed. The minimum supported window size is 900 x 640; the board scrolls horizontally rather than crushing columns.

## Components and States

- Sidebar: workspace identity, Board/Timeline/Inbox navigation, team initials, settings, and help. Only Board is functional; other entries show a restrained status message.
- Header: board title, date range, search, priority filter, collaborators, and cobalt New task action.
- Column: title, store-derived count, fixed full-width stage accent, drop target, task stack, and Add task affordance. The accent communicates workflow stage, never fake progress.
- Card: variable-height title/content, priority, due date, comments/checklist, assignee initials, selected outline, keyboard focus, and drag state. Cards, columns, header controls, drawer, and dialog expose stable `objectName` values for tests.
- Detail drawer: selected task title, status, assignee, due date, checklist, activity, and close action.
- New task dialog: title, column, priority, default Create action, cancel action, contained focus, and validation.
- Icon family: local monochrome SVGs at 16 and 20 px, 1.75 px stroke, round caps/joins, and consistent optical bounds. Controls tint icons from Theme tokens and expose accessible names. Do not mix Unicode symbol icons, emoji, or unrelated icon styles.

Every interactive control implements normal, hover where available, pressed, keyboard-focus, disabled, and selected/checked states as applicable. Focus and selection are distinct: selection uses the cobalt outline; keyboard focus adds an outer `focus` ring with a 2 px gap, while the dark sidebar uses `sidebarFocus` for at least 3:1 non-text contrast. State precedence is disabled, drag, keyboard focus, selected, pressed, hover, normal. Custom card interaction exposes accessible button semantics and Enter/Space activation.

## Motion

Use 120 ms for press/focus feedback and 180 ms for drawer/card transitions with standard ease-out. Drag feedback uses scale and opacity only. Motion is interruptible and reaches deterministic final state. A `motionEnabled` theme setting disables nonessential transitions.

## Depth

Use borders and tonal surface shifts. Selected cards receive a 2 px cobalt outline; High-priority cards receive a 3 px coral leading edge. Do not add drop-shadow stacks.
