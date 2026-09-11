#!/usr/bin/env node
// Maintainer tool: how far has `epoko77-ai/im-not-ai` moved since the idea sync recorded in
// skills/humanize-korean/references/upstream-notice.md? Prints the commit count, every commit
// subject, the changed files, and the rule headings added to the upstream taxonomy so the next
// clean-room adaptation pass starts from facts. Network and `gh` auth required; not part of `npm test`.
//
//   node scripts/upstream-drift.mjs            # compare recorded sync commit ... upstream HEAD
//   node scripts/upstream-drift.mjs v2.3.2     # compare against a tag or sha instead of HEAD
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const UPSTREAM_REPO = "epoko77-ai/im-not-ai";
export const NOTICE_PATH = "skills/humanize-korean/references/upstream-notice.md";
export const RULE_HEADING_PATTERN = /^\+(#{2,4} .*\b[A-Z]-\d+\..*)$/u;

// The notice records the sync as "commit `<sha>`"; anything else is a broken notice, not a default.
export function syncCommitFromNotice(markdown) {
  const match = /Last idea sync:[^\n]*commit `([0-9a-f]{7,40})`/u.exec(markdown);
  if (match === null) throw new Error(`${NOTICE_PATH} does not record a sync commit`);
  return match[1];
}

// Upstream rule headings look like "### A-22. 평가 술어 얹기 ..." — any added heading with a rule id.
export function addedRuleHeadings(patch) {
  if (typeof patch !== "string") return [];
  return patch.split("\n").flatMap((line) => {
    const match = RULE_HEADING_PATTERN.exec(line);
    return match === null ? [] : [match[1].replace(/^#+\s*/u, "")];
  });
}

export function summarize(compare) {
  const files = Array.isArray(compare.files) ? compare.files : [];
  const taxonomy = files.find((file) => file.filename.endsWith("references/ai-tell-taxonomy.md"));
  return {
    aheadBy: compare.ahead_by ?? 0,
    commits: (compare.commits ?? []).map((entry) => ({
      sha: entry.sha.slice(0, 7),
      date: (entry.commit?.author?.date ?? "").slice(0, 10),
      subject: (entry.commit?.message ?? "").split("\n")[0]
    })),
    files: files.map((file) => ({ status: file.status, additions: file.additions, deletions: file.deletions, filename: file.filename })),
    addedRuleHeadings: addedRuleHeadings(taxonomy?.patch)
  };
}

function fetchCompare(base, head) {
  const result = spawnSync("gh", ["api", `repos/${UPSTREAM_REPO}/compare/${base}...${head}`], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`gh api compare failed: ${result.stderr.trim()}`);
  return JSON.parse(result.stdout);
}

function main(head = "HEAD") {
  if (head.startsWith("--")) {
    console.error("Usage: node scripts/upstream-drift.mjs [<upstream ref, default HEAD>]");
    process.exit(2);
  }
  const base = syncCommitFromNotice(readFileSync(NOTICE_PATH, "utf8"));
  const summary = summarize(fetchCompare(base, head));
  console.log(`${UPSTREAM_REPO}: ${summary.aheadBy} commits since sync ${base} (compared to ${head})`);
  for (const commit of summary.commits.filter((entry) => !entry.subject.startsWith("Merge pull request"))) {
    console.log(`  ${commit.sha} ${commit.date} ${commit.subject}`);
  }
  console.log(`files changed: ${summary.files.length}`);
  for (const file of summary.files) console.log(`  ${file.status.padEnd(8)} +${file.additions}/-${file.deletions}  ${file.filename}`);
  console.log(`rule headings added to the taxonomy: ${summary.addedRuleHeadings.length}`);
  for (const heading of summary.addedRuleHeadings) console.log(`  ${heading}`);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv[2]);
