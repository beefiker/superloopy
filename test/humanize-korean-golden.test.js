import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const script = "skills/humanize-korean/scripts/audit-humanize-output.mjs";
const goldenSetPath = "skills/humanize-korean/references/golden-set.md";

const PAIR_PATTERN =
  /^### (G-\d{2}) · (.+?) · (.+)\naudit: ([^\n]+)\n+```before\n([\s\S]*?)\n```\n+```after\n([\s\S]*?)\n```/gmu;

function parseGoldenSet(markdown) {
  const normalized = markdown.replace(/\r\n?/gu, "\n");
  return [...normalized.matchAll(PAIR_PATTERN)].map((match) => {
    const auditField = match[4].trim();
    const parseIds = (value) => value.split(",").map((id) => id.trim()).filter(Boolean);
    return {
      id: match[1],
      rules: match[2].trim(),
      genre: match[3].trim(),
      auditIds: auditField === "none" || auditField.startsWith("keep") ? [] : parseIds(auditField),
      keepIds: auditField.startsWith("keep") ? parseIds(auditField.replace(/^keep\s*/u, "")) : [],
      before: match[5],
      after: match[6]
    };
  });
}

async function auditPair(pair) {
  const dir = await mkdtemp(join(tmpdir(), `superloopy-golden-${pair.id}-`));
  const source = join(dir, "source.md");
  const final = join(dir, "final.md");
  const report = join(dir, "audit.json");
  await writeFile(source, pair.before);
  await writeFile(final, pair.after);
  const result = spawnSync(
    process.execPath,
    [script, "--source", source, "--final", final, "--report", report, "--genre", pair.genre],
    { encoding: "utf8" }
  );
  return { result, report: JSON.parse(await readFile(report, "utf8")) };
}

const goldenMarkdown = await readFile(goldenSetPath, "utf8");
const goldenPairs = parseGoldenSet(goldenMarkdown);

test("golden set is large enough and has unique ids", () => {
  assert.ok(goldenPairs.length >= 30, `expected at least 30 golden pairs, found ${goldenPairs.length}`);
  assert.equal(new Set(goldenPairs.map((pair) => pair.id)).size, goldenPairs.length);
});

test("golden set parser captures every heading", () => {
  const headings = goldenMarkdown.match(/^### G-\d{2} · /gmu) ?? [];
  assert.equal(goldenPairs.length, headings.length, "a malformed entry silently dropped out of the parse");
});

test("golden set parser accepts Windows line endings", () => {
  const windowsMarkdown = goldenMarkdown.replace(/\r\n?/gu, "\n").replace(/\n/gu, "\r\n");
  const windowsPairs = parseGoldenSet(windowsMarkdown);
  assert.equal(windowsPairs.length, 44);
  assert.deepEqual([windowsPairs[0].id, windowsPairs.at(-1).id], ["G-01", "G-44"]);
  assert.equal(windowsPairs[0].before, "팀은 자동화 스크립트를 통해 배포 시간을 절반으로 줄였습니다.");
});

test("golden set covers the reassurance rules from issue #44", () => {
  for (const id of ["L-1", "L-2", "L-3"]) {
    assert.ok(
      goldenPairs.some((pair) => pair.auditIds.includes(id)),
      `expected at least one golden pair auditing ${id}`
    );
  }
  assert.ok(
    goldenPairs.some((pair) => pair.keepIds.length > 0),
    "expected at least one must-not-change pair guarding against over-writing"
  );
});

for (const pair of goldenPairs) {
  test(`golden pair ${pair.id} (${pair.rules}, ${pair.genre}) passes the humanize audit`, async () => {
    const { result, report } = await auditPair(pair);

    assert.equal(result.status, 0, `${pair.id} audit failed: ${result.stderr}\n${JSON.stringify(report, null, 2)}`);
    assert.equal(report.ok, true);
    assert.equal(report.genre, pair.genre);
    assert.equal(report.protectedTokens.missing.length, 0);

    if (pair.keepIds.length > 0) {
      assert.equal(pair.before, pair.after, `${pair.id} is a must-not-change pair; before and after must be identical`);
      for (const id of pair.keepIds) {
        assert.ok(
          (report.patterns.after[id] ?? 0) > 0,
          `${pair.id} must keep its ${id} vocabulary and still pass: ${JSON.stringify(report.patterns.after)}`
        );
      }
      return;
    }

    assert.ok(["A", "B"].includes(report.grade), `${pair.id} expected grade A or B, got ${report.grade}`);

    for (const id of pair.auditIds) {
      assert.ok(
        (report.patterns.before[id] ?? 0) > 0,
        `${pair.id} before text should trigger ${id}: ${JSON.stringify(report.patterns.before)}`
      );
      assert.equal(
        report.patterns.after[id] ?? 0,
        0,
        `${pair.id} after text should clear ${id}: ${JSON.stringify(report.patterns.after)}`
      );
    }
  });
}
