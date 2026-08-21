import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { checkSkills } from "../src/doctor-skills.js";

const PRODUCT_COPY_PATHS = [
  "docs/superpowers/specs/2026-08-21-product-copy-gate-design.md",
  "skills/product-copy/SKILL.md",
  "skills/product-copy/agents/openai.yaml",
  "skills/product-copy/references/golden-set.md",
  "skills/product-copy/references/quality-rubric.md",
  "skills/product-copy/references/quick-rules.md",
  "skills/product-copy/scripts/audit-product-copy.mjs",
  "test/product-copy-integration-helpers.js",
  "test/product-copy.test.js"
];

export function assertProductCopyPackFiles(files) {
  for (const path of PRODUCT_COPY_PATHS.filter((path) => path.startsWith("skills/"))) {
    assert.equal(files.has(path), true, `product-copy package file missing from npm pack: ${path}`);
  }
}

export async function assertProductCopyDiscovery() {
  const skill = await readFile("skills/product-copy/SKILL.md", "utf8");
  const metadata = await readFile("skills/product-copy/agents/openai.yaml", "utf8");
  const discovery = await checkSkills(process.cwd());
  assert.match(skill, /^name: product-copy$/m);
  assert.match(skill, /^disable-model-invocation: true$/m);
  assert.match(skill, /Korean in-product messages/iu);
  assert.match(skill, /Never add or invent[\s\S]*(?:recovery|privacy|safety)/iu);
  assert.match(metadata, /^\s*allow_implicit_invocation:\s*false$/m);
  assert.ok(discovery.skills.includes("product-copy"));
  assert.ok(discovery.requiredSkills.includes("product-copy"));
}

export async function assertProductCopyDocs() {
  const locales = [
    { file: "README.md", explicit: /explicit-only/iu, korean: /Korean/iu, facts: /supplied product behavior/iu },
    { file: "README.ko.md", explicit: /명시적으로/iu, korean: /한국어/u, facts: /제공된 제품 동작/u },
    { file: "README.ja.md", explicit: /明示的/iu, korean: /韓国語/u, facts: /提供された製品動作/u },
    { file: "README.zh-CN.md", explicit: /显式/iu, korean: /韩文/u, facts: /已提供的产品行为/u },
    { file: "README.es.md", explicit: /explícit/iu, korean: /corean/iu, facts: /comportamiento del producto proporcionado/iu }
  ];
  for (const { file, explicit, korean, facts } of locales) {
    const rows = (await readFile(file, "utf8")).split("\n").filter((line) => line.startsWith("| `product-copy` |"));
    assert.equal(rows.length, 1, `${file} must have one product-copy skill row`);
    for (const pattern of [/\$superloopy:product-copy/u, /\/superloopy:product-copy/u, explicit, korean, facts, /humanize-korean/u, /\.superloopy\/evidence\/product-copy/u]) {
      assert.match(rows[0], pattern, file);
    }
  }

  const designAudit = await readFile("docs/superloopy-design-audit.md", "utf8");
  const fileAudit = await readFile("docs/superloopy-file-audit.md", "utf8");
  const golden = await readFile("docs/superloopy-loop-golden-set.md", "utf8");
  const designRows = designAudit.split("\n").filter((line) => line.startsWith("| `product-copy-gate` |"));
  assert.equal(designRows.length, 1, "product-copy-gate must have one exact design-audit row");
  for (const pattern of [/explicit-only/iu, /Korean/iu, /supplied product behavior/iu, /humanize-korean/iu, /manual review/iu]) {
    assert.match(designRows[0], pattern);
  }
  for (const path of PRODUCT_COPY_PATHS) {
    const fileRows = fileAudit.split("\n").filter((line) => line.startsWith(`| \`${path}\` |`));
    const goldenRows = golden.split("\n").filter((line) => line.startsWith(`| \`${path}\` |`));
    assert.equal(fileRows.length, 1, `${path} must have one exact file-audit row`);
    assert.equal(goldenRows.length, 1, `${path} must have one exact golden-set row`);
  }
  const skillRows = [fileAudit, golden].map((content) => content.split("\n").find((line) => line.startsWith("| `skills/product-copy/SKILL.md` |")));
  for (const row of skillRows) {
    for (const pattern of [/explicit-only/iu, /Korean/iu, /supplied product behavior/iu, /humanize-korean/iu]) assert.match(row, pattern);
  }
  const humanizerRows = [fileAudit, golden].map((content) => content.split("\n").find((line) => line.startsWith("| `skills/humanize-korean/references/golden-set.md` |")));
  for (const row of humanizerRows) {
    assert.match(row, /28/);
    assert.match(row, /non-product-copy/iu);
    assert.doesNotMatch(row, /issue.?#44|reassurance-copy|safety vocabulary/iu);
  }
}
