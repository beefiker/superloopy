import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

// P-family calques, the upstream v2.7 adoptions, Q-1 chatbot frames, and the injection guard.
// Split from humanize-korean.test.js when that file reached the 550-line reviewability cap.
const script = "skills/humanize-korean/scripts/audit-humanize-output.mjs";

async function writeCase(sourceText, finalText) {
  const dir = await mkdtemp(join(tmpdir(), "superloopy-humanize-calques-"));
  const source = join(dir, "source.md");
  const final = join(dir, "final.md");
  const report = join(dir, "audit.json");
  await writeFile(source, sourceText);
  await writeFile(final, finalText);
  return { source, final, report };
}

// P family: English adverb and compound-term calques. Gating ids (P-1a, P-2, P-4) hold the grade
// below A/B; advisory ids (P-1b, P-3, P-5, P-6) only warn. Every P id ignores quoted and code spans.
async function runAudit(sourceText, finalText) {
  const files = await writeCase(sourceText, finalText);
  const result = spawnSync(process.execPath, [script, "--source", files.source, "--final", files.final, "--report", files.report], {
    encoding: "utf8"
  });
  return { result, report: JSON.parse(await readFile(files.report, "utf8")) };
}

test("humanize audit counts calque gating ids and clears them after the ladder repair", async () => {
  const { result, report } = await runAudit(
    "저장 요청이 조용히 무시된다. 재시작 전에 워커를 우아하게 종료한다. 주문 상태의 단일 진실 공급원은 orders 테이블이다.",
    "저장 요청이 무시된다. 재시작 전에 워커를 종료한다. 주문 상태의 기준 데이터는 orders 테이블이다."
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(report.ok, true);
  assert.ok(["A", "B"].includes(report.grade), report.grade);
  for (const id of ["P-1a", "P-2", "P-4"]) {
    assert.equal(report.patterns.before[id], 1, id);
    assert.equal(report.patterns.after[id], 0, id);
  }
  assert.equal(report.warnings.some((warning) => warning.startsWith("P-")), false);
});

test("humanize audit reports P-1b only where P-1a did not already claim the 조용히", async () => {
  const { report } = await runAudit(
    "이력을 100행에서 조용히 자른다. 저장 요청이 서버에 도달하지 못하면 조용히 무시된다.",
    "이력을 100행에서 조용히 자른다. 저장 요청이 서버에 도달하지 못하면 무시된다."
  );
  assert.equal(report.patterns.before["P-1a"], 1);
  assert.equal(report.patterns.before["P-1b"], 1);
  assert.equal(report.patterns.after["P-1a"], 0);
  assert.equal(report.patterns.after["P-1b"], 1);
  assert.equal(report.ok, true);
  assert.ok(report.warnings.some((warning) => warning.startsWith("P-1b remains (1)")), JSON.stringify(report.warnings));
});

test("humanize audit skips alpha-transparency sentences when counting P-3", async () => {
  const { report } = await runAudit(
    "드롭존 배경을 투명하게 수정했다. 프록시 계층은 요청을 투명하게 전달한다.",
    "드롭존 배경을 투명하게 수정했다. 프록시 계층은 요청을 코드 변경 없이 전달한다."
  );
  assert.equal(report.patterns.before["P-3"], 1);
  assert.equal(report.patterns.after["P-3"], 0);
  assert.equal(report.ok, true);
});

test("humanize audit does not count a quoted 조용히 against the rewrite", async () => {
  const { report } = await runAudit(
    "저장 요청이 서버에 도달하지 못하면 조용히 무시된다. 재시도는 세 번까지 한다.",
    "저장 요청이 서버에 도달하지 못하면 무시된다. 재시도는 세 번까지 한다. 원문: \"조용히 무시된다\""
  );
  assert.equal(report.patterns.before["P-1a"], 1);
  assert.equal(report.patterns.after["P-1a"], 0);
  assert.equal(report.patterns.after["P-1b"], 0);
  assert.equal(report.ok, true);
});

test("humanize audit keeps advisory calques out of the grade and explains each in warnings", async () => {
  const { report } = await runAudit(
    "정본 스키마로 이관한다. 첫날부터 적용한다. 팀은 자동화 스크립트를 통해 배포 시간을 줄였다.",
    "정본 스키마로 이관한다. 첫날부터 적용한다. 팀은 자동화 스크립트로 배포 시간을 줄였다."
  );
  assert.equal(report.ok, true);
  assert.ok(["A", "B"].includes(report.grade), report.grade);
  assert.equal(report.patterns.after["P-5"], 1);
  assert.equal(report.patterns.after["P-6"], 1);
  assert.ok(report.warnings.some((warning) => warning.startsWith("P-5 remains (1)")), JSON.stringify(report.warnings));
  assert.ok(report.warnings.some((warning) => warning.startsWith("P-6 remains (1)")), JSON.stringify(report.warnings));
});

test("humanize audit never matches bare 안전 through P-6", async () => {
  const { report } = await runAudit(
    "이 기능은 안전하게 처리됩니다. 결과를 통해 확인합니다.",
    "이 기능은 안전하게 처리됩니다. 결과로 확인합니다."
  );
  assert.equal(report.patterns.before["P-6"], 0);
  assert.equal(report.patterns.after["L-1"], undefined);
});

// Injection guard (upstream v2.6): fixing one tell must not create another. The rewrite below clears
// A-2 but introduces an A-10 hedge and a C-8 antithesis pair the source never had. Both are S2 or
// separately counted, so `ok` stays true and the guard is what names them.
test("humanize audit warns when a rewrite injects a tell the source did not have", async () => {
  const { report } = await runAudit(
    "팀은 자동화 스크립트를 통해 배포 시간을 절반으로 줄였습니다. 배포는 이제 하루 두 번 나갑니다.",
    "팀은 자동화 스크립트로 배포 시간을 절반으로 줄였습니다. 이는 속도가 아니라 방향의 문제임을 확인할 수 있습니다. 배포는 이제 하루 두 번 나갑니다."
  );
  assert.equal(report.ok, true, JSON.stringify(report.problems));
  assert.equal(report.patterns.before["A-10"], 0);
  assert.equal(report.patterns.after["A-10"], 1);
  assert.ok(report.warnings.some((warning) => warning.startsWith("A-10 injected by the rewrite (0 → 1)")), JSON.stringify(report.warnings));
  assert.ok(report.warnings.some((warning) => warning.startsWith("C-8 injected by the rewrite (0 → 1)")), JSON.stringify(report.warnings));
});

test("humanize audit stays silent on injection when every count falls or holds", async () => {
  const { report } = await runAudit(
    "팀은 자동화 스크립트를 통해 배포 시간을 절반으로 줄였습니다. 따라서 배포는 하루 두 번 나갑니다.",
    "팀은 자동화 스크립트로 배포 시간을 절반으로 줄였습니다. 따라서 배포는 하루 두 번 나갑니다."
  );
  assert.equal(report.warnings.some((warning) => warning.includes("injected")), false, JSON.stringify(report.warnings));
});

// Upstream v2.5–v2.7 adoptions (2026-09-10 drift pass). Human-near-zero forms count toward S2;
// A-20, A-22 and A-24 are advisory because upstream fires them only at density or a threshold.
test("humanize audit counts the adopted upstream tells and clears them after repair", async () => {
  const { report } = await runAudit(
    "시는 상반기에 임대료 지원을 시작했고 하반기에는 결과를 점검한다. 이 문제는 단순한 수지타산을 넘어 균형을 묻는다. 지금 필요한 것은 방향이다. 매출 감소는 침체로 이어진다. 우려가 나오는 이유다. 그러나 과제도 남아 있다. 기준이 아직 없다. 노조는 다음 주 협상을 재개하고 시의회는 예산안을 심의한다.",
    "시는 상반기에 임대료 지원을 시작했고 하반기에는 결과를 점검한다. 이 문제는 수지타산만이 아니라 균형을 묻는다. 지금은 방향이 필요하다. 매출이 줄면 일자리가 사라진다. 그래서 우려가 나온다. 다만 기준이 아직 없다. 노조는 다음 주 협상을 재개하고 시의회는 예산안을 심의한다."
  );
  assert.equal(report.ok, true, JSON.stringify(report.problems));
  for (const id of ["A-21", "D-8", "D-9", "D-10", "D-12"]) {
    assert.equal(report.patterns.before[id], 1, `${id} before`);
    assert.equal(report.patterns.after[id], 0, `${id} after`);
  }
});

test("humanize audit keeps A-20, A-22 and A-24 advisory with hints and out of the grade", async () => {
  const { report } = await runAudit(
    "경쟁은 심화되고 있다. 정책이 실패했다는 점은 명확하다. 속도는 더 이상 핵심이 아니다. 팀은 자동화 스크립트를 통해 시간을 줄였다.",
    "경쟁은 심화되고 있다. 정책이 실패했다는 점은 명확하다. 속도는 더 이상 핵심이 아니다. 팀은 자동화 스크립트로 시간을 줄였다."
  );
  assert.equal(report.ok, true, JSON.stringify(report.problems));
  assert.ok(["A", "B"].includes(report.grade), report.grade);
  for (const id of ["A-20", "A-22", "A-24"]) {
    assert.equal(report.patterns.after[id], 1, id);
    assert.ok(report.warnings.some((warning) => warning.startsWith(`${id} remains (1)`)), `${id}: ${JSON.stringify(report.warnings)}`);
  }
  // Exclusions: the adverb 분명히, the verb phrase 명확히 하다, "더 이상의 N", and active progressive 하고 있다.
  const { report: clean } = await runAudit(
    "그는 분명히 옳았다. 입장을 명확히 했다. 더 이상의 설명은 필요 없다. 팀은 검토하고 있다. 결과를 통해 확인했다.",
    "그는 분명히 옳았다. 입장을 명확히 했다. 더 이상의 설명은 필요 없다. 팀은 검토하고 있다. 결과로 확인했다."
  );
  for (const id of ["A-20", "A-22", "A-24"]) assert.equal(clean.patterns.after[id], 0, `${id} exclusion`);
});

// Q-1 chatbot-frame hygiene (upstream v2.6 SKILL step, local id): pasted chatbot output carries a
// greeting header, a closing offer, or a knowledge-cutoff disclaimer that is not body text.
test("humanize audit gates chatbot frame sentences and ignores them inside quotes", async () => {
  const { report } = await runAudit(
    "물론입니다! 다음은 배포 절차입니다: 먼저 서명 인증서를 갱신하고 만료일을 기록한다. 그다음 패키지를 다시 빌드해 스토어에 제출한다. 심사가 끝나면 릴리스 노트를 게시하고 지원팀에 알린다. 도움이 되셨길 바랍니다. 추가 질문이 있으시면 말씀해 주세요.",
    "먼저 서명 인증서를 갱신하고 만료일을 기록한다. 그다음 패키지를 다시 빌드해 스토어에 제출한다. 심사가 끝나면 릴리스 노트를 게시하고 지원팀에 알린다."
  );
  assert.equal(report.ok, true, JSON.stringify(report.problems));
  assert.equal(report.patterns.before["Q-1"], 4);
  assert.equal(report.patterns.after["Q-1"], 0);
  const { report: quoted } = await runAudit(
    "챗봇은 \"도움이 되셨길 바랍니다\"로 답을 끝냈다. 이 문장을 통해 어조를 판단했다.",
    "챗봇은 \"도움이 되셨길 바랍니다\"로 답을 끝냈다. 이 문장으로 어조를 판단했다."
  );
  assert.equal(quoted.patterns.after["Q-1"], 0);
});

// Acceptance criteria from the spec, pinned as tests instead of a one-off harness run.
import { CALQUE_GATING_PATTERNS, P1A_SILENCE_PATTERN, countP1bOnly } from "../skills/humanize-korean/scripts/calque-patterns.mjs";

// Real 2026 GitHub issue titles from the 2026-09-10 sample (P-1a where a program-action stem is
// present, P-1b for open-class verbs) and ten human sentences that must stay untouched.
const REAL_TITLES = [
  "성장·1on1 화면이 조용히 비어 있던 것을 고친다", "설치된 모듈 연동이 조용히 죽던 결함", "bump-image.sh 가 단일 파일 모듈에서 조용히 no-op 되던 문제",
  "배포 트랙이 조용히 멈추지 않게", "목록 API 가 필터 쿼리 파라미터를 조용히 무시함", "bcrypt 72바이트 초과 비밀번호가 조용히 잘림",
  "저장한 제품이 서버에 없으면 조용히 사라진다", "이력을 100행에서 조용히 자른다", "텍스트 인덱스가 조용히 틀어질 수 있다",
  "OPEN 회로를 CLOSED로 조용히 되돌린다", "조용히 H2로 기동된다", "드래그·리사이즈가 일정을 조용히 옮긴다", "두 층이 조용히 빠지고 있었습니다"
];
const HUMAN_SENTENCES = [
  "아이는 조용히 앉아 책을 읽었다", "조용히 대화를 나누었다", "실패 원인을 조용히 되짚어 보았다", "회사는 매출을 투명하게 공개했다", "의사결정 과정을 투명하게 운영한다",
  "우아한 디자인의 의자", "조용한 밤이었다", "조용히 하세요", "그는 실패를 인정하고 조용히 물러났다", "조용히 지난 분기를 돌아보았다",
  "그는 조용히 실패 원인을 분석했다", "팀은 조용히 무시 사례를 정리했다"
];
const silenceHits = (text) => [...text.matchAll(P1A_SILENCE_PATTERN)].length + countP1bOnly(text);

test("every sampled real title with 조용히 on a program action is caught by P-1a or P-1b", () => {
  for (const title of REAL_TITLES) assert.ok(silenceHits(title) > 0, title);
});

test("no sampled human sentence trips any gating calque rule or the silence heuristic", () => {
  for (const sentence of HUMAN_SENTENCES) {
    assert.equal(silenceHits(sentence), 0, sentence);
    for (const [id, pattern] of CALQUE_GATING_PATTERNS) assert.equal([...sentence.matchAll(pattern)].length, 0, `${id}: ${sentence}`);
  }
});

test("no golden after-block carries a gating calque or a chatbot frame", async () => {
  // Windows checkouts may carry CRLF; normalize like the golden parser does, and refuse to pass on an
  // empty extraction — an unmatched fence would otherwise make every "== 0" assertion vacuous.
  const markdown = (await readFile("skills/humanize-korean/references/golden-set.md", "utf8")).replace(/\r\n?/gu, "\n");
  const afters = [...markdown.matchAll(/```after\n([\s\S]*?)\n```/gu)].map((match) => match[1]).join("\n");
  assert.ok(afters.length > 1000, `expected the golden after-blocks, got ${afters.length} chars`);
  const { report } = await runAudit(afters, afters);
  assert.ok(report.koreanRatio.source > 0.2, "after-blocks must audit as Korean text");
  for (const id of ["P-1a", "P-1b", "P-2", "P-3", "P-4", "P-6", "Q-1"]) assert.equal(report.patterns.after[id] ?? 0, 0, id);
  assert.equal(report.patterns.after["P-5"], 1, "only the G-37 legal 정본 keep pair may carry P-5");
});

// PR #55 review regressions.
test("Q-1 counts 물론입니다 only as a sentence-opening frame, not as a predicate", async () => {
  const prose = "계약 연장은 물론입니다. 유지보수도 포함됩니다. 결과를 통해 확인합니다.";
  const { report } = await runAudit(prose, prose.replace("결과를 통해", "결과로"));
  assert.equal(report.patterns.before["Q-1"], 0);
  assert.equal(report.ok, true, JSON.stringify(report.problems));
  const { report: framed } = await runAudit("물론입니다. 먼저 인증서를 갱신하고 만료일을 기록합니다. 그다음 패키지를 다시 빌드해 제출합니다.", "먼저 인증서를 갱신하고 만료일을 기록합니다. 그다음 패키지를 다시 빌드해 제출합니다.");
  assert.equal(framed.patterns.before["Q-1"], 1);
});

test("fenced code blocks are protected from every calque counter and preserved as tokens", async () => {
  const block = "```\nexpect(log).toContain(\"조용히 무시된다\");\n```";
  const { report } = await runAudit(`진단 픽스처는 아래와 같다.\n${block}\n팀은 자동화 스크립트를 통해 이 케이스를 재현했다.`, `진단 픽스처는 아래와 같다.\n${block}\n팀은 자동화 스크립트로 이 케이스를 재현했다.`);
  assert.equal(report.patterns.before["P-1a"], 0);
  assert.equal(report.patterns.after["P-1a"], 0);
  assert.equal(report.ok, true, JSON.stringify(report.problems));
  const { report: dropped } = await runAudit(`진단 픽스처는 아래와 같다.\n${block}\n팀은 자동화 스크립트를 통해 이 케이스를 재현했다.`, "진단 픽스처는 아래와 같다.\n팀은 자동화 스크립트로 이 케이스를 재현했다.");
  assert.equal(dropped.ok, false, "removing a fenced block drops a protected token");
});

test("an injected logical 결국 is warned through D-9b without being graded or reported as remaining", async () => {
  const { report } = await runAudit(
    "팀은 자동화 스크립트를 통해 시간을 줄였다. 배포는 하루 두 번 나간다.",
    "팀은 자동화 스크립트로 시간을 줄였다. 결국 배포는 하루 두 번 나간다."
  );
  assert.ok(["A", "B"].includes(report.grade), report.grade);
  assert.ok(report.warnings.some((warning) => warning.startsWith("D-9b injected by the rewrite (0 → 1)")), JSON.stringify(report.warnings));
  assert.equal(report.warnings.some((warning) => warning.startsWith("D-9b remains")), false);
  const { report: narrative } = await runAudit("그는 결국 회사를 나갔다. 결과를 통해 확인했다.", "그는 결국 회사를 나갔다. 결과로 확인했다.");
  assert.equal(narrative.warnings.some((warning) => warning.includes("D-9b")), false, "a preserved narrative 결국 is silent");
});
