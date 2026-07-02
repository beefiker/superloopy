import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

// Regression coverage for issue #14: `npm pack` always strips these repo-only files
// from the tarball, so a packed install legitimately lacks them while the file audit
// doc still lists their inventory rows. Doctor must not report the install as broken.
const NPM_PACK_STRIPPED = new Set([".gitignore", "package-lock.json"]);

// Mirrors an `npm pack` extract: every Git-visible file except the npm-stripped set,
// with no .git directory. Built by copy instead of running `npm pack` + `tar` so the
// test stays dependency-free on the Windows CI runners.
async function tempNpmPackedCopy(destination) {
  const repo = destination ?? await mkdtemp(join(tmpdir(), "superloopy-packed-"));
  const result = spawnSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr);
  for (const file of result.stdout.split("\n").filter(Boolean)) {
    if (NPM_PACK_STRIPPED.has(file)) continue;
    const source = join(process.cwd(), file);
    if (!existsSync(source)) continue;
    const target = join(repo, file);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, await readFile(source));
  }
  return repo;
}

test("doctor accepts an npm-packed install run from an arbitrary cwd", async () => {
  const packed = await tempNpmPackedCopy();
  const elsewhere = await mkdtemp(join(tmpdir(), "superloopy-elsewhere-"));

  const result = spawnSync(process.execPath, [join(packed, "src", "cli.js"), "doctor", "--json"], {
    cwd: elsewhere,
    encoding: "utf8",
    timeout: 30_000
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.checks.fileAudit.ok, true);
  assert.deepEqual(parsed.checks.fileAudit.staleRows, []);
});

// A packed install nested inside a user's Git repository (the npx/npm layout): the
// enclosing repo ignores node_modules/, so `git ls-files` run from the install root
// answers for the PARENT repo and reports no package files. Doctor must list the
// install's own filesystem instead of trusting the enclosing repo.
test("doctor accepts an npm-packed install nested inside a parent Git repository", async () => {
  const parent = await mkdtemp(join(tmpdir(), "superloopy-parent-"));
  const init = spawnSync("git", ["init"], { cwd: parent, encoding: "utf8" });
  assert.equal(init.status, 0, init.stderr);
  await writeFile(join(parent, ".gitignore"), "node_modules/\n", "utf8");
  const packed = join(parent, "node_modules", "superloopy");
  await mkdir(packed, { recursive: true });
  await tempNpmPackedCopy(packed);

  const result = spawnSync(process.execPath, [join(packed, "src", "cli.js"), "doctor", "--json"], {
    cwd: parent,
    encoding: "utf8",
    timeout: 30_000
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.checks.fileAudit.ok, true);
  assert.deepEqual(parsed.checks.fileAudit.staleRows, []);
  assert.equal(parsed.checks.runtimeBoundary.ok, true);
});
