import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";

// Each of these skills is loaded into context on every run, so its SKILL.md keeps only the rules every
// run needs and points at on-demand references for the rest. A reference the core never links is
// unreachable in practice, and a core that regrows past its budget defeats the split.
const BUDGETS = new Map([
  ["superloopy-loop", 1800],
  ["superloopy-research", 2500],
  ["superloopy-slides", 2500]
]);

for (const [name, budget] of BUDGETS) {
  test(`${name} SKILL.md stays within its word budget and links every reference`, async () => {
    const skill = (await readFile(`skills/${name}/SKILL.md`, "utf8")).replace(/\r\n?/gu, "\n");
    const words = skill.split(/\s+/u).filter(Boolean).length;
    assert.ok(words <= budget, `${name} SKILL.md is ${words} words; the budget is ${budget}`);

    const references = (await readdir(`skills/${name}/references`)).filter((file) => file.endsWith(".md"));
    assert.ok(references.length > 0, `${name} must keep its situational detail in references/`);
    for (const file of references) {
      assert.ok(skill.includes(`(references/${file})`), `${name} SKILL.md must link references/${file} with when to read it`);
    }
  });
}

// A paragraph moved from SKILL.md into references/ keeps its relative links, which then point one
// directory too deep; an agent following them finds nothing.
for (const name of BUDGETS.keys()) {
  test(`${name} SKILL.md and references resolve every relative link`, async () => {
    const files = [`skills/${name}/SKILL.md`, ...(await readdir(`skills/${name}/references`)).filter((file) => file.endsWith(".md")).map((file) => `skills/${name}/references/${file}`)];
    const broken = [];
    for (const file of files) {
      for (const [, target] of (await readFile(file, "utf8")).matchAll(/\]\(([^)\s]+)\)/gu)) {
        if (/^[a-z][a-z0-9+.-]*:|^#/iu.test(target)) continue;
        if (!existsSync(join(dirname(file), decodeURIComponent(target.split("#")[0])))) broken.push(`${file} -> ${target}`);
      }
    }
    assert.deepEqual(broken, []);
  });
}
