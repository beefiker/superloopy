import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

import { checkSkills } from "../src/doctor-skills.js";

const script = fileURLToPath(new URL("../skills/superloopy-loop/scripts/audit-reassurance-copy.mjs", import.meta.url));
const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const auditModuleUrl = new URL("../skills/superloopy-loop/scripts/audit-reassurance-copy.mjs", import.meta.url);

async function auditCase(t, sourceText, finalText, extraArgs = []) {
  const directory = await mkdtemp(join(tmpdir(), "reassurance-copy-audit-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const source = join(directory, "source.md");
  const final = join(directory, "final.md");
  const report = join(directory, "report.json");
  await writeFile(source, sourceText);
  await writeFile(final, finalText);
  const result = spawnSync(process.execPath, [script, "--source", source, "--final", final, "--report", report, ...extraArgs], { encoding: "utf8" });
  return { result, report: JSON.parse(await readFile(report, "utf8")), files: { source, final, report } };
}

// Mutation caught: retaining the standalone skill keeps explicit discovery active instead of making the loop gate automatic.
test("doctor discovery excludes standalone product-copy", async () => {
  const discovery = await checkSkills(repoRoot);

  assert.equal(discovery.skills.includes("product-copy"), false);
  assert.equal(discovery.requiredSkills.includes("product-copy"), false);
});

// Mutation caught: rebuilding argv[1] with new URL(path, "file:") prevents main() from running for Windows drive-letter paths.
test("audit recognizes Windows drive-letter paths as CLI entry points", async () => {
  const auditModule = await import(auditModuleUrl);
  assert.equal(typeof auditModule.isMainModule, "function");
  const windowsPath = "C:\\repo\\skills\\superloopy-loop\\scripts\\audit-reassurance-copy.mjs";
  const windowsUrl = pathToFileURL(windowsPath, { windows: true }).href;
  assert.equal(auditModule.isMainModule(windowsUrl, windowsPath, { windows: true }), true);
});

// Mutation caught: skipping main() can exit 0 without creating the public report on Windows.
test("audit CLI executes and writes its public report", async (t) => {
  const audited = await auditCase(t, "설정을 저장했습니다.", "설정을 저장했습니다.");

  assert.equal(audited.result.status, 0, audited.result.stderr);
  assert.equal(audited.report.ok, true);
  assert.equal(audited.report.sourceChars, 11);
  assert.equal(audited.report.finalChars, 11);
});

// Mutation caught: dropping any RC-1 safety pattern allows vague safety reassurance to pass.
test("audit rejects vague safety reassurance", async (t) => {
  const vagueSafety = await auditCase(t, "백업 방식은 제공하지 않았습니다.", "백업을 안전하게 처리합니다.");
  assert.notEqual(vagueSafety.result.status, 0);
  assert.ok(vagueSafety.report.problems.some((item) => item.id === "RC-1-safety"));
});

// Mutation caught: omitting accuracy patterns allows unsupported correctness boasts to pass.
test("audit rejects vague accuracy reassurance", async (t) => {
  const vagueAccuracy = await auditCase(t, "계산 방법은 제공하지 않았습니다.", "정확하게 계산합니다.");
  assert.notEqual(vagueAccuracy.result.status, 0);
  assert.ok(vagueAccuracy.report.problems.some((item) => item.id === "RC-1-accuracy"));
});

// Mutation caught: treating a vague failure reassurance as a concrete outcome incorrectly passes it.
test("audit rejects vague failure reassurance", async (t) => {
  const vagueFailure = await auditCase(t, "저장 실패 후 동작은 제공하지 않았습니다.", "저장에 실패해도 이전 버전은 안전하게 남습니다.");
  assert.notEqual(vagueFailure.result.status, 0);
  assert.ok(vagueFailure.report.problems.some((item) => item.id === "RC-2-vague-failure"));
});

// Mutation caught: classifying a supported fallback as a vague failure prevents a valid message from passing.
test("audit accepts a concrete supplied fallback", async (t) => {
  const concreteFallback = await auditCase(t, "펌웨어 적용에 실패하면 제품은 기존 부팅 설정으로 계속 부팅합니다.", "펌웨어 설정에 실패했습니다. 기존 부팅 설정을 계속 사용합니다.");
  assert.equal(concreteFallback.result.status, 0);
  assert.deepEqual(concreteFallback.report.problems, []);
});

// Mutation caught: limiting RC-2 to the nouns 실패 and 오류 silently passes common inability messages.
test("audit sends inability failure wording to RC-2 manual review", async (t) => {
  for (const finalText of ["설정을 저장할 수 없습니다.", "설정을 저장하지 못했습니다."]) {
    const inability = await auditCase(t, "설정 저장을 시도합니다.", finalText);
    assert.equal(inability.result.status, 0, inability.result.stderr);
    assert.ok(inability.report.manualReview.some((item) => item.id === "RC-2-failure"), finalText);
  }
});

// Mutation caught: matching the positive form 할 수 있습니다 as inability creates noisy RC-2 reviews.
test("audit does not classify positive capability wording as a failure", async (t) => {
  const capability = await auditCase(t, "설정을 저장할 수 있습니다.", "설정을 저장할 수 있습니다.");
  assert.equal(capability.result.status, 0, capability.result.stderr);
  assert.ok(!capability.report.manualReview.some((item) => item.id === "RC-2-failure"));
});

// Mutation caught: turning negative privacy commitments into failures hides required human review.
test("audit sends privacy commitments to manual review", async (t) => {
  const privacyCommitment = await auditCase(t, "검색어를 서버로 전송하지 않습니다.", "검색어를 서버로 전송하지 않습니다.");
  assert.equal(privacyCommitment.result.status, 0);
  assert.ok(privacyCommitment.report.manualReview.some((item) => item.id === "RC-3-negative-capability"));
});

// Mutation caught: recognizing only active negative clauses hides passive verified privacy commitments.
test("audit sends passive privacy commitments to manual review", async (t) => {
  const privacyCommitment = await auditCase(t, "검색어는 서버로 전송되지 않습니다.", "검색어는 서버로 전송되지 않습니다.");
  assert.equal(privacyCommitment.result.status, 0);
  assert.ok(privacyCommitment.report.manualReview.some((item) => item.id === "RC-3-negative-capability"));
});

// Mutation caught: omitting the known incomplete stored-data reassurance allows it to pass as a supported outcome.
test("audit rejects the known vague stored-data failure reassurance", async (t) => {
  const vagueFailure = await auditCase(t, "저장 실패 후 동작은 제공하지 않았습니다.", "저장에 실패해도 데이터는 안전합니다.");
  assert.notEqual(vagueFailure.result.status, 0);
  assert.ok(vagueFailure.report.problems.some((item) => item.id === "RC-2-vague-failure"));
});

// Mutation caught: matching a reassurance inside a Korean negative prefix falsely blocks unrelated words.
test("audit does not match Korean negative prefixes as vague reassurance", async (t) => {
  const negativePrefixes = await auditCase(t, "불안전하게 처리합니다. 부정확하게 계산합니다.", "불안전하게 처리합니다. 부정확하게 계산합니다.");
  assert.equal(negativePrefixes.result.status, 0);
  assert.ok(!negativePrefixes.report.problems.some((item) => item.id === "RC-1-safety" || item.id === "RC-1-accuracy"));
});

// Mutation caught: pushing the semantic naturalness judgment into the lexical CLI recreates unbounded Korean phrase false positives.
test("audit leaves misplaced precision to humanize-korean semantic review", async (t) => {
  const copy = "정확한 컴퓨터 / 정확한 시스템 이름 / 정확한 GPU 주파수";
  const audited = await auditCase(t, copy, copy);
  assert.equal(audited.result.status, 0, audited.result.stderr);
  assert.equal("PC-5-misplaced-precision" in audited.report.patterns.after, false);
  assert.equal("RC-5-misplaced-precision" in audited.report.patterns.after, false);
  assert.ok(!audited.report.manualReview.some((item) => item.id === "PC-5-misplaced-precision" || item.id === "RC-5-misplaced-precision"));
});

// Mutation caught: failing to collect a quoted product value permits its removal.
test("audit rejects removal of protected quoted values", async (t) => {
  const protectedRemoval = await auditCase(t, "제품 이름은 \"Northwind\"입니다.", "제품 이름이 변경되었습니다.");
  assert.notEqual(protectedRemoval.result.status, 0);
  assert.ok(protectedRemoval.report.problems.some((item) => item.id === "protected-token" && item.values.includes("\"Northwind\"")));
});

// Mutation caught: collecting only quoted values permits a supplied unquoted product name to disappear.
test("audit rejects removal of an unquoted Latin product name", async (t) => {
  const protectedRemoval = await auditCase(t, "Fileloom에서 백업을 시작합니다.", "앱에서 백업을 시작합니다.");
  assert.notEqual(protectedRemoval.result.status, 0);
  assert.ok(protectedRemoval.report.problems.some((item) => item.id === "protected-token" && item.values.includes("Fileloom")));
});

// Mutation caught: treating ordinary Korean subjects as product names blocks legitimate copy edits.
test("audit does not freeze ordinary Korean subjects as product names", async (t) => {
  const ordinarySubject = await auditCase(t, "사용자는 설정을 저장합니다.", "고객은 설정을 저장합니다.");
  assert.equal(ordinarySubject.result.status, 0, ordinarySubject.result.stderr);
  assert.ok(!ordinarySubject.report.problems.some((item) => item.id === "protected-token"));
});

// Mutation caught: omitting or renaming declared fields breaks consumers of the public report schema.
test("audit reports declared character counts and protected-token schema", async (t) => {
  const audited = await auditCase(t, "Fileloom은 2개 파일을 저장합니다.", "Fileloom은 2개 파일을 저장합니다.");

  assert.equal(audited.report.sourceChars, 23);
  assert.equal(audited.report.finalChars, 23);
  assert.deepEqual(audited.report.protectedTokens, { total: 2, missing: [] });
  assert.equal("protected" in audited.report, false);
});

// Mutation caught: skipping change-rate calculation hides large unsupported rewrites from reviewers.
test("audit flags large rewrites for manual review without failing them", async (t) => {
  const largeRewrite = await auditCase(t, "짧은 안내입니다.", "이 안내는 사용자가 다음 단계를 이해할 수 있도록 여러 문장으로 상세히 설명합니다.");
  assert.equal(largeRewrite.result.status, 0);
  assert.ok(largeRewrite.report.changeRate > 0.5);
  assert.ok(largeRewrite.report.manualReview.some((item) => item.id === "large-rewrite"));
});

// Mutation caught: silently accepting unreadable source input loses actionable audit diagnostics.
test("audit writes an error report for unreadable input", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "reassurance-copy-audit-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const final = join(directory, "final.md");
  const report = join(directory, "report.json");
  await writeFile(final, "완료했습니다.");
  const result = spawnSync(process.execPath, [script, "--source", join(directory, "missing.md"), "--final", final, "--report", report], { encoding: "utf8" });
  const parsed = JSON.parse(await readFile(report, "utf8"));
  assert.notEqual(result.status, 0);
  assert.equal(parsed.ok, false);
  assert.ok(parsed.problems.some((item) => item.id === "input"));
  assert.equal(parsed.sourceChars, 0);
  assert.equal(parsed.finalChars, 0);
  assert.deepEqual(parsed.protectedTokens, { total: 0, missing: [] });
  assert.equal("protected" in parsed, false);
});

// Mutation caught: accepting unknown or incomplete flags makes invocation errors indistinguishable from audited copy.
test("audit writes an error report for malformed flags", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "reassurance-copy-audit-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const report = join(directory, "report.json");
  const result = spawnSync(process.execPath, [script, "--report", report, "--unknown"], { encoding: "utf8" });
  const parsed = JSON.parse(await readFile(report, "utf8"));
  assert.notEqual(result.status, 0);
  assert.equal(parsed.ok, false);
  assert.ok(parsed.problems.some((item) => item.id === "arguments"));
});

// Mutation caught: processing line endings differently changes otherwise identical RC-1 outcomes.
test("audit gives LF and CRLF input identical decisions", async (t) => {
  const lf = await auditCase(t, "첫 줄\n둘째 줄", "백업을 안전하게 처리합니다.");
  const crlf = await auditCase(t, "첫 줄\r\n둘째 줄", "백업을 안전하게 처리합니다.");
  assert.deepEqual(crlf.report, lf.report);
});
