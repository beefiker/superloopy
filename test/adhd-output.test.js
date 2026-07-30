import assert from "node:assert/strict";
import test from "node:test";

import {
  extractSkillBody,
  hasAdhdFriendlyOutputCue,
  loadAdhdFriendlyOutputOverlay
} from "../src/adhd-output.js";

test("ADHD-friendly cue classifier accepts self-selected execution support", () => {
  for (const brief of [
    "I have ADHD; keep the migration one step at a time",
    "Make the response ADHD-friendly and easy to scan",
    "I cannot focus; give me short numbered steps",
    "This task is overwhelming me. Lead with one action",
    "한 단계씩 짧게 알려줘. 집중이 안 돼요",
    "너무 막막해요. 핵심부터 실행 단계로 정리해줘",
    "저는 ADHD가 있어요. 읽기 쉽게 단계별로 진행해줘",
    "답변을 ADHD 친화적으로 작성해줘"
  ]) {
    assert.equal(hasAdhdFriendlyOutputCue(brief), true, brief);
  }
});

test("ADHD-friendly cue classifier accepts approved standalone activation cues", () => {
  const briefs = [
    "I have ADHD. Migrate the auth module",
    "I cannot focus. Migrate the auth module",
    "This task is overwhelming me. Add login",
    "Please fix this one step at a time",
    "Migrate auth one step at a time",
    "한 단계씩 로그인 기능을 추가해줘"
  ];

  assert.deepEqual(briefs.map(hasAdhdFriendlyOutputCue), [
    true,
    true,
    true,
    true,
    true,
    true
  ]);
});

test("ADHD-friendly cue classifier keeps direct requests active alongside engineering work", () => {
  for (const brief of [
    "I have ADHD; add the settings page one step at a time",
    "I cannot focus; edit the docs using short numbered steps",
    "Make the response ADHD-friendly and help me change the modal"
  ]) {
    assert.equal(hasAdhdFriendlyOutputCue(brief), true, brief);
  }
});

test("ADHD-friendly cue classifier accepts friction paired with presentation intent", () => {
  const briefs = [
    "너무 막막해요. 한 단계씩 로그인 기능을 추가해줘",
    "I cannot focus; keep the migration action-first"
  ];

  assert.deepEqual(briefs.map(hasAdhdFriendlyOutputCue), [true, true]);
});

test("ADHD-friendly cue classifier accepts polite and later-clause support requests", () => {
  for (const brief of [
    "Please make the response ADHD-friendly and easy to scan",
    "For this migration, I have ADHD; keep the steps short",
    "Could you give me an ADHD-friendly answer?",
    "로그인 버그를 고쳐줘. 집중이 안 돼요. 한 단계씩 알려줘"
  ]) {
    assert.equal(hasAdhdFriendlyOutputCue(brief), true, brief);
  }
});

test("ADHD-friendly cue classifier accepts direct presentation requests", () => {
  for (const brief of [
    "Do not bury the next action",
    "Format the output action-first",
    "Make the answer easy to scan",
    "Could you break this down into short numbered steps?",
    "Could you please break this down into short numbered steps?",
    "Can you keep the answer easy to scan?"
  ]) {
    assert.equal(hasAdhdFriendlyOutputCue(brief), true, brief);
  }
});

test("ADHD-friendly cue classifier rejects diagnosis-by-writing and domain mentions", () => {
  for (const brief of [
    "add the login route",
    "URGENT!!! ship auth NOW",
    "add ADHD accessibility copy to the settings page",
    "fix the focus ring in the modal",
    "document attention and cognitive-load research",
    "cantt fokuz plz fixx",
    "로그인빨리!!!",
    "ADHD라는 용어를 도움말에 추가해줘",
    "stop adhd mode",
    "normal mode"
  ]) {
    assert.equal(hasAdhdFriendlyOutputCue(brief), false, brief);
  }
});

test("ADHD-friendly cue classifier rejects cue-like UI and domain statements", () => {
  for (const brief of [
    "I have ADHD research notes to summarize",
    "I have ADHD-friendly copy to revise",
    "I cannot focus the input field after the modal opens",
    "Short numbered steps are shown in the wizard",
    "Action-first rendering is broken in the settings page",
    "Format action-first rendering in the settings page",
    "Write a React component that shows short numbered steps in the wizard",
    "Write a test for the response action-first option"
  ]) {
    assert.equal(hasAdhdFriendlyOutputCue(brief), false, brief);
  }
});

test("ADHD-friendly cue classifier rejects quoted, copy-editing, and third-party support language", () => {
  for (const brief of [
    "Add the phrase I have ADHD to the help page",
    "Quote 'I cannot focus; give me short numbered steps' in the docs",
    "Edit the copy to say Make the response ADHD-friendly and easy to scan",
    "Document why users cannot focus during checkout",
    "Explain whether ADHD-friendly responses help users",
    "사용자가 집중이 안 돼요라고 말할 때 도움말을 보여줘",
    "도움말에 ADHD 친화적으로 작성해줘라는 문구를 추가해줘",
    "Review the copy that says I have ADHD",
    "A user wrote I have ADHD and needs assistance",
    "저는 ADHD 연구자입니다. 연구 결과를 요약해줘"
  ]) {
    assert.equal(hasAdhdFriendlyOutputCue(brief), false, brief);
  }
});

test("extractSkillBody accepts LF and CRLF frontmatter and rejects malformed content", () => {
  assert.equal(extractSkillBody("---\nname: demo\n---\n# Demo\nBody\n"), "# Demo\nBody");
  assert.equal(extractSkillBody("---\r\nname: demo\r\n---\r\n# Demo\r\nBody\r\n"), "# Demo\nBody");
  assert.equal(extractSkillBody("# Missing frontmatter"), "");
  assert.equal(extractSkillBody(null), "");
});

test("overlay loader reads only after a positive cue and labels the injected body", async () => {
  let reads = 0;
  const readFileImpl = async () => {
    reads += 1;
    return "---\nname: i-have-adhd\n---\n# i-have-adhd\nLead with the next action.\n";
  };

  assert.equal(await loadAdhdFriendlyOutputOverlay("add login", { readFileImpl }), "");
  assert.equal(reads, 0);

  const overlay = await loadAdhdFriendlyOutputOverlay(
    "I have ADHD; keep this one step at a time",
    { readFileImpl }
  );
  assert.equal(reads, 1);
  assert.match(overlay, /^ADHD-friendly output overlay$/m);
  assert.match(overlay, /Lead with the next action/);
  assert.doesNotMatch(overlay, /^---$/m);
});

test("overlay loader fails closed on missing or malformed skill content", async () => {
  const missing = await loadAdhdFriendlyOutputOverlay(
    "I have ADHD; use short steps",
    { readFileImpl: async () => { throw new Error("ENOENT secret path"); } }
  );
  const malformed = await loadAdhdFriendlyOutputOverlay(
    "I have ADHD; use short steps",
    { readFileImpl: async () => "# no frontmatter" }
  );

  assert.equal(missing, "");
  assert.equal(malformed, "");
});

test("default loader reads the packaged skill for a qualifying brief", async () => {
  const overlay = await loadAdhdFriendlyOutputOverlay(
    "I have ADHD; keep this one step at a time"
  );

  assert.match(overlay, /^ADHD-friendly output overlay$/m);
  assert.match(overlay, /^# i-have-adhd$/m);
  assert.match(overlay, /### 1\. Lead with the next action/);
});
