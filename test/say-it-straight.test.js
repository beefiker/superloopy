import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const skillRoot = "skills/say-it-straight";

test("say-it-straight keeps direct artifact editing explicit while documenting bounded Loopy output", async () => {
  const skill = await readFile(`${skillRoot}/SKILL.md`, "utf8");
  const metadata = await readFile(`${skillRoot}/agents/openai.yaml`, "utf8");
  const notice = await readFile(`${skillRoot}/references/upstream-notice.md`, "utf8");

  assert.match(skill, /^name: say-it-straight$/m);
  assert.match(skill, /^disable-model-invocation: true$/m);
  assert.match(skill, /\$superloopy:say-it-straight/);
  assert.match(skill, /\/superloopy:say-it-straight/);
  assert.match(skill, /humanize-korean.*Korean|Korean.*humanize-korean/is);
  assert.match(skill, /i-have-adhd.*structure|structure.*i-have-adhd/is);
  assert.match(skill, /full Loopy runs.*direct, concise, complete progress.*final responses/is);
  assert.match(skill, /current incomplete loop.*say-it-straight off.*직설 모드 끄기/is);
  assert.match(skill, /enabled.*new loop/is);
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

test("say-it-straight preserves exact operational relations and unsupported perspectives", async () => {
  const skill = await readFile(`${skillRoot}/SKILL.md`, "utf8");

  assert.match(skill, /retain the exact wording of the condition/i);
  assert.match(skill, /retries are accepted/i);
  assert.match(skill, /preserve supplied operational clauses verbatim/i);
  assert.match(skill, /return an otherwise sound operational sentence exactly/i);
  assert.match(skill, /first-person perspective.*I.*we.*us/i);
  assert.match(skill, /detector.*otherwise strong.*source exactly/i);
});

test("say-it-straight keeps non-Korean language boundaries and explicit uncertainty", async () => {
  const skill = await readFile(`${skillRoot}/SKILL.md`, "utf8");

  assert.match(skill, /language-neutral edits/i);
  assert.match(skill, /preserve.*locale.*dialect.*code-switching.*register.*genre/is);
  assert.match(skill, /native judgment is unavailable.*preservation-safe.*disclose/is);
  assert.match(skill, /pressure.*remove.*qualification.*uncertainty.*preserve.*briefly nam(?:e|es)/is);
  assert.match(skill, /^6\. .*literal word `uncertainty`.*retained.*first-person perspective/m);
});

test("say-it-straight names periphrasis as a defect and guards the modality it collapses", async () => {
  const skill = await readFile(`${skillRoot}/SKILL.md`, "utf8");
  const rules = await readFile(`${skillRoot}/references/quick-rules.md`, "utf8");

  assert.match(skill, /periphrastic construction/i);
  assert.match(skill, /every qualifier survives/i);
  assert.match(skill, /term of art/i);
  assert.match(rules, /^\| Periphrastic construction \|/m);
  assert.match(rules, /light verb/i);
  assert.match(rules, /dropped modality or raised certainty/i);
});

test("say-it-straight pressure scenarios stay well formed and cover the periphrasis guard", async () => {
  const scenarios = JSON.parse(await readFile("test/fixtures/say-it-straight/scenarios.json", "utf8"));
  assert.ok(Array.isArray(scenarios), "scenarios fixture must be an array");
  assert.ok(scenarios.length >= 8, `expected at least 8 scenarios, found ${scenarios.length}`);

  const ids = new Set();
  for (const scenario of scenarios) {
    assert.equal(typeof scenario.id, "string", JSON.stringify(scenario).slice(0, 60));
    assert.equal(ids.has(scenario.id), false, `duplicate scenario id: ${scenario.id}`);
    ids.add(scenario.id);
    assert.ok(scenario.prompt?.length > 0, scenario.id);
    assert.ok(Array.isArray(scenario.must_preserve) && scenario.must_preserve.length > 0, scenario.id);
    assert.equal(typeof scenario.allow_unchanged, "boolean", scenario.id);
  }

  const periphrasis = scenarios.find((scenario) => scenario.id === "periphrasis-with-modality");
  assert.ok(periphrasis, "periphrasis scenario must exist");
  // Collapsing "it is possible that saving may become slower" must not drop "may".
  assert.ok(periphrasis.must_preserve.includes("may"), "must pin the modality the collapse could drop");
  assert.equal(periphrasis.allow_unchanged, false);
});
