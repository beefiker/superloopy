import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import test from "node:test";

async function readSkill(name) {
  const path = `skills/${name}/SKILL.md`;
  const content = await readFile(path, "utf8");
  const frontmatter = extractSkillFrontmatter(content);
  return { path, content, frontmatter };
}

function extractSkillFrontmatter(content) {
  return content.replace(/\r\n?/gu, "\n").match(/^---\n([\s\S]*?)\n---/u)?.[1] ?? "";
}

test("skill frontmatter parser accepts CRLF line endings", () => {
  const frontmatter = extractSkillFrontmatter("---\r\nname: example\r\ndescription: test\r\n---\r\nbody\r\n");

  assert.match(frontmatter, /^name: example$/m);
  assert.match(frontmatter, /^description: test$/m);
});

test("plugin manifest exposes Superloopy skills and packaged opt-in hooks", async () => {
  const plugin = JSON.parse(await readFile(".codex-plugin/plugin.json", "utf8"));

  assert.equal(plugin.name, "superloopy");
  assert.equal(plugin.author.name, "beefiker");
  assert.equal(plugin.interface.displayName, "Superloopy");
  assert.equal(plugin.skills, "./skills/");
  assert(plugin.hooks.includes("./hooks/session-start.json"));
  assert(plugin.hooks.includes("./hooks/user-prompt-submit.json"));
  assert(plugin.hooks.includes("./hooks/pre-tool-use.json"));
  assert(plugin.interface.defaultPrompt.some((line) => /bootstraps the CLI wrapper/.test(line)));
  assert.ok(plugin.interface.defaultPrompt.length <= 3);
  assert.ok(plugin.interface.defaultPrompt.every((line) => line.length <= 128));
  assert.equal(plugin.hooks.includes("./hooks/stop.json"), true);
});

test("package metadata names author and GitHub topics", async () => {
  const pkg = JSON.parse(await readFile("package.json", "utf8"));

  assert.equal(pkg.author, "beefiker");
  for (const topic of ["codex-plugin", "ai-agents", "developer-tools", "workflow-automation", "evidence-gates"]) {
    assert.ok(pkg.keywords.includes(topic));
  }
});

test("subagent receipt hook covers Superloopy evidence-reporting agents", async () => {
  const hook = JSON.parse(await readFile("hooks/subagent-stop.json", "utf8"));
  const matcher = new RegExp(hook.hooks.SubagentStop[0].matcher);

  assert.equal(matcher.test("franky"), true);
  assert.equal(matcher.test("zoro"), true);
  assert.equal(matcher.test("usopp"), true);
  assert.equal(matcher.test("jinbe"), true);
  assert.equal(matcher.test("robin"), false);
});

test("repo marketplace exposes Superloopy plugin install entry", async () => {
  const marketplace = JSON.parse(await readFile(".agents/plugins/marketplace.json", "utf8"));
  const entry = marketplace.plugins.find((plugin) => plugin.name === "superloopy");

  assert.equal(marketplace.name, "beefiker");
  assert.equal(marketplace.interface.displayName, "Superloopy");
  assert.deepEqual(entry.source, { source: "local", path: "./" });
  assert.equal(entry.policy.installation, "AVAILABLE");
  assert.equal(entry.policy.authentication, "ON_INSTALL");
  assert.equal(entry.category, "Developer Tools");
});

test("Stop hook manifest routes to the Superloopy CLI", async () => {
  const hook = JSON.parse(await readFile("hooks/stop.json", "utf8"));
  const command = hook.hooks.Stop[0].hooks[0].command;

  assert.equal(command, 'node "${PLUGIN_ROOT}/src/cli.js" hook stop');
  assert.match(hook.hooks.Stop[0].hooks[0].statusMessage, /Continu/);
});

test("plugin packages Superloopy research and website-clone skills", async () => {
  const research = await readSkill("superloopy-research");
  const clone = await readSkill("superloopy-clone");

  assert.match(research.frontmatter, /^name: superloopy-research$/m);
  assert.match(research.frontmatter, /loopy research|deep research/i);
  assert.match(research.content, /SUPERLOOPY RESEARCH ENABLED/);
  assert.match(research.content, /EXPAND/);
  assert.match(research.content, /SUPERLOOPY_EVIDENCE/);
  assert.match(research.content, /\.superloopy\/evidence\/research/);

  assert.match(clone.frontmatter, /^name: superloopy-clone$/m);
  assert.match(clone.frontmatter, /loopy clone|website|reverse-engineer/i);
  assert.match(clone.content, /browser automation/i);
  assert.match(clone.content, /component spec/i);
  assert.match(clone.content, /Visual QA/i);
  assert.match(clone.content, /SUPERLOOPY_EVIDENCE/);

  for (const name of ["superloopy-research", "superloopy-clone", "superloopy-frontend"]) {
    assert.equal(existsSync(`skills/${name}/agents/openai.yaml`), true);
    const metadata = await readFile(`skills/${name}/agents/openai.yaml`, "utf8");
    assert.match(metadata, /display_name:/);
    assert.match(metadata, /short_description:/);
    assert.match(metadata, /default_prompt:/);
  }
});

test("plugin packages the Superloopy frontend skill with auto-activation and gates", async () => {
  const frontend = await readSkill("superloopy-frontend");

  assert.match(frontend.frontmatter, /^name: superloopy-frontend$/m);
  assert.match(frontend.frontmatter, /MUST USE for ANY frontend/i);
  assert.match(frontend.frontmatter, /Auto-activates/i);
  assert.match(frontend.content, /SUPERLOOPY FRONTEND ENABLED/);
  assert.match(frontend.content, /DESIGN\.md/);
  assert.match(frontend.content, /anti-slop/i);
  assert.match(frontend.content, /SUPERLOOPY_EVIDENCE/);
  assert.match(frontend.content, /\.superloopy\/evidence\/frontend/);

  const antiSlop = await readFile("skills/superloopy-frontend/references/anti-slop.md", "utf8");
  assert.match(antiSlop, /Pre-Flight checklist/i);
  assert.match(antiSlop, /em-dash/i);

  const designSystem = await readFile("skills/superloopy-frontend/references/design-system.md", "utf8");
  assert.match(designSystem, /7 sections|7-section/i);
});

test("clone skill preserves exact extraction pipeline and crew dispatch guardrails", async () => {
  const clone = await readSkill("superloopy-clone");

  for (const pattern of [
    /docs\/research\/<hostname>\//,
    /docs\/design-references\/<hostname>\//,
    /getComputedStyle\(\)/,
    /scripts\/download-assets\.mjs/,
    /Asset Discovery Script Pattern/i,
    /Layered assets/i,
    /video.*Lottie.*canvas/is,
    /scroll before click/i,
    /Pre-Dispatch Checklist/,
    /150 lines/,
    /loopy team.*full-crew clone/is,
    /plain `loopy clone`.*solo/is,
    /superloopy loop handoff/,
    /superloopy loop fleet --json/,
    /nami.*franky.*usopp.*zoro.*robin.*jinbe/is,
    /Do not.*similar.*redraw/is
  ]) {
    assert.match(clone.content, pattern);
  }
});

test("plugin packages the Superloopy Korean humanizer skill with measurable safeguards", async () => {
  const skill = await readSkill("humanize-korean");

  assert.match(skill.frontmatter, /^name: humanize-korean$/m);
  assert.match(skill.frontmatter, /AI 티|humanize Korean|번역투/u);
  assert.match(skill.content, /SUPERLOOPY HUMANIZE KOREAN ENABLED/);
  assert.match(skill.content, /references\/quick-rules\.md/);
  assert.match(skill.content, /audit-humanize-output\.mjs/);
  assert.match(skill.content, /SUPERLOOPY_EVIDENCE/);

  for (const file of [
    "skills/humanize-korean/agents/openai.yaml",
    "skills/humanize-korean/references/quick-rules.md",
    "skills/humanize-korean/references/quality-rubric.md",
    "skills/humanize-korean/references/upstream-notice.md",
    "skills/humanize-korean/scripts/audit-humanize-output.mjs"
  ]) {
    assert.equal(existsSync(file), true);
  }
});
