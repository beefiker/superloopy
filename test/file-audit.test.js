import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { checkFileAudit } from "../src/file-audit.js";

async function tempRepo() {
  return mkdtemp(join(tmpdir(), "loopy-file-audit-"));
}

test("checkFileAudit reports stale inventory rows without needing doctor wiring", async () => {
  const repo = await tempRepo();
  await mkdir(join(repo, "docs"), { recursive: true });
  await writeFile(join(repo, "docs", "audit.md"), [
    "Boundary statement: Loopy does not vendor reference code.",
    "Loopy-native boundary: all public names belong to Loopy.",
    "## Original Loopy role",
    "",
    "| File | Original Loopy role | Compatibility boundary |",
    "| --- | --- | --- |",
    "| `live.js` | Live Loopy file. | Original implementation. |",
    "| `deleted.js` | Removed Loopy file. | Original implementation. |"
  ].join("\n"), "utf8");

  const result = await checkFileAudit(repo, {
    auditPath: "docs/audit.md",
    listFiles: () => ["live.js"]
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.staleRows, ["deleted.js"]);
  assert.match(result.message, /File audit rows without Git-visible files: deleted\.js/);
});
