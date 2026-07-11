# Signal Bench Design Contract

## Purpose

Signal Bench is a Qt Widgets acceptance fixture for two visual identities that share one application model and behavior layer. It is an original desktop audio-tuning concept, not a recreation of another product. The preferred client size is 1280 x 800; the minimum supported size is 1000 x 680.

The interface contains a stock identity selector and status header, an identity-specific preset picker, a response graph above a band table, three rotary controls, and a status strip. It uses deterministic local data only. Networking, audio processing, persistence, animation, and custom window chrome are out of scope.

## Build and Run

From the repository root:

```bash
cmake -S examples/qt-widgets-identities -B build/qt-widgets-identities -G Ninja -DCMAKE_PREFIX_PATH=/opt/homebrew
cmake --build build/qt-widgets-identities
build/qt-widgets-identities/qtwidgetsidentities
```

Use `--identity rack` to start in Hardware Rack, `--window-size 1000x680` to exercise the supported minimum, and `--gallery <directory>` to write the fixed client-pixel matrix. Run `ctest --test-dir build/qt-widgets-identities --output-on-failure` for the acceptance suite. The current native proof target is macOS; Windows and Linux native appearance remain unverified.

## Shared Product Rules

- The native window frame, platform application font, focus behavior, cursor timing, and accessibility preferences remain runtime-owned.
- Content uses the inherited platform UI font. Numeric readouts use the platform fixed-width system font; no font or raster asset is bundled.
- Color is never the only state cue. Labels, outlines, position, or indicator form must carry the same meaning.
- Focus and selection are separate. Keyboard focus always has a visible outer indicator; selection remains visible when focus moves.
- State precedence is: disabled, inactive, pressed, keyboard focus, selected or checked, hover, normal. Custom painters derive the effective `QPalette` color group from resolved Qt state before reading branded semantic roles.
- Layout uses device-independent coordinates and Qt layouts. Long English, Korean, RTL text, emoji, and enlarged fonts must not clip primary controls.
- Horizontal scrolling is not part of the designed surface. Tables resize their columns to the available width.

## Precision Lab Constitution

Precision Lab is a measured workspace in which the response curve, aligned values, and column structure lead. Its UI is compact, flat, and quiet.

- Hierarchy: graph first, numerical band data second, controls third.
- Typography: inherited UI font; fixed-width numeric values; sentence-case labels.
- Geometry: 4 px rhythm, 4 px corners, 1 px hairlines, 34 px rows, thin dial arcs.
- Depth: flat tonal separation with one visual layer; no decorative shadow, texture, glow, or hardware ornament.
- State language: cobalt outlines and leading markers accompany explicit text or value changes.
- Extension rule: align new elements to the analysis grid and give every state a non-color cue.

## Hardware Rack Constitution

Hardware Rack groups the same functions into clear instrument modules. It feels tactile through geometry and tonal layering while keeping software labels and focus behavior unambiguous.

- Hierarchy: named modules and large controls first, signal data second.
- Typography: inherited UI font; fixed-width readouts; uppercase module labels only.
- Geometry: 8 px rhythm, 8 px panel corners, 50 px rows, inset wells, broad rotary silhouettes.
- Depth: three controlled tonal layers; painted rails and fasteners are noninteractive. No bitmap texture, fake wear, or clutter.
- State language: position, outline, label, and lamp form reinforce amber or green signals.
- Extension rule: place each new element inside a named module and preserve a clear label, value, focus indicator, and accessible name.

The identities fail the contract if they differ only by color. Their picker class, density, geometry, depth, delegate metrics, graph grammar, dial form, hierarchy, and state treatment must remain visibly distinct.

## IdentityTheme Tokens

These names and values map directly to `IdentityTheme`. Colors use opaque sRGB hex values.

| Field | Precision Lab | Hardware Rack |
| --- | --- | --- |
| `id` | `precision` | `rack` |
| `displayName` | `Precision Lab` | `Hardware Rack` |
| `canvas` | `#E9EEF5` | `#15181D` |
| `surface` | `#FFFFFF` | `#20252C` |
| `panel` | `#F6F8FB` | `#2A3038` |
| `text` | `#172033` | `#F3EEE2` |
| `muted` | `#637188` | `#A9B0B8` |
| `accent` | `#2F6FED` | `#EFA43A` |
| `focus` | `#174FBF` | `#FFC462` |
| `grid` | `#D4DCE8` | `#4A525D` |
| `trace` | `#079E96` | `#62D486` |
| `warning` | `#B86508` | `#FFBD57` |
| `rowHeight` | `34` | `50` |
| `spacing` | `4` | `8` |
| `radius` | `4` | `8` |
| `depthLayers` | `1` | `3` |
| `pickerKind` | `Table` | `Cards` |
| `graphGrammar` | `Cartesian` | `Instrument` |
| `dialGrammar` | `Arc` | `Hardware` |

## State Token Mapping

QSS applies `canvas`, `surface`, `panel`, `text`, `muted`, `accent`, `focus`, and `grid` to supported stock-widget chrome inside the content root. Hover borders use `accent`; keyboard-focus borders use `focus`; disabled labels use `muted` over `canvas`. Delegate selection mixes `accent` into the row background at 16% in Precision and 28% in Rack, while disabled rows mix `canvas` into the resolved background at 60%. Identity tokens are mapped onto Active, Inactive, and Disabled `QPalette` roles at picker, table, and dial boundaries. Custom painters choose the effective group from resolved Qt state and read the supplied palette roles directly, so caller overrides remain authoritative.

## Geometry Tokens

| Role | Precision Lab | Hardware Rack |
| --- | --- | --- |
| Content margin | 18 px horizontal, 16 px top | 18 px horizontal, 16 px top |
| Panel padding | 12 px | 12 px |
| Stock control minimum height | 28 px | 28 px |
| Dial minimum diameter | 92 px | 92 px |
| Focus stroke | 2 px dashed | 2 px solid |
| Graph minimum size | 360 x 220 px | 360 x 220 px |
| Preset scroll mode | per pixel | per pixel |

## Component and State Grammar

- Stock buttons, selectors, editors, headers, scrollbars, and documented view/item states are QSS-led. The picker factory owns structure; QSS owns its supported stock chrome. QSS does not paint the graph, dials, or delegate rows.
- Precision selection uses an accent-mixed surface, a cobalt leading rule, and the existing selected-row text. Rack selection uses an amber-mixed card plus the preset status label.
- Precision focus uses a cobalt outer rectangle. Rack focus uses an amber outer rectangle. Neither focus treatment replaces selection.
- Stock-control hover changes the border to `accent`; pressed behavior remains owned by the host widget. Labels and values stay present.
- Disabled controls keep their outline, label, and value. Stock labels move to `muted`; custom graph and dial paint loses contrast without changing geometry or semantics.
- Warnings use `warning` plus warning text or shape. The response trace uses `trace`; grid and trace colors never communicate selection.
- Decorative rails, screws, grid lines, ticks, and lamps are paint-only and never become focusable or accessible children.

## Ownership Boundaries

- `SessionModel` owns preset and band data, the shared preset `QItemSelectionModel`, and the serialized session snapshot.
- `SignalBenchWindow` owns actions, input routing, focus restoration, splitter state, and identity switching.
- `BandDelegate` owns band-row painting and `sizeHint()` while honoring the supplied style option's enabled, selected, focused, active, and layout-direction state.
- `ResponseGraph` owns graph painting only and remains informational with a stable accessible name and description.
- `SignalDial` replaces painting only. `QDial` continues to own range, value, keyboard, wheel, hit testing, and accessibility semantics.
- `createPresetPicker()` may return a `QTableView` or `QListView`, but both receive the same model, selection model, activation action, and accessible meaning.
- No custom `QStyle` or `QProxyStyle` is allowed. The application content subtree has one QSS owner; native top-level chrome remains outside it.

Identity switching rebuilds only the picker subtree. A real switch preserves model and action pointers, selection, current index, per-pixel scroll value, picker focus intent, active band editor, splitter sizes, dial values, and the byte-identical session snapshot. Reapplying the active identity is a no-op.

Preset activation and serialization use the shared selection model's selected row, not its independently movable current index. With no selected row, the action and button are disabled, the status strip explicitly reports that no preset is selected, and activation emits no domain signal. The gallery's Normal and Focused states intentionally retain only a current index; Selected and Disabled add selection.

## Deterministic Gallery

Gallery rendering uses fixed fixture data, a 1280 x 800 client surface, Qt 6.11.1, the offscreen QPA backend, DPR 1, 96 DPI, `en_US.UTF-8` locale, the pinned Fusion style, software rendering, and no animation. The executable pins those values before constructing `QApplication` only when `--gallery` is present, so caller scale, style, locale, or platform environment does not alter the same-host artifact. Native captures continue to use the platform style. The gallery produces exactly:

- `precision_normal.png`
- `precision_focused.png`
- `precision_selected.png`
- `precision_disabled.png`
- `rack_normal.png`
- `rack_focused.png`
- `rack_selected.png`
- `rack_disabled.png`

Generation fails on a missing or extra PNG, a size other than 1280 x 800, any pixel whose alpha is not 255, a write failure, or a visible horizontal scrollbar with a positive range. These files prove deterministic client pixels on the pinned host/font stack only; they do not replace Qt Test, native macOS capture, or accessibility inspection.
