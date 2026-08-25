import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const script = "skills/humanize-korean/scripts/audit-humanize-output.mjs";
const skill = "skills/humanize-korean/SKILL.md";
const quickRules = "skills/humanize-korean/references/quick-rules.md";
const qualityRubric = "skills/humanize-korean/references/quality-rubric.md";
const goldenSet = "skills/humanize-korean/references/golden-set.md";

async function writeCase(sourceText, finalText) {
  const dir = await mkdtemp(join(tmpdir(), "superloopy-humanize-"));
  const source = join(dir, "source.md");
  const final = join(dir, "final.md");
  const report = join(dir, "audit.json");
  await writeFile(source, sourceText);
  await writeFile(final, finalText);
  return { source, final, report };
}

test("humanize audit accepts Korean output with preserved protected tokens", async () => {
  const files = await writeCase(
    "2026년 7월 1일, GPT-5 API를 통해 Fileloom 2.3.1의 성능을 개선할 수 있다.",
    "2026년 7월 1일, GPT-5 API로 Fileloom 2.3.1의 성능을 개선한다."
  );
  const result = spawnSync(process.execPath, [script, "--source", files.source, "--final", files.final, "--report", files.report], {
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(await readFile(files.report, "utf8"));
  assert.equal(report.ok, true);
  assert.equal(report.protectedTokens.missing.length, 0);
  assert.equal(report.patterns.before["A-2"], 1);
  assert.equal(report.patterns.after["A-2"], 0);
});

test("humanize audit rejects non-Korean source text", async () => {
  const files = await writeCase("This is not Korean text.", "This is still not Korean text.");
  const result = spawnSync(process.execPath, [script, "--source", files.source, "--final", files.final, "--report", files.report], {
    encoding: "utf8"
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Korean source text required/);
});

test("humanize audit writes a report when input files cannot be read", async () => {
  const dir = await mkdtemp(join(tmpdir(), "superloopy-humanize-missing-"));
  const reportPath = join(dir, "audit.json");
  const result = spawnSync(process.execPath, [
    script,
    "--source",
    join(dir, "missing-source.md"),
    "--final",
    join(dir, "missing-final.md"),
    "--report",
    reportPath
  ], { encoding: "utf8" });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Unable to read source file/);
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  assert.equal(report.ok, false);
  assert.match(report.problems[0], /Unable to read source file/);
});

test("humanize audit rejects missing protected tokens", async () => {
  const files = await writeCase(
    "Transferloom 1.4.0은 2026년 7월 1일에 배포됐다.",
    "Transferloom은 배포됐다."
  );
  const result = spawnSync(process.execPath, [script, "--source", files.source, "--final", files.final, "--report", files.report], {
    encoding: "utf8"
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Protected tokens changed/);
});

test("humanize audit rejects unchanged high-signal AI tells", async () => {
  const files = await writeCase(
    "결론적으로, Fileloom은 API를 통해 문서를 열 수 있습니다.",
    "결론적으로, Fileloom은 API를 통해 문서를 열 수 있습니다."
  );
  const result = spawnSync(process.execPath, [script, "--source", files.source, "--final", files.final, "--report", files.report], {
    encoding: "utf8"
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /S1 AI-tell count not reduced/);
});

test("humanize guidance and audit replace unnecessary 멱등 jargon", async () => {
  const rules = await readFile(quickRules, "utf8");
  assert.match(rules, /멱등/);
  assert.match(rules, /같은 요청을 여러 번/);

  const files = await writeCase(
    "이 API는 멱등성을 보장하므로 같은 요청을 여러 번 보내도 결과가 달라지지 않습니다.",
    "이 API는 멱등성을 보장해 같은 요청을 여러 번 보내도 결과가 달라지지 않습니다."
  );
  const result = spawnSync(process.execPath, [script, "--source", files.source, "--final", files.final, "--report", files.report], {
    encoding: "utf8"
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Unnecessary technical jargon remains/);

  const rewrittenFiles = await writeCase(
    "이 API는 멱등성을 보장하므로 같은 요청을 여러 번 보내도 결과가 달라지지 않습니다.",
    "이 API는 같은 요청을 여러 번 보내도 결과가 달라지지 않습니다."
  );
  const rewrittenResult = spawnSync(process.execPath, [
    script,
    "--source",
    rewrittenFiles.source,
    "--final",
    rewrittenFiles.final,
    "--report",
    rewrittenFiles.report
  ], { encoding: "utf8" });

  assert.equal(rewrittenResult.status, 0, rewrittenResult.stderr);
  const rewrittenReport = JSON.parse(await readFile(rewrittenFiles.report, "utf8"));
  assert.equal(rewrittenReport.patterns.before["K-1"], 1);
  assert.equal(rewrittenReport.patterns.after["K-1"], 0);
});

test("humanize audit preserves 멱등 jargon inside protected code spans", async () => {
  const files = await writeCase(
    "`멱등성`은 같은 요청을 여러 번 보내도 결과가 달라지지 않는 성질입니다.",
    "`멱등성`은 같은 요청을 여러 번 보내도 결과가 달라지지 않는 성질입니다."
  );
  const result = spawnSync(process.execPath, [script, "--source", files.source, "--final", files.final, "--report", files.report], {
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr);
});

test("humanize guidance owns misplaced precision as semantic N-1 without a brittle audit pattern", async () => {
  const [skillText, rules, rubric, golden] = await Promise.all([
    readFile(skill, "utf8"),
    readFile(quickRules, "utf8"),
    readFile(qualityRubric, "utf8"),
    readFile(goldenSet, "utf8")
  ]);
  for (const text of [skillText, rules, rubric, golden]) {
    assert.match(text, /N-1/);
  }

  const files = await writeCase(
    "정확한 컴퓨터를 확인했습니다. 정확한 MSI 보드를 확인했습니다. 정확한 펌웨어 이미지를 적용했습니다.",
    "대상 컴퓨터를 확인했습니다. MSI 보드 모델을 확인했습니다. 보드와 일치하는 펌웨어 이미지를 적용했습니다."
  );
  const result = spawnSync(process.execPath, [script, "--source", files.source, "--final", files.final, "--report", files.report], {
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(await readFile(files.report, "utf8"));
  assert.equal(report.patterns.before["N-1"], undefined);
  assert.equal(report.patterns.after["N-1"], undefined);
});

test("humanize audit exempts unchanged typographic quoted spans from prose checks", async () => {
  for (const quoted of ["\"멱등성—정의\"", "“멱등성—정의”", "「멱등성—정의」", "『멱등성—정의』"]) {
    const files = await writeCase(`${quoted}는 용어집 표제입니다.`, `${quoted}는 용어집 표제입니다.`);
    const result = spawnSync(process.execPath, [script, "--source", files.source, "--final", files.final, "--report", files.report], {
      encoding: "utf8"
    });

    assert.equal(result.status, 0, `${quoted}: ${result.stderr}`);
    const report = JSON.parse(await readFile(files.report, "utf8"));
    assert.equal(report.protectedTokens.missing.length, 0);
    assert.equal(report.patterns.after["K-1"], 0);
    assert.equal(report.patterns.after["M-1"], 0);
  }
});

test("humanize audit rejects changes to typographic quoted spans", async () => {
  const files = await writeCase(
    "「사용자 설정」은 화면 이름입니다.",
    "「계정 설정」은 화면 이름입니다."
  );
  const result = spawnSync(process.execPath, [script, "--source", files.source, "--final", files.final, "--report", files.report], {
    encoding: "utf8"
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Protected tokens changed/);
});

test("humanize audit does not enforce product-copy reassurance policy", async () => {
  const genericSafetyFiles = await writeCase(
    "이 도구는 백업 파일을 안전하게 저장합니다.",
    "이 도구는 백업 파일을 안전하게 저장합니다."
  );
  const genericSafety = {
    result: spawnSync(process.execPath, [
      script,
      "--source",
      genericSafetyFiles.source,
      "--final",
      genericSafetyFiles.final,
      "--report",
      genericSafetyFiles.report,
      "--genre",
      "제품 문구"
    ], { encoding: "utf8" }),
    report: JSON.parse(await readFile(genericSafetyFiles.report, "utf8"))
  };

  assert.equal(genericSafety.result.status, 0);
  assert.equal(genericSafety.report.patterns.after["L-1"], undefined);
  assert.equal(genericSafety.report.genre, "제품 문구");

  const privacyCommitmentFiles = await writeCase(
    "검색어를 서버로 전송하지 않습니다.",
    "검색어를 서버로 전송하지 않습니다."
  );
  const privacyCommitment = {
    result: spawnSync(process.execPath, [
      script,
      "--source",
      privacyCommitmentFiles.source,
      "--final",
      privacyCommitmentFiles.final,
      "--report",
      privacyCommitmentFiles.report
    ], { encoding: "utf8" }),
    report: JSON.parse(await readFile(privacyCommitmentFiles.report, "utf8"))
  };

  assert.equal(privacyCommitment.result.status, 0);
  assert.equal(privacyCommitment.report.patterns.after["L-3"], undefined);
  assert.ok(!privacyCommitment.report.warnings.some((item) => /reassurance|capability|Safety/i.test(item)));
});

test("humanize audit detects polite-form AI tells such as 것입니다", async () => {
  const files = await writeCase(
    "이번 성장은 신규 기능 덕분인 것입니다. 이 결과는 주목할 만합니다.",
    "이번 성장은 신규 기능 덕분입니다. 이 결과는 눈여겨볼 만합니다."
  );
  const result = spawnSync(process.execPath, [script, "--source", files.source, "--final", files.final, "--report", files.report], {
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(await readFile(files.report, "utf8"));
  assert.equal(report.patterns.before["I-1"], 1);
  assert.equal(report.patterns.before["D-2"], 1);
  assert.equal(report.patterns.after["I-1"], 0);
  assert.equal(report.patterns.after["D-2"], 0);
});


test("humanize audit rejects em dashes left in Korean prose but ignores dashes in code spans", async () => {
  const lingering = await writeCase(
    "이 기능은 — 아직 실험 단계지만 — 문서 검색 속도를 높입니다.",
    "이 기능은 — 아직 실험 단계지만 — 문서 검색 속도를 높입니다."
  );
  const lingeringResult = spawnSync(process.execPath, [script, "--source", lingering.source, "--final", lingering.final, "--report", lingering.report], {
    encoding: "utf8"
  });

  assert.notEqual(lingeringResult.status, 0);
  assert.match(lingeringResult.stderr, /Em dash remains in Korean prose/);

  const repaired = await writeCase(
    "이 기능은 — 아직 실험 단계지만 — 문서 검색 속도를 높입니다.",
    "이 기능은 아직 실험 단계지만 문서 검색 속도를 높입니다."
  );
  const repairedResult = spawnSync(process.execPath, [script, "--source", repaired.source, "--final", repaired.final, "--report", repaired.report], {
    encoding: "utf8"
  });

  assert.equal(repairedResult.status, 0, repairedResult.stderr);
  const repairedReport = JSON.parse(await readFile(repaired.report, "utf8"));
  assert.equal(repairedReport.patterns.before["M-1"], 2);
  assert.equal(repairedReport.patterns.after["M-1"], 0);

  const codeSpan = await writeCase(
    "`--range 1—3` 옵션은 페이지 범위를 지정합니다.",
    "`--range 1—3` 옵션은 페이지 범위를 지정합니다."
  );
  const codeSpanResult = spawnSync(process.execPath, [script, "--source", codeSpan.source, "--final", codeSpan.final, "--report", codeSpan.report], {
    encoding: "utf8"
  });

  assert.equal(codeSpanResult.status, 0, codeSpanResult.stderr);
});

test("humanize audit warns when modality markers decrease but not when they are repositioned", async () => {
  const substituted = await writeCase(
    "배포 전에 보안 정책을 검토해야 한다. 로그 보존 기간도 확인해야 한다.",
    "배포 전에 보안 정책을 검토한다. 로그 보존 기간도 확인해야 한다."
  );
  const substitutedResult = spawnSync(process.execPath, [script, "--source", substituted.source, "--final", substituted.final, "--report", substituted.report], {
    encoding: "utf8"
  });

  assert.equal(substitutedResult.status, 0, substitutedResult.stderr);
  const substitutedReport = JSON.parse(await readFile(substituted.report, "utf8"));
  assert.equal(substitutedReport.modality.deontic.before, 2);
  assert.equal(substitutedReport.modality.deontic.after, 1);
  assert.ok(substitutedReport.warnings.some((warning) => /Modality markers decreased/.test(warning)), JSON.stringify(substitutedReport.warnings));

  const repositioned = await writeCase(
    "이 함수는 입력을 검증한다. 잘못된 값은 즉시 호출자에게 반환한다. 로그는 하루 단위로 정리해 보관한다. 담당자는 매주 결과를 공유한다. 배포 전에 반드시 점검해야 한다.",
    "배포 전에 반드시 점검해야 한다. 이 함수는 입력을 검증한다. 잘못된 값은 즉시 호출자에게 반환한다. 로그는 하루 단위로 정리해 보관한다. 담당자는 매주 결과를 공유한다."
  );
  const repositionedResult = spawnSync(process.execPath, [script, "--source", repositioned.source, "--final", repositioned.final, "--report", repositioned.report], {
    encoding: "utf8"
  });

  assert.equal(repositionedResult.status, 0, repositionedResult.stderr);
  const repositionedReport = JSON.parse(await readFile(repositioned.report, "utf8"));
  assert.equal(repositionedReport.modality.deontic.before, 1);
  assert.equal(repositionedReport.modality.deontic.after, 1);
  assert.ok(!repositionedReport.warnings.some((warning) => /Modality markers decreased/.test(warning)), JSON.stringify(repositionedReport.warnings));
});

test("humanize audit warns on repeated paired antithesis rhetoric but allows a single pair", async () => {
  const repeated = await writeCase(
    "속도가 아니라 방향이 문제다. 기능이 아니라 완성도가 관건이다.",
    "속도가 아니라 방향이 문제다. 기능이 아니라 완성도가 관건이다."
  );
  const repeatedResult = spawnSync(process.execPath, [script, "--source", repeated.source, "--final", repeated.final, "--report", repeated.report], {
    encoding: "utf8"
  });

  assert.equal(repeatedResult.status, 0, repeatedResult.stderr);
  const repeatedReport = JSON.parse(await readFile(repeated.report, "utf8"));
  assert.equal(repeatedReport.antithesis.after, 2);
  assert.ok(repeatedReport.warnings.some((warning) => /antithesis rhetoric repeats/.test(warning)), JSON.stringify(repeatedReport.warnings));

  const single = await writeCase(
    "속도가 아니라 방향이 문제다. 완성도는 별도로 살핀다.",
    "속도가 아니라 방향이 문제다. 완성도는 별도로 살핀다."
  );
  const singleResult = spawnSync(process.execPath, [script, "--source", single.source, "--final", single.final, "--report", single.report], {
    encoding: "utf8"
  });

  assert.equal(singleResult.status, 0, singleResult.stderr);
  const singleReport = JSON.parse(await readFile(single.report, "utf8"));
  assert.equal(singleReport.antithesis.after, 1);
  assert.ok(!singleReport.warnings.some((warning) => /antithesis/.test(warning)), JSON.stringify(singleReport.warnings));
});

test("humanize audit protects Korean product names supplied by the caller", async () => {
  const files = await writeCase(
    "카카오톡은 2026년 7월 1일에 업데이트됐다.",
    "메신저는 2026년 7월 1일에 업데이트됐다."
  );
  const result = spawnSync(process.execPath, [script, "--source", files.source, "--final", files.final, "--report", files.report], {
    encoding: "utf8"
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Protected tokens changed/);
});
