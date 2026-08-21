import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const script = "skills/humanize-korean/scripts/audit-humanize-output.mjs";
const quickRules = "skills/humanize-korean/references/quick-rules.md";

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

test("humanize audit rejects lingering safety-flaunting copy", async () => {
  const files = await writeCase(
    "이 도구는 백업 파일을 안전하게 저장합니다.",
    "이 도구는 백업 파일을 안전하게 저장합니다."
  );
  const result = spawnSync(process.execPath, [script, "--source", files.source, "--final", files.final, "--report", files.report], {
    encoding: "utf8"
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Safety-flaunting copy remains/);

  const repaired = await writeCase(
    "이 도구는 백업 파일을 안전하게 저장합니다.",
    "이 도구는 백업 파일을 저장합니다."
  );
  const repairedResult = spawnSync(process.execPath, [
    script,
    "--source",
    repaired.source,
    "--final",
    repaired.final,
    "--report",
    repaired.report
  ], { encoding: "utf8" });

  assert.equal(repairedResult.status, 0, repairedResult.stderr);
  const repairedReport = JSON.parse(await readFile(repaired.report, "utf8"));
  assert.equal(repairedReport.patterns.before["L-1"], 1);
  assert.equal(repairedReport.patterns.after["L-1"], 0);
});

test("humanize audit rejects vague safety wording even when a failure is stated", async () => {
  const files = await writeCase(
    "저장에 실패해도 이전 버전은 안전하게 남습니다.",
    "저장에 실패해도 이전 버전은 안전하게 남습니다."
  );
  const result = spawnSync(process.execPath, [script, "--source", files.source, "--final", files.final, "--report", files.report], {
    encoding: "utf8"
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Safety-flaunting copy remains/);
});

test("humanize audit allows safety wording that names the fallback after a failure", async () => {
  const files = await writeCase(
    "펌웨어 설정에 실패했습니다. 안전한 기존 부팅 설정을 계속 사용합니다.",
    "펌웨어 설정에 실패했습니다. 안전한 기존 부팅 설정을 계속 사용합니다."
  );
  const result = spawnSync(process.execPath, [script, "--source", files.source, "--final", files.final, "--report", files.report], {
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(await readFile(files.report, "utf8"));
  assert.equal(report.patterns.after["L-1"], 0);
});

test("humanize audit rejects vague safety maintenance after a failure", async () => {
  const files = await writeCase(
    "변환에 실패해도 원본 파일은 안전하게 유지됩니다.",
    "변환에 실패해도 원본 파일은 안전하게 유지됩니다."
  );
  const result = spawnSync(process.execPath, [script, "--source", files.source, "--final", files.final, "--report", files.report], {
    encoding: "utf8"
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Safety-flaunting copy remains/);
});

test("humanize audit does not pair a failure with unrelated safety copy", async () => {
  const files = await writeCase(
    "업로드에 실패했습니다. 비밀번호는 안전하게 보관합니다.",
    "업로드에 실패했습니다. 비밀번호는 안전하게 보관합니다."
  );
  const result = spawnSync(process.execPath, [script, "--source", files.source, "--final", files.final, "--report", files.report], {
    encoding: "utf8"
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Safety-flaunting copy remains/);
});

test("humanize audit warns on remaining negative-capability reassurance and caps the grade", async () => {
  const files = await writeCase(
    "이 프로그램은 원본 문서를 수정하지 않습니다.",
    "이 프로그램은 원본 문서를 수정하지 않습니다."
  );
  const result = spawnSync(process.execPath, [script, "--source", files.source, "--final", files.final, "--report", files.report], {
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(await readFile(files.report, "utf8"));
  assert.equal(report.ok, true);
  assert.equal(report.grade, "C");
  assert.ok(report.warnings.some((warning) => /Negative-capability/.test(warning)), JSON.stringify(report.warnings));
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

test("humanize audit scopes the safety gate by declared genre", async () => {
  const newsText = "식약처는 백신 안전성 검토 결과를 어제 공개했다.";
  const strict = await writeCase(newsText, newsText);
  const strictResult = spawnSync(process.execPath, [script, "--source", strict.source, "--final", strict.final, "--report", strict.report], {
    encoding: "utf8"
  });

  assert.notEqual(strictResult.status, 0);
  assert.match(strictResult.stderr, /Safety-flaunting copy remains/);

  const relaxed = await writeCase(newsText, newsText);
  const relaxedResult = spawnSync(process.execPath, [
    script,
    "--source",
    relaxed.source,
    "--final",
    relaxed.final,
    "--report",
    relaxed.report,
    "--genre",
    "리포트"
  ], { encoding: "utf8" });

  assert.equal(relaxedResult.status, 0, relaxedResult.stderr);
  const relaxedReport = JSON.parse(await readFile(relaxed.report, "utf8"));
  assert.equal(relaxedReport.ok, true);
  assert.equal(relaxedReport.genre, "리포트");
  assert.equal(relaxedReport.grade, "C");
  assert.ok(relaxedReport.warnings.some((warning) => /Safety-flaunting/.test(warning)), JSON.stringify(relaxedReport.warnings));
});

test("humanize audit exempts safety only for concrete outcomes paired with failures, not recovery-feature names", async () => {
  const flaunt = await writeCase(
    "복구 기능이 여러분의 데이터를 언제나 안전하게 지켜드립니다.",
    "복구 기능이 여러분의 데이터를 언제나 안전하게 지켜드립니다."
  );
  const flauntResult = spawnSync(process.execPath, [script, "--source", flaunt.source, "--final", flaunt.final, "--report", flaunt.report], {
    encoding: "utf8"
  });

  assert.notEqual(flauntResult.status, 0);
  assert.match(flauntResult.stderr, /Safety-flaunting copy remains/);

  const reported = await writeCase(
    "업로드에 실패했지만 임시 파일은 안전하게 보관되어 있습니다.",
    "업로드에 실패했지만 임시 파일은 안전하게 보관되어 있습니다."
  );
  const reportedResult = spawnSync(process.execPath, [
    script,
    "--source",
    reported.source,
    "--final",
    reported.final,
    "--report",
    reported.report
  ], { encoding: "utf8" });

  assert.equal(reportedResult.status, 0, reportedResult.stderr);
});

test("humanize audit never counts imperatives as reassurance", async () => {
  const files = await writeCase(
    "비밀번호는 안전하게 보관하세요.",
    "비밀번호는 안전하게 보관하세요."
  );
  const result = spawnSync(process.execPath, [script, "--source", files.source, "--final", files.final, "--report", files.report], {
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(await readFile(files.report, "utf8"));
  assert.equal(report.patterns.after["L-1"], 0);
});

test("humanize audit treats conditional negatives as warnings to the reader, not L-3 reassurance", async () => {
  const files = await writeCase(
    "지금 나가면 변경 사항이 저장되지 않습니다.",
    "지금 나가면 변경 사항이 저장되지 않습니다."
  );
  const result = spawnSync(process.execPath, [script, "--source", files.source, "--final", files.final, "--report", files.report], {
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(await readFile(files.report, "utf8"));
  assert.equal(report.patterns.after["L-3"], 0);
  assert.equal(report.grade, "B");
  assert.ok(!report.warnings.some((warning) => /Negative-capability/.test(warning)), JSON.stringify(report.warnings));
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
