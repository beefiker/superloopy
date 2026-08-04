import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const skillRoot = "skills/say-it-straight";

test("say-it-straight is explicit-only and ships its complete clean-room contract", async () => {
  const skill = await readFile(`${skillRoot}/SKILL.md`, "utf8");
  const metadata = await readFile(`${skillRoot}/agents/openai.yaml`, "utf8");
  const notice = await readFile(`${skillRoot}/references/upstream-notice.md`, "utf8");

  assert.match(skill, /^name: say-it-straight$/m);
  assert.match(skill, /^disable-model-invocation: true$/m);
  assert.match(skill, /\$superloopy:say-it-straight/);
  assert.match(skill, /\/superloopy:say-it-straight/);
  assert.match(skill, /humanize-korean.*Korean|Korean.*humanize-korean/is);
  assert.match(skill, /i-have-adhd.*structure|structure.*i-have-adhd/is);
  assert.match(metadata, /allow_implicit_invocation:\s*false/);
  assert.match(metadata, /\$superloopy:say-it-straight/);
  assert.match(notice, /clean-room/i);
  assert.match(notice, /copied wording:\s*none/i);
});

test("say-it-straight ships one-level references and MIT terms", async () => {
  for (const file of ["quick-rules.md", "preservation.md", "quality-rubric.md", "upstream-notice.md"]) {
    const content = await readFile(`${skillRoot}/references/${file}`, "utf8");
    assert.ok(content.trim().length > 0, file);
  }
  assert.match(await readFile(`${skillRoot}/LICENSE`, "utf8"), /MIT License/);
});
