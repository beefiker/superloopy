import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = "skills/superloopy-backend";
const referenceNames = [
  "architecture",
  "data-safety",
  "runtime-agents",
  "testing-and-operations",
  "upstream-notice",
];

async function read(path) {
  return (await readFile(path, "utf8")).replace(/\r\n?/gu, "\n");
}

test("backend skill routes a stack-neutral, bounded database workflow", async () => {
  // Read the router first so a missing skill produces a deterministic RED failure.
  const skill = await read(`${root}/SKILL.md`);
  const metadata = await read(`${root}/agents/openai.yaml`);
  const references = Object.fromEntries(
    await Promise.all(
      referenceNames.map(async (name) => [name, await read(`${root}/references/${name}.md`)]),
    ),
  );

  assert.match(skill, /^---\nname: superloopy-backend\ndescription: Use only after explicit Codex/mu);
  assert.match(skill, /\$superloopy:superloopy-backend/u);
  assert.match(skill, /\/superloopy:superloopy-backend/u);
  assert.match(skill, /stack-neutral/iu);
  assert.match(skill, /typed.*tool/isu);
  assert.match(skill, /least[- ]privilege/iu);
  assert.match(skill, /read-only/iu);
  assert.match(skill, /tenant/iu);
  assert.match(skill, /idempot/iu);
  assert.match(skill, /ambiguous/iu);
  assert.match(skill, /migration/iu);
  assert.match(skill, /SUPERLOOPY_EVIDENCE/u);
  assert.doesNotMatch(skill, /always use (PostgreSQL|TypeScript|Python|MongoDB)/iu);
  assert.doesNotMatch(metadata, /^policy:/mu);

  for (const name of referenceNames) {
    assert.match(
      skill,
      new RegExp(`\\(references/${name}\\.md\\)`, "u"),
      `SKILL.md must link directly to references/${name}.md`,
    );
  }

  const architecture = references.architecture;
  assert.match(architecture, /project.*discover/isu);
  assert.match(architecture, /system boundar/iu);
  assert.match(architecture, /API.*contract/isu);
  assert.match(architecture, /event.*contract/isu);
  assert.match(architecture, /consisten/iu);
  assert.match(architecture, /transaction/iu);
  assert.match(architecture, /idempot/iu);
  assert.match(architecture, /cach/iu);
  assert.match(architecture, /background/iu);
  assert.match(architecture, /compatib/iu);
  assert.match(architecture, /stack.*(?:preserv|restrain|neutral)/isu);

  const dataSafety = references["data-safety"];
  assert.match(dataSafety, /schema author/iu);
  assert.match(dataSafety, /least[- ]privilege/iu);
  assert.match(dataSafety, /tenant.*isolat/isu);
  assert.match(dataSafety, /parameter/iu);
  assert.match(dataSafety, /ambiguous/iu);
  assert.match(dataSafety, /expand[- ]and[- ]contract/iu);
  assert.match(dataSafety, /lock.*(?:resource|preflight)|(?:resource|preflight).*lock/isu);
  assert.match(dataSafety, /backup.*verif/isu);
  assert.match(dataSafety, /staged rollout/iu);
  assert.match(dataSafety, /rollback.*roll[- ]forward|roll[- ]forward.*rollback/isu);
  assert.match(dataSafety, /fail[- ]closed/iu);

  const runtimeAgents = references["runtime-agents"];
  for (const pattern of [
    /input schema/iu,
    /authorization context/iu,
    /tenant scope/iu,
    /allowlist/iu,
    /result schema/iu,
    /timeout/iu,
    /row.*payload.*cost.*limit/isu,
    /redact/iu,
    /audit event/iu,
    /idempot/iu,
    /error shape/iu,
  ]) {
    assert.match(runtimeAgents, pattern);
  }
  assert.match(runtimeAgents, /retriev.*(?:separate|distinct).*action|action.*(?:separate|distinct).*retriev/isu);
  assert.match(runtimeAgents, /retrieved records.*untrusted data/isu);
  assert.match(runtimeAgents, /approval.*(?:consequential|production).*write/isu);

  const testingAndOperations = references["testing-and-operations"];
  assert.match(testingAndOperations, /disposable.*real database/isu);
  assert.match(testingAndOperations, /contract.*integration.*migration.*failure/isu);
  assert.match(testingAndOperations, /observab/iu);
  assert.match(testingAndOperations, /trace.*audit/isu);
  assert.match(testingAndOperations, /bounded retr/iu);
  assert.match(testingAndOperations, /reconcil.*ambiguous/isu);
  assert.match(testingAndOperations, /performance evidence/iu);
  assert.match(testingAndOperations, /rollout/iu);
  assert.match(testingAndOperations, /recover/iu);
  assert.match(testingAndOperations, /completion report/iu);

  const upstreamNotice = references["upstream-notice"];
  assert.match(upstreamNotice, /https?:\/\//u);
  assert.match(upstreamNotice, /(?:pinned )?repository revision/iu);
  assert.match(upstreamNotice, /observed date/iu);
  assert.match(upstreamNotice, /content date/iu);
  assert.match(upstreamNotice, /license/iu);
  assert.match(upstreamNotice, /principle retained/iu);
  assert.match(upstreamNotice, /limitation/iu);
  assert.match(upstreamNotice, /independent prose; no copied code or text/iu);
  assert.match(upstreamNotice, /public.*(?:evidence|source).*not.*private.*practice/isu);
});
