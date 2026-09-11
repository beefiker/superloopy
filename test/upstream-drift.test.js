import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { NOTICE_PATH, addedRuleHeadings, summarize, syncCommitFromNotice } from "../scripts/upstream-drift.mjs";

test("upstream drift reads the recorded sync commit from the shipped notice", async () => {
  const sha = syncCommitFromNotice(await readFile(NOTICE_PATH, "utf8"));
  assert.match(sha, /^[0-9a-f]{7,40}$/u);
  assert.throws(() => syncCommitFromNotice("# Upstream Notice\n\nno sync line"), /does not record a sync commit/u);
});

test("upstream drift summarizes a compare payload and lists added rule headings", () => {
  const compare = {
    ahead_by: 2,
    commits: [
      { sha: "9747f03abcdef", commit: { author: { date: "2026-09-06T01:02:03Z" }, message: "Merge pull request #134\n\nbody" } },
      { sha: "bf48b12abcdef", commit: { author: { date: "2026-09-06T00:00:00Z" }, message: "feat(rules): A-24 신설" } }
    ],
    files: [
      { status: "modified", additions: 259, deletions: 30, filename: "skills/humanize-korean/references/ai-tell-taxonomy.md",
        patch: "+### A-22. 평가 술어 얹기 [S2] · v2.7 신규\n+본문\n-### A-9. 삭제된 것\n+## 오탐 방지 원칙 (v2.6)\n+#### D-14. 생성형 은유 남용 · v2.6.1" },
      { status: "added", additions: 288, deletions: 0, filename: "scripts/restore_modality.py" }
    ]
  };
  const summary = summarize(compare);
  assert.equal(summary.aheadBy, 2);
  assert.deepEqual(summary.commits[1], { sha: "bf48b12", date: "2026-09-06", subject: "feat(rules): A-24 신설" });
  assert.deepEqual(summary.files[1], { status: "added", additions: 288, deletions: 0, filename: "scripts/restore_modality.py" });
  assert.deepEqual(summary.addedRuleHeadings, ["A-22. 평가 술어 얹기 [S2] · v2.7 신규", "D-14. 생성형 은유 남용 · v2.6.1"]);
  assert.deepEqual(addedRuleHeadings(undefined), []);
  assert.deepEqual(summarize({}).addedRuleHeadings, []);
});
