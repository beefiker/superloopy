import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, realpathSync } from "node:fs";
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
  // Canonicalize so the path matches process.cwd() inside the spawned CLI:
  // on macOS tmpdir() lives under the /var -> /private/var symlink.
  const repo = realpathSync(await mkdtemp(join(tmpdir(), "superloopy-doctor-review-")));
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

test("doctor CLI falls back to CLI root from an unrelated Codex plugin project", async () => {
  const project = await mkdtemp(join(tmpdir(), "superloopy-doctor-foreign-"));
  await mkdir(join(project, ".codex-plugin"), { recursive: true });
  await writeFile(
    join(project, ".codex-plugin", "plugin.json"),
    JSON.stringify({ name: "some-other-plugin" }, null, 2),
    "utf8"
  );
  await mkdir(join(project, "src"), { recursive: true });
  await writeFile(join(project, "src", "cli.js"), "// unrelated plugin\n", "utf8");
  await writeFile(
    join(project, "package.json"),
    JSON.stringify({ name: "some-other-plugin" }, null, 2),
    "utf8"
  );

  const result = runCli(["doctor", "--json"], { cwd: project });

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  // Not Superloopy by package identity -> diagnose the installed CLI root, not this project.
  assert.equal(parsed.root, process.cwd());
  assert.equal(parsed.ok, true);
});

test("doctor CLI returns a structured skills failure when a SKILL.md is unreadable", async () => {
  const repo = await tempRepoCopy();
  const skillFile = join(repo, "skills", "superloopy-doctor", "SKILL.md");
  await rm(skillFile, { force: true });
  await mkdir(skillFile, { recursive: true });

  const result = runCli(["doctor", "--root", repo, "--json"]);

  assert.equal(result.status, 1, result.stderr);
  assert.equal(result.stderr, "");
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.checks.skills.ok, false);
  assert.match(parsed.checks.skills.message, /Unreadable skill files: .*superloopy-doctor/);
});
