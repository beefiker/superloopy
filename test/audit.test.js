import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";

const AUDIT_PATH = "docs/superloopy-file-audit.md";
const MAX_REVIEWABLE_LINES = 500;

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
  const files = listRepoFiles().filter(isReviewabilityCandidate);
  const oversized = [];
  for (const file of files) {
    const lineCount = (await readFile(file, "utf8")).split("\n").length - 1;
    if (lineCount > MAX_REVIEWABLE_LINES) oversized.push(`${file}:${lineCount}`);
  }

  assert.deepEqual(oversized, []);
});

test("file audit weight note names the current largest source file", async () => {
  const audit = await readFile(AUDIT_PATH, "utf8");
  const sourceFiles = listRepoFiles().filter((file) => file.startsWith("src/") && file.endsWith(".js"));
  const measured = [];
  for (const file of sourceFiles) {
    measured.push({
      file,
      lines: (await readFile(file, "utf8")).split("\n").length - 1
    });
  }
  const largest = measured.toSorted((left, right) => right.lines - left.lines)[0];
  const escapedFile = largest.file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  assert.match(audit, new RegExp(`Current largest source file: \`${escapedFile}\``, "u"));
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

function isReviewabilityCandidate(file) {
  if (!/\.(js|md|json|yaml)$/u.test(file)) return false;
  if (file === "web/loopy-copy.js") return false;
  if (file === "web/_payload.json") return false;
  if (file.startsWith("web/_nuxt/")) return false;
  return true;
}
