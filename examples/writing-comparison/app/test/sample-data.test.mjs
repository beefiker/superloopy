import assert from "node:assert/strict";
import test from "node:test";

import { SAMPLE_ORDER, VERSION_ORDER, SAMPLES } from "../data.generated.mjs";

const EXPECTED_SAMPLES = [
  "release-note", "meeting-followup", "incident-review",
  "support-reply", "internal-proposal",
  "api-migration", "llm-wiki",
  "release-note-en", "meeting-followup-en", "incident-review-en",
  "support-reply-en", "internal-proposal-en", "api-migration-en"
];
// Version A is the Korean humanizer, so it has no English counterpart.
// English samples ship original + B + C and the selector marks A unavailable.
const EXPECTED_VERSIONS = Object.freeze({
  __default: ["original", "a", "b", "c"],
  __english: ["original", "b", "c"]
});
const versionsFor = (sampleId) =>
  sampleId.endsWith("-en") ? EXPECTED_VERSIONS.__english : EXPECTED_VERSIONS.__default;
const SAMPLE_LENGTH_RANGES = {
  "release-note": [700, 1100],
  "meeting-followup": [650, 1000],
  "incident-review": [800, 1200],
  "support-reply": [600, 900],
  "internal-proposal": [800, 1200],
  "api-migration": [850, 1300],
  "llm-wiki": [2800, 5600],
  "release-note-en": [1400, 2000],
  "meeting-followup-en": [1000, 1450],
  "incident-review-en": [1100, 1400],
  "support-reply-en": [800, 1300],
  "internal-proposal-en": [1000, 1450],
  "api-migration-en": [1000, 1400]
};
const REQUIRED_FACTS = {
  "release-note": ["2026-08-20", "오후 3시", "검색 필터", "담당자와 다음 확인 시각"],
  "meeting-followup": ["2026-08-21", "민지", "운영팀", "다음 회의에서 결정"],
  "incident-review": ["10:12", "10:38", "26분", "다음 훈련 전에 완료 여부를 다시 확인", "담당자는 결과를 기록"],
  "support-reply": ["주문번호 18427", "1~2일", "한진택배", "배송 기사 배정 전"],
  "internal-proposal": ["월 29,000원", "8명", "3개월", "계약을 연장하지 않고 기존 공유 폴더 방식으로 돌아"],
  "api-migration": ["2026-09-30", "X-API-Version", "https://docs.example.com/api/v2", "전환 목록은 운영 배포 전 검토 항목"],
  "llm-wiki": ["(BEE)", "30여 명", "대형 프로젝트 3개", "48.9%", "87%", "3,900", "1,300건", "53%에서 100%로", "17~33%", "20~40%", "30~50%", "3분의 2", "골든 질문 100여 개", "200줄", "AGENTS.md", "3개월"],
  "release-note-en": ["2026-08-20", "3:00 PM", "search filters", "the owner and the next check time"],
  "meeting-followup-en": ["2026-08-21", "Mina", "operations team", "decide at the next meeting"],
  "incident-review-en": ["10:12", "10:38", "26 minutes", "confirm again before the next drill", "the owner records the result"],
  "support-reply-en": ["18427", "1-2 days", "Northline Courier", "before a delivery driver is assigned"],
  "internal-proposal-en": ["$29 per month", "8 people", "three months", "do not renew the contract and return to the existing shared folder"],
  "api-migration-en": ["2026-09-30", "X-API-Version", "https://docs.example.com/api/v2", "the migration list is a review item before production release"]
};
const UNSUPPORTED_TRANSFORMED_FACTS = {
  "release-note": ["저장 지연이 사라지는지 먼저 확인", "확인한 영향 범위와 다음 안내 시각"],
  "incident-review": ["고객 문의와 대시보드의 빈 응답 수치가 같은 방향으로 움직이는지도"]
};
const NORMALIZATION_STOPWORDS = new Set([
  "그리고", "하지만", "또는", "관련", "대한", "위해", "있는", "없는", "합니다", "합니다만",
  // English function words carry no topical signal, so counting them as
  // shared terms would make unrelated paragraphs look like duplicates.
  "the", "and", "for", "with", "that", "this", "from", "into", "over", "when",
  "then", "than", "will", "would", "can", "not", "but", "are", "was", "were",
  "has", "have", "had", "been", "its", "it", "they", "them", "their", "there",
  "you", "your", "our", "we", "all", "any", "each", "also", "only", "same",
  "other", "some", "such", "more", "most", "out", "off", "per", "via", "use",
  "used", "using", "make", "makes", "made", "does", "did", "before", "after",
  "until", "while", "which", "what", "who", "whether", "still", "just", "even",
  "one", "two", "second", "both", "under", "above", "again", "way", "get", "gets"
]);

function semanticContentUnits(text) {
  const units = [];
  let lines = [];
  let inFence = false;
  const flush = () => {
    if (lines.length > 0) units.push(lines.join(" "));
    lines = [];
  };

  for (const line of text.split(/\r?\n/u)) {
    if (line.startsWith("```")) {
      flush();
      inFence = !inFence;
      continue;
    }
    if (inFence || line === "" || /^#{1,6}\s/u.test(line)) {
      flush();
      continue;
    }
    const list = /^(?:[-*+]\s|\d+\.\s)/u.exec(line);
    if (list) {
      flush();
      units.push(line.slice(list[0].length).replace(/^\[[^\]]+\]\s*/u, ""));
      continue;
    }
    lines.push(line);
  }
  flush();
  return units;
}

function normalizedProseTerms(paragraph) {
  return new Set(
    (paragraph.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])
      .filter((term) => term.length > 1 && !NORMALIZATION_STOPWORDS.has(term))
  );
}

function duplicateNormalizedContentUnitPairs(text) {
  const units = semanticContentUnits(text);
  const duplicates = [];
  for (let left = 0; left < units.length; left += 1) {
    const leftTerms = normalizedProseTerms(units[left]);
    for (let right = left + 1; right < units.length; right += 1) {
      const rightTerms = normalizedProseTerms(units[right]);
      const shared = [...leftTerms].filter((term) => rightTerms.has(term)).length;
      if (shared >= 4 && shared / Math.min(leftTerms.size, rightTerms.size) >= 0.6) {
        duplicates.push([left, right]);
      }
    }
  }
  return duplicates;
}

test("embeds thirteen complete comparison samples", () => {
  assert.deepEqual(SAMPLE_ORDER, EXPECTED_SAMPLES);
  assert.deepEqual(VERSION_ORDER, ["original", "a", "b", "c"]);
  for (const sampleId of EXPECTED_SAMPLES) {
    const sample = SAMPLES[sampleId];
    assert.equal(sample.id, sampleId);
    assert.equal(sample.label.length > 0, true);
    assert.equal(sample.description.length > 0, true);
    assert.deepEqual(Object.keys(sample.versions), versionsFor(sampleId));
    for (const versionId of versionsFor(sampleId)) {
      const version = sample.versions[versionId];
      const [minimum, maximum] = SAMPLE_LENGTH_RANGES[sampleId];
      assert.equal(version.text.length >= minimum, true, `${sampleId}/${versionId} is shorter than ${minimum}`);
      assert.equal(version.text.length <= maximum, true, `${sampleId}/${versionId} is longer than ${maximum}`);
      assert.equal(version.metrics.characters, version.text.length);
    }
  }
});

test("preserves each document format across all four versions", () => {
  for (const versionId of VERSION_ORDER) {
    const textFor = (sampleId) => SAMPLES[sampleId].versions[versionId].text;
    assert.match(textFor("release-note"), /^# .+$/m, `release-note/${versionId}`);
    assert.equal((textFor("release-note").match(/^- /gm) ?? []).length >= 3, true, `release-note/${versionId}`);
    assert.match(textFor("meeting-followup"), /- \[ \]/, `meeting-followup/${versionId}`);
    assert.match(textFor("incident-review"), /\| 시간 \| 상태 \|/, `incident-review/${versionId}`);
    assert.match(textFor("incident-review"), /^> /m, `incident-review/${versionId}`);
    assert.match(textFor("support-reply"), /^1\. /m, `support-reply/${versionId}`);
    assert.match(textFor("internal-proposal"), /## 장점/, `internal-proposal/${versionId}`);
    assert.match(textFor("internal-proposal"), /\| 항목 \| 월 비용 \| 대상 \|/, `internal-proposal/${versionId}`);
    assert.match(textFor("api-migration"), /```(?:js|sh)/, `api-migration/${versionId}`);
    assert.match(textFor("api-migration"), /https:\/\/docs\.example\.com\/api\/v2/, `api-migration/${versionId}`);
    assert.match(textFor("llm-wiki"), /\| 규모 \| 회사 \| 방식 \| 결과 \|/, `llm-wiki/${versionId}`);
    assert.match(textFor("llm-wiki"), /^> /m, `llm-wiki/${versionId}`);
    assert.match(textFor("llm-wiki"), /^1\. /m, `llm-wiki/${versionId}`);
    assert.equal((textFor("llm-wiki").match(/^- /gm) ?? []).length >= 3, true, `llm-wiki/${versionId}`);
  }
});

test("preserves each English document format across original, B, and C", () => {
  for (const versionId of EXPECTED_VERSIONS.__english) {
    const textFor = (sampleId) => SAMPLES[sampleId].versions[versionId].text;
    assert.match(textFor("release-note-en"), /^# .+$/m, `release-note-en/${versionId}`);
    assert.equal((textFor("release-note-en").match(/^- /gm) ?? []).length >= 3, true, `release-note-en/${versionId}`);
    assert.match(textFor("meeting-followup-en"), /- \[ \]/, `meeting-followup-en/${versionId}`);
    assert.match(textFor("incident-review-en"), /\| Time \| Status \|/, `incident-review-en/${versionId}`);
    assert.match(textFor("incident-review-en"), /^> /m, `incident-review-en/${versionId}`);
    assert.match(textFor("support-reply-en"), /^1\. /m, `support-reply-en/${versionId}`);
    assert.match(textFor("internal-proposal-en"), /## Benefits/, `internal-proposal-en/${versionId}`);
    assert.match(textFor("internal-proposal-en"), /\| Item \| Monthly cost \| Who \|/, `internal-proposal-en/${versionId}`);
    assert.match(textFor("api-migration-en"), /```(?:js|sh)/, `api-migration-en/${versionId}`);
    assert.match(textFor("api-migration-en"), /https:\/\/docs\.example\.com\/api\/v2/, `api-migration-en/${versionId}`);
  }
});

test("preserves the required factual skeleton across all four versions", () => {
  for (const [sampleId, values] of Object.entries(REQUIRED_FACTS)) {
    for (const version of Object.values(SAMPLES[sampleId].versions)) {
      for (const value of values) assert.equal(version.text.includes(value), true, `${sampleId}: ${value}`);
    }
  }
});

test("does not add operational facts that are absent from the originals", () => {
  const violations = [];
  for (const [sampleId, unsupportedFacts] of Object.entries(UNSUPPORTED_TRANSFORMED_FACTS)) {
    for (const version of Object.values(SAMPLES[sampleId].versions)) {
      for (const fact of unsupportedFacts) {
        if (version.text.includes(fact)) violations.push(`${sampleId}/${version.id}: ${fact}`);
      }
    }
  }
  assert.deepEqual(violations, []);
});

test("states the API deployment-record instruction once in version C", () => {
  const text = SAMPLES["api-migration"].versions.c.text;
  const recordInstructions = [
    "프록시와 SDK가 헤더를 그대로 전달한 배포 기록도 전환 목록에 남깁니다.",
    "확인 기록을 보관합니다."
  ];
  const retainedInstructions = recordInstructions.filter((instruction) => text.includes(instruction));
  assert.equal(retainedInstructions.length, 1, retainedInstructions);
});

test("does not repeat normalized semantic content units in transformed samples", () => {
  for (const sampleId of SAMPLE_ORDER) {
    for (const versionId of versionsFor(sampleId).filter((id) => id !== "original")) {
      const duplicates = duplicateNormalizedContentUnitPairs(SAMPLES[sampleId].versions[versionId].text);
      assert.deepEqual(duplicates, [], `${sampleId}/${versionId}: ${JSON.stringify(duplicates)}`);
    }
  }
});

test("generated modules match samples/ on disk", async () => {
  // Without this, editing a sample and forgetting `node build-data.mjs` ships
  // stale content that every other assertion here still passes.
  const { buildSamples, SAMPLE_IDS } = await import("../build-data.mjs");
  const built = await buildSamples();

  assert.deepEqual(SAMPLE_IDS, SAMPLE_ORDER, "sample order drifted from the builder");
  for (const sampleId of SAMPLE_ORDER) {
    const fresh = built[sampleId];
    const embedded = SAMPLES[sampleId];
    assert.ok(fresh, `${sampleId} missing from a fresh build`);
    assert.deepEqual(Object.keys(embedded.versions), Object.keys(fresh.versions), sampleId);
    for (const versionId of Object.keys(fresh.versions)) {
      assert.equal(
        embedded.versions[versionId].text,
        fresh.versions[versionId].text,
        `${sampleId}/${versionId} is stale — run: node examples/writing-comparison/app/build-data.mjs`
      );
      assert.deepEqual(embedded.versions[versionId].metrics, fresh.versions[versionId].metrics, `${sampleId}/${versionId}`);
    }
  }
});
