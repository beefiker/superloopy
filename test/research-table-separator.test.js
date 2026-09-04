import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  parseBlockedSources,
  parseExpectedTruths,
  parseLedger,
  validate
} from "../skills/superloopy-research/scripts/validate-research-evidence.mjs";

// Issue #50: agents copied the skill's table templates verbatim and shipped ledgers whose header
// had no separator row beneath it, so every markdown preview rendered them as running text. The
// validator now treats a missing or malformed separator row as structural damage.
const LEDGER_HEADER = "| id | claim | risk | cost | observations | counter | primary | observed | as-of | depends-on | status |";
const LEDGER_ROW =
  "| C1 | Idle sessions expire in 30 minutes | high | A wrong timeout ships a session-fixation window | standard: https://a.example/spec · registry: https://b.example/api/config | Counter-search found only a superseded draft | https://a.example/spec | 2026-07-29 | 2026-06-01 | none | verified |";
const BLOCKED_HEADER = "| url | tiers | reason | substitute | status |";
const BLOCKED_ROW = "| https://x.example/spec | api, plain, tls, headless | bot challenge survived every tier | https://mirror.example/spec | substituted |";
const TRUTH_HEADER = "| id | expected | source | observed | status | claim |";
const TRUTH_ROW = "| T1 | Idle sessions expire in 30 minutes | spec section 4.2 | They expire in 8 hours | violated | C1 |";
const SYNTHESIS = [
  "# Superloopy Research Synthesis: session expiry",
  "## Executive answer",
  "Idle sessions expire in 30 minutes [Source 1].",
  "## Sources",
  "- Source 1: https://a.example/spec - grade B - ok - observed 2026-07-29",
  "## Verified claims",
  "- C1 | verified | ledger",
  "## Contradictions",
  "None.",
  "## Gaps",
  "None."
].join("\n");

function separator(header) {
  return `|${" --- |".repeat(header.split("|").length - 2)}`;
}

test("every ledger reader fails a header with no markdown separator row beneath it", () => {
  const ledger = parseLedger([LEDGER_HEADER, LEDGER_ROW].join("\n"));
  assert.match(ledger.problems.join("\n"), /claim-ledger\.md header has no markdown separator row/u);
  assert.equal(ledger.rows.length, 1, "rows are still read so every other problem is reported alongside");

  const blocked = parseBlockedSources([BLOCKED_HEADER, BLOCKED_ROW].join("\n"));
  assert.match(blocked.problems.join("\n"), /blocked-sources\.md header has no markdown separator row/u);

  const truths = parseExpectedTruths([TRUTH_HEADER, TRUTH_ROW].join("\n"));
  assert.match(truths.problems.join("\n"), /expected-truths\.md header has no markdown separator row/u);

  const headerOnly = parseExpectedTruths(`${TRUTH_HEADER}\n`);
  assert.match(headerOnly.problems.join("\n"), /expected-truths\.md header has no markdown separator row/u);
});

test("a separator row must match the header width, and alignment colons are allowed", () => {
  const narrow = parseBlockedSources([BLOCKED_HEADER, "| --- | --- |", BLOCKED_ROW].join("\n"));
  assert.match(narrow.problems.join("\n"), /blocked-sources\.md separator row has 2 cells, header has 5/u);

  const aligned = parseBlockedSources([BLOCKED_HEADER, "| :--- | :---: | ---: | - | --- |", BLOCKED_ROW].join("\n"));
  assert.deepEqual(aligned.problems, []);
  assert.equal(aligned.rows.length, 1);

  const plain = parseLedger([LEDGER_HEADER, separator(LEDGER_HEADER), LEDGER_ROW].join("\n"));
  assert.deepEqual(plain.problems, []);
});

test("the separator rule reads the same on a CRLF checkout", () => {
  // A Windows session writes CRLF ledgers; the gate must judge them by content, not line endings.
  const crlf = (lines) => lines.join("\r\n");
  assert.deepEqual(parseLedger(crlf([LEDGER_HEADER, separator(LEDGER_HEADER), LEDGER_ROW])).problems, []);
  assert.match(
    parseLedger(crlf([LEDGER_HEADER, LEDGER_ROW])).problems.join("\n"),
    /claim-ledger\.md header has no markdown separator row/u
  );
});

test("a session whose ledger lacks the separator row fails the whole gate", async () => {
  const root = await mkdtemp(join(tmpdir(), "superloopy-research-"));
  await writeFile(join(root, "SYNTHESIS.md"), SYNTHESIS, "utf8");
  await writeFile(join(root, "INDEX.md"), "# Index\n- claim C1 -> wave-1-web-spec.md\n", "utf8");

  await writeFile(join(root, "claim-ledger.md"), [LEDGER_HEADER, LEDGER_ROW].join("\n"), "utf8");
  const failing = await validate(root);
  assert.equal(failing.ok, false);
  assert.deepEqual(failing.problems, ["claim-ledger.md header has no markdown separator row (`| --- | ... |`) beneath it."]);

  await writeFile(join(root, "claim-ledger.md"), [LEDGER_HEADER, separator(LEDGER_HEADER), LEDGER_ROW].join("\n"), "utf8");
  const passing = await validate(root);
  assert.deepEqual(passing.problems, []);
  assert.equal(passing.ok, true);
});
