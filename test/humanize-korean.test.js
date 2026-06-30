import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const script = "skills/humanize-korean/scripts/audit-humanize-output.mjs";

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
