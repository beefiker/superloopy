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
  assert.match(frontmatter, /public web.*desktop.*mobile\/tablet.*embedded\/hybrid.*Qt.*custom-rendered.*mixed/is);
  assert.match(frontmatter, /Do not activate.*UI.*frontend.*desktop.*mobile.*framework.*vocabulary alone/is);
  assert.match(frontmatter, /TV.*wearable.*XR.*game UI.*TUI.*non-interactive visual deliverables/is);
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
  assert.match(routing, /Ask one question only when a material ambiguity would change the route or result/u);
});

test("frontend route matrix composes shared, platform, hybrid, renderer, and Qt contracts", async () => {
  const skill = await read(`${root}/SKILL.md`);
  const routing = skill.match(/## Inspect and route\n[\s\S]*?(?=\n## )/u)?.[0] ?? "";
  const expected = [
    ["Public DOM/document Web", ["ux", "web"]],
    ["Public canvas/custom-rendered Web", ["ux", "web", "renderer"]],
    ["Embedded HTML on desktop", ["ux", "web", "desktop", "hybrid"]],
    ["Embedded HTML on mobile", ["ux", "web", "mobile", "hybrid"]],
    ["Native/custom desktop", ["ux", "desktop"]],
    ["Qt Widgets", ["ux", "desktop", "qt", "qt-widgets", "qt-qa"]],
    ["Qt Quick/QML", ["ux", "desktop", "qt", "qt-quick", "qt-qa"]],
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
  assert.match(routing, /shared UX.*once.*independent.*attributable.*evidence.*owner.*target/is);
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
    /Qt.*speciali[sz]ed.*Qt references/is,
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
  assert.match(ux, /availability.*enabled.*temporarily unavailable/is);
  assert.match(ux, /verification.*proven.*unverified/is);
  assert.match(ux, /enabled production affordance.*advertised semantic (?:outcome|result)/is);
  assert.match(ux, /handler.*toast.*spinner.*mock.*not completion/is);
  assert.match(ux, /failed operation.*resulting state.*recovery/is);
  assert.match(ux, /simulated.*cannot.*production.*native acceptance/is);
  assert.match(ux, /deferred.*normally omitted.*stable top-level.*honestly unavailable/is);
  assert.match(ux, /temporarily unavailable.*prerequisite.*accessible reason.*next step/is);
  assert.match(ux, /editable-looking.*edit.*validate.*commit.*cancel/is);
  assert.match(ux, /read-only.*output.*clearly read-only/is);
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

  assert.match(renderer, /DOM.*native control.*custom.*mixed/is);
  assert.match(renderer, /semantic.*accessibility.*owner/is);
  assert.match(renderer, /text.*input.*selection.*focus.*IME/is);
  assert.match(renderer, /scal.*performance/is);
  assert.match(renderer, /crawlability.*separate.*capability.*prove/is);
  assert.match(renderer, /screenshot.*pixel similarity.*not.*promotion|not.*promot.*screenshot.*pixel similarity/is);
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
