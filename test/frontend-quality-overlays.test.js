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

test("frontend quality overlays are claim-triggered and independent from target routes", async () => {
  const skill = await read(`${root}/SKILL.md`);
  const targetTable = skill.match(/\| Requested surface \|[\s\S]*?(?=\n### Claim-triggered)/u)?.[0] ?? "";
  const targetRows = targetTable.split("\n").filter((line) => line.startsWith("| "));

  assert.match(skill, /claim-triggered|cross-cutting quality overlays/iu);
  assert.match(skill, /references\/layout\.md/u);
  assert.match(skill, /references\/motion-core\.md/u);
  assert.match(skill, /layout.*placement.*scroll.*overflow.*reflow.*adaptation/is);
  assert.match(skill, /motion.*transition.*gesture.*haptic/is);
  assert.match(skill, /smallest applicable union|smallest applicable set/iu);
  assert.ok(targetRows.every((line) => !/references\/(?:layout|motion-core)\.md/u.test(line)));
});

test("layout overlay defines proportional cross-platform spatial ownership without Web absolutes", async () => {
  const layout = await read(reference("layout"));

  assert.match(layout, /only when.*spatial|material spatial/isu);
  assert.match(layout, /Layout impact: unchanged/u);
  assert.match(layout, /semantic.*model.*reading.*focus.*traversal/is);
  assert.match(layout, /layout owner.*scroll owner|scroll owner.*layout owner/is);
  assert.match(layout, /size.*constraint.*shrink.*wrap.*overflow/is);
  assert.match(layout, /window.*container.*orientation.*text scal/is);
  assert.match(layout, /empty.*long.*unbroken.*RTL/is);
  assert.match(layout, /multiple.*scroll.*named.*task.*owner/is);
  assert.match(layout, /two-dimensional.*task|task.*two-dimensional/is);
  assert.match(layout, /virtuali[sz].*logical.*instantiat/is);
  assert.match(layout, /narrow.*existing receipt.*new|existing receipt.*narrow/is);
  assert.match(layout, /narrow.*existing receipt.*existing surface.*multi-region.*virtuali[sz].*does not expand/is);
  assert.match(layout, /only.*affected.*(?:case|boundary)|unaffected.*N\/A/is);
  assert.match(layout, /semantic.*task context.*not.*exact.*(?:object|offset)/is);
  assert.match(layout, /target-derived.*change point/is);
  assert.doesNotMatch(layout, /320\s*\/\s*375\s*\/\s*768|1024\s*\/\s*1440/u);
  assert.doesNotMatch(layout, /issue\s*#?28/iu);
});

test("motion core preserves provider ownership and temporal truth across platforms", async () => {
  const motionCore = await read(reference("motion-core"));
  const webMotion = await read(reference("motion"));

  assert.match(motionCore, /only when.*motion|motion.*claim.*changes/isu);
  assert.match(motionCore, /Motion impact: unchanged/u);
  assert.match(motionCore, /purpose.*trigger.*frequency.*owner/is);
  assert.match(motionCore, /before.*intermediate.*after/is);
  assert.match(motionCore, /repeated.*interrupt.*revers.*retarget.*cancel/is);
  assert.match(motionCore, /focus.*selection.*assistive/is);
  assert.match(motionCore, /reduced motion.*semantic (?:outcome|result)/is);
  assert.match(motionCore, /system.*provider.*authoritative|provider.*system.*authoritative/is);
  assert.match(motionCore, /haptic.*optional.*sole|haptic.*never.*sole/is);
  assert.match(motionCore, /not applicable.*reason|N\/A.*reason/is);
  assert.match(motionCore, /cross-platform equality.*not.*goal|not.*goal.*cross-platform equality/is);
  assert.match(motionCore, /representative.*target.*state.*matrix.*not.*Cartesian/is);
  assert.match(motionCore, /screenshot.*not.*motion|motion.*not.*screenshot/is);
  assert.match(motionCore, /real-target|actual target/iu);
  assert.match(motionCore, /artifact label.*non-empty note.*not.*temporal.*haptic.*proof/is);
  assert.match(motionCore, /do not invent.*motion.*haptic.*artifact kind.*validator.*structure.*provenance/is);
  assert.doesNotMatch(motionCore, /React|GSAP|ScrollTrigger|DOM|CSS/iu);
  assert.doesNotMatch(motionCore, /universal.*(?:duration|easing|spring|FPS)|(?:duration|easing|spring|FPS).*universal/iu);
  assert.match(webMotion, /Web.*speciali[sz]ation|speciali[sz].*Web/is);
  assert.match(webMotion, /references\/motion-core\.md/u);
  assert.doesNotMatch(motionCore, /issue\s*#?28/iu);
});

test("visual references distinguish current deltas, exploration, and approved implementation authority", async () => {
  const imageFirst = await read(reference("image-first"));

  assert.match(imageFirst, /current-surface delta/iu);
  assert.match(imageFirst, /exploratory direction/iu);
  assert.match(imageFirst, /approved implementation reference/iu);
  assert.match(imageFirst, /exploratory.*non-authoritative.*(?:not|cannot).*implementation/is);
  assert.match(imageFirst, /task.*content.*semantic.*spatial.*platform.*accessibility/is);
  assert.match(imageFirst, /generated.*text.*not.*(?:content|copy).*authorit/is);
  assert.match(imageFirst, /full-surface.*section.*state.*board/is);
  assert.match(imageFirst, /pixel-exact.*target.*rendering environment.*project-specific tolerance/is);
  assert.match(imageFirst, /without.*(?:criterion|criteria).*visual direction.*not.*exactness/is);
  assert.match(imageFirst, /not.*proof.*usability.*accessibility|usability.*accessibility.*not.*proof/is);
  assert.doesNotMatch(imageFirst, /Order \(mandatory for visually-important work\)/u);
  assert.doesNotMatch(imageFirst, /One image \*\*per section\*\*, never/u);
});

test("shared UX scales high-impact rationale, usability evidence, and accepted debt", async () => {
  const ux = await read(reference("ux"));

  assert.match(ux, /high-impact.*approve.*block.*redirect|approve.*block.*redirect.*high-impact/is);
  assert.match(ux, /authority.*criteria.*warrant.*evidence.*limitation/is);
  assert.match(ux, /alternative.*not applicable.*existing.*authoritative/is);
  assert.match(ux, /new.*redesign.*high-consequence.*task.*context.*result.*limitation/is);
  assert.match(ux, /walkthrough.*not.*user evidence|user evidence.*not.*walkthrough/is);
  assert.match(ux, /known.*accepted.*gap|accepted.*known.*gap/is);
  assert.match(ux, /affected users.*owner.*review trigger.*exit/is);
  assert.match(ux, /unknown.*not.*debt|debt.*not.*unknown/is);
  assert.match(ux, /false success.*core task.*accessibility.*privacy.*security.*data loss/is);
  assert.match(ux, /unknown owner.*review_required|review_required.*unknown owner/is);
  assert.match(ux, /review_required.*decision disposition.*not.*capability/is);
  assert.match(ux, /acceptance authority.*own.*(?:release|risk).*boundary/is);
  assert.match(ux, /accountable owner.*distinct from.*technical.*surfaceEvidence\.owner/is);
  assert.match(ux, /critical.*core task.*escap.*necessary state.*recover/is);
});

test("Web redesign specialization does not silently route native redesigns through browser rules", async () => {
  const skill = await read(`${root}/SKILL.md`);
  const redesign = await read(reference("redesign"));

  assert.match(skill, /redesign\.md.*Web-only|Web-only.*redesign\.md/is);
  assert.match(skill, /native.*redesign.*ux\.md.*layout\.md.*image-first\.md/is);
  assert.match(redesign, /Web-only.*living site|living site.*Web-only/is);
});

test("campaign composition heuristics cannot become unsupported universal blockers", async () => {
  const antiSlop = await read(reference("anti-slop"));

  assert.match(antiSlop, /review flag.*approved.*(?:brand|content|campaign).*criterion/is);
  assert.doesNotMatch(antiSlop, /fail when/iu);
});

test("StyleGallery remains an independent research reference with bounded provenance", async () => {
  const notice = await read(reference("upstream-notice"));
  const designAudit = await read("docs/superloopy-design-audit.md");
  const fileAudit = await read("docs/superloopy-file-audit.md");
  const golden = await read("docs/superloopy-loop-golden-set.md");
  const commit = "24ae581e92666a8864d42ffa64f7c34caf3a2156";

  assert.match(notice, /github\.com\/changeroa\/StyleGallery/u);
  assert.ok(notice.includes(commit));
  assert.match(notice, /architecture research|research reference/iu);
  assert.match(notice, /no root license|root license.*not.*identified/iu);
  assert.match(notice, /no.*(?:code|prose).*schema.*pattern.*copied/is);
  assert.match(notice, /no.*runtime dependency|no.*dependency/is);
  assert.match(designAudit, /StyleGallery.*independent.*quality overlay/is);
  assert.match(designAudit, /rejects.*fixed Web.*CSS pattern.*mandatory image.*universal motion/is);
  assert.match(designAudit, /does not add.*motion.*haptic.*artifact kind.*file existence.*not.*proof/is);

  for (const path of [reference("layout"), reference("motion-core"), "test/frontend-quality-overlays.test.js"]) {
    assert.equal(fileAudit.split("\n").filter((line) => line.startsWith(`| \`${path}\` |`)).length, 1);
    assert.equal(golden.split("\n").filter((line) => line.startsWith(`| \`${path}\` |`)).length, 1);
  }
});
