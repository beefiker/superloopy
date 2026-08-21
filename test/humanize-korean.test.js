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
