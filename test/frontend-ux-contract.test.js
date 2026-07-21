import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = "skills/superloopy-frontend";
const reference = (name) => `${root}/references/${name}.md`;

async function read(path) {
  assert.equal(existsSync(path), true, `missing ${path}`);
  return (await readFile(path, "utf8")).replace(/\r\n?/gu, "\n");
}

test("frontend scope stays explicit while covering supported screen-based application UI", async () => {
  const skill = await read(`${root}/SKILL.md`);
  const frontmatter = skill.match(/^---\n([\s\S]*?)\n---/u)?.[1] ?? "";
  const activation = skill.match(/## Activation\n[\s\S]*?(?=\n## )/u)?.[0] ?? "";

  assert.match(frontmatter, /explicit.*screen-based application UI/is);
  assert.match(frontmatter, /browser-hosted Web.*interactive deployed content-led Web.*desktop.*mobile\/tablet.*embedded\/hybrid.*Qt.*custom-rendered.*mixed/is);
  assert.match(frontmatter, /Do not activate.*UI.*frontend.*desktop.*mobile.*framework.*vocabulary alone/is);
  assert.match(frontmatter, /TV.*wearable.*XR.*game UI.*TUI.*static media\/document artifacts/is);
  assert.match(activation, /interactive deployed content-led Web.*campaign.*publication.*landing.*navigation.*forms.*consent.*localization/is);
  assert.match(activation, /SUPERLOOPY FRONTEND ENABLED/u);
  assert.match(activation, /Explicit activation only/iu);
  assert.match(activation, /\$superloopy:superloopy-frontend/u);
  assert.match(activation, /\/superloopy:superloopy-frontend/u);
  assert.match(activation, /leading `loopy` or `루피`/u);
  assert.match(activation, /plain mention.*UI.*desktop.*mobile.*SwiftUI.*Tauri.*Flutter.*Qt.*QML.*not authorization/is);
  assert.doesNotMatch(skill, /Auto-activate|When in doubt/iu);
});

test("frontend discovery resolves the user outcome, target, ownership, runtime, and proof before routing", async () => {
  const skill = await read(`${root}/SKILL.md`);
  const routing = skill.match(/## Inspect and route\n[\s\S]*?(?=\n## )/u)?.[0] ?? "";

  for (const pattern of [
    /affected users.*job.*outcome.*evidence.*assumption.*confidence/is,
    /OS.*device.*desktop environment.*session/is,
    /public.*embedded.*native-control.*custom-rendered.*mixed.*composition/is,
    /renderer.*semantic.*accessibility model/is,
    /client.*shell.*service.*document.*state ownership/is,
    /framework.*runtime.*provider.*backend.*version/is,
    /package.*sandbox.*update.*distribution channel.*persistence boundary/is,
    /input.*locale.*accessibility services.*validation capability/is,
  ]) {
    assert.match(routing, pattern);
  }
  assert.match(routing, /Ask the minimum necessary questions only when material unknowns would change the route or result/u);
  assert.match(routing, /batch independent unknowns when more than one must be answered/u);
});

test("frontend route matrix composes shared, platform, hybrid, renderer, and Qt contracts", async () => {
  const skill = await read(`${root}/SKILL.md`);
  const routing = skill.match(/## Inspect and route\n[\s\S]*?(?=\n## )/u)?.[0] ?? "";
  const expected = [
    ["Browser-hosted DOM/document Web", ["ux", "web"]],
    ["Browser-hosted canvas/custom-rendered Web", ["ux", "web", "renderer"]],
    ["Installed PWA or browser extension", ["ux", "web"]],
    ["Embedded HTML on desktop", ["ux", "web", "desktop", "hybrid"]],
    ["Embedded HTML on mobile", ["ux", "web", "mobile", "hybrid"]],
    ["Native/custom desktop", ["ux", "desktop"]],
    ["Qt Widgets on desktop", ["ux", "desktop", "qt", "qt-widgets", "qt-qa"]],
    ["Qt Widgets on mobile or tablet", ["ux", "mobile", "qt", "qt-widgets", "qt-qa"]],
    ["Qt Quick/QML on desktop", ["ux", "desktop", "qt", "qt-quick", "qt-qa"]],
    ["Qt Quick/QML on mobile or tablet", ["ux", "mobile", "qt", "qt-quick", "qt-qa"]],
    ["Qt Widgets on WebAssembly", ["ux", "web", "renderer", "qt", "qt-widgets", "qt-qa"]],
    ["Qt Quick/QML on WebAssembly", ["ux", "web", "renderer", "qt", "qt-quick", "qt-qa"]],
    ["Mixed Qt Widgets + Qt Quick on WebAssembly", ["ux", "web", "renderer", "qt", "qt-widgets", "qt-quick", "qt-qa"]],
    ["Mixed Qt Widgets + Qt Quick on desktop", ["ux", "desktop", "qt", "qt-widgets", "qt-quick", "qt-qa"]],
    ["Mixed Qt Widgets + Qt Quick on mobile or tablet", ["ux", "mobile", "qt", "qt-widgets", "qt-quick", "qt-qa"]],
    ["Native/cross-platform mobile or tablet", ["ux", "mobile"]],
    ["Mixed or multi-target", ["ux"]],
  ];

  for (const [label, references] of expected) {
    const row = routing.split("\n").find((line) => line.startsWith(`| ${label} |`));
    assert.ok(row, `missing route row: ${label}`);
    for (const name of references) {
      assert.match(row, new RegExp(`references/${name}\\.md`), `${label} must load ${name}.md`);
    }
  }
  assert.match(routing, /add.*renderer\.md.*engine|engine.*add.*renderer\.md/is);
  assert.match(
    routing,
    /load shared UX once.*one evidence row per target and affected owner.*independent, attributable proof/is,
  );
});

test("framework examples route by deployed facts instead of brand", async () => {
  const skill = await read(`${root}/SKILL.md`);
  const routing = skill.match(/## Inspect and route\n[\s\S]*?(?=\n## )/u)?.[0] ?? "";

  for (const pattern of [
    /Tauri.*pywebview.*actual desktop or mobile target.*embedded client/is,
    /Electron.*desktop.*bundled Chromium/is,
    /CustomTkinter.*native\/custom desktop/is,
    /Flutter.*Compose.*renderer.*semantics/is,
    /React Native.*provider.*target/is,
    /MAUI Hybrid.*native host.*embedded client/is,
    /Qt.*matching desktop, mobile\/tablet, or WebAssembly row/is,
  ]) {
    assert.match(routing, pattern);
  }
  assert.match(routing, /Mac Catalyst.*UIKit-on-desktop.*AppKit/is);
  assert.match(routing, /iPadOS.*mobile.*desktop-capabilities overlay/is);
});

test("shared UX contract scales ceremony and keeps capability claims truthful", async () => {
  const ux = await read(reference("ux"));

  assert.match(ux, /frame the delta.*users.*job.*outcome.*evidence.*assumption.*confidence/is);
  assert.match(ux, /map.*journeys.*capabilities/is);
  assert.match(ux, /behavior.*invariants/is);
  assert.match(ux, /claim-shaped evidence/is);
  assert.match(ux, /promot.*capability by capability.*real-target evidence/is);
  assert.match(ux, /narrow fix.*UX impact: unchanged.*expanded journey.*new\/redesigned\/high-consequence/is);
  assert.match(ux, /UX_CONTRACT\.md.*expanded journey.*new\/redesigned\/high-consequence/is);

  assert.match(ux, /role.*action.*navigation.*input.*output/is);
  assert.match(ux, /decoration.*not a capability/is);
  assert.match(ux, /fidelity.*production.*simulated.*deferred/is);
  assert.match(ux, /applicability.*applicable.*not applicable/is);
  assert.match(ux, /availability.*available.*temporarily unavailable.*unavailable.*not evaluated/is);
  assert.match(ux, /presentation.*visible.*hidden.*omitted.*passive/is);
  assert.match(ux, /invocability.*enabled.*disabled.*not invocable/is);
  assert.match(ux, /feedback\/result.*idle.*pending.*succeeded.*failed.*blocked.*not evaluated/is);
  assert.match(ux, /verification.*proven.*failed.*inconclusive.*blocked.*unverified/is);
  assert.match(ux, /not applicable.*availability.*not evaluated.*presentation.*omitted.*invocability.*not invocable.*feedback\/result.*not evaluated/is);
  assert.match(ux, /visible, enabled production affordance.*advertised semantic (?:outcome|result)/is);
  assert.match(ux, /available capability.*disabled.*prerequisite.*not.*unavailable/is);
  assert.match(ux, /hidden.*not.*unavailable.*policy.*role.*context/is);
  assert.match(ux, /pending.*succeeded.*failed.*durable owner/is);
  assert.match(ux, /handler.*toast.*spinner.*mock.*not completion/is);
  assert.match(ux, /failed operation.*resulting state.*recovery/is);
  assert.match(ux, /simulated.*cannot.*production.*native acceptance/is);
  assert.match(ux, /deferred.*normally omitted.*stable top-level.*honestly unavailable/is);
  assert.match(
    ux,
    /deferred future capability.*no operable affordance.*applicability.*not applicable.*availability.*not evaluated.*presentation.*omitted.*invocability.*not invocable.*feedback\/result.*not evaluated.*verification.*unverified/is,
  );
  assert.match(
    ux,
    /stable top-level.*signpost.*separate passive output capability.*production.*available.*passive.*not invocable.*independently.*proven.*unverified.*never.*deferred navigation affordance.*button.*link.*focus action/is,
  );
  assert.match(ux, /temporarily unavailable.*prerequisite.*accessible reason.*next step/is);
  assert.match(ux, /editable-looking.*edit.*validate.*commit.*cancel/is);
  assert.match(ux, /read-only.*output.*clearly read-only/is);
});

test("shared workflow starts from the current experience and traces contract to implementation", async () => {
  const ux = await read(reference("ux"));

  assert.match(ux, /baseline|current[- ]state/iu);
  assert.match(ux, /reproduce.*current.*journey|current.*journey.*reproduce/is);
  assert.match(ux, /affected journey.*adjacent journey.*regression/is);
  assert.match(ux, /existing.*component.*state owner.*test/is);
  assert.match(
    ux,
    /contract (?:clause|invariant).*acceptance (?:case|criterion).*implementation (?:owner|file).*test.*evidence/is,
  );
});

test("shared workflow scales user coverage and operating states by consequence", async () => {
  const ux = await read(reference("ux"));

  assert.match(ux, /risk-gated user coverage matrix/is);
  assert.match(ux, /primary.*secondary.*affected.*not affected.*counterexample/is);
  assert.match(ux, /role.*expertise.*accessibility.*locale.*device.*input.*connectivity.*account.*entitlement/is);
  assert.match(ux, /frequency.*severity.*success measure/is);
  assert.match(ux, /narrow.*low-risk.*only.*material|material.*narrow.*low-risk/is);
  assert.match(
    ux,
    /initial.*loading.*empty.*partial.*stale.*offline.*degraded.*error.*retry.*cancel/is,
  );
  assert.match(ux, /optimistic.*duplicate.*conflict.*concurrent/is);
  assert.match(ux, /authentication.*session expiry.*authori[sz]ation.*permission.*role.*entitlement/is);
  assert.match(ux, /privacy.*consent.*sensitive/is);
});

test("shared input and motion rules cover editable text, IME, and reduced motion", async () => {
  const ux = await read(reference("ux"));
  const mobile = await read(reference("mobile"));

  assert.match(ux, /editable text.*selection.*clipboard.*composition.*IME.*commit.*cancel/is);
  assert.match(ux, /composition.*validation.*after.*commit|validation.*composition.*commit/is);
  assert.match(ux, /reduced motion.*system.*semantic outcome/is);
  assert.match(mobile, /IME|input method/u);
  assert.match(mobile, /reduced motion|animation scale/iu);
});
test("shared UX keeps resource identity and lifecycle transitions attributable", async () => {
  const ux = await read(reference("ux"));
  for (const pattern of [/lifecycle verbs?.*distinct semantic transitions?/is, /canonical resource.*working copy.*last[- ]saved.*active resource.*dirty.*pending.*visible.*attributable/is, /copy.*identity change.*disclos/is, /product contract.*portability.*stable logical identifier.*owned-root-relative locator/is, /absolute locator remains valid.*actual platform.*provider.*integration owner.*requires.*explicit reason.*resolution boundary.*relink.*recovery/is, /copy-based workflow remains valid.*identity.*lifecycle effects.*truthful/is, /each user intent.*shortest.*truthful.*transition/is, /current owner.*safely.*update.*reload.*original.*(?:do not|does not).*require.*import.*modify.*apply.*round trip.*copy.*edit.*apply.*variant/is, /staged copy.*edit.*apply.*real owner.*boundary.*reason.*original identity.*preserv.*reconcil.*apply.*save-back.*explicit.*commit path/is]) assert.match(ux, pattern);
  for (const pattern of [/(?:^|[.!?]\s+)(?:absolute locators?\b[^.\n]{0,40}(?:are|must be)\s+(?:(?:always|universally)\s+)?(?:banned|forbidden)|(?:(?:always|universally)\s+)?(?:ban|forbid)\b[^.\n]{0,60}absolute locators?\b|never use (?:any\s+)?absolute locators?\b|absolute locators?\b\s+(?:are|must be)\s+never\s+(?:allowed|valid|used))(?!\s+(?:only|for|when|within|on|in|by|where|if|unless|except)\b)/im, /(?:^|[.!?]\s+)(?:copy-based workflows?\b[^.\n]{0,40}(?:are|must be)\s+(?:(?:always|universally)\s+)?(?:banned|forbidden)|(?:(?:always|universally)\s+)?(?:ban|forbid)\b[^.\n]{0,60}copy-based workflows?\b|never use (?:any\s+)?copy-based workflows?\b|copy-based workflows?\b\s+(?:are|must be)\s+never\s+(?:allowed|valid|used))(?!\s+(?:only|for|when|within|on|in|by|where|if|unless|except)\b)/im, /(?:^|[.!?]\s+)when\s+(?:(?:the\s+)?current owner[^.\n]{0,100}(?:can|is able to)\s+safely[^.\n]{0,60}(?:update|reload)[^.\n]{0,60}(?:the\s+)?original|(?:a\s+)?safe direct owner update[^.\n]{0,40}(?:is\s+)?\bpossible\b)[^.\n]{0,100}(?:(?:(?:always|universally|must(?:\s+always)?)\s+(?:require|use|perform)|(?:still\s+)?requires)[^.\n]{0,120}(?:import[^.\n]{0,60}(?:copy|modify|edit)[^.\n]{0,60}apply|(?:import|copy|modify|edit)[^.\n]{0,80}round trip)|[^.\n]{0,120}(?:import[^.\n]{0,60}(?:copy|modify|edit)[^.\n]{0,60}apply|(?:import|copy|modify|edit)[^.\n]{0,80}round trip)[^.\n]{0,40}(?:is|remains)\s+(?:always\s+)?(?:required|mandatory))/im]) assert.doesNotMatch(ux, pattern);
});
test("shared UX distinguishes revert and reset provenance", async () => {
  const ux = await read(reference("ux"));
  for (const pattern of [/Revert.*current(?: or |\/)inherited defaults.*versioned factory defaults.*distinct.*baseline.*scope/is, /reset values.*read.*real owner.*not.*duplicated UI literals/is, /proof.*non-default.*inherited.*changed[- ]default.*dirty.*Undo.*save.*apply.*restart.*relocation.*applicable/is]) assert.match(ux, pattern);
});
test("shared UX gives each task-bearing region purpose and proportional disclosure", async () => {
  const ux = await read(reference("ux"));
  for (const pattern of [/within the affected surface or journey.*every task-bearing region.*affordance.*distinct user-recognizable.*job.*outcome.*decision.*information gain.*parent.*siblings/is, /redundant.*unsupported.*merge.*relabel.*truthful output.*omit/is, /task criticality.*frequency.*consequence.*urgency.*actionability/is, /essential state.*blockers.*errors.*recovery.*next action.*in context/is, /simultaneous.*dense.*comparison.*monitoring.*expert work.*requires/is, /Advanced.*More.*not.*mechanical.*ban/is]) assert.match(ux, pattern);
  for (const pattern of [/(?:^|[.!?]\s+)(?:(?:dense|comparison|monitoring|expert)[^.\n]{0,60}(?:content|work)\b[^.\n]{0,40}(?:(?:must|should)\s+(?:(?:always|universally)\s+)?|(?:is|are)\s+(?:always|universally)\s+)(?:be\s+)?(?:collaps(?:e|ed)\b|hid(?:e|den)\b|mov(?:e|ed)\s+behind disclosure\b)|(?:(?:always|universally)\s+)?(?:collapse|hide)\b[^.\n]{0,80}(?:dense|comparison|monitoring|expert)[^.\n]{0,40}(?:content|work)\b|(?:(?:always|universally)\s+)?move\b[^.\n]{0,80}(?:dense|comparison|monitoring|expert)[^.\n]{0,40}(?:content|work)\b[^.\n]{0,40}behind disclosure\b)(?!\s+(?:only|for|when|within|on|in|by|where|if|unless|except)\b)/im, /(?:^|[.!?]\s+)(?:(?:Advanced(?:\s*(?:and|\/)\s*More)?|More)[^.\n]{0,30}labels?\b[^.\n]{0,30}(?:(?:are|must be|should be)\s+(?:(?:always|universally)\s+)?(?:banned|forbidden|avoided)|(?:must|should)\s+never\s+be\s+used)|(?:(?:always|universally)\s+)?(?:ban|forbid)\b[^.\n]{0,60}(?:Advanced|More)[^.\n]{0,30}labels?\b|never use\b[^.\n]{0,40}(?:Advanced|More)[^.\n]{0,30}labels?\b)(?!\s+(?:only|for|when|within|on|in|by|where|if|unless|except)\b)/im]) assert.doesNotMatch(ux, pattern);
});
test("narrow nonvisual changes do not require design or visual artifacts", async () => {
  const ux = await read(reference("ux"));
  const web = await read(reference("web"));

  for (const contract of [ux, web]) {
    assert.match(contract, /narrow nonvisual.*Design impact: unchanged/is);
    assert.match(contract, /Visual evidence: not applicable/is);
    assert.match(contract, /behavioral.*accessibility.*regression evidence/is);
  }
  assert.match(web, /DESIGN\.md.*only.*visual|visual.*DESIGN\.md.*required/is);
  assert.match(web, /VISUAL_QA\.md.*only.*visual|visual.*VISUAL_QA\.md.*required/is);
  assert.match(
    web,
    /current design source of truth remains authoritative.*DESIGN\.md.*scoped mapping\/receipt.*no equivalent.*changed value.*links back.*synchronized/is,
  );
});

test("optional visual references inherit design authority and proportional evidence gates", async () => {
  const designSystem = await read(reference("design-system"));
  const redesign = await read(reference("redesign"));
  const systemMap = await read(reference("system-map"));
  const imageFirst = await read(reference("image-first"));
  const motion = await read(reference("motion"));

  assert.match(designSystem, /changed visual claim.*narrow nonvisual change.*Design impact: unchanged.*Visual evidence: not applicable/is);
  assert.match(designSystem, /current design source of truth remains authoritative/is);
  assert.match(designSystem, /DESIGN\.md.*already the established source.*another source owns.*scoped mapping\/receipt.*links every changed.*synchronized/is);
  assert.match(designSystem, /absence of a formal design-system document is not a blocker.*never means.*no UI work/is);
  assert.match(designSystem, /material unknowns.*minimum necessary questions.*batch independent unknowns/is);
  assert.match(designSystem, /does not by itself select anti-slop.*SEO.*measured-quality.*universal visual matrix/is);
  assert.match(designSystem, /SEO.*current crawlable public Web target.*distinct deployed public Web target/is);
  assert.match(designSystem, /target-derived browser\/OS\/input and breakpoint matrix.*visual artifacts only for changed visual claims.*visible-state\/layout consequence/is);
  assert.match(designSystem, /complete schema.*approved new or redesigned.*visual delta inside an existing system.*only the affected sections/is);
  assert.match(designSystem, /project-native.*color.*token.*resolved value.*semantic role/is);
  assert.match(designSystem, /project-native.*unit.*spacing.*scale/is);
  assert.match(designSystem, /CSS.*Android.*Apple.*Qt|Qt.*Apple.*Android.*CSS/is);
  assert.doesNotMatch(designSystem, /every color as `hex \+ CSS variable \+ semantic role`/iu);
  assert.doesNotMatch(designSystem, /base unit \(4px\).*every margin\/padding\/gap is a multiple/iu);
  assert.doesNotMatch(designSystem, /\*\*No design system = no UI work\.\*\*/u);

  assert.match(redesign, /only when a visual Web redesign is actually in scope.*narrow nonvisual change.*does not require.*redesign audit.*design artifact.*anti-slop.*visual capture/is);
  assert.match(redesign, /material unknown.*minimum necessary questions.*batch independent material unknowns/is);
  assert.match(redesign, /existing authoritative design source.*do not move ownership/is);
  assert.match(redesign, /DESIGN\.md.*already established.*synchronized scoped mapping\/receipt/is);
  assert.match(redesign, /current crawlable public Web target.*distinct deployed public Web target/is);
  assert.match(redesign, /authenticated.*private.*native-only.*embedded-only.*SEO: N\/A.*concrete deployment reason/is);
  assert.match(redesign, /absence of a formal design-system document alone is not structural failure/is);
  assert.match(redesign, /anti-slop only for its declared.*scope.*target-derived browser\/OS\/input and breakpoint matrix/is);
  assert.match(redesign, /visual language.*depart.*quantity.*complexity.*motion.*information.*density/is);
  assert.match(redesign, /concrete evidence.*component variation.*transition.*content per viewport.*whitespace/is);
  assert.doesNotMatch(redesign, /DESIGN_VARIANCE|MOTION_INTENSITY|VISUAL_DENSITY/u);

  assert.match(systemMap, /actual platform contract/is);
  assert.match(systemMap, /does not replace.*authoritative design source.*narrow nonvisual change.*behavioral.*accessibility.*regression proof/is);
  assert.match(systemMap, /SEO remains limited.*current crawlable public Web target.*distinct deployed public Web target/is);
  assert.match(systemMap, /DESIGN\.md.*repository establishes it.*scoped mapping.*links back.*synchronized.*never a competing source/is);
  assert.match(systemMap, /target-derived browser\/OS\/input and breakpoint matrix.*changed claims or risk/is);
  assert.match(systemMap, /materially change.*minimum necessary questions.*batch independent unknowns/is);

  assert.match(imageFirst, /approved new\/redesigned direction.*materially changed visual claim/is);
  assert.match(imageFirst, /Do not use this reference to expand a narrow nonvisual change into visual work/is);
  assert.match(imageFirst, /current design source.*remain authoritative.*generated image.*scoped reference.*never permission to replace/is);
  assert.match(imageFirst, /minimum necessary questions.*batch independent unknowns/is);
  assert.match(imageFirst, /does not make anti-slop or SEO applicable.*current crawlable public Web target.*distinct deployed public Web target/is);
  assert.match(imageFirst, /representative target-derived viewport/is);
  assert.match(imageFirst, /DESIGN\.md.*already established.*synchronized scoped mapping\/receipt.*never create a competing source/is);
  assert.doesNotMatch(imageFirst, /Phase \d+ of the skill/iu);

  assert.match(motion, /only when a motion or animated-interaction claim changes.*does not expand a narrow nonvisual change/is);
  assert.match(motion, /existing motion primitives and authoritative design source remain authoritative.*DESIGN\.md.*already that source.*scoped mapping\/receipt.*synchronized/is);
  assert.match(motion, /minimum necessary questions.*material unknowns.*batch independent unknowns/is);
  assert.match(motion, /SEO.*current crawlable public Web target.*distinct deployed public Web target.*never because animation code runs in a browser/is);
  assert.match(motion, /target-derived browser\/OS\/input and breakpoint matrix.*390.*768.*1280.*optional baseline.*never universal proof/is);
  assert.match(motion, /1024px.*illustrative.*actual target-derived breakpoint.*never add or claim a breakpoint.*example/is);
  assert.match(motion, /target-supported viewport.*resize.*orientation.*container transition/is);
  assert.match(motion, /each supported input.*keyboard.*touch.*pointer.*only where the target contract includes it/is);
  assert.match(motion, /visible-state or layout consequence.*VISUAL_QA\.md.*real interaction.*accessibility.*cleanup.*regression evidence/is);
  assert.match(motion, /reduce.*animation.*quantity.*complexity.*clear static surface/is);
  assert.doesNotMatch(motion, /DESIGN_VARIANCE|MOTION_INTENSITY|VISUAL_DENSITY/u);
});

test("shared UX contract covers input burden, undo, state, content, i18n, access, and evidence", async () => {
  const ux = await read(reference("ux"));

  assert.match(ux, /constrained identifier.*platform.*toolkit.*provider.*portal.*picker.*search.*detection.*suggestion.*recent/is);
  assert.match(ux, /no universal.*picker.*validated manual entry.*arbitrary.*expert/is);
  assert.match(ux, /Undo.*domain command.*coalesc.*no-op.*meaningful label.*visible state/is);
  assert.match(ux, /hover.*focus.*scroll.*noise.*excluded.*selection.*navigation.*resize.*meaningful mutation/is);
  assert.match(ux, /Undo.*applicability.*explicit/is);
  assert.match(ux, /application defaults.*user preferences.*system.*document.*model.*scene.*sensitive.*ephemeral/is);
  assert.match(ux, /same view.*revisit.*restart.*process recreation.*supported upgrade.*device transfer.*account/is);
  assert.match(ux, /migration.*explicit.*idempotent.*version.*package.*distribution channel/is);
  assert.match(ux, /information architecture|\bIA\b/u);
  assert.match(
    ux,
    /multiple advertised.*frontends|frontends.*capability reachability matrix/is,
  );
  assert.match(
    ux,
    /reachable on each surface.*intention.*handed off.*return path.*context\/state.*not applicable/is,
  );
  assert.match(ux, /consequence-scaled.*error.*preserve input.*specific correction.*duplicate submission/is);
  assert.match(ux, /internationali[sz]ation.*discovery.*concatenat.*locale-aware.*language.*direction.*override/is);
  assert.match(ux, /long.*unbroken.*bidirectional.*taller-script/is);
  assert.match(ux, /names.*roles.*states.*actions.*focus order.*restoration.*traps.*status announcement/is);
  assert.match(ux, /adaptive.*window.*orientation.*zoom.*text scaling.*content.*input/is);
  assert.match(ux, /executable target journey.*resulting state.*function/is);
  assert.match(ux, /representative users.*believable tasks.*usability/is);
  assert.match(ux, /telemetry.*outcome.*live quality/is);
  assert.match(ux, /static contract tests.*not.*downstream.*usable/is);
});

test("desktop, mobile, hybrid, and renderer references own distinct proof", async () => {
  const desktop = await read(reference("desktop"));
  const mobile = await read(reference("mobile"));
  const hybrid = await read(reference("hybrid"));
  const renderer = await read(reference("renderer"));

  assert.match(desktop, /OS.*version.*desktop environment.*session/is);
  assert.match(desktop, /toolkit.*runtime.*package.*update channel/is);
  assert.match(desktop, /system.*chrome.*default/is);
  assert.match(desktop, /Windows.*GNOME.*KDE.*Apple/is);
  assert.match(desktop, /Windows.*supported titlebar.*system caption buttons.*retained/is);
  assert.match(desktop, /fully custom.*frame.*caption hit testing.*resize.*snap.*system menu/is);
  assert.match(desktop, /input method|\bIME\b/u);
  assert.match(desktop, /native accessibility tree.*packaged lifecycle/is);

  assert.match(mobile, /navigation.*back.*insets.*safe areas/is);
  assert.match(mobile, /window.*orientation.*posture/is);
  assert.match(mobile, /touch.*pointer.*keyboard.*stylus.*applicable/is);
  assert.match(mobile, /permission.*picker.*process.*scene.*restoration/is);
  assert.match(mobile, /locale.*RTL.*text scaling.*accessibility/is);
  assert.match(mobile, /device.*API.*matrix.*emulator.*physical device.*risk/is);

  assert.match(hybrid, /client.*shell.*service.*owner/is);
  assert.match(hybrid, /IPC.*bridge.*semantic.*failure/is);
  assert.match(hybrid, /WebView.*bundled browser/is);
  assert.match(hybrid, /picker.*window.*menu.*permission.*accessibility.*package/is);
  assert.match(hybrid, /client proof.*cannot substitute.*shell proof/is);
  assert.match(hybrid, /multiple.*clients.*shells.*capability reachability.*intentional handoff/is);

  assert.match(renderer, /DOM.*native control.*custom.*mixed/is);
  assert.match(renderer, /semantic.*accessibility.*owner/is);
  assert.match(renderer, /text.*input.*selection.*focus.*IME/is);
  assert.match(renderer, /scal.*performance/is);
  assert.match(renderer, /crawlability.*separate.*capability.*prove/is);
  assert.match(renderer, /screenshot.*pixel similarity.*not.*promotion|not.*promot.*screenshot.*pixel similarity/is);
});

test("web delivery classes separate product, campaign, installed, renderer, and shell concerns", async () => {
  const web = await read(reference("web"));
  const product = web.match(/### Product\/application DOM Web[\s\S]*?(?=\n### )/u)?.[0] ?? "";
  const campaign = web.match(/### Marketing\/editorial Web[\s\S]*?(?=\n### )/u)?.[0] ?? "";
  const installed = web.match(/### PWA and browser extension[\s\S]*?(?=\n### )/u)?.[0] ?? "";
  const custom = web.match(/### Canvas\/custom-rendered Web[\s\S]*?(?=\n### )/u)?.[0] ?? "";
  const embedded = web.match(/### Embedded client Web[\s\S]*?(?=\n## )/u)?.[0] ?? "";

  assert.match(web, /classify.*deployed surface.*before.*Web checklist/is);

  assert.match(product, /authenticated.*private.*internal/is);
  assert.match(product, /existing product.*design system.*workflow/is);
  assert.match(
    product,
    /SEO applies.*current Web target.*public and crawlable.*authentication.*privacy.*do not imply crawlability/is,
  );

  assert.match(campaign, /anti-slop\.md/u);
  assert.match(campaign, /brand.*editorial.*composition/is);

  assert.match(installed, /service worker.*offline.*update/is);
  assert.match(installed, /extension.*permission.*browser chrome.*content script/is);

  assert.match(custom, /references\/renderer\.md/u);
  assert.match(custom, /semantics.*accessibility.*text.*input/is);
  assert.match(custom, /crawlability.*separately prove/is);
  assert.match(custom, /canvas screenshot.*insufficient/is);

  assert.match(embedded, /references\/(?:desktop|mobile)\.md.*references\/hybrid\.md/is);
  assert.match(embedded, /shell proof.*ownership.*lifecycle.*permissions.*accessibility.*menus.*windowing.*packaging/is);
  assert.match(embedded, /client proof.*cannot substitute.*shell proof/is);
});

test("web verification matrix is derived from supported targets rather than three universal viewports", async () => {
  const web = await read(reference("web"));

  assert.match(web, /target-derived verification matrix/is);
  assert.match(web, /supported browser.*engine.*OS.*input/is);
  assert.match(web, /Browserslist.*package.*product support.*analytics/is);
  assert.match(web, /actual.*breakpoint.*minimum.*maximum.*zoom.*text scaling/is);
  assert.match(web, /390.*768.*1280.*baseline samples.*not.*universal proof/is);
  assert.match(web, /minimum validation floor.*production build.*affected journey.*adjacent regression.*supported real browser/is);
  assert.match(web, /design compliance.*visual capture.*Lighthouse.*React Doctor.*changed claim.*risk/is);
  assert.match(
    web,
    /changed visual claim.*interaction claim.*visible-state or layout consequence.*VISUAL_QA\.md.*purely behavioral interaction.*behavioral proof/is,
  );
  assert.doesNotMatch(web, /For any served web-app implementation or validation plan/iu);
});

test("web evidence instructions work in standalone and active-loop modes", async () => {
  const web = await read(reference("web"));
  const perfection = await read(reference("perfection"));

  assert.match(web, /Standalone frontend invocation/is);
  assert.match(web, /run.*validation command directly.*write.*artifact/is);
  assert.match(web, /YYYYMMDDTHHMMSSZ-<slug>/u);
  assert.match(web, /lowercase ASCII.*single hyphens/is);
  assert.match(web, /evidence-root\.mjs"? create frontend-check/u);
  assert.match(web, /FRONTEND_SKILL_DIR.*actual.*skill.*directory/is);
  assert.match(web, /\$\{FRONTEND_SKILL_DIR\}\/scripts\/evidence-root\.mjs/u);
  assert.match(web, /\$\{FRONTEND_SKILL_DIR\}\/scripts\/ds-compliance\.mjs/u);
  assert.match(web, /\$\{FRONTEND_SKILL_DIR\}\/scripts\/visual-diff\.mjs/u);
  assert.match(web, /POSIX.*EVIDENCE_ROOT=.*evidence-root\.mjs/is);
  assert.match(web, /PowerShell.*\$EVIDENCE_ROOT = node .*evidence-root\.mjs/is);
  assert.match(web, /evidence-root\.mjs"? verify/u);
  assert.doesNotMatch(web, /date -u|mkdir -p/u);
  assert.match(web, /SUPERLOOPY_EVIDENCE: <path-under-active-evidence-root>/u);
  assert.match(web, /Active Superloopy loop/is);
  assert.match(web, /superloopy loop guide --json/u);
  assert.match(web, /superloopy loop prove --artifact .* -- node/u);
  assert.match(
    web,
    /superloopy loop evidence --goal-id G001 --criterion-id C001 --status pass --artifact .* --notes .* --json/u,
  );
  assert.doesNotMatch(web, /superloopy loop evidence --status pass/u);
  assert.doesNotMatch(web, /frontend-check\/token-lint\.txt/u);
  assert.match(
    perfection,
    /Create .*EVIDENCE_ROOT.*portable helper.*returned path.*run ID.*do not separately synthesize or set .*RUN_ID.*Reuse that exact evidence root/is,
  );
  assert.doesNotMatch(perfection, /Set RUN_ID through/iu);
  assert.match(perfection, /evidence-root\.mjs"? create frontend-quality/u);
  assert.doesNotMatch(perfection, /frontend-check\/token-lint\.txt/u);
});

test("platform and composition evidence keeps a small floor and expands only with affected claims or risk", async () => {
  const desktop = await read(reference("desktop"));
  const mobile = await read(reference("mobile"));
  const hybrid = await read(reference("hybrid"));
  const renderer = await read(reference("renderer"));
  const web = await read(reference("web"));

  assert.match(desktop, /minimum regression floor.*build.*launch.*affected core journey/is);
  assert.match(desktop, /install.*first run.*permission.*restart.*update.*recovery.*only when.*affected.*claimed.*risk/is);
  assert.match(
    mobile,
    /minimum regression floor.*builds and launches the real target.*affected core journey.*closest adjacent regression.*supported emulator, simulator, or device/is,
  );
  assert.match(mobile, /install\/first-run.*permission denial\/recovery.*process recreation.*only when affected, claimed, release-critical, or selected by risk/is);
  assert.match(hybrid, /minimum regression floor.*builds.*launches.*client.*shell.*affected journey/is);
  assert.match(hybrid, /picker.*window.*menu.*permission.*accessibility.*package.*update.*shutdown.*when.*affected.*claimed.*risk/is);
  assert.match(renderer, /target-applicable scaling matrix.*DPR.*zoom.*orientation.*safe areas/is);
  assert.match(renderer, /orientation.*safe areas.*only.*target.*supports|target.*supports.*orientation.*safe areas/is);
  assert.match(web, /performance.*when affected.*claimed.*risk/is);
});

test("frontend shell examples do not turn documentation placeholders into redirects", async () => {
  for (const contract of [await read(reference("web")), await read(reference("perfection"))]) {
    const shellBlocks = [...contract.matchAll(/```(?:sh|shell)?\n([\s\S]*?)```/gu)].map((match) => match[1]).join("\n");
    assert.doesNotMatch(shellBlocks, /<(?:slug|built-files|built CSS\/TSX files…|url|selected-categories)>/u);
  }
});

test("web perfection applies SEO to the crawlable Web target, never merely to an embedded shell", async () => {
  const web = await read(reference("web"));
  const perfection = await read(reference("perfection"));

  for (const contract of [web, perfection]) {
    assert.match(contract, /SEO.*current.*target.*crawlable public Web|audited target.*crawlable public Web/is);
    assert.match(contract, /native.*embedded.*distinct.*public Web target/is);
    assert.match(contract, /HTML\/CSS.*WebView.*canvas.*embedded browser engine.*(?:does not|never).*SEO/is);
  }

  assert.match(perfection, /Lighthouse.*categor(?:y|ies).*deployed surface/is);
  assert.match(
    perfection,
    /token-lint layer accepts .*DESIGN\.md.*only when.*established design source.*scoped mapping\/receipt.*synchronized.*another authoritative source.*repository-native checks.*instead of creating .*DESIGN\.md/is,
  );
  assert.match(perfection, /narrow nonvisual change.*does not select either layer.*existing gate.*changed claim.*regression signal.*risk/is);
  assert.match(
    perfection,
    /SEO: N\/A.*concrete deployment reason.*authentication.*private access.*native-only delivery.*embedded client.*no distinct public Web target/is,
  );
  assert.match(perfection, /performance.*accessibility.*best practices.*selected.*changed claim.*risk/is);
  assert.match(perfection, /exact Lighthouse version.*browser version.*OS.*profile/is);
  assert.match(perfection, /LIGHTHOUSE_VERSION.*exact.*semver/is);
  assert.match(perfection, /lighthouse@\$\{LIGHTHOUSE_VERSION\}/u);
  assert.match(perfection, /target-derived browser\/OS\/input and breakpoint matrix/is);
  assert.match(perfection, /13\.4\.0.*Node.*22\.19.*Node 20.*12\.8\.2/is);
  assert.match(
    perfection,
    /lighthouse-mobile-run-1\.json.*increment the run index.*Never overwrite raw runs/is,
  );
  assert.match(
    perfection,
    /retain every indexed raw JSON.*lighthouse-summary\.json.*summary must list its input filenames.*median is reproducible/is,
  );
  assert.match(perfection, /project.*budget.*regression.*baseline/is);
  assert.match(perfection, /90-99.*not.*automatic failure/is);
  assert.match(perfection, /below 90.*block.*applicable.*category.*documented.*limitation/is);
  assert.match(perfection, /React Doctor.*triage.*affected.*owned.*finding/is);
  assert.match(perfection, /React Doctor.*0\.8\.1.*Node.*\^20\.19\.0.*>=22\.13\.0/is);
  assert.match(
    perfection,
    /react-doctor@\$\{REACT_DOCTOR_VERSION\}.*--json.*--no-telemetry.*--no-supply-chain.*react-doctor\.json/is,
  );
  assert.match(
    perfection,
    /require informed opt-in before omitting either privacy flag.*supply-chain analysis only when.*claim is selected and approved/is,
  );
  assert.doesNotMatch(perfection, /90-99 as work remaining/iu);
  assert.doesNotMatch(perfection, /applicable static render-performance findings as blockers/iu);
  assert.match(perfection, /3-, 4-, 6-, and 8-digit hex/is);
});

test("anti-slop is a conditional visual-direction check, not a product-UI mandate", async () => {
  const antiSlop = await read(reference("anti-slop"));

  assert.match(antiSlop, /marketing.*editorial.*new visual direction/is);
  assert.match(antiSlop, /authenticated.*private.*internal.*product/is);
  assert.match(antiSlop, /existing design system.*product conventions/is);
  assert.match(antiSlop, /not.*require.*imagery.*layout-family.*font replacement/is);
});

test("new UX references and contract test are inventoried as original Superloopy work", async () => {
  const designAudit = await read("docs/superloopy-design-audit.md");
  const fileAudit = await read("docs/superloopy-file-audit.md");
  const golden = await read("docs/superloopy-loop-golden-set.md");
  const paths = [
    reference("ux"),
    reference("desktop"),
    reference("mobile"),
    reference("hybrid"),
    reference("renderer"),
    "test/frontend-ux-contract.test.js",
  ];

  for (const path of paths) {
    assert.ok(designAudit.includes(`\`${path}\``), `${path} missing from design audit`);
    assert.equal(fileAudit.split("\n").filter((line) => line.startsWith(`| \`${path}\` |`)).length, 1);
    assert.equal(golden.split("\n").filter((line) => line.startsWith(`| \`${path}\` |`)).length, 1);
  }
  assert.match(designAudit, /shared UX.*platform.*composition.*original (?:Superloopy prose|prose authored for Superloopy).*no external runtime dependencies/is);
  assert.match(fileAudit, /references\/ux\.md.*Superloopy-native.*original prose/is);
  assert.match(golden, /test\/frontend-ux-contract\.test\.js.*node --test/is);
});
