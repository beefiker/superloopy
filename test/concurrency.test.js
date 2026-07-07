import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { withFileLock } from "../src/store.js";

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
