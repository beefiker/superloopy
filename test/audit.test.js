import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { countPhysicalLines, INVENTORY_DOCS, isReviewableTextFile, runDoctor } from "../src/doctor.js";

const AUDIT_PATH = "docs/superloopy-file-audit.md";
const MAX_REVIEWABLE_LINES = 550;

test("file audit covers every repository file and reference boundary", async () => {
  const audit = await readFile(AUDIT_PATH, "utf8");
  const files = listRepoFiles();
  const missing = files.filter((file) => !audit.includes(`\`${file}\``));

  assert.deepEqual(missing, []);
  assert.match(audit, /does not vendor/u);
  assert.match(audit, /Original Superloopy role/u);
  assert.match(audit, /Superloopy-native boundary/u);
});

test("source and test files stay small enough to review file by file", async () => {
  const files = listRepoFiles().filter(isReviewableTextFile);
  const oversized = [];
  for (const file of files) {
    const lineCount = countPhysicalLines(await readFile(file, "utf8"));
    if (lineCount > MAX_REVIEWABLE_LINES) oversized.push(`${file}:${lineCount}`);
  }

  assert.deepEqual(oversized, []);
});

test("standalone reviewability uses the physical-line and extension contract", () => {
  assert.equal(countPhysicalLines("one\ntwo"), 2);
  assert.equal(countPhysicalLines("one\rtwo\r"), 2);
  for (const file of ["a.mjs", "a.cjs", "a.yml"]) {
    assert.equal(isReviewableTextFile(file), true, file);
  }
});

test("the per-file inventories are audited by completeness, not by line count", () => {
  // Their length is one row per Git-visible file, so a fixed cap would make repository growth a
  // violation. Completeness is proven by the file-audit check above instead.
  for (const file of [...INVENTORY_DOCS]) {
    assert.equal(isReviewableTextFile(file), false, file);
  }
  // The exemption is exactly those two documents: every other doc still reviews by line count.
  assert.deepEqual([...INVENTORY_DOCS].sort(), [
    "docs/superloopy-file-audit.md",
    "docs/superloopy-loop-golden-set.md"
  ]);
  for (const file of ["docs/superloopy-design-audit.md", "docs/superloopy-gate-notes.md", "README.md"]) {
    assert.equal(isReviewableTextFile(file), true, file);
  }
});

test("file audit weight note names the current largest source file", async () => {
  const audit = await readFile(AUDIT_PATH, "utf8");
  const sourceFiles = listRepoFiles().filter((file) => file.startsWith("src/") && file.endsWith(".js"));
  const measured = [];
  for (const file of sourceFiles) {
    measured.push({
      file,
      lines: countPhysicalLines(await readFile(file, "utf8"))
    });
  }
  const largest = [...measured].sort((left, right) => right.lines - left.lines)[0];
  const escapedFile = largest.file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  assert.match(audit, new RegExp(`Current largest source file: \`${escapedFile}\``, "u"));
});

test("the reviewability check does not depend on a runtime-version-gated array method", async () => {
  // Regression: this check catches its own errors, so calling a method the running Node may lack
  // turned a runtime gap into a failed repository check whose message named an internal variable.
  // Verified by deleting the method and proving the check still reports the repository truthfully.
  const original = Array.prototype.toSorted;
  delete Array.prototype.toSorted;
  try {
    const result = await runDoctor(process.cwd());
    assert.equal(result.checks.reviewability.ok, true);
    assert.equal(result.checks.reviewability.message, undefined);
    assert.ok(result.checks.reviewability.largest.file.length > 0);
  } finally {
    Array.prototype.toSorted = original;
  }
});

test("reviewability excludes tracked approved plans but not ordinary Markdown", async () => {
  const repo = await mkdtemp(join(tmpdir(), "superloopy-reviewability-"));
  const listed = spawnSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" });
  assert.equal(listed.status, 0, listed.stderr);
  for (const file of listed.stdout.split("\n").filter(Boolean)) {
    if (!existsSync(file)) continue;
    const target = join(repo, file);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(file, target);
  }
  const initialized = spawnSync("git", ["init"], { cwd: repo, encoding: "utf8" });
  assert.equal(initialized.status, 0, initialized.stderr);
  const staged = spawnSync("git", ["add", "--force", "."], { cwd: repo, encoding: "utf8" });
  assert.equal(staged.status, 0, staged.stderr);

  const approvedPlan = await runDoctor(repo);
  assert.equal(approvedPlan.checks.reviewability.ok, true, approvedPlan.checks.reviewability.message);

  await writeFile(join(repo, "docs", "ordinary.md"), "# Ordinary\n".repeat(551));
  const stagedOrdinary = spawnSync("git", ["add", "docs/ordinary.md"], { cwd: repo, encoding: "utf8" });
  assert.equal(stagedOrdinary.status, 0, stagedOrdinary.stderr);
  const ordinaryMarkdown = await runDoctor(repo);
  assert.equal(ordinaryMarkdown.checks.reviewability.ok, false);
  assert.match(ordinaryMarkdown.checks.reviewability.message, /docs\/ordinary\.md:551/);
});

function listRepoFiles() {
  const result = spawnSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((file) => existsSync(file))
    .sort();
}
