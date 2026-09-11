import assert from "node:assert/strict";
import test from "node:test";

import { FOOTER_TOLERANCE_POINTS, MIN_HUMAN_ERA_HITS, footerShare, measure, verdict } from "../scripts/calque-reverse-test.mjs";

// Measured 2026-09-10 against a 13.7% baseline; the tool must reproduce those verdicts offline.
test("reverse test passes human-era phrases and fails LLM-era ones", () => {
  const baseline = 13.7;
  assert.equal(verdict({ pre: 267, year: 10807, footer: 1189 }, baseline).pass, true, "기준 데이터");
  assert.equal(verdict({ pre: 5, year: 23157, footer: 8035 }, baseline).pass, false, "정본: no human-era use");
  assert.equal(verdict({ pre: 80, year: 7160, footer: 1568 }, baseline).pass, false, "정상 종료: 21.9% footer");
  assert.equal(verdict({ pre: 0, year: 245, footer: 69 }, baseline).pass, false, "아무 표시 없이");
  assert.equal(verdict({ pre: MIN_HUMAN_ERA_HITS, year: 100, footer: 0 }, baseline).pass, true, "threshold is inclusive");
  const edge = verdict({ pre: 100, year: 1000, footer: Math.round((baseline + FOOTER_TOLERANCE_POINTS) * 10) }, baseline);
  assert.equal(edge.pass, true, "baseline plus tolerance still passes");
});

test("reverse test measures with three quoted searches per phrase and reports footer share", () => {
  const queries = [];
  const row = measure("기준 데이터", 2026, (query) => { queries.push(query); return queries.length * 10; });
  assert.deepEqual(row, { phrase: "기준 데이터", pre: 10, year: 20, footer: 30 });
  assert.deepEqual(queries, [
    '"기준 데이터" created:<2022-11-30',
    '"기준 데이터" created:>=2026-01-01',
    '"기준 데이터" "Generated with Claude Code" created:>=2026-01-01'
  ]);
  assert.equal(footerShare(0, 0), 0);
  assert.equal(footerShare(25, 100), 25);
});
