import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { chmod, link, mkdir, mkdtemp, open, readFile, readdir, rename, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const root = "skills/superloopy-backend";
const boundReport = (id, content) => `<!-- superloopy-backend-report-id: ${id.toLowerCase()} -->\n${content}`;
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

async function removePublishedTestTree(path) {
  await chmod(path, 0o700).catch(() => {});
  for (const entry of await readdir(path, { withFileTypes: true }).catch(() => [])) {
    if (entry.isDirectory()) await removePublishedTestTree(join(path, entry.name));
  }
  await rm(path, { recursive: true, force: true });
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
  assert.match(
    skill,
    /write-evidence-report\.mjs" write "<project-root>" "<active-evidence-root>" "<qualified-report-id>"/su,
  );
  assert.match(skill, /standard input/iu);
  assert.match(skill, /names one attempt/u, "report ids must be scoped to one attempt");
  assert.match(skill, /-attempt-2/u);
  assert.match(skill, /`recover` only for the invocation whose receipt was lost/u);
  assert.match(skill, /Redact credentials, connection strings, tokens/u);
  assert.match(skill, /another active Superloopy mode mandates its own first line/u);
  assert.match(skill, /hard-link/u);
  assert.match(skill, /never write the target path directly/u);
  assert.doesNotMatch(skill, /ai-db-backend-skill-20260805/u);
  assert.doesNotMatch(skill, /always use (PostgreSQL|TypeScript|Python|MongoDB)/iu);
  assert.match(metadata, /^policy:$/mu, "explicit-only activation must be enforced by metadata policy");
  assert.match(metadata, /^ {2}allow_implicit_invocation: false$/mu);
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
  t.after(() => removePublishedTestTree(sandbox));

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
  assert.equal(await readFile(join(sandbox, firstPath), "utf8"), boundReport("goal-g001-criterion-c001-worker-franky", "# Backend report\n\nworker: franky\n"));
  const firstDirectory = join(sandbox, ".superloopy/evidence/superloopy-backend/goal-g001-criterion-c001-worker-franky");
  if (process.platform !== "win32") {
    assert.notEqual(statSync(firstDirectory).mode & 0o200, 0, "published report directory must stay writable for ordinary cleanup");
    assert.equal(statSync(join(sandbox, firstPath)).mode & 0o222, 0, "published report file must be read-only");
  }

  const recovered = spawnSync(process.execPath, [
    helper,
    "recover",
    ".",
    ".superloopy/evidence",
    "goal-g001-criterion-c001-worker-franky",
  ], { cwd: sandbox, encoding: "utf8" });
  assert.equal(recovered.status, 0, recovered.stderr);
  assert.equal(recovered.stdout.trim(), firstPath);

  if (process.platform !== "win32") {
    const publicationRoot = join(sandbox, ".superloopy/evidence/superloopy-backend");
    await chmod(publicationRoot, 0o755);
    const writableRootRecovery = spawnSync(process.execPath, [
      helper, "recover", ".", ".superloopy/evidence", "goal-g001-criterion-c001-worker-franky",
    ], { cwd: sandbox, encoding: "utf8" });
    assert.equal(writableRootRecovery.status, 0, writableRootRecovery.stderr);
    assert.equal(writableRootRecovery.stdout.trim(), firstPath);

    const probe = await open(join(sandbox, "recovery-directory-sync-probe"), "wx");
    const fileHandlePrototype = Object.getPrototypeOf(probe);
    await probe.close();
    const originalSync = fileHandlePrototype.sync;
    let recoveryDirectorySyncs = 0;
    fileHandlePrototype.sync = async function trackRecoveryDirectorySync() {
      if ((await this.stat()).isDirectory()) recoveryDirectorySyncs += 1;
      return originalSync.call(this);
    };
    try {
      const helperModule = await import(pathToFileURL(helper));
      assert.equal(
        await helperModule.recoverBackendEvidenceReport({
          projectRoot: sandbox,
          evidenceRoot: ".superloopy/evidence",
          reportId: "goal-g001-criterion-c001-worker-franky",
        }),
        firstPath,
      );
    } finally {
      fileHandlePrototype.sync = originalSync;
    }
    assert.equal(recoveryDirectorySyncs, 2, "recovery must sync the published report directory and its parent");
  }

  const incompleteAnchor = join(sandbox, ".incomplete-report.scrub");
  await link(join(sandbox, firstPath), incompleteAnchor);
  const linkedRecovery = spawnSync(process.execPath, [
    helper,
    "recover",
    ".",
    ".superloopy/evidence",
    "goal-g001-criterion-c001-worker-franky",
  ], { cwd: sandbox, encoding: "utf8" });
  assert.notEqual(linkedRecovery.status, 0);
  assert.match(linkedRecovery.stderr, /committed|hard link|link count/iu);
  await rm(incompleteAnchor);

  // Only Windows finalizes after the rename commit point, so only Windows crash states are
  // repairable; on POSIX a writable or extra-linked committed report is post-publication
  // interference and must fail closed instead of being repaired into a certifiable state.
  const crashedAnchor = join(sandbox, ".superloopy/evidence/superloopy-backend/.goal-g001-criterion-c001-worker-franky.1234.5.abc.tmp.scrub");
  await chmod(join(sandbox, firstPath), 0o644);
  await link(join(sandbox, firstPath), crashedAnchor);
  if (process.platform !== "win32") {
    const laundered = spawnSync(process.execPath, [
      helper, "recover", ".", ".superloopy/evidence", "goal-g001-criterion-c001-worker-franky",
    ], { cwd: sandbox, encoding: "utf8" });
    assert.notEqual(laundered.status, 0, "POSIX recover must never repair a writable report");
    assert.match(laundered.stderr, /hard links|writable/iu);
    assert.equal(existsSync(crashedAnchor), true, "POSIX recover must not delete anchor-named user hard links");
  }
  const repairHelper = await import(pathToFileURL(helper));
  const repairPlatform = Object.getOwnPropertyDescriptor(process, "platform");
  Object.defineProperty(process, "platform", { ...repairPlatform, value: "win32" });
  try {
    assert.equal(await repairHelper.recoverBackendEvidenceReport({
      projectRoot: sandbox, evidenceRoot: ".superloopy/evidence", reportId: "goal-g001-criterion-c001-worker-franky",
    }), firstPath);
  } finally {
    Object.defineProperty(process, "platform", repairPlatform);
  }
  assert.equal(existsSync(crashedAnchor), false, "Windows recover must remove the crashed same-inode scrub anchor");
  assert.equal(statSync(join(sandbox, firstPath)).mode & 0o222, 0, "Windows recover must restore the read-only report mode");

  // A hard pre-commit crash leaves this report's staging directory behind; recover sweeps it
  // under the lock once its recorded owner PID is provably dead.
  const deadPid = spawnSync(process.execPath, ["-e", ""], { encoding: "utf8" }).pid;
  const crashedStage = join(sandbox, `.superloopy/evidence/superloopy-backend/.goal-g001-criterion-c001-worker-franky.${deadPid}.5.abc.tmp`);
  await mkdir(crashedStage, { recursive: true });
  await writeFile(join(crashedStage, "backend-skill-report.md"), "torn staging content\n", "utf8");
  const sweptRecovery = spawnSync(process.execPath, [
    helper, "recover", ".", ".superloopy/evidence", "goal-g001-criterion-c001-worker-franky",
  ], { cwd: sandbox, encoding: "utf8" });
  assert.equal(sweptRecovery.status, 0, sweptRecovery.stderr);
  assert.equal(existsSync(crashedStage), false, "recover must sweep this report's dead-owner staging directory");

  const missingRecovery = spawnSync(process.execPath, [
    helper,
    "recover",
    ".",
    ".superloopy/evidence",
    "run-missing-report",
  ], { cwd: sandbox, encoding: "utf8" });
  assert.notEqual(missingRecovery.status, 0);
  assert.match(missingRecovery.stderr, /does not exist/iu);

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
  assert.match(duplicate.stderr, /new attempt id/u, "the duplicate error must steer re-attempts away from recover");
  assert.equal(await readFile(join(sandbox, firstPath), "utf8"), boundReport("goal-g001-criterion-c001-worker-franky", "# Backend report\n\nworker: franky\n"));

  const child = join(sandbox, "packages", "api");
  await mkdir(child, { recursive: true });
  const ghostSession = spawnSync(process.execPath, [
    helper, "write", sandbox, ".superloopy/sessions/ghost-session/evidence", "goal-g001-criterion-c001-worker-usopp",
  ], { cwd: child, encoding: "utf8", input: "# Report into a session no loop created\n" });
  assert.notEqual(ghostSession.status, 0, "a scoped root must name an existing session");
  assert.match(ghostSession.stderr, /no existing session/iu);
  assert.equal(existsSync(join(sandbox, ".superloopy", "sessions", "ghost-session")), false);
  const ghostRecovery = spawnSync(process.execPath, [
    helper, "recover", sandbox, ".superloopy/sessions/ghost-session/evidence", "goal-g001-criterion-c001-worker-usopp",
  ], { cwd: child, encoding: "utf8" });
  assert.notEqual(ghostRecovery.status, 0, "recover must not certify evidence in a session no gate reads");
  assert.match(ghostRecovery.stderr, /no existing session/iu);

  await mkdir(join(sandbox, ".superloopy", "sessions", "session-1"), { recursive: true });
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
  assert.equal(await readFile(join(sandbox, secondPath), "utf8"), boundReport("goal-g001-criterion-c001-worker-usopp", "# Backend report\n\nworker: usopp\n"));
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

  const helperModule = await import(pathToFileURL(helper));
  const concurrentPaths = await Promise.all([
    helperModule.writeBackendEvidenceReport({ projectRoot: sandbox, evidenceRoot: ".superloopy/evidence", reportId: "run-concurrent-one", content: "# Concurrent one\n" }),
    helperModule.writeBackendEvidenceReport({ projectRoot: sandbox, evidenceRoot: ".superloopy/evidence", reportId: "run-concurrent-two", content: "# Concurrent two\n" }),
  ]);
  assert.equal(new Set(concurrentPaths).size, 2);

  const enclosingGit = await mkdtemp(join(tmpdir(), "superloopy-backend-enclosing-git-"));
  t.after(() => removePublishedTestTree(enclosingGit));
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
    boundReport("run-20260810t104000z-api", "# First standalone report\n"),
  );
  assert.equal(existsSync(join(freshChild, ".superloopy")), false);
});

test("Windows recovery rejects swapped qualified report directories", async (t) => {
  const helper = join(process.cwd(), root, "scripts/write-evidence-report.mjs");
  const helperModule = await import(pathToFileURL(helper));
  const sandbox = await mkdtemp(join(tmpdir(), "superloopy-backend-windows-swap-"));
  const platformDescriptor = Object.getOwnPropertyDescriptor(process, "platform");
  t.after(() => removePublishedTestTree(sandbox));
  Object.defineProperty(process, "platform", { ...platformDescriptor, value: "win32" });

  try {
    await helperModule.writeBackendEvidenceReport({
      projectRoot: sandbox,
      evidenceRoot: ".superloopy/evidence",
      reportId: "run-windows-one",
      content: "# Windows report one\n",
    });
    await helperModule.writeBackendEvidenceReport({
      projectRoot: sandbox,
      evidenceRoot: ".superloopy/evidence",
      reportId: "run-windows-two",
      content: "# Windows report two\n",
    });
    const publicationRoot = join(sandbox, ".superloopy/evidence/superloopy-backend");
    const firstDirectory = join(publicationRoot, "run-windows-one");
    const secondDirectory = join(publicationRoot, "run-windows-two");
    const swapDirectory = join(publicationRoot, "run-windows-swap");
    await rename(firstDirectory, swapDirectory);
    await rename(secondDirectory, firstDirectory);
    await rename(swapDirectory, secondDirectory);

    await assert.rejects(
      helperModule.recoverBackendEvidenceReport({
        projectRoot: sandbox,
        evidenceRoot: ".superloopy/evidence",
        reportId: "run-windows-one",
      }),
      /binding|identity|report id/iu,
    );
  } finally {
    Object.defineProperty(process, "platform", platformDescriptor);
  }
});

test("backend evidence publication preserves shared publication-root permissions", async (t) => {
  if (process.platform === "win32") return t.skip("POSIX special mode bits are not available on Windows");
  const helperModule = await import(pathToFileURL(join(process.cwd(), root, "scripts/write-evidence-report.mjs")));
  const sandbox = await mkdtemp(join(tmpdir(), "superloopy-backend-setgid-"));
  const publicationRoot = join(sandbox, ".superloopy/evidence/superloopy-backend");
  t.after(() => removePublishedTestTree(sandbox));
  await mkdir(publicationRoot, { recursive: true });
  await chmod(publicationRoot, 0o2770);

  await helperModule.writeBackendEvidenceReport({
    projectRoot: sandbox, evidenceRoot: ".superloopy/evidence", reportId: "run-setgid", content: "setgid-preserving report\n",
  });
  assert.equal(statSync(publicationRoot).mode & 0o7777, 0o2770);

  await helperModule.writeBackendEvidenceReport({
    projectRoot: sandbox, evidenceRoot: ".superloopy/evidence", reportId: "run-setgid-two", content: "second shared report\n",
  });
  assert.equal(statSync(publicationRoot).mode & 0o7777, 0o2770);
});

test("backend evidence helper rejects unsafe roots, targets, identifiers, and blank reports", {
  skip: process.platform === "win32" ? "file symlink creation is not reliably available on Windows CI" : false,
}, async (t) => {
  const repoRoot = process.cwd();
  const helper = join(repoRoot, root, "scripts/write-evidence-report.mjs");
  const sandbox = await mkdtemp(join(tmpdir(), "superloopy-backend-evidence-symlink-"));
  const outside = await mkdtemp(join(tmpdir(), "superloopy-backend-evidence-outside-"));
  t.after(() => removePublishedTestTree(sandbox));
  t.after(() => removePublishedTestTree(outside));

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

  const escapedReportDirectory = join(outside, "evidence/superloopy-backend/run-external");
  await mkdir(escapedReportDirectory, { recursive: true });
  await writeFile(join(escapedReportDirectory, "backend-skill-report.md"), "external report\n", "utf8");
  await chmod(join(escapedReportDirectory, "backend-skill-report.md"), 0o444);
  await chmod(escapedReportDirectory, 0o555);
  await chmod(dirname(escapedReportDirectory), 0o555);
  const escapedRecovery = spawnSync(process.execPath, [
    helper, "recover", ".", ".superloopy/evidence", "run-external",
  ], { cwd: sandbox, encoding: "utf8" });
  assert.notEqual(escapedRecovery.status, 0);
  assert.match(escapedRecovery.stderr, /must not cross a symlink/u);
  assert.equal(existsSync(join(outside, "evidence-publication.lock")), false, "recovery must validate confinement before creating its lock");

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
