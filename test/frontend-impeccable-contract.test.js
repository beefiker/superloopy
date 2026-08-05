import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = "skills/superloopy-frontend";

async function read(path) {
  return (await readFile(path, "utf8")).replace(/\r\n?/gu, "\n");
}

test("marketing and explicit new visual directions load bounded Impeccable guidance", async () => {
  const skill = await read(`${root}/SKILL.md`);
  const web = await read(`${root}/references/web.md`);

  assert.match(skill, /marketing[\s\S]*references\/impeccable\.md|references\/impeccable\.md[\s\S]*new visual direction/iu);
  assert.match(web, /marketing[\s\S]*references\/impeccable\.md|references\/impeccable\.md[\s\S]*new visual direction/iu);
  assert.match(skill, /anti-slop\.md[\s\S]*impeccable\.md/iu);
});

test("Impeccable informs presentation without taking Superloopy ownership", async () => {
  const reference = await read(`${root}/references/impeccable.md`);

  assert.match(reference, /visitor mode/iu);
  assert.match(reference, /direction pass[\s\S]*refinement pass/iu);
  assert.match(reference, /Superloopy owns[\s\S]*Impeccable informs/iu);
  assert.match(reference, /contextual[\s\S]*not.*universal/iu);
  assert.match(reference, /bounded[\s\S]*(?:once|one pass|single pass)/iu);
  assert.match(reference, /product truth[\s\S]*platform[\s\S]*dependenc/iu);
  assert.match(reference, /accessib[\s\S]*responsive[\s\S]*evidence/iu);
});

test("Impeccable provenance is pinned without importing runtime coupling", async () => {
  const reference = await read(`${root}/references/impeccable.md`);

  assert.match(reference, /github\.com\/pbakaus\/impeccable/u);
  assert.match(reference, /ae5e95101a6979e7f7973a4ff57680b3c7adc1ec/u);
  assert.match(reference, /4\.0\.4/u);
  assert.match(reference, /Apache-2\.0/u);
  assert.match(reference, /no runtime dependency|does not add.*runtime dependency/iu);
  assert.doesNotMatch(reference, /install (?:the )?(?:Impeccable )?hooks/iu);
  assert.doesNotMatch(reference, /mandatory root.*PRODUCT\.md|mandatory root.*DESIGN\.md/iu);
});
