import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  dependencyIds,
  observationSurfaces,
  parseBlockedSources,
  parseExpectedTruths,
  parseLedger,
  parseTable,
  tokens,
  validate
} from "../skills/superloopy-research/scripts/validate-research-evidence.mjs";

const SCRIPT = "skills/superloopy-research/scripts/validate-research-evidence.mjs";
const LEDGER_HEADER = [
  "| id | claim | risk | cost | observations | counter | primary | observed | as-of | depends-on | status |",
  "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |"
];
const BLOCKED_HEADER = [
  "| url | tiers | reason | substitute | status |",
  "| --- | --- | --- | --- | --- |"
];
const TRUTH_HEADER = [
  "| id | expected | source | observed | status | claim |",
  "| --- | --- | --- | --- | --- | --- |"
];
const DEFAULT_INDEX = [
  "# Index",
  "- claim C1 -> wave-1-web-spec.md",
  "- claim C2 -> wave-1-web-spec.md",
  "- claim C3 -> wave-1-web-spec.md"
].join("\n");

async function evidenceRoot(ledgerRows, synthesis, blockedRows = null, options = {}) {
  const root = await mkdtemp(join(tmpdir(), "superloopy-research-"));
  if (ledgerRows !== null) {
    await writeFile(join(root, "claim-ledger.md"), [...LEDGER_HEADER, ...ledgerRows].join("\n"), "utf8");
  }
  if (synthesis !== null) await writeFile(join(root, "SYNTHESIS.md"), synthesis, "utf8");
  if (blockedRows !== null) {
    await writeFile(join(root, "blocked-sources.md"), [...BLOCKED_HEADER, ...blockedRows].join("\n"), "utf8");
  }
  if (options.truthRows !== undefined) {
    await writeFile(join(root, "expected-truths.md"), [...TRUTH_HEADER, ...options.truthRows].join("\n"), "utf8");
  }
  if (options.index !== null) {
    await writeFile(join(root, "INDEX.md"), options.index ?? DEFAULT_INDEX, "utf8");
  }
  return root;
}

function blockedRow(overrides = {}) {
  const values = {
    url: "https://x.example/spec",
    tiers: "api, plain, tls, headless",
    reason: "bot challenge survived every tier",
    substitute: "https://mirror.example/spec",
    status: "substituted",
    ...overrides
  };
  return `| ${[values.url, values.tiers, values.reason, values.substitute, values.status].join(" | ")} |`;
}

function row(overrides = {}) {
  const values = {
    id: "C1",
    claim: "The spec requires idle sessions to expire in 30 minutes",
    risk: "high",
    cost: "A wrong timeout ships a session-fixation window",
    observations: "standard: https://a.example/spec · registry: https://b.example/api/config",
    counter: "Counter-search found only a superseded draft",
    primary: "https://a.example/spec",
    observed: "2026-07-29",
    "as-of": "2026-06-01",
    "depends-on": "none",
    status: "verified",
    ...overrides
  };
  return `| ${[
    values.id,
    values.claim,
    values.risk,
    values.cost,
    values.observations,
    values.counter,
    values.primary,
    values.observed,
    values["as-of"],
    values["depends-on"],
    values.status
  ].join(" | ")} |`;
}

const GOOD_SYNTHESIS = [
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

test("a complete ledger and synthesis pass the research evidence gate", async () => {
  const root = await evidenceRoot([row()], GOOD_SYNTHESIS);

  const report = await validate(root);

  assert.deepEqual(report.problems, []);
  assert.equal(report.ok, true);
  assert.equal(report.ledger.rows, 1);
  assert.equal(report.ledger.verified, 1);
  assert.equal(report.synthesis.citations, 1);
});

test("a missing ledger fails closed because the synthesis has no allowlist", async () => {
  const root = await evidenceRoot(null, GOOD_SYNTHESIS);

  const report = await validate(root);

  assert.equal(report.ok, false);
  assert.match(report.problems[0], /Missing claim-ledger\.md/u);
});

test("verified rows need two distinct observation surfaces, not two links", async () => {
  const sameSurface = await validate(
    await evidenceRoot(
      [row({ observations: "vendor blog: https://v.example/a · vendor blog: https://v.example/b" })],
      GOOD_SYNTHESIS
    )
  );

  assert.equal(sameSurface.ok, false);
  assert.match(sameSurface.problems.join("\n"), /verified needs 2\+ observations on distinct surfaces, found 1/u);
});

test("verified rows need a counter-search, a primary source, and both dates", async () => {
  for (const [overrides, expected] of [
    [{ counter: "none" }, /without a counter-search/u],
    [{ primary: "-" }, /without a primary source/u],
    [{ observed: "last week" }, /observed must be an ISO date/u],
    [{ "as-of": "unknown" }, /high-risk verified claim needs an ISO as-of date/u]
  ]) {
    const report = await validate(await evidenceRoot([row(overrides)], GOOD_SYNTHESIS));
    assert.equal(report.ok, false);
    assert.match(report.problems.join("\n"), expected);
  }
});

test("an unpriced claim fails because verify-or-defer was never decided", async () => {
  const report = await validate(await evidenceRoot([row({ cost: "" })], GOOD_SYNTHESIS));

  assert.equal(report.ok, false);
  assert.match(report.problems.join("\n"), /error cost is unpriced/u);
});

test("a verified claim cannot rest on a refuted or unresolved dependency", async () => {
  const refuted = row({ id: "C2", status: "refuted", risk: "normal", "as-of": "unknown" });
  const report = await validate(
    await evidenceRoot([row({ "depends-on": "C2" }), refuted], GOOD_SYNTHESIS)
  );

  assert.equal(report.ok, false);
  assert.match(report.problems.join("\n"), /C1: verified while dependency C2 is refuted/u);
});

test("dependency graphs reject unknown ids and cycles", async () => {
  const unknown = await validate(await evidenceRoot([row({ "depends-on": "C9" })], GOOD_SYNTHESIS));
  assert.match(unknown.problems.join("\n"), /depends-on references unknown id C9/u);

  const cycle = await validate(
    await evidenceRoot(
      [row({ "depends-on": "C2" }), row({ id: "C2", "depends-on": "C1" })],
      GOOD_SYNTHESIS
    )
  );
  assert.equal(cycle.ok, false);
  assert.match(cycle.problems.join("\n"), /Dependency cycle: /u);
});

test("the synthesis cannot assert a high-risk claim the ledger left unresolved", async () => {
  const report = await validate(
    await evidenceRoot([row({ status: "unresolved" })], GOOD_SYNTHESIS)
  );

  assert.equal(report.ok, false);
  assert.match(report.problems.join("\n"), /lists C1 as verified but the ledger says unresolved/u);
});

test("dangling and absent citations both fail the synthesis check", async () => {
  const dangling = await validate(
    await evidenceRoot([row()], GOOD_SYNTHESIS.replace("[Source 1]", "[Source 4]"))
  );
  assert.equal(dangling.ok, false);
  assert.match(dangling.problems.join("\n"), /cites sources with no numbered entry: \[Source 4\]/u);

  const uncited = await validate(
    await evidenceRoot([row()], GOOD_SYNTHESIS.replace(" [Source 1]", ""))
  );
  assert.match(uncited.problems.join("\n"), /carries no \[Source N\] citations/u);
});

test("a missing synthesis section fails the deliverable shape", async () => {
  const report = await validate(
    await evidenceRoot([row()], GOOD_SYNTHESIS.replace("## Contradictions", "## Notes"))
  );

  assert.equal(report.ok, false);
  assert.match(report.problems.join("\n"), /missing "## Contradictions" section/u);
});

test("ledger parsing reports structural damage instead of silently skipping rows", () => {
  const noHeader = parseLedger("| C1 | claim |\n");
  assert.match(noHeader.problems.join("\n"), /no table header starting with `id`/u);

  const shortRow = parseLedger([...LEDGER_HEADER, "| C1 | claim | high |"].join("\n"));
  assert.match(shortRow.problems.join("\n"), /row has 3 cells, header has 11/u);

  const duplicate = parseLedger([...LEDGER_HEADER, row(), row()].join("\n"));
  assert.match(duplicate.problems.join("\n"), /duplicate id: C1/u);

  const missingColumn = parseLedger(
    ["| id | claim | risk | status |", "| --- | --- | --- | --- |", "| C1 | c | high | verified |"].join("\n")
  );
  assert.match(missingColumn.problems.join("\n"), /header missing columns: cost, observations/u);
});

test("surface and dependency parsing ignore empty and label-less entries", () => {
  assert.deepEqual(observationSurfaces("standard: https://a · api: https://b"), ["standard", "api"]);
  assert.deepEqual(observationSurfaces("https://a · https://b"), []);
  assert.deepEqual(observationSurfaces("none"), []);
  assert.deepEqual(dependencyIds("C1, C2 · C3"), ["C1", "C2", "C3"]);
  assert.deepEqual(dependencyIds("none"), []);
  assert.deepEqual(tokens("api, plain tls·headless"), ["api", "plain", "tls", "headless"]);
});

test("surface labels come from a closed vocabulary so independence cannot be relabelled", async () => {
  const unknown = await validate(
    await evidenceRoot(
      [row({ observations: "official site: https://a.example · my notes: https://b.example" })],
      GOOD_SYNTHESIS
    )
  );

  assert.equal(unknown.ok, false);
  assert.match(unknown.problems.join("\n"), /unknown surface label\(s\) official site, my notes; use one of rendered, api/u);
});

test("a high-risk claim standing only on commentary has no primary surface", async () => {
  const report = await validate(
    await evidenceRoot(
      [row({ observations: "press: https://news.example/a · community: https://forum.example/b" })],
      GOOD_SYNTHESIS
    )
  );

  assert.equal(report.ok, false);
  assert.match(report.problems.join("\n"), /needs at least one primary surface \(api, repo, registry/u);
});

test("blocked sources must exhaust the ladder or record a terminal reason", async () => {
  const clean = await validate(await evidenceRoot([row()], GOOD_SYNTHESIS, [blockedRow()]));
  assert.deepEqual(clean.problems, []);
  assert.equal(clean.blocked.substituted, 1);

  const partial = await validate(
    await evidenceRoot([row()], GOOD_SYNTHESIS, [blockedRow({ tiers: "api, plain" })])
  );
  assert.equal(partial.ok, false);
  assert.match(partial.problems.join("\n"), /only 2\/4 ladder tiers tried and no terminal reason/u);

  const terminal = await validate(
    await evidenceRoot([row()], GOOD_SYNTHESIS, [
      blockedRow({ tiers: "api", reason: "auth-required behind a customer login" })
    ])
  );
  assert.deepEqual(terminal.problems, []);

  const unknownTier = await validate(
    await evidenceRoot([row()], GOOD_SYNTHESIS, [blockedRow({ tiers: "api, plain, tls, headless, cache" })])
  );
  assert.match(unknownTier.problems.join("\n"), /unknown ladder tier\(s\) cache/u);
});

test("an open blocked row blocks completion and a gap must be published", async () => {
  const open = await validate(
    await evidenceRoot([row()], GOOD_SYNTHESIS, [blockedRow({ status: "open" })])
  );
  assert.equal(open.ok, false);
  assert.match(open.problems.join("\n"), /still open — the ladder is unfinished/u);

  const unpublished = await validate(
    await evidenceRoot([row()], GOOD_SYNTHESIS, [blockedRow({ substitute: "none", status: "gap" })])
  );
  assert.equal(unpublished.ok, false);
  assert.match(unpublished.problems.join("\n"), /recorded as a gap but the synthesis Gaps section never names it/u);

  const published = await validate(
    await evidenceRoot(
      [row()],
      GOOD_SYNTHESIS.replace("## Gaps\nNone.", "## Gaps\nNo substitute for https://x.example/spec."),
      [blockedRow({ substitute: "none", status: "gap" })]
    )
  );
  assert.deepEqual(published.problems, []);

  const noSubstitute = await validate(
    await evidenceRoot([row()], GOOD_SYNTHESIS, [blockedRow({ substitute: "-" })])
  );
  assert.match(noSubstitute.problems.join("\n"), /marked substituted with no substitute source/u);
});

test("blocked-sources parsing reports structural damage", () => {
  const noHeader = parseBlockedSources("| https://a | api |\n");
  assert.match(noHeader.problems.join("\n"), /no table header starting with `url`/u);

  const shortRow = parseBlockedSources([...BLOCKED_HEADER, "| https://a | api |"].join("\n"));
  assert.match(shortRow.problems.join("\n"), /row has 2 cells, header has 5/u);
});

test("the index must exist and must reach every wave file and claim", async () => {
  const missing = await validate(await evidenceRoot([row()], GOOD_SYNTHESIS, null, { index: null }));
  assert.equal(missing.ok, false);
  assert.match(missing.problems.join("\n"), /Missing INDEX\.md: the session has no summary layer/u);

  const noClaim = await validate(
    await evidenceRoot([row()], GOOD_SYNTHESIS, null, { index: "# Index\n- nothing useful" })
  );
  assert.equal(noClaim.ok, false);
  assert.match(noClaim.problems.join("\n"), /INDEX\.md has no line for claim C1/u);

  const stale = await evidenceRoot([row()], GOOD_SYNTHESIS, null, { index: "# Index\n- claim C1" });
  await writeFile(join(stale, "wave-2-web-registry.md"), "detail", "utf8");
  const staleReport = await validate(stale);
  assert.equal(staleReport.ok, false);
  assert.match(staleReport.problems.join("\n"), /INDEX\.md never names wave-2-web-registry\.md/u);
});

test("expected truths need an authority and a landing place for every violation", async () => {
  const truth = (overrides = {}) => {
    const values = {
      id: "T1",
      expected: "Idle sessions expire in 30 minutes",
      source: "spec section 4.2",
      observed: "They expire in 8 hours",
      status: "violated",
      claim: "C1",
      ...overrides
    };
    return `| ${[values.id, values.expected, values.source, values.observed, values.status, values.claim].join(" | ")} |`;
  };

  const linked = await validate(
    await evidenceRoot([row()], GOOD_SYNTHESIS, null, { truthRows: [truth()] })
  );
  assert.deepEqual(linked.problems, []);
  assert.equal(linked.expectedTruths.violated, 1);

  const dangling = await validate(
    await evidenceRoot([row()], GOOD_SYNTHESIS, null, { truthRows: [truth({ claim: "C9" })] })
  );
  assert.equal(dangling.ok, false);
  assert.match(dangling.problems.join("\n"), /T1: violated but claim "C9" is not a ledger id or `gap`/u);

  const unpublishedGap = await validate(
    await evidenceRoot([row()], GOOD_SYNTHESIS, null, { truthRows: [truth({ claim: "gap" })] })
  );
  assert.equal(unpublishedGap.ok, false);
  assert.match(unpublishedGap.problems.join("\n"), /T1: violated and routed to a gap the synthesis Gaps section never names/u);

  const publishedGap = await validate(
    await evidenceRoot(
      [row()],
      GOOD_SYNTHESIS.replace("## Gaps\nNone.", "## Gaps\nT1 has no reachable source."),
      null,
      { truthRows: [truth({ claim: "gap" })] }
    )
  );
  assert.deepEqual(publishedGap.problems, []);

  const noAuthority = await validate(
    await evidenceRoot([row()], GOOD_SYNTHESIS, null, { truthRows: [truth({ source: "none" })] })
  );
  assert.match(noAuthority.problems.join("\n"), /T1: no intent source recorded/u);

  const unmeasured = await validate(
    await evidenceRoot([row()], GOOD_SYNTHESIS, null, { truthRows: [truth({ status: "unknown", claim: "none" })] })
  );
  assert.equal(unmeasured.ok, false);
  assert.match(unmeasured.problems.join("\n"), /T1: unmeasured expected truth that the synthesis Gaps section never names/u);

  const badStatus = await validate(
    await evidenceRoot([row()], GOOD_SYNTHESIS, null, { truthRows: [truth({ status: "maybe" })] })
  );
  assert.match(badStatus.problems.join("\n"), /T1: status must be holds, violated, or unknown/u);
});

test("the shared table reader names the document it is reading", () => {
  const truths = parseExpectedTruths("| id | expected |\n| --- | --- |\n| T1 | x |\n");
  assert.match(truths.problems.join("\n"), /expected-truths\.md header missing columns: source, observed, status, claim/u);

  const duplicate = parseTable("| id | a |\n| --- | --- |\n| T1 | x |\n| T1 | y |\n", {
    label: "demo.md",
    columns: ["id", "a"],
    uniqueFirstColumn: true
  });
  assert.match(duplicate.problems.join("\n"), /demo\.md duplicate id: T1/u);
});

test("the validator runs as a CLI and exits non-zero on a failing session", async () => {
  const failing = await evidenceRoot([row({ counter: "none" })], GOOD_SYNTHESIS);
  const bad = spawnSync(process.execPath, [SCRIPT, "--root", failing, "--json"], { encoding: "utf8" });

  assert.equal(bad.status, 1);
  assert.equal(JSON.parse(bad.stdout).ok, false);

  const passing = await evidenceRoot([row()], GOOD_SYNTHESIS);
  const good = spawnSync(process.execPath, [SCRIPT, "--root", passing], { encoding: "utf8" });

  assert.equal(good.status, 0);
  assert.match(good.stdout, /Superloopy research evidence: pass/u);
});
