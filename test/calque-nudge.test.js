import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { calqueNudgeContext, lastAssistantText, mergeAdditionalContext } from "../src/calque-nudge.js";
import { formatMeasuredAdditionalContext } from "../src/context-cost.js";
import { runUserPromptSubmitHook } from "../src/hooks.js";

const ON = { SUPERLOOPY_CALQUE_NUDGE: "on" };
const entry = (type, content) => JSON.stringify({ type, message: { role: type, content } });
const text = (value) => ({ type: "text", text: value });

async function transcriptWith(lines) {
  const dir = await mkdtemp(join(tmpdir(), "superloopy-calque-nudge-"));
  const path = join(dir, "transcript.jsonl");
  await writeFile(path, `${lines.join("\n")}\n`);
  return { dir, path };
}

async function withEnv(values, fn) {
  const previous = {};
  for (const [key, value] of Object.entries(values)) {
    previous[key] = process.env[key];
    process.env[key] = value;
  }
  try {
    return await fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("lastAssistantText takes the trailing assistant run in reading order and skips a torn first line", async () => {
  const { path } = await transcriptWith([
    '{"type":"assist', // torn by the bounded tail read
    entry("user", [text("첫 질문")]),
    entry("assistant", [text("이전 턴의 답입니다.")]),
    entry("user", [{ type: "tool_result", content: "ok" }]),
    entry("assistant", [{ type: "tool_use", name: "Bash" }]),
    entry("assistant", [text("첫 문장."), text("둘째 문장.")]),
    entry("assistant", [text("셋째 문장.")])
  ]);
  assert.equal(lastAssistantText({ transcript_path: path }), "첫 문장.\n둘째 문장.\n셋째 문장.");
  assert.equal(lastAssistantText({ transcript_path: path, last_assistant_message: "Codex 본문" }), "Codex 본문");
  assert.equal(lastAssistantText({ transcript_path: join(path, "missing") }), "");
});

test("calqueNudgeContext is off by default and silent for non-Korean or advisory-only text", async () => {
  const { path } = await transcriptWith([entry("assistant", [text("저장 요청이 조용히 무시된다.")])]);
  assert.equal(calqueNudgeContext({ transcript_path: path }, {}), null);
  assert.equal(calqueNudgeContext({ last_assistant_message: "The request fails silently." }, ON), null);
  assert.equal(calqueNudgeContext({ last_assistant_message: "정본 스키마로 이관한다. 첫날부터 적용한다." }, ON), null);
  assert.equal(calqueNudgeContext({ last_assistant_message: "사용자 보고: \"조용히 무시된다\" 를 재현했다." }, ON), null, "quoted span is the source's");
});

test("calqueNudgeContext names each gating span with its ladder hint", () => {
  const nudge = calqueNudgeContext({ last_assistant_message: "저장 요청이 조용히 무시된다. 재시작 전에 워커를 우아하게 종료한다. 주문 상태의 단일 진실 공급원은 orders 테이블이다." }, ON);
  assert.match(nudge, /^Superloopy calque nudge \(advisory, not a gate\)/u);
  assert.match(nudge, /- P-1a `조용히 무시된` — 조용히 is for people/u);
  assert.match(nudge, /- P-2 `우아하게 종료` — /u);
  assert.match(nudge, /- P-4 `단일 진실 공급원` — /u);
  assert.match(nudge, /Repair ladder: delete the adverb/u);
  assert.doesNotMatch(nudge, /decision/u);
});

test("mergeAdditionalContext appends below existing context and keeps one cost trailer last", () => {
  assert.equal(mergeAdditionalContext("", "UserPromptSubmit", null), "");
  assert.equal(mergeAdditionalContext('{"decision":"steer"}', "UserPromptSubmit", "nudge"), '{"decision":"steer"}');
  const alone = JSON.parse(mergeAdditionalContext("", "UserPromptSubmit", "nudge"));
  assert.equal(alone.hookSpecificOutput.hookEventName, "UserPromptSubmit");
  assert.match(alone.hookSpecificOutput.additionalContext, /^nudge\n\nSuperloopy context cost: /u);
  const existing = formatMeasuredAdditionalContext("UserPromptSubmit", "hello", { continue: true });
  const merged = JSON.parse(mergeAdditionalContext(existing, "UserPromptSubmit", "nudge"));
  assert.equal(merged.continue, true);
  const context = merged.hookSpecificOutput.additionalContext;
  assert.match(context, /^hello\n\nnudge\n\nSuperloopy context cost: /u);
  assert.equal(context.match(/Superloopy context cost/gu).length, 1);
});

test("runUserPromptSubmitHook stays quiet by default and emits the nudge as additionalContext when enabled", async () => {
  const { dir, path } = await transcriptWith([entry("assistant", [text("저장 요청이 서버에 도달하지 못하면 조용히 무시된다.")])]);
  const payload = { hook_event_name: "UserPromptSubmit", cwd: dir, prompt: "다음 단계로 가자", transcript_path: path };
  assert.equal(await runUserPromptSubmitHook(payload), "");
  const output = await withEnv(ON, () => runUserPromptSubmitHook(payload));
  const parsed = JSON.parse(output);
  assert.equal(parsed.decision, undefined);
  assert.match(parsed.hookSpecificOutput.additionalContext, /P-1a `조용히 무시된`/u);
  const english = await withEnv(ON, () => runUserPromptSubmitHook({ ...payload, last_assistant_message: "Done. The uploader fails silently." }));
  assert.equal(english, "");
});
