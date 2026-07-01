import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { syncVersion } from "../scripts/sync-version.mjs";

test("syncVersion stamps package and plugin manifests from the authoritative root version", async () => {
  const repo = await mkdtemp(join(tmpdir(), "superloopy-sync-version-"));
  await mkdir(join(repo, ".codex-plugin"), { recursive: true });
  await writeFile(join(repo, "package.json"), `${JSON.stringify({ name: "superloopy", version: "0.2.0" }, null, 2)}\n`);
  await writeFile(
    join(repo, "package-lock.json"),
    `${JSON.stringify({ name: "superloopy", version: "0.1.0", packages: { "": { name: "superloopy", version: "0.1.0" } } }, null, 2)}\n`
  );
  await writeFile(join(repo, ".codex-plugin", "plugin.json"), `${JSON.stringify({ name: "superloopy", version: "0.1.0" }, null, 2)}\n`);

  const result = await syncVersion({ repoRoot: repo });

  assert.equal(result.version, "0.2.0");
  assert.deepEqual(result.changed, [join(repo, ".codex-plugin", "plugin.json"), join(repo, "package-lock.json")]);
  assert.equal(JSON.parse(await readFile(join(repo, "package.json"), "utf8")).version, "0.2.0");
  const packageLock = JSON.parse(await readFile(join(repo, "package-lock.json"), "utf8"));
  assert.equal(packageLock.version, "0.2.0");
  assert.equal(packageLock.packages[""].version, "0.2.0");
  assert.equal(JSON.parse(await readFile(join(repo, ".codex-plugin", "plugin.json"), "utf8")).version, "0.2.0");
});

test("syncVersion honors an explicit release version", async () => {
  const repo = await mkdtemp(join(tmpdir(), "superloopy-sync-version-explicit-"));
  await mkdir(join(repo, ".codex-plugin"), { recursive: true });
  await writeFile(join(repo, "package.json"), `${JSON.stringify({ name: "superloopy", version: "0.1.0" }, null, 2)}\n`);
  await writeFile(
    join(repo, "package-lock.json"),
    `${JSON.stringify({ name: "superloopy", version: "0.1.0", packages: { "": { name: "superloopy", version: "0.1.0" } } }, null, 2)}\n`
  );
  await writeFile(join(repo, ".codex-plugin", "plugin.json"), `${JSON.stringify({ name: "superloopy", version: "0.1.0" }, null, 2)}\n`);

  const result = await syncVersion({ repoRoot: repo, version: "0.3.0" });

  assert.equal(result.version, "0.3.0");
  assert.equal(JSON.parse(await readFile(join(repo, "package.json"), "utf8")).version, "0.3.0");
  const packageLock = JSON.parse(await readFile(join(repo, "package-lock.json"), "utf8"));
  assert.equal(packageLock.version, "0.3.0");
  assert.equal(packageLock.packages[""].version, "0.3.0");
  assert.equal(JSON.parse(await readFile(join(repo, ".codex-plugin", "plugin.json"), "utf8")).version, "0.3.0");
});

test("syncVersion stamps the Claude plugin manifest and the marketplace plugins[].version", async () => {
  const repo = await mkdtemp(join(tmpdir(), "superloopy-sync-version-claude-"));
  await mkdir(join(repo, ".codex-plugin"), { recursive: true });
  await mkdir(join(repo, ".claude-plugin"), { recursive: true });
  await writeFile(join(repo, "package.json"), `${JSON.stringify({ name: "superloopy", version: "0.4.0" }, null, 2)}\n`);
  await writeFile(join(repo, ".codex-plugin", "plugin.json"), `${JSON.stringify({ name: "superloopy", version: "0.1.0" }, null, 2)}\n`);
  await writeFile(join(repo, ".claude-plugin", "plugin.json"), `${JSON.stringify({ name: "superloopy", version: "0.1.0" }, null, 2)}\n`);
  await writeFile(
    join(repo, ".claude-plugin", "marketplace.json"),
    `${JSON.stringify({ name: "beefiker", plugins: [{ name: "superloopy", version: "0.1.0" }] }, null, 2)}\n`
  );

  const result = await syncVersion({ repoRoot: repo });

  assert.equal(result.version, "0.4.0");
  assert.ok(result.changed.includes(join(repo, ".claude-plugin", "plugin.json")));
  assert.ok(result.changed.includes(join(repo, ".claude-plugin", "marketplace.json")));
  assert.equal(JSON.parse(await readFile(join(repo, ".claude-plugin", "plugin.json"), "utf8")).version, "0.4.0");
  const marketplace = JSON.parse(await readFile(join(repo, ".claude-plugin", "marketplace.json"), "utf8"));
  assert.equal(marketplace.plugins[0].version, "0.4.0");

  // Idempotent: a second run makes no further changes.
  const again = await syncVersion({ repoRoot: repo });
  assert.doesNotMatch(JSON.stringify(again.changed), /marketplace\.json/);
});
