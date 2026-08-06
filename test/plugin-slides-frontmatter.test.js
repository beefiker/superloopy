import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function extractSkillFrontmatter(content) {
  return content.replace(/\r\n?/gu, "\n").match(/^---\n([\s\S]*?)\n---/u)?.[1] ?? "";
}

test("slides skill keeps core routing contexts in a YAML-safe description", async () => {
  const skill = await readFile("skills/superloopy-slides/SKILL.md", "utf8");
  const frontmatter = extractSkillFrontmatter(skill);
  const description = frontmatter.split("\n").find((line) => line.startsWith("description: ")) ?? "";

  assert.match(description, /^description: (?:(?:".*")|(?:'.*')|(?:[>|][-+]?))$/u);
  assert.match(frontmatter, /HTML (?:slides|slide decks)/iu);
  assert.match(frontmatter, /PowerPoint\/PPT\/PPTX/u);
  assert.match(frontmatter, /PDF (?:output|export)/iu);
  assert.match(frontmatter, /deploy/iu);
  assert.match(frontmatter, /not for general web pages or landing pages/iu);
});
