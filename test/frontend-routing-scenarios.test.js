import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const skillPath = "skills/superloopy-frontend/SKILL.md";

async function read(path) {
  return (await readFile(path, "utf8")).replace(/\r\n?/gu, "\n");
}

function routeReferences(skill, label) {
  const row = skill.split("\n").find((line) => line.startsWith(`| ${label} |`));
  assert.ok(row, `missing route row: ${label}`);
  return [...row.matchAll(/\]\(references\/([a-z-]+)\.md\)/gu)].map((match) => match[1]);
}

test("frontend routes exact target-derived reference sets", async () => {
  const skill = await read(skillPath);
  const expected = new Map([
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
  ]);

  for (const [label, references] of expected) {
    assert.deepEqual(routeReferences(skill, label), references, label);
  }
});

test("frontend scope excludes every intentionally unsupported specialized surface", async () => {
  const skill = await read(skillPath);
  const metadata = await read("skills/superloopy-frontend/agents/openai.yaml");

  for (const content of [skill, metadata]) {
    assert.match(content, /TV.*wearable.*XR.*automotive.*game UI.*TUI/is);
  }
  assert.match(skill, /authenticated.*private|private.*authenticated/is);
  assert.match(skill, /PWA.*browser extension/is);
});

test("frontend completion is proportional and works with or without an active loop", async () => {
  const skill = await read(skillPath);

  assert.doesNotMatch(skill, /Ask one question only/u);
  assert.match(skill, /minimum necessary questions|fewest necessary questions/iu);
  assert.match(skill, /Design impact: unchanged/u);
  assert.match(skill, /visual claim.*interaction claim.*visible-state or layout consequence/isu);
  assert.match(skill, /without an active.*loop|no active.*loop/iu);
  assert.match(skill, /active.*loop.*goal.*criterion|goal.*criterion.*active.*loop/isu);
  assert.match(skill, /YYYYMMDDTHHMMSSZ-<slug>/u);
  assert.match(skill, /portable.*lowercase ASCII.*single hyphen/iu);
});

test("frontend routing keeps renderer proof conditional and scopes single-target evidence", async () => {
  const skill = await read(skillPath);
  const hybrid = await read("skills/superloopy-frontend/references/hybrid.md");

  assert.match(hybrid, /renderer.*only when.*owns.*pixels.*semantics.*text.*input/isu);
  assert.match(skill, /Qt Widgets on WebAssembly.*Qt Quick\/QML on WebAssembly.*mixed Qt WebAssembly.*browser and renderer proof/isu);
  assert.match(skill, /every new scoped.*single.*mixed.*multi-target.*target.*id.*platform.*environment.*owner.*claims.*scopeReason.*Gate Notes/isu);
});

test("frontend evidence helper creates and verifies portable run-scoped roots", async (t) => {
  const repoRoot = process.cwd();
  const helper = join(repoRoot, "skills/superloopy-frontend/scripts/evidence-root.mjs");
  const tokenLint = join(repoRoot, "skills/superloopy-frontend/scripts/ds-compliance.mjs");
  const sandbox = await mkdtemp(join(tmpdir(), "superloopy-frontend-evidence-"));
  t.after(() => rm(sandbox, { recursive: true, force: true }));

  const created = spawnSync(process.execPath, [helper, "create", "frontend-check"], {
    cwd: sandbox,
    encoding: "utf8"
  });
  assert.equal(created.status, 0, created.stderr);
  const evidenceRoot = created.stdout.trim();
  assert.match(evidenceRoot, /^\.superloopy\/evidence\/frontend\/\d{8}T\d{6}Z-frontend-check$/u);
  assert.equal((await stat(join(sandbox, evidenceRoot))).isDirectory(), true);

  await mkdir(join(sandbox, "dist"), { recursive: true });
  await writeFile(join(sandbox, "DESIGN.md"), "Base spacing: 4px\nColor: #112233\n", "utf8");
  await writeFile(join(sandbox, "dist", "app.css"), ".card { color: #112233; margin: 8px; }\n", "utf8");
  const scanned = spawnSync(process.execPath, [tokenLint, "DESIGN.md", "dist/app.css"], {
    cwd: sandbox,
    encoding: "utf8"
  });
  assert.equal(scanned.status, 0, scanned.stderr);
  await writeFile(join(sandbox, evidenceRoot, "token-lint.txt"), scanned.stdout, "utf8");
  const verified = spawnSync(process.execPath, [helper, "verify", evidenceRoot, "token-lint.txt"], {
    cwd: sandbox,
    encoding: "utf8"
  });
  assert.equal(verified.status, 0, verified.stderr);

  for (const slug of ["..", "Bad-Slug", "two--parts", "con", "bad/slug"]) {
    const rejected = spawnSync(process.execPath, [helper, "create", slug], { cwd: sandbox, encoding: "utf8" });
    assert.notEqual(rejected.status, 0, slug);
  }
  const escaped = spawnSync(process.execPath, [helper, "verify", evidenceRoot, "../outside.txt"], {
    cwd: sandbox,
    encoding: "utf8"
  });
  assert.notEqual(escaped.status, 0);

  const slidesLane = spawnSync(process.execPath, [helper, "create", "deck-check", "slides"], { cwd: sandbox, encoding: "utf8" });
  assert.equal(slidesLane.status, 0, slidesLane.stderr);
  const slidesRoot = slidesLane.stdout.trim();
  assert.match(slidesRoot, /^\.superloopy\/evidence\/slides\/\d{8}T\d{6}Z-deck-check$/u);
  await writeFile(join(sandbox, slidesRoot, "VISUAL_QA.md"), "visual qa proof\n", "utf8");
  const slidesVerified = spawnSync(process.execPath, [helper, "verify", slidesRoot, "VISUAL_QA.md"], { cwd: sandbox, encoding: "utf8" });
  assert.equal(slidesVerified.status, 0, slidesVerified.stderr);
  const badLane = spawnSync(process.execPath, [helper, "create", "deck-check", "backend"], { cwd: sandbox, encoding: "utf8" });
  assert.notEqual(badLane.status, 0);
  assert.match(badLane.stderr, /lane must be frontend or slides/u);
});

test("frontend evidence helper rejects symlinked proofs and roots while running through a linked entrypoint", {
  skip: process.platform === "win32" ? "file symlink creation is not reliably available on Windows CI" : false
}, async (t) => {
  const repoRoot = process.cwd();
  const helper = join(repoRoot, "skills/superloopy-frontend/scripts/evidence-root.mjs");
  const sandbox = await mkdtemp(join(tmpdir(), "superloopy-frontend-evidence-symlink-"));
  t.after(() => rm(sandbox, { recursive: true, force: true }));

  const created = spawnSync(process.execPath, [helper, "create", "frontend-check"], {
    cwd: sandbox,
    encoding: "utf8"
  });
  assert.equal(created.status, 0, created.stderr);
  const evidenceRoot = created.stdout.trim();
  await writeFile(join(sandbox, evidenceRoot, "token-lint.txt"), "token lint proof\n", "utf8");

  await symlink(join(sandbox, evidenceRoot, "token-lint.txt"), join(sandbox, evidenceRoot, "linked-proof.txt"));
  const linkedProof = spawnSync(process.execPath, [helper, "verify", evidenceRoot, "linked-proof.txt"], {
    cwd: sandbox,
    encoding: "utf8"
  });
  assert.notEqual(linkedProof.status, 0);

  const linkedHelper = join(sandbox, "evidence-root-link.mjs");
  await symlink(helper, linkedHelper);
  const throughLinkedHelper = spawnSync(process.execPath, [linkedHelper, "create", "linked-helper"], {
    cwd: sandbox,
    encoding: "utf8"
  });
  assert.equal(throughLinkedHelper.status, 0, throughLinkedHelper.stderr);
  assert.match(throughLinkedHelper.stdout, /linked-helper/u);

  const escapedProject = await mkdtemp(join(tmpdir(), "superloopy-frontend-symlink-project-"));
  const outside = await mkdtemp(join(tmpdir(), "superloopy-frontend-symlink-outside-"));
  t.after(() => rm(escapedProject, { recursive: true, force: true }));
  t.after(() => rm(outside, { recursive: true, force: true }));
  await symlink(outside, join(escapedProject, ".superloopy"));
  const escapedCreate = spawnSync(process.execPath, [helper, "create", "escape-check"], {
    cwd: escapedProject,
    encoding: "utf8"
  });
  assert.notEqual(escapedCreate.status, 0);
  assert.equal(existsSync(join(outside, "evidence")), false);
});
