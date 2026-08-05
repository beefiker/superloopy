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
  const targetTable = skill.match(/\| Requested surface \|[\s\S]*?(?=\n### Claim-triggered)/u)?.[0] ?? "";
  const overlays = skill.match(/### Claim-triggered cross-cutting quality overlays[\s\S]*?(?=\n`references\/redesign\.md`)/u)?.[0] ?? "";
  const marketing = web.match(/### Marketing\/editorial Web[\s\S]*?(?=\n### PWA and browser extension)/u)?.[0] ?? "";

  assert.match(overlays, /marketing, editorial, campaign, or an explicitly new visual direction[\s\S]*anti-slop\.md[\s\S]*impeccable\.md/iu);
  assert.match(overlays, /Both stay unselected for authenticated, internal, or convention-preserving product UI/iu);
  assert.match(marketing, /campaign, publication, landing page, or explicit new visual direction[\s\S]*anti-slop\.md[\s\S]*impeccable\.md/iu);
  assert.doesNotMatch(targetTable, /impeccable\.md/iu);
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
  assert.match(reference, /cannot broaden scope, replace factual copy, invent claims, select another platform, add a dependency, weaken required evidence/iu);
  assert.match(reference, /without decoding decoration/iu);
  assert.match(reference, /Do not optimize for rule counts, novelty, detector output, or visual difference alone/iu);
  assert.match(reference, /legible hierarchy[\s\S]*coherent system/iu);
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

test("tracked release documentation treats the visual comparison as local exploration", async () => {
  const designAudit = await read("docs/superloopy-design-audit.md");
  const row = designAudit.split("\n").find((line) => line.startsWith("| `frontend-impeccable-direction` |")) ?? "";

  assert.match(row, /local-only exploratory run/iu);
  assert.match(row, /coherent legibility[\s\S]*novelty/iu);
  assert.match(row, /not shipped[\s\S]*release proof/iu);
  assert.doesNotMatch(row, /\.superloopy\/evidence|93\.5|91\.5|87\.0/iu);
});
