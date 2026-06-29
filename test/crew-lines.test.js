import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { crewLineForHandoff, decorateHandoffWithCrewLine, detectCrewLineLanguage, formatCrewLine, SUPPORTED_CREW_LINE_LANGUAGES } from "../src/crew-lines.js";

async function tempRepo() {
  return mkdtemp(join(tmpdir(), "superloopy-crew-lines-"));
}

async function writeEvidence(repo, name, content = "proof\n", sessionId = null) {
  const relativeDir = sessionId === null ? join(".superloopy", "evidence") : join(".superloopy", "sessions", sessionId, "evidence");
  const evidenceDir = join(repo, relativeDir);
  await mkdir(evidenceDir, { recursive: true });
  const path = join(evidenceDir, name);
  await writeFile(path, content, "utf8");
  return `${relativeDir.split("\\").join("/")}/${name}`;
}

function runCli(args, options = {}) {
  return spawnSync(process.execPath, [join(process.cwd(), "src/cli.js"), ...args], {
    cwd: options.cwd ?? process.cwd(),
    encoding: "utf8",
    timeout: 10_000
  });
}

test("crewLineForHandoff returns original role lines for terminal verdicts", () => {
  const line = crewLineForHandoff({ agent: "usk", normalizedVerdict: "accept" });

  assert.deepEqual(line, {
    agent: "usk",
    speaker: "Usk",
    verdict: "accept",
    language: "en",
    line: "Target checked. The test passed."
  });
  assert.equal(formatCrewLine(line), 'Usk: "Target checked. The test passed."');
});

test("crewLineForHandoff matches Korean user language from assignment or explicit hints", () => {
  assert.equal(detectCrewLineLanguage("영어가 아니라 한국어로 답해줘"), "ko");
  assert.equal(detectCrewLineLanguage("answer in English"), "en");

  const line = crewLineForHandoff({
    agent: "usk",
    normalizedVerdict: "accept",
    assignment: "한국어 사용자가 요청한 QA"
  });

  assert.deepEqual(line, {
    agent: "usk",
    speaker: "Usk",
    verdict: "accept",
    language: "ko",
    line: "표적 확인. 테스트는 통과했다."
  });
  assert.equal(
    decorateHandoffWithCrewLine({ agent: "zyro", normalizedVerdict: "reject", assignment: "review" }, { languageHints: ["사용자는 한국어로 말했다"] }).crewLine.line,
    "길이 어긋났다. 막는 결함부터 베어내자."
  );
});

test("crewLineForHandoff follows supported prompt languages and falls back to English", () => {
  assert.deepEqual(SUPPORTED_CREW_LINE_LANGUAGES, ["en", "ko", "ja", "zh", "es", "fr", "de", "it", "pt", "id", "hi", "tr", "vi", "ru", "ar", "th"]);
  assert.equal(detectCrewLineLanguage("responde en español"), "es");
  assert.equal(detectCrewLineLanguage("日本語でレビューして"), "ja");
  assert.equal(detectCrewLineLanguage("language=pt-BR"), "pt");
  assert.equal(detectCrewLineLanguage("العربية"), "ar");
  assert.equal(detectCrewLineLanguage("unsupported made-up language"), "en");

  assert.deepEqual(crewLineForHandoff({ agent: "usk", normalizedVerdict: "accept", assignment: "responde en español" }), {
    agent: "usk",
    speaker: "Usk",
    verdict: "accept",
    language: "es",
    line: "Objetivo confirmado. La prueba pasó."
  });
  assert.equal(crewLineForHandoff({ agent: "rovyn", normalizedVerdict: "accept", assignment: "日本語で監査" }).line, "記録確認。証拠と結論は一致している。");
  assert.equal(crewLineForHandoff({ agent: "usk", normalizedVerdict: "accept" }, { language: "fr-FR" }).line, "Cible confirmée. Le test est passé.");
});

test("crewLineForHandoff stays silent for pending or unknown lanes", () => {
  assert.equal(crewLineForHandoff({ agent: "usk", normalizedVerdict: "pending" }), null);
  assert.equal(crewLineForHandoff({ agent: "unknown", normalizedVerdict: "accept" }), null);
  assert.deepEqual(decorateHandoffWithCrewLine({ id: "H001", agent: "usk", normalizedVerdict: "pending" }), {
    id: "H001",
    agent: "usk",
    normalizedVerdict: "pending"
  });
});

test("CLI handoff text shows the crew line without hiding status", async () => {
  const repo = await tempRepo();
  const artifact = await writeEvidence(repo, "qa.txt");

  const result = runCli([
    "loop",
    "handoff",
    "--agent",
    "usk",
    "--assignment",
    "qa",
    "--status",
    "done",
    "--verdict",
    "PASS",
    "--artifact",
    artifact
  ], { cwd: repo });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^Usk: "Target checked\. The test passed\."\nsuperloopy handoff: H001 usk -> done \[accept\]\n$/);
});

test("CLI handoff text can use an explicit supported language override", async () => {
  const repo = await tempRepo();
  const artifact = await writeEvidence(repo, "qa.txt");

  const result = runCli([
    "loop",
    "handoff",
    "--language",
    "es",
    "--agent",
    "usk",
    "--assignment",
    "qa",
    "--status",
    "done",
    "--verdict",
    "PASS",
    "--artifact",
    artifact
  ], { cwd: repo });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^Usk: "Objetivo confirmado\. La prueba pasó\."\nsuperloopy handoff: H001 usk -> done \[accept\]\n$/);
});

test("CLI handoff text follows Korean session brief language", async () => {
  const repo = await tempRepo();
  const begun = runCli([
    "loop",
    "begin",
    "--session-id",
    "ko-user",
    "--brief",
    "한국어 사용자가 요청한 작업",
    "--json"
  ], { cwd: repo });
  assert.equal(begun.status, 0, begun.stderr);
  const scopedArtifact = await writeEvidence(repo, "qa-scoped.txt", "proof\n", "ko-user");

  const result = runCli([
    "loop",
    "handoff",
    "--session-id",
    "ko-user",
    "--agent",
    "usk",
    "--assignment",
    "qa",
    "--status",
    "done",
    "--verdict",
    "PASS",
    "--artifact",
    scopedArtifact
  ], { cwd: repo });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^Usk: "표적 확인\. 테스트는 통과했다\."\nsuperloopy handoff: H001 usk -> done \[accept\]\n$/);
});
