import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { checkFileAudit } from "../src/file-audit.js";

async function tempRepo() {
  return mkdtemp(join(tmpdir(), "superloopy-file-audit-"));
}

test("checkFileAudit reports stale inventory rows without needing doctor wiring", async () => {
  const repo = await tempRepo();
  await mkdir(join(repo, "docs"), { recursive: true });
  await writeFile(join(repo, "docs", "audit.md"), [
    "Boundary statement: Superloopy does not vendor reference code.",
    "Superloopy-native boundary: all public names belong to Superloopy.",
    "## Original Superloopy role",
    "",
    "| File | Original Superloopy role | Compatibility boundary |",
    "| --- | --- | --- |",
    "| `live.js` | Live Superloopy file. | Original implementation. |",
    "| `deleted.js` | Removed Superloopy file. | Original implementation. |"
  ].join("\n"), "utf8");

  const result = await checkFileAudit(repo, {
    auditPath: "docs/audit.md",
    listFiles: () => ["live.js"]
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.staleRows, ["deleted.js"]);
  assert.match(result.message, /File audit rows without Git-visible files: deleted\.js/);
});

async function writePackagingStrippedAudit(repo) {
  await mkdir(join(repo, "docs"), { recursive: true });
  await writeFile(join(repo, "docs", "audit.md"), [
    "Boundary statement: Superloopy does not vendor reference code.",
    "Superloopy-native boundary: all public names belong to Superloopy.",
    "## Original Superloopy role",
    "",
    "| File | Original Superloopy role | Compatibility boundary |",
    "| --- | --- | --- |",
    "| `live.js` | Live Superloopy file. | Original implementation. |",
    "| `.gitignore` | Repo hygiene. | Original implementation. |",
    "| `package-lock.json` | Locked dependency graph. | Original implementation. |"
  ].join("\n"), "utf8");
}

test("checkFileAudit tolerates packaging-stripped rows in a packed (non-git) root", async () => {
  const repo = await tempRepo();
  await writePackagingStrippedAudit(repo);

  const result = await checkFileAudit(repo, {
    auditPath: "docs/audit.md",
    listFiles: () => ["live.js"]
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.staleRows, []);
});

test("checkFileAudit still flags packaging-stripped rows in a source checkout", async () => {
  const repo = await tempRepo();
  await writePackagingStrippedAudit(repo);
  await mkdir(join(repo, ".git"), { recursive: true });

  const result = await checkFileAudit(repo, {
    auditPath: "docs/audit.md",
    listFiles: () => ["live.js"]
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.staleRows, [".gitignore", "package-lock.json"]);
  assert.match(result.message, /File audit rows without Git-visible files/);
});

test("checkFileAudit honors an explicit sourceCheckout signal over the .git fallback", async () => {
  const repo = await tempRepo();
  await writePackagingStrippedAudit(repo);

  // No .git marker at the root — a tracked monorepo subdirectory looks like this.
  // The caller-supplied signal must keep stale-row enforcement on.
  const result = await checkFileAudit(repo, {
    auditPath: "docs/audit.md",
    listFiles: () => ["live.js"],
    sourceCheckout: true
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.staleRows, [".gitignore", "package-lock.json"]);
});
