import { existsSync, readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const REQUIRED_SKILLS = [
  "humanize-korean",
  "superloopy-clone",
  "superloopy-doctor",
  "superloopy-frontend",
  "superloopy-loop",
  "superloopy-research",
  "superloopy-video"
];

export async function checkSkills(cwd) {
  const skillsDir = join(cwd, "skills");
  let readError = null;
  let entries = [];
  if (existsSync(skillsDir)) {
    try {
      entries = readdirSync(skillsDir, { withFileTypes: true });
    } catch (error) {
      readError = errorText(error);
    }
  }
  const skills = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const missing = new Set(
    REQUIRED_SKILLS
      .filter((name) => !skills.includes(name))
      .map((name) => `skills/${name}/SKILL.md`)
  );
  const invalid = [];
  const unreadable = [];

  for (const name of skills) {
    const path = join(skillsDir, name, "SKILL.md");
    if (!existsSync(path)) {
      missing.add(`skills/${name}/SKILL.md`);
      continue;
    }
    let content;
    try {
      content = await readFile(path, "utf8");
    } catch (error) {
      // A corrupt cache can have SKILL.md as a directory or otherwise unreadable;
      // report it as a structured skill problem rather than aborting the whole report.
      unreadable.push(`skills/${name}/SKILL.md (${errorText(error)})`);
      continue;
    }
    if (readSkillName(content) !== name) invalid.push(name);
  }

  const problems = [];
  if (readError !== null) problems.push(`Unable to read skills directory: ${readError}.`);
  if (missing.size > 0) problems.push(`Missing skill files: ${[...missing].sort().join(", ")}.`);
  if (unreadable.length > 0) problems.push(`Unreadable skill files: ${unreadable.sort().join(", ")}.`);
  if (invalid.length > 0) problems.push(`Invalid skill frontmatter: ${invalid.sort().join(", ")}.`);
  if (problems.length > 0) {
    return { ok: false, skills, requiredSkills: REQUIRED_SKILLS, message: problems.join(" ") };
  }
  return { ok: true, skills, requiredSkills: REQUIRED_SKILLS };
}

function readSkillName(content) {
  const lines = normalizeLineEndings(content).split("\n");
  if (lines[0] !== "---") return null;
  for (let index = 1; index < lines.length && lines[index] !== "---"; index += 1) {
    const match = /^name:\s*"?([^"]+)"?\s*$/u.exec(lines[index]);
    if (match) return match[1];
  }
  return null;
}

function normalizeLineEndings(content) {
  return content.replace(/\r\n?/gu, "\n");
}

function errorText(error) {
  return error instanceof Error ? error.message : String(error);
}
