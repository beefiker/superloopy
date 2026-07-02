import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

function runCli(args, options = {}) {
  return spawnSync(process.execPath, [join(process.cwd(), "src/cli.js"), ...args], {
    cwd: options.cwd ?? process.cwd(),
    encoding: "utf8",
    timeout: 10_000
  });
}

async function tempRepoCopy() {
  const repo = await mkdtemp(join(tmpdir(), "superloopy-doctor-review-"));
  const result = spawnSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr);
  for (const file of result.stdout.split("\n").filter(Boolean)) {
    const source = join(process.cwd(), file);
    if (!existsSync(source)) continue;
    const target = join(repo, file);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, await readFile(source));
  }
  spawnSync("git", ["init"], { cwd: repo, encoding: "utf8" });
  return repo;
}

test("doctor CLI reports a broken checkout manifest instead of silently falling back", async () => {
  const repo = await tempRepoCopy();
  await writeFile(
    join(repo, ".codex-plugin", "plugin.json"),
    JSON.stringify({ name: "not-superloopy", skills: "./skills/", hooks: [] }, null, 2),
    "utf8"
  );

  const result = runCli(["doctor", "--json"], { cwd: repo });

  assert.equal(result.status, 1, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.root, repo);
  assert.equal(parsed.checks.pluginManifest.ok, false);
  assert.match(parsed.checks.pluginManifest.message, /Plugin name must be superloopy/);
});

test("doctor CLI returns a structured skills failure when skills is not a directory", async () => {
  const repo = await tempRepoCopy();
  await rm(join(repo, "skills"), { recursive: true, force: true });
  await writeFile(join(repo, "skills"), "not a directory\n", "utf8");

  const result = runCli(["doctor", "--root", repo, "--json"]);

  assert.equal(result.status, 1, result.stderr);
  assert.equal(result.stderr, "");
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.checks.skills.ok, false);
  assert.match(parsed.checks.skills.message, /Unable to read skills directory/);
  assert.match(parsed.checks.skills.message, /Missing skill files: .*superloopy-doctor/);
});
