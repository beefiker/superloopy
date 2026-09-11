#!/usr/bin/env node
// Maintainer tool: measure whether a Korean phrase is an LLM-era tell before it enters rule text.
//
// A stock repair phrase that itself trends with AI authorship becomes the next tell (정본, 페일세이프,
// 아무 표시 없이 all failed this test on 2026-09-10). For each phrase this asks GitHub search for the
// issue/PR count created before ChatGPT (2022-11-30), the count created this year, and how many of
// this year's hits carry a Claude Code footer. The baseline footer share comes from 오류 in the same
// run so the bar moves with the corpus. Network and `gh` auth required; not part of `npm test`.
//
//   node scripts/calque-reverse-test.mjs 기준 데이터 "정상 종료" 정본
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const PRE_CHATGPT = "2022-11-30";
export const MIN_HUMAN_ERA_HITS = 40;
export const FOOTER_TOLERANCE_POINTS = 3;
export const BASELINE_PHRASE = "오류";
const FOOTER = '"Generated with Claude Code"';

export function footerShare(footerHits, yearHits) {
  return yearHits === 0 ? 0 : (footerHits / yearHits) * 100;
}

// Pass = real human-era use AND an AI-authorship share no higher than the corpus baseline plus a
// small tolerance. Zero pre-2022 hits is an automatic fail: the phrase did not exist before LLMs.
export function verdict({ pre, year, footer }, baselineShare) {
  const share = footerShare(footer, year);
  if (pre < MIN_HUMAN_ERA_HITS) return { pass: false, share, reason: `only ${pre} hits before ${PRE_CHATGPT} (need ${MIN_HUMAN_ERA_HITS})` };
  if (share > baselineShare + FOOTER_TOLERANCE_POINTS) return { pass: false, share, reason: `footer share ${share.toFixed(1)}% exceeds baseline ${baselineShare.toFixed(1)}% + ${FOOTER_TOLERANCE_POINTS}` };
  return { pass: true, share, reason: "human-era use and baseline AI share" };
}

function searchCount(query) {
  const result = spawnSync("gh", ["api", "-X", "GET", "search/issues", "-f", `q=${query}`, "--jq", ".total_count"], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`gh api failed for ${query}: ${result.stderr.trim()}`);
  return Number.parseInt(result.stdout.trim(), 10);
}

export function measure(phrase, year = new Date().getUTCFullYear(), count = searchCount) {
  const quoted = `"${phrase}"`;
  return {
    phrase,
    pre: count(`${quoted} created:<${PRE_CHATGPT}`),
    year: count(`${quoted} created:>=${year}-01-01`),
    footer: count(`${quoted} ${FOOTER} created:>=${year}-01-01`)
  };
}

function main(phrases) {
  if (phrases.length === 0) {
    console.error("Usage: node scripts/calque-reverse-test.mjs <phrase> [<phrase> ...]");
    process.exit(2);
  }
  const baseline = measure(BASELINE_PHRASE);
  const baselineShare = footerShare(baseline.footer, baseline.year);
  console.log(`baseline ${BASELINE_PHRASE}: pre ${baseline.pre}, year ${baseline.year}, footer ${baselineShare.toFixed(1)}%`);
  let failed = 0;
  for (const phrase of phrases) {
    const row = measure(phrase);
    const { pass, share, reason } = verdict(row, baselineShare);
    if (!pass) failed += 1;
    console.log(`${pass ? "PASS" : "FAIL"}  ${phrase}  pre=${row.pre} year=${row.year} footer=${share.toFixed(1)}%  ${reason}`);
  }
  process.exit(failed === 0 ? 0 : 1);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
