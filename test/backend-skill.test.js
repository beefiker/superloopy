import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
  assert.match(skill, /active.*evidence root/isu);
  assert.match(skill, /standalone.*evidence/isu);
  assert.match(skill, /qualified.*report id|report id.*qualified/isu);
  assert.match(skill, /write-evidence-report\.mjs/u);
  assert.match(skill, /write-evidence-report\.mjs.*<project-root>/su);
  assert.match(skill, /standard input/iu);
  assert.doesNotMatch(skill, /ai-db-backend-skill-20260805/u);
  assert.doesNotMatch(skill, /always use (PostgreSQL|TypeScript|Python|MongoDB)/iu);
  assert.doesNotMatch(metadata, /^policy:/mu);
  assert.match(metadata, /Use `\$superloopy:superloopy-backend` only after explicit invocation/u);
  assert.doesNotMatch(metadata, /Use \$superloopy-backend\b/u);

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
  assert.match(dataSafety, /Production authority:.*not granted/isu);
  assert.match(dataSafety, /index.*materialized view.*partition.*expand[- ]and[- ]contract/isu);

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
  assert.match(upstreamNotice, /\| Grade \| Retrieval verdict \|/u);
  const sourceRows = upstreamNotice
    .split("\n")
    .filter((line) => line.startsWith("| ") && /https?:\/\//u.test(line));
  assert.ok(sourceRows.length > 0, "upstream notice must contain source rows");
  for (const row of sourceRows) {
    const columns = row.split("|").slice(1, -1).map((column) => column.trim());
    assert.equal(columns.length, 7, `source row must carry seven evidence fields: ${row}`);
    assert.match(columns[1], /\b[ABCDE]\b/u, `source row must carry a source grade: ${row}`);
    assert.match(columns[2], /\b(?:ok|partial|blocked|error|empty)\b/u, `source row must carry a retrieval verdict: ${row}`);
  }
  assert.match(upstreamNotice, /principle retained/iu);
  assert.match(upstreamNotice, /limitation/iu);
  assert.match(upstreamNotice, /independent prose; no copied code or text/iu);
  assert.match(upstreamNotice, /public.*(?:evidence|source).*not.*private.*practice/isu);
});

test("backend evidence helper writes distinct reports through the active evidence root", async (t) => {
  const repoRoot = process.cwd();
  const helper = join(repoRoot, root, "scripts/write-evidence-report.mjs");
  const sandbox = await mkdtemp(join(tmpdir(), "superloopy-backend-evidence-"));
  t.after(() => rm(sandbox, { recursive: true, force: true }));

  const first = spawnSync(process.execPath, [
    helper,
    "write",
    ".",
    ".superloopy/evidence",
    "goal-g001-criterion-c001-worker-franky",
  ], {
    cwd: sandbox,
    encoding: "utf8",
    input: "# Backend report\n\nworker: franky\n",
  });
  assert.equal(first.status, 0, first.stderr);
  const firstPath = first.stdout.trim();
  assert.equal(
    firstPath,
    ".superloopy/evidence/superloopy-backend/goal-g001-criterion-c001-worker-franky/backend-skill-report.md",
  );
  assert.equal(await readFile(join(sandbox, firstPath), "utf8"), "# Backend report\n\nworker: franky\n");

  const duplicate = spawnSync(process.execPath, [
    helper,
    "write",
    ".",
    ".superloopy/evidence",
    "goal-g001-criterion-c001-worker-franky",
  ], {
    cwd: sandbox,
    encoding: "utf8",
    input: "# Replacement report\n",
  });
  assert.notEqual(duplicate.status, 0);
  assert.match(duplicate.stderr, /already exists/iu);
  assert.equal(await readFile(join(sandbox, firstPath), "utf8"), "# Backend report\n\nworker: franky\n");

  const child = join(sandbox, "packages", "api");
  await mkdir(child, { recursive: true });
  const second = spawnSync(process.execPath, [
    helper,
    "write",
    sandbox,
    ".superloopy/sessions/session-1/evidence",
    "goal-g001-criterion-c001-worker-usopp",
  ], {
    cwd: child,
    encoding: "utf8",
    input: "# Backend report\n\nworker: usopp\n",
  });
  assert.equal(second.status, 0, second.stderr);
  const secondPath = second.stdout.trim();
  assert.equal(
    secondPath,
    ".superloopy/sessions/session-1/evidence/superloopy-backend/goal-g001-criterion-c001-worker-usopp/backend-skill-report.md",
  );
  assert.equal(await readFile(join(sandbox, secondPath), "utf8"), "# Backend report\n\nworker: usopp\n");
  assert.equal(existsSync(join(child, ".superloopy")), false);
  assert.notEqual(firstPath, secondPath);

  const canonicalIds = spawnSync(process.execPath, [
    helper,
    "write",
    ".",
    ".superloopy/evidence",
    "goal-G002-criterion-C003-worker-Jinbe",
  ], {
    cwd: sandbox,
    encoding: "utf8",
    input: "# Backend report\n\ncanonical loop ids\n",
  });
  assert.equal(canonicalIds.status, 0, canonicalIds.stderr);
  assert.equal(
    canonicalIds.stdout.trim(),
    ".superloopy/evidence/superloopy-backend/goal-g002-criterion-c003-worker-jinbe/backend-skill-report.md",
  );
  assert.equal(
    (await readdir(join(sandbox, ".superloopy/evidence/superloopy-backend"))).some((name) => name.startsWith(".")),
    false,
  );

  const enclosingGit = await mkdtemp(join(tmpdir(), "superloopy-backend-enclosing-git-"));
  t.after(() => rm(enclosingGit, { recursive: true, force: true }));
  const initialized = spawnSync("git", ["init", "-q", enclosingGit], { encoding: "utf8" });
  assert.equal(initialized.status, 0, initialized.stderr);
  const freshProject = join(enclosingGit, "nested-non-git-project");
  const freshChild = join(freshProject, "packages", "api");
  await mkdir(freshChild, { recursive: true });
  const firstStandalone = spawnSync(process.execPath, [
    helper,
    "write",
    freshProject,
    ".superloopy/evidence",
    "run-20260810t104000z-api",
  ], {
    cwd: freshChild,
    encoding: "utf8",
    input: "# First standalone report\n",
  });
  assert.equal(firstStandalone.status, 0, firstStandalone.stderr);
  assert.equal(
    firstStandalone.stdout.trim(),
    ".superloopy/evidence/superloopy-backend/run-20260810t104000z-api/backend-skill-report.md",
  );
  assert.equal(
    await readFile(join(freshProject, firstStandalone.stdout.trim()), "utf8"),
    "# First standalone report\n",
  );
  assert.equal(existsSync(join(freshChild, ".superloopy")), false);
});

test("backend evidence helper rejects unsafe roots, targets, identifiers, and blank reports", {
  skip: process.platform === "win32" ? "file symlink creation is not reliably available on Windows CI" : false,
}, async (t) => {
  const repoRoot = process.cwd();
  const helper = join(repoRoot, root, "scripts/write-evidence-report.mjs");
  const sandbox = await mkdtemp(join(tmpdir(), "superloopy-backend-evidence-symlink-"));
  const outside = await mkdtemp(join(tmpdir(), "superloopy-backend-evidence-outside-"));
  t.after(() => rm(sandbox, { recursive: true, force: true }));
  t.after(() => rm(outside, { recursive: true, force: true }));

  await symlink(outside, join(sandbox, ".superloopy"));
  const escapedRoot = spawnSync(process.execPath, [
    helper,
    "write",
    ".",
    ".superloopy/evidence",
    "goal-g001-criterion-c001-worker-franky",
  ], { cwd: sandbox, encoding: "utf8", input: "must stay in repository\n" });
  assert.notEqual(escapedRoot.status, 0);
  assert.match(escapedRoot.stderr, /must not cross a symlink/u);
  assert.equal(existsSync(join(outside, "evidence")), false);

  await rm(join(sandbox, ".superloopy"));
  const reportDir = join(
    sandbox,
    ".superloopy/evidence/superloopy-backend/goal-g001-criterion-c001-worker-franky",
  );
  await mkdir(reportDir, { recursive: true });
  const outsideFile = join(outside, "owner-data.md");
  await writeFile(outsideFile, "owner data\n", "utf8");
  await symlink(outsideFile, join(reportDir, "backend-skill-report.md"));
  const linkedTarget = spawnSync(process.execPath, [
    helper,
    "write",
    ".",
    ".superloopy/evidence",
    "goal-g001-criterion-c001-worker-franky",
  ], { cwd: sandbox, encoding: "utf8", input: "replacement\n" });
  assert.notEqual(linkedTarget.status, 0);
  assert.match(linkedTarget.stderr, /must not cross a symlink|must not be a symlink/u);
  assert.equal(await readFile(outsideFile, "utf8"), "owner data\n");

  for (const [evidenceRoot, reportId, input] of [
    ["../evidence", "goal-g001", "report\n"],
    [".superloopy/evidence", "../escape", "report\n"],
    [".superloopy/evidence", "goal-g001", "  \n"],
  ]) {
    const rejected = spawnSync(process.execPath, [helper, "write", ".", evidenceRoot, reportId], {
      cwd: sandbox,
      encoding: "utf8",
      input,
    });
    assert.notEqual(rejected.status, 0, `${evidenceRoot} ${reportId}`);
    assert.doesNotMatch(rejected.stderr, /MODULE_NOT_FOUND/u);
  }
});
