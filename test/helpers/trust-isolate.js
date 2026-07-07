// Test-only side effect: point the plan-trust approval ledger at a throwaway
// temp dir so tests never read/write the real user-home trust store. Imported
// for its side effect at the top of any test file that exercises capture/audit.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

if (!process.env.SUPERLOOPY_TRUST_DIR) {
  process.env.SUPERLOOPY_TRUST_DIR = mkdtempSync(join(tmpdir(), "superloopy-trust-test-"));
}
