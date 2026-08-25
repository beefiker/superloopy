import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const CURRENT_GATE_PATHS = [
  "docs/superpowers/specs/2026-08-21-automatic-reassurance-copy-gate-design.md",
  "skills/superloopy-loop/SKILL.md",
  "skills/superloopy-loop/references/reassurance-copy.md",
  "skills/superloopy-loop/scripts/audit-reassurance-copy.mjs",
  "src/doctor-skills.js",
  "src/engineer.js",
  "test/docs.test.js",
  "test/doctor.test.js",
  "test/engineer-reassurance-copy.test.js",
  "test/engineer.test.js",
  "test/plugin.test.js",
  "test/reassurance-copy-docs-helpers.js",
  "test/reassurance-copy.test.js"
];

const REMOVED_STANDALONE_PATTERNS = [
  /\| `product-copy` \|/u,
  /\$superloopy:product-copy/u,
  /\/superloopy:product-copy/u,
  /skills\/product-copy\//u,
  /test\/product-copy(?:-integration-helpers|\.test)\.js/u
];

export function parseGoldenFileColumnPaths(content) {
  const normalized = content.replace(/\r\n?/gu, "\n");
  const inventory = normalized.split("## File Evidence Inventory\n")[1] ?? "";
  return new Set(inventory.split("\n").flatMap((line) => [...(line.split("|")[1] ?? "").matchAll(/`([^`]+)`/gu)].map((match) => match[1])));
}

export async function assertAutomaticReassuranceCopyDocs() {
  const locales = [
    { file: "README.md", automatic: /automatic reassurance-copy gate/iu, affected: /affected artifact/iu, scope: /user-visible Korean product-behavior copy/iu, excluded: /internal logs[\s\S]*non-Korean copy/iu, naturalness: /misplaced modifiers/iu },
    { file: "README.ko.md", automatic: /자동 안심 문구 게이트/u, affected: /영향받는 artifact/u, scope: /사용자가 보는 한국어 제품 동작 문구/u, excluded: /내부 로그[\s\S]*한국어가 아닌 문구/u, naturalness: /잘못 놓인 수식어/u },
    { file: "README.ja.md", automatic: /自動安心文言ゲート/u, affected: /影響を受ける artifact/u, scope: /ユーザーに表示される韓国語の製品動作文言/u, excluded: /内部ログ[\s\S]*韓国語以外の文言/u, naturalness: /不適切な修飾語/u },
    { file: "README.es.md", automatic: /gate automático de copy tranquilizador/iu, affected: /artifact afectado/iu, scope: /copy coreano visible para el usuario sobre el comportamiento del producto/iu, excluded: /logs internos[\s\S]*copy que no esté en coreano/iu, naturalness: /modificadores mal colocados/iu },
    { file: "README.zh-CN.md", automatic: /自动安心文案 gate/u, affected: /受影响的 artifact/u, scope: /用户可见的韩文产品行为文案/u, excluded: /内部日志[\s\S]*非韩文文案/u, naturalness: /错位修饰语/u }
  ];

  for (const { file, automatic, affected, scope, excluded, naturalness } of locales) {
    const content = await readFile(file, "utf8");
    for (const pattern of REMOVED_STANDALONE_PATTERNS.slice(0, 3)) assert.doesNotMatch(content, pattern, file);
    for (const pattern of [automatic, affected, scope, excluded, naturalness, /RC-1[\s\S]*RC-4/u, /humanize-korean/u]) assert.match(content, pattern, file);
  }

  const designAudit = await readFile("docs/superloopy-design-audit.md", "utf8");
  const fileAudit = await readFile("docs/superloopy-file-audit.md", "utf8");
  const golden = await readFile("docs/superloopy-loop-golden-set.md", "utf8");
  const reference = await readFile("skills/superloopy-loop/references/reassurance-copy.md", "utf8");
  assert.match(reference, /at least one supplied reader-relevant fact/iu);
  assert.doesNotMatch(reference, /what was retained and what the user can do next/iu);
  const designRows = designAudit.split("\n").filter((line) => line.startsWith("| `automatic-reassurance-copy-gate` |"));
  assert.equal(designRows.length, 1, "automatic gate must have one exact design-audit row");
  for (const pattern of [/every full Loopy start and resume/iu, /affected artifact/iu, /RC-1 through RC-4/iu, /humanize-korean/iu, /no standalone/iu]) assert.match(designRows[0], pattern);
  for (const path of CURRENT_GATE_PATHS) assert.equal(designRows[0].includes(`\`${path}\``), true, `${path} missing from design decision`);

  for (const content of [designAudit, fileAudit, golden]) {
    for (const pattern of REMOVED_STANDALONE_PATTERNS) assert.doesNotMatch(content, pattern);
  }
  for (const path of CURRENT_GATE_PATHS) {
    assert.equal(fileAudit.split("\n").filter((line) => line.startsWith(`| \`${path}\` |`)).length, 1, `${path} must have one exact file-audit row`);
    assert.equal(golden.split("\n").filter((line) => line.startsWith(`| \`${path}\` |`)).length, 1, `${path} must have one exact golden-set row`);
  }
}
