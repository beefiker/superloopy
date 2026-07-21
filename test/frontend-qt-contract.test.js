import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const root = "skills/superloopy-frontend";
const reference = (name) => `${root}/references/${name}.md`;

const activationContract = `## Activation

Open your reply with \`SUPERLOOPY FRONTEND ENABLED\`. If another active Superloopy mode mandates its own first line, print that first and this marker on the next line.

**Explicit activation only.** Engage when the user invokes \`$superloopy:superloopy-frontend\` in Codex or \`/superloopy:superloopy-frontend\` in Claude Code for a supported screen-based application UI task, begins such a task with a leading \`loopy\` or \`루피\`, or an already-active Superloopy loop explicitly routes that task here. Interactive deployed content-led Web such as a campaign, publication, or landing experience is supported when navigation, forms, consent, localization, or another user journey is being built or validated; a static image, video, slide deck, document, or other non-interactive artifact is not. A plain mention of UI, frontend, desktop, mobile, SwiftUI, Tauri, Flutter, Qt, QML, Widgets, or a visible symptom is not authorization to activate this workflow. TV, wearable, XR, automotive, game UI, TUI, static media/document artifacts, and backend, API, data, concurrency, or infrastructure work stay with their primary workflows.
`;

async function read(path) {
  assert.equal(existsSync(path), true, `missing ${path}`);
  return (await readFile(path, "utf8")).replace(/\r\n?/gu, "\n");
}

test("frontend contract reader normalizes platform line endings", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "superloopy-frontend-contract-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const path = join(directory, "contract.md");
  await writeFile(path, "## Activation\r\n\r\nBody\r\n", "utf8");

  assert.equal(await read(path), "## Activation\n\nBody\n");
});

test("frontend skill preserves explicit activation while routing Qt through target-specific UX", async () => {
  const skill = await read(`${root}/SKILL.md`);
  const frontmatter = skill.match(/^---\n([\s\S]*?)\n---/u)?.[1] ?? "";
  const activation = skill.match(/## Activation\n[\s\S]*?(?=\n## )/)?.[0];
  assert.equal(activation, activationContract, "the activation section must remain byte-for-byte unchanged");
  assert.match(frontmatter, /screen-based application UI/is);
  assert.match(frontmatter, /browser-hosted Web.*interactive deployed content-led Web.*desktop.*mobile\/tablet.*embedded\/hybrid.*Qt.*custom-rendered.*mixed/is);
  assert.match(frontmatter, /TV.*wearable.*XR.*automotive.*game UI.*TUI/is);
  assert.doesNotMatch(frontmatter, /other visual-deliverable/i);
  assert.match(skill, /Explicit activation only/i);
  assert.match(skill, /browser-hosted DOM.*Qt Widgets on desktop.*Qt Widgets on mobile or tablet.*Qt Quick\/QML on desktop.*Qt Quick\/QML on mobile or tablet.*Qt Quick\/QML on WebAssembly.*Mixed Qt Widgets.*Qt Quick.*desktop.*Mixed Qt Widgets.*Qt Quick.*mobile or tablet.*mixed/is);
  for (const name of ["ux", "desktop", "mobile", "hybrid", "renderer", "web", "qt", "qt-widgets", "qt-quick", "qt-qa"]) {
    assert.match(skill, new RegExp(`references/${name}\\.md`));
  }
  assert.match(skill, /mixed or multi-target.*union.*shared UX.*once.*independent.*evidence/is);
  assert.match(skill, /Qt Widgets on desktop.*references\/ux\.md.*references\/desktop\.md.*references\/qt\.md.*references\/qt-widgets\.md.*references\/qt-qa\.md/is);
  assert.match(skill, /Qt Widgets on mobile or tablet.*references\/ux\.md.*references\/mobile\.md.*references\/qt\.md.*references\/qt-widgets\.md.*references\/qt-qa\.md/is);
  assert.match(skill, /Mixed Qt Widgets.*Qt Quick on desktop.*qt-widgets\.md.*qt-quick\.md.*qt-qa\.md/is);
  assert.match(skill, /Qt Quick\/QML on desktop.*references\/ux\.md.*references\/desktop\.md.*references\/qt\.md.*references\/qt-quick\.md.*references\/qt-qa\.md/is);
  assert.match(skill, /Qt Quick\/QML on mobile or tablet.*references\/ux\.md.*references\/mobile\.md.*references\/qt\.md.*references\/qt-quick\.md.*references\/qt-qa\.md/is);
  assert.match(skill, /Qt Quick\/QML on WebAssembly.*references\/ux\.md.*references\/web\.md.*references\/renderer\.md.*references\/qt\.md.*references\/qt-quick\.md.*references\/qt-qa\.md/is);
  assert.doesNotMatch(skill, /Auto-activate|When in doubt/i);
});

test("browser-hosted DOM web route excludes Qt specialization", async () => {
  const skill = await read(`${root}/SKILL.md`);
  const routing = skill.match(/## Inspect and route\n[\s\S]*?(?=\n## )/)?.[0];
  assert.ok(routing, "missing inspect-and-route contract");
  const webRow = routing.split("\n").find((line) => line.startsWith("| Browser-hosted DOM/document Web |"));
  assert.equal(webRow, "| Browser-hosted DOM/document Web | [`references/ux.md`](references/ux.md) + [`references/web.md`](references/web.md) |");
  assert.match(routing, /For a Qt route, also resolve the minimum Qt version\./u);

  const web = await read(reference("web"));
  assert.doesNotMatch(web, /\b(?:QML|QStyle|QWidget|Qt Test|Qt Quick|Qt Widgets|qmllint)\b/iu);
});

test("web route preserves browser-only tools without making them universal", async () => {
  const web = await read(reference("web"));
  for (const pattern of [/anti-slop/i, /390.*768.*1280/s, /ds-compliance\.mjs/, /Lighthouse/, /real browser/i]) {
    assert.match(web, pattern);
  }
  assert.match(web, /served Web implementation or plan.*minimum validation floor.*production build.*affected journey.*adjacent regression.*supported real browser/is);
  assert.match(web, /design compliance.*visual capture.*390.*768.*1280.*Lighthouse.*React Doctor.*only when.*changed claim.*risk/is);
  assert.doesNotMatch(web, /for any served web-app implementation or validation plan.*390.*768.*1280.*Lighthouse/is);
});

test("Qt common and Widgets references preserve native ownership", async () => {
  const common = await read(reference("qt"));
  const widgets = await read(reference("qt-widgets"));
  assert.match(common, /minimum Qt version/i);
  assert.match(common, /system palette.*platform font.*accessibility/is);
  assert.match(common, /QGuiApplication.*application defaults/is);
  assert.match(common, /Widgets.*effective.*QPalette.*current.*QStyle/is);
  assert.match(common, /Quick.*type that owns.*palette.*Item.*Window.*Control.*ApplicationWindow.*font.*Control.*ApplicationWindow.*Text.*selected Controls style.*implicit sizes.*Layout\.\*/is);
  assert.match(common, /generic.*Item.*Window.*must not.*assum.*font/is);
  assert.match(common, /pure Quick.*must not.*Qt Widgets dependency.*QStyle.*style metrics/is);
  assert.match(widgets, /native-adaptive.*branded-deterministic.*QSS/is);
  assert.match(widgets, /QSS.*QProxyStyle.*same (?:widget )?subtree/is);
  assert.match(widgets, /QStyledItemDelegate/);
  assert.match(widgets, /semantic part model.*paint.*hit-testing.*supported-input focus\/activation.*accessibility/is);
  assert.match(widgets, /keyboard activation when hardware keyboard input is supported/is);
});

test("Qt common contract stays target-neutral and composes desktop or mobile ownership", async () => {
  const common = await read(reference("qt"));

  assert.doesNotMatch(common, /assumes? a Qt 6 C\+\+ desktop application/iu);
  assert.match(common, /target-neutral.*Qt 6/iu);
  assert.match(common, /desktop.*references\/desktop\.md.*mobile.*references\/mobile\.md/is);
  assert.match(
    common,
    /target-native evidence gates for Qt-owned non-Web pixels.*Qt WebEngine.*embedded HTML client.*references\/web\.md.*references\/hybrid\.md.*never substitutes.*browser.*client-shell boundary proof/is,
  );
  assert.match(common, /mobile.*replaces.*desktop-specific.*input.*window.*display.*chrome.*lifecycle.*package/is);
  assert.match(common, /minimum necessary questions.*batch independent unknowns/is);
  assert.match(common, /supported input.*pointer.*keyboard.*touch.*switch.*assistive/is);
  assert.match(common, /target-supported.*DPR.*display transition/is);
  assert.match(common, /target-native system chrome/iu);
  assert.match(common, /existing architecture and.*authoritative design source.*cannot override required target behavior or accessibility/is);
  assert.match(common, /existing design source of truth remains authoritative.*DESIGN\.md.*only when.*already establishes it.*scoped mapping\/receipt.*links every changed.*synchronized/is);
  assert.match(common, /without a formal design-system document is not blocked.*narrow nonvisual change.*Design impact: unchanged.*Visual evidence: not applicable/is);
  assert.match(
    common,
    /For Qt-owned non-Web pixels.*replaces the Web.*checklist.*does not replace.*Web \+ hybrid proof.*Qt WebEngine.*embedded HTML client/is,
  );
});

test("Qt Widgets obligations follow the actual target and supported inputs", async () => {
  const widgets = await read(reference("qt-widgets"));

  assert.match(widgets, /actual desktop or mobile\/tablet target contract/is);
  assert.match(widgets, /Desktop window.*multi-screen.*pointer.*keyboard.*shortcut.*mnemonic.*only when.*named target and supported inputs expose them/is);
  assert.match(widgets, /mobile contract owns system bars.*insets.*lifecycle.*orientation\/posture.*touch behavior/is);
  assert.match(widgets, /Active.*Inactive.*Disabled.*selected style and named target expose.*record unsupported groups as not applicable/is);
  assert.match(widgets, /supported-input focus\/activation.*keyboard activation when hardware keyboard input is supported.*pointer, touch, or pen-event hit testing/is);
  assert.match(widgets, /Desktop menus.*window movement\/resizing.*system shortcuts.*multi-screen behavior.*only on named targets that expose those capabilities/is);
  assert.match(widgets, /target-applicable window or inset behavior.*supported input.*lifecycle.*assistive technology/is);
  assert.match(widgets, /every supported pointer, touch, pen, keyboard, switch, or assistive action path.*same action exactly once/is);
  assert.match(widgets, /shortcuts\/mnemonics.*where the named target and supported inputs expose or require them/is);
  assert.match(widgets, /target-applicable.*palette group.*selected supported style\/theme/is);
});

test("Qt Widgets branded identities stay differentiated and behavior-neutral", async () => {
  const widgets = await read(reference("qt-widgets"));
  const branded = widgets.match(/## Branded and multi-identity systems\n[\s\S]*?(?=\n## )/)?.[0];
  assert.ok(branded, "missing branded and multi-identity contract");
  assert.match(branded, /only when.*product.*owns/is);
  assert.match(branded, /ordinary native-adaptive.*must not.*skin manager.*gallery/is);
  assert.match(branded, /identity constitution.*signature.*hierarchy.*geometry.*depth.*state grammar.*prohibited.*extend/is);
  assert.match(branded, /differ only by palette.*themes.*not.*identities.*multiple meaningful.*non-color/is);
  assert.match(branded, /QSS.*stock widget chrome/is);
  assert.match(branded, /QStyledItemDelegate.*model\/view rows.*sizeHint.*editing.*editorEvent/is);
  assert.match(branded, /QPainter.*non-item.*custom.*data geometry/is);
  assert.match(branded, /view factor(?:y|ies).*structure/is);
  assert.match(branded, /shared models.*controllers.*host widgets.*delegates.*data.*commands.*serialization.*input.*keyboard.*accessibility actions/is);
  assert.match(branded, /identity-specific presentation.*state.*geometry.*styling.*painting.*structure.*must not.*per-identity behavior/is);
  assert.match(branded, /legacy-equivalent.*idempotent.*focus.*selection.*scroll.*updateGeometry.*layout/is);
});

test("Qt Quick and QA references enforce native validation", async () => {
  const quick = await read(reference("qt-quick"));
  const qa = await read(reference("qt-qa"));
  assert.match(quick, /style.*before.*Qt Quick Controls/is);
  assert.match(quick, /runtime.*compile-time/is);
  assert.match(quick, /ownership.*static-build.*unknown.*remain unresolved.*without listing alternatives/is);
  assert.match(quick, /once.*known.*exactly one repository-owned runtime channel.*compile-time route.*required/is);
  assert.match(quick, /before returning a custom-style plan.*style-selection channel: unresolved pending repository ownership and static-build inspection.*do not name, recommend, or exemplify/is);
  assert.doesNotMatch(quick, /provisional channel by name/i);
  assert.match(quick, /QtQuick\.Templates.*fallback/is);
  assert.match(quick, /exactly one fallback mechanism.*style route/is);
  assert.match(quick, /compile-time.*static fallback.*qmldir import/is);
  assert.match(quick, /dynamic runtime fallback.*only when no static.*qmldir fallback exists/is);
  assert.match(quick, /never configure both/is);
  assert.match(quick, /Accessible.*attached properties.*metadata.*actions/is);
  assert.match(quick, /ordinary properties.*value.*minimumValue.*maximumValue.*stepSize/is);
  assert.match(quick, /availability.*enabled/is);
  assert.match(quick, /semantics.*unavailable.*standard Control.*validated custom accessibility-interface path/is);
  assert.doesNotMatch(quick, /Accessible\.(?:value|disabled)\b/);
  assert.match(quick, /QQuickWidget.*threaded render loop/is);
  assert.match(quick, /QQuickWidget.*focus traversal.*hardware keyboard.*touch.*assistive action.*named target/is);
  assert.match(quick, /continuous resize.*mixed-DPR.*desktop.*only when.*target.*exposes.*mobile\/tablet.*window.*orientation.*posture.*inset.*display[- ]transition/is);
  assert.match(quick, /active.*inactive.*palette.*only when.*selected style.*named target.*expose/is);
  assert.match(qa, /every implementation or release-proof plan.*classify.*configure\/build.*Qt Test\/ctest.*repository lint\/static gates/is);
  assert.match(qa, /implementation.*run and pass all applicable commands/is);
  assert.match(
    qa,
    /when no relevant check exists.*record the evidenced.*N\/A.*instead of silently omitting the gate/is,
  );
  assert.match(qa, /missing required build infrastructure.*blocker.*executable claim/is);
  assert.match(qa, /missing test infrastructure.*disclosed gap.*not an automatic blocker/is);
  assert.match(qa, /before returning.*repository gates.*configure\/build.*BLOCKED.*N\/A with reason.*Qt Test\/ctest.*GAP with evidence.*BLOCKED.*lint\/static.*N\/A with evidence/is);
  assert.doesNotMatch(qa, /run and pass all three/i);
  assert.match(qa, /VISUAL_QA\.md/);
  assert.match(qa, /offscreen.*not.*native/is);
  assert.match(qa, /Lighthouse.*not.*Qt.*proof/is);
  assert.match(qa, /screenshot.*guidance.*verdict/is);
});

test("Qt QA scales commands, state coverage, and visual artifacts to changed claims", async () => {
  const qa = await read(reference("qt-qa"));

  assert.match(qa, /validation scope.*changed claims.*risk/is);
  assert.match(qa, /implementation.*run.*applicable.*commands.*plan.*name.*intended.*commands/is);
  assert.match(qa, /docs-only.*configure\/build.*not applicable.*reason/is);
  assert.match(qa, /missing.*test infrastructure.*gap.*not.*automatic blocker/is);
  assert.match(qa, /state matrix.*applicable.*changed journey.*adjacent regression/is);
  assert.match(qa, /narrow nonvisual.*VISUAL_QA\.md.*not applicable/is);
  assert.match(qa, /visual claim.*interaction claim.*visible-state or layout consequence.*VISUAL_QA\.md/is);
  assert.match(qa, /real-target behavioral evidence.*without.*decorative screenshot/is);
});

test("Qt Quick Kanban component colors come from Theme tokens", async () => {
  const qmlRoot = "examples/qt-kanban/src/Northstar/Kanban";
  const qmlFiles = (await readdir(qmlRoot))
    .filter((file) => file.endsWith(".qml") && file !== "Theme.qml")
    .sort();
  assert.ok(qmlFiles.length > 0, "Qt Quick Kanban QML inventory is empty");
  for (const file of qmlFiles) {
    const source = await read(`${qmlRoot}/${file}`);
    assert.doesNotMatch(
      source,
      /#[0-9a-f]{6,8}|["']transparent["']/iu,
      `${file} contains a raw color instead of a Theme token`,
    );
  }

  const dialog = await read(`${qmlRoot}/NewTaskDialog.qml`);
  assert.match(
    dialog,
    /createButton\.down\s*\?\s*Theme\.primaryPressed/u,
    "Create must use the semantic primary pressed token",
  );
});

test("Qt Quick Kanban exposes one real sidebar destination and passive demo context", async () => {
  const sidebar = await read("examples/qt-kanban/src/Northstar/Kanban/Sidebar.qml");
  const view = await read("examples/qt-kanban/src/Northstar/Kanban/KanbanView.qml");
  const module = await read("examples/qt-kanban/src/Northstar/Kanban/CMakeLists.txt");
  const passive = sidebar.match(
    /    component PassiveDemoItem:\s*Item \{[\s\S]*?(?=\n    contentItem:)/u,
  )?.[0];

  assert.ok(passive, "missing PassiveDemoItem component");
  assert.match(passive, /objectName:\s*demoItem\.compactObjectPrefix \+ "CompactTitle"/u);
  assert.match(passive, /objectName:\s*demoItem\.compactObjectPrefix \+ "CompactStatus"/u);
  assert.doesNotMatch(
    passive,
    /\b(?:AbstractButton|Button|MouseArea|PointerHandler|TapHandler|HoverHandler|DragHandler|WheelHandler|Shortcut)\b|(?:Keys\.)?on(?:Clicked|DoubleClicked|Tapped|Pressed|Released|Activated|Triggered|ShortcutOverride)\s*:/u,
    "passive demo context must not acquire an action path",
  );
  assert.match(
    sidebar,
    /objectName:\s*"boardButton"[\s\S]*?text:\s*qsTr\("Board"\)[\s\S]*?selected:\s*true/u,
    "Board must remain the real selected navigation action",
  );
  assert.match(sidebar, /signal boardRequested\(Item invoker\)/u);
  assert.match(
    sidebar,
    /id:\s*boardButton[\s\S]*?onClicked:\s*root\.boardRequested\(boardButton\)/u,
    "Board must emit its real sidebar action",
  );
  assert.match(
    view,
    /function returnToBoardOverview\(invoker\)\s*\{[\s\S]*?if \(overlayDetailDrawer\.opened\) \{[\s\S]*?overlayDetailDrawer\.returnFocusToBoard = true[\s\S]*?overlayDetailDrawer\.close\(\)[\s\S]*?return[\s\S]*?\}[\s\S]*?TaskStore\.clearSelection\(\)[\s\S]*?restoreFocus\(invoker\)[\s\S]*?sidebar\.focusBoard\(\)/su,
    "Board command must defer overlay cleanup while preserving direct-path selection and focus behavior",
  );
  assert.match(
    view,
    /id:\s*overlayDetailDrawer[\s\S]*?property bool returnFocusToBoard:\s*false[\s\S]*?onClosed:\s*\{[\s\S]*?shouldReturnToBoard = returnFocusToBoard[\s\S]*?returnFocusToBoard = false[\s\S]*?if \(shouldReturnToBoard\)\s*TaskStore\.clearSelection\(\)[\s\S]*?if \(shouldReturnToBoard\) \{[\s\S]*?sidebar\.focusBoard\(\)/su,
    "Overlay close must clear selection after dismissal and restore Board focus without flicker",
  );
  assert.match(
    view,
    /onBoardRequested:\s*invoker\s*=>\s*root\.returnToBoardOverview\(invoker\)/u,
    "KanbanView must handle the real Sidebar Board signal",
  );
  assert.match(
    sidebar,
    /objectName:\s*"timelineDemoItem"[\s\S]*?title:\s*qsTr\("Timeline"\)/u,
  );
  assert.match(
    sidebar,
    /objectName:\s*"inboxDemoItem"[\s\S]*?title:\s*qsTr\("Inbox"\)/u,
  );
  assert.match(sidebar, /demoOnlyLabel:\s*qsTr\("Demo only"\)/u);
  assert.match(sidebar, /Accessible\.role:\s*Accessible\.StaticText/u);
  assert.doesNotMatch(
    sidebar,
    /unavailableDestinationRequested|timelineButton|inboxButton|settingsButton|helpButton|not available in this demo/u,
  );
  assert.doesNotMatch(
    view,
    /showStatus|statusToast|statusTimer|onUnavailableDestinationRequested/u,
  );
  assert.doesNotMatch(module, /assets\/icons\/(?:settings|help)\.svg/u);
});

test("Qt Quick accessibility probe cannot chain its own update handler", async () => {
  const harness = await read("examples/qt-kanban/tests/quick/tst_qtkanban.cpp");
  assert.match(
    harness,
    /void start\(\)\s*\{\s*if \(s_instance == this\)\s*return;/su,
  );
});

test("Qt QA treats deterministic galleries as conditional client-pixel evidence", async () => {
  const qa = await read(reference("qt-qa"));
  const gallery = qa.match(/## Deterministic branded gallery\n[\s\S]*?(?=\n## )/)?.[0];
  assert.ok(gallery, "missing deterministic branded gallery contract");
  assert.match(gallery, /custom-painted.*multi-identity Widgets.*broad reusable presentation/is);
  assert.match(gallery, /do not impose.*ordinary native-adaptive/is);
  assert.match(gallery, /stable.*fixtures.*dimensions.*states.*themes.*filenames/is);
  assert.match(gallery, /expected artifact count.*clipping.*overflow/is);
  assert.match(gallery, /offscreen gallery.*not.*native.*accessibility/is);
  assert.match(gallery, /exact pixel equality.*unchanged pixels.*not.*visual quality/is);
});
