import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { link, mkdir, mkdtemp, open, readFile, readdir, rename, rm, stat, symlink, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import { withFileLock } from "../src/store.js";
import { commitManagedAgentFiles, withManagedAgentInstallLocks } from "../src/managed-agents.js";

const STORE_URL = new URL("../src/store.js", import.meta.url).href;

// A child process that increments a counter file under withFileLock, with a sleep inside
// the critical section so an unguarded read-modify-write would reliably lose updates.
const CHILD = `
const { withFileLock } = await import(process.argv[2]);
const { readFileSync, writeFileSync } = await import("node:fs");
const counter = process.argv[1];
await withFileLock(counter, async () => {
  const value = Number(readFileSync(counter, "utf8"));
  await new Promise((resolve) => setTimeout(resolve, 25));
  writeFileSync(counter, String(value + 1));
});
`;

function runChild(counter) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--input-type=module", "-e", CHILD, counter, STORE_URL], { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`child exited ${code}`))));
  });
}

test("withFileLock serializes concurrent cross-process read-modify-write without lost updates", async () => {
  const dir = await mkdtemp(join(tmpdir(), "superloopy-lock-"));
  const counter = join(dir, "counter.txt");
  await writeFile(counter, "0", "utf8");

  await Promise.all([runChild(counter), runChild(counter), runChild(counter), runChild(counter), runChild(counter)]);

  // Without the lock the sleeping critical sections interleave and updates are lost; the
  // lock forces serialization so every increment lands.
  assert.equal(Number(await readFile(counter, "utf8")), 5);
});

test("withFileLock is re-entrant within a process (nested same-path does not deadlock)", async () => {
  const dir = await mkdtemp(join(tmpdir(), "superloopy-lock-"));
  const target = join(dir, "x.json");
  let inner = false;
  await withFileLock(target, async () => {
    await withFileLock(target, async () => {
      inner = true;
    });
  });
  assert.equal(inner, true);
});

test("withFileLock reclaims a stale lock instead of blocking forever", async () => {
  const dir = await mkdtemp(join(tmpdir(), "superloopy-lock-"));
  const target = join(dir, "y.json");
  await writeFile(`${target}.lock`, "999999 0\n", "utf8");
  let ran = false;
  await withFileLock(target, async () => {
    ran = true;
  }, { staleMs: -1, timeoutMs: 1000 });
  assert.equal(ran, true);
});

test("withFileLock reclaims a stale corrupt lock token", async () => {
  const dir = await mkdtemp(join(tmpdir(), "superloopy-lock-"));
  const target = join(dir, "corrupt.json");
  await writeFile(`${target}.lock`, "not-a-valid-lock-token\n", "utf8");
  let ran = false;
  await withFileLock(target, async () => {
    ran = true;
  }, { staleMs: -1, timeoutMs: 1000 });
  assert.equal(ran, true);
});

test("withFileLock fails closed when a fresh lock is held past the timeout", async () => {
  const dir = await mkdtemp(join(tmpdir(), "superloopy-lock-"));
  const target = join(dir, "z.json");
  await writeFile(`${target}.lock`, `${process.pid} ${Date.now()}\n`, "utf8");
  await assert.rejects(
    withFileLock(target, async () => "should not run", { staleMs: 60000, timeoutMs: 120, retryMs: 20 }),
    /Timed out acquiring lock/
  );
  // A live holder's lock must never be reclaimed/deleted by a waiter.
  assert.ok(existsSync(`${target}.lock`));
});

test("withFileLock release does not delete a successor token", async () => {
  const dir = await mkdtemp(join(tmpdir(), "superloopy-lock-"));
  const target = join(dir, "successor.json");
  await withFileLock(target, async () => {
    await writeFile(`${target}.lock`, "successor-token\n", "utf8");
  });
  assert.equal(await readFile(`${target}.lock`, "utf8"), "successor-token\n");
});

test("managed install locks abort when a target alias changes before mutation", async () => {
  const dir = await mkdtemp(join(tmpdir(), "superloopy-lock-alias-race-"));
  const firstRoot = join(dir, "first-root");
  const secondRoot = join(dir, "second-root");
  const aliasRoot = join(dir, "retargetable-root");
  await mkdir(firstRoot, { recursive: true });
  await mkdir(secondRoot, { recursive: true });
  await symlink(firstRoot, aliasRoot, process.platform === "win32" ? "junction" : "dir");
  let lockCalls = 0;
  let mutated = false;
  const withFileLock = async (_path, operation) => {
    lockCalls += 1;
    if (lockCalls === 2) {
      await rm(aliasRoot);
      await symlink(secondRoot, aliasRoot, process.platform === "win32" ? "junction" : "dir");
    }
    return operation();
  };

  await assert.rejects(withManagedAgentInstallLocks(
    join(aliasRoot, "agents"),
    join(dir, "state", "model-resolution.json"),
    async () => { mutated = true; },
    { withFileLock }
  ), /path changed while acquiring managed-agent locks/iu);

  assert.equal(mutated, false);
});

test("managed install operations stay on locked canonical paths after an alias retargets", async () => {
  const dir = await mkdtemp(join(tmpdir(), "superloopy-lock-alias-operation-"));
  const firstRoot = join(dir, "first-root");
  const secondRoot = join(dir, "second-root");
  const aliasRoot = join(dir, "retargetable-root");
  await mkdir(firstRoot, { recursive: true });
  await mkdir(secondRoot, { recursive: true });
  await symlink(firstRoot, aliasRoot, process.platform === "win32" ? "junction" : "dir");

  await withManagedAgentInstallLocks(
    join(aliasRoot, "agents"),
    join(aliasRoot, "state", "model-resolution.json"),
    async ({ targetDir, statePath }) => {
      await rm(aliasRoot);
      await symlink(secondRoot, aliasRoot, process.platform === "win32" ? "junction" : "dir");
      await mkdir(targetDir, { recursive: true });
      await mkdir(dirname(statePath), { recursive: true });
      await writeFile(join(targetDir, "franky.toml"), "locked target\n", "utf8");
      await writeFile(statePath, "locked state\n", "utf8");
    }
  );

  assert.equal(await readFile(join(firstRoot, "agents", "franky.toml"), "utf8"), "locked target\n");
  assert.equal(await readFile(join(firstRoot, "state", "model-resolution.json"), "utf8"), "locked state\n");
  assert.equal(existsSync(join(secondRoot, "agents", "franky.toml")), false);
  assert.equal(existsSync(join(secondRoot, "state", "model-resolution.json")), false);
});

test("managed rollback never deletes a same-content replacement inode", async () => {
  const dir = await mkdtemp(join(tmpdir(), "superloopy-inode-race-"));
  const target = join(dir, "franky.toml");
  const statePath = join(dir, "state", "model-resolution.json");
  await mkdir(dir, { recursive: true });
  await writeFile(target, "old\n", "utf8");
  let replacementIdentity;

  await assert.rejects(commitManagedAgentFiles([
    { name: "franky", target, status: "updated", content: "new\n", existingKind: "file", existing: "old\n" }
  ], statePath, {}, true, {
    writeState: async () => {
      const replacement = join(dir, "replacement.toml");
      await writeFile(replacement, "new\n", "utf8");
      replacementIdentity = await stat(replacement);
      await rename(replacement, target);
      throw new Error("injected state failure");
    }
  }), /rollback failed/u);

  const finalIdentity = await stat(target);
  assert.equal(await readFile(target, "utf8"), "new\n");
  assert.deepEqual([finalIdentity.dev, finalIdentity.ino], [replacementIdentity.dev, replacementIdentity.ino]);
});

test("managed rollback never deletes an in-place edit on the staged inode", async () => {
  const dir = await mkdtemp(join(tmpdir(), "superloopy-inode-edit-race-"));
  const target = join(dir, "franky.toml");
  const statePath = join(dir, "state", "model-resolution.json");
  const userEdit = "concurrent user edit\n";
  await writeFile(target, "old\n", "utf8");

  await assert.rejects(commitManagedAgentFiles([
    { name: "franky", target, status: "updated", content: "new\n", existingKind: "file", existing: "old\n" }
  ], statePath, {}, true, {
    writeState: async () => {
      await writeFile(target, userEdit, "utf8");
      throw new Error("injected state failure");
    }
  }), /rollback failed/u);

  assert.equal(await readFile(target, "utf8"), userEdit);
});

test("managed rollback preserves a replacement installed after target verification", async () => {
  const dir = await mkdtemp(join(tmpdir(), "superloopy-rollback-path-race-"));
  const target = join(dir, "franky.toml");
  const replacement = join(dir, "replacement.toml");
  const userContent = "concurrent replacement\n";
  let rollbackStarted = false;
  let replaced = false;
  await writeFile(target, "old\n", "utf8");

  await assert.rejects(commitManagedAgentFiles([
    { name: "franky", target, status: "updated", content: "new\n", existingKind: "file", existing: "old\n" }
  ], join(dir, "state.json"), {}, true, {
    writeState: async () => {
      rollbackStarted = true;
      throw new Error("injected state failure");
    },
    readFile: async (path, encoding) => {
      const content = await readFile(path, encoding);
      if (rollbackStarted && path === target && !replaced) {
        replaced = true;
        await writeFile(replacement, userContent, "utf8");
        await rename(replacement, target);
      }
      return content;
    }
  }), /rollback failed/u);

  assert.equal(replaced, true);
  assert.equal(await readFile(target, "utf8"), userContent);
});

test("managed rollback does not overwrite a file created before original restoration", async () => {
  const dir = await mkdtemp(join(tmpdir(), "superloopy-rollback-restore-race-"));
  const target = join(dir, "franky.toml");
  const userContent = "concurrent creation\n";
  let rollbackStarted = false;
  let created = false;
  await writeFile(target, "old\n", "utf8");

  await assert.rejects(commitManagedAgentFiles([
    { name: "franky", target, status: "updated", content: "new\n", existingKind: "file", existing: "old\n" }
  ], join(dir, "state.json"), {}, true, {
    writeState: async () => {
      rollbackStarted = true;
      throw new Error("injected state failure");
    },
    link: async (source, destination) => {
      if (rollbackStarted && destination === target && !created) {
        created = true;
        await writeFile(target, userContent, "utf8");
      }
      return link(source, destination);
    }
  }), /rollback failed/u);

  assert.equal(created, true);
  assert.equal(await readFile(target, "utf8"), userContent);
});

test("managed commit surfaces an old-backup cleanup failure", async () => {
  const dir = await mkdtemp(join(tmpdir(), "superloopy-backup-cleanup-"));
  const target = join(dir, "franky.toml");
  await writeFile(target, "old\n", "utf8");
  let unlinkCalls = 0;

  await assert.rejects(commitManagedAgentFiles([
    { name: "franky", target, status: "updated", content: "new\n", existingKind: "file", existing: "old\n" }
  ], join(dir, "state.json"), {}, true, {
    writeState: async () => {},
    unlink: async (path) => {
      unlinkCalls += 1;
      if (unlinkCalls === 2) throw Object.assign(new Error("injected cleanup failure"), { code: "EPERM" });
      return unlink(path);
    }
  }), /backup cleanup failed/u);

  assert.equal(await readFile(target, "utf8"), "new\n");
});

test("managed commit preserves an old backup edited through an open handle", async () => {
  const dir = await mkdtemp(join(tmpdir(), "superloopy-backup-edit-race-"));
  const target = join(dir, "franky.toml");
  const userEdit = "concurrent edit through open handle\n";
  await writeFile(target, "old\n", "utf8");
  const handle = await open(target, "r+");

  try {
    await assert.rejects(commitManagedAgentFiles([
      { name: "franky", target, status: "updated", content: "new\n", existingKind: "file", existing: "old\n" }
    ], join(dir, "state.json"), {}, true, {
      writeState: async () => {
        await handle.truncate(0);
        await handle.writeFile(userEdit, "utf8");
      }
    }), /backup.*changed|backup cleanup failed/iu);
  } finally {
    await handle.close();
  }

  assert.equal(await readFile(target, "utf8"), "new\n");
  const backups = (await readdir(dir)).filter((name) => name.startsWith(".franky.toml.") && name.endsWith(".tmp"));
  assert.equal(backups.length, 1);
  assert.equal(await readFile(join(dir, backups[0]), "utf8"), userEdit);
});

test("managed cleanup preserves a backup replacement installed after verification", async () => {
  const dir = await mkdtemp(join(tmpdir(), "superloopy-backup-path-race-"));
  const target = join(dir, "franky.toml");
  const replacement = join(dir, "replacement.toml");
  const userContent = "concurrent backup replacement\n";
  let stateWritten = false;
  let replaced = false;
  await writeFile(target, "old\n", "utf8");

  await assert.rejects(commitManagedAgentFiles([
    { name: "franky", target, status: "updated", content: "new\n", existingKind: "file", existing: "old\n" }
  ], join(dir, "state.json"), {}, true, {
    writeState: async () => { stateWritten = true; },
    readFile: async (path, encoding) => {
      const content = await readFile(path, encoding);
      if (stateWritten && path !== target && content === "old\n" && !replaced) {
        replaced = true;
        await writeFile(replacement, userContent, "utf8");
        await rename(replacement, path);
      }
      return content;
    }
  }), /backup cleanup failed/u);

  assert.equal(replaced, true);
  assert.equal(await readFile(target, "utf8"), "new\n");
  const backups = (await readdir(dir)).filter((name) => name.startsWith(".franky.toml.") && name.endsWith(".tmp"));
  assert.equal(backups.length, 1);
  assert.equal(await readFile(join(dir, backups[0]), "utf8"), userContent);
});
