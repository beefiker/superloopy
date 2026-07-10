# Qt Kanban QA and Handoff Plan

> **For agentic workers:** Continue only after Tasks 1-8 in [Qt Kanban acceptance demo](2026-07-11-qt-kanban-demo.md) pass.

**Goal:** Capture native macOS evidence for the Northstar Kanban app and publish its runnable handoff.

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
