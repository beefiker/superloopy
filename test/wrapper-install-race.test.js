import assert from "node:assert/strict";
import { symlinkSync, unlinkSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { installOneTextFile } from "../src/text-file-install.js";

test("wrapper install does not follow a symlink swapped in after validation", {
  skip: process.platform === "win32" ? "file symlink races are POSIX-only" : false
}, async (t) => {
  const root = await mkdtemp(join(tmpdir(), "superloopy-wrapper-race-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const target = join(root, "superloopy");
  const outside = join(root, "personal-wrapper");
  const personalWrapper = "personal wrapper\n";
  await writeFile(target, "# superloopy-generated bin shim\nold\n", "utf8");
  await writeFile(outside, personalWrapper, "utf8");

  const status = await installOneTextFile(target, "replacement\n", false, 0o755, {
    replaceIf: () => {
      unlinkSync(target);
      symlinkSync(outside, target);
      return true;
    }
  });

  assert.equal(await readFile(outside, "utf8"), personalWrapper);
  assert.equal(status, "conflict");
});

test("forced wrapper install does not follow a symlink swapped in after validation", {
  skip: process.platform === "win32" ? "file symlink races are POSIX-only" : false
}, async (t) => {
  const root = await mkdtemp(join(tmpdir(), "superloopy-wrapper-force-race-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const target = join(root, "superloopy");
  const outside = join(root, "personal-wrapper");
  const personalWrapper = "personal wrapper\n";
  await writeFile(target, "foreign wrapper\n", "utf8");
  await writeFile(outside, personalWrapper, "utf8");

  const status = await installOneTextFile(target, "replacement\n", true, 0o755, {
    beforeReplace: () => {
      unlinkSync(target);
      symlinkSync(outside, target);
    }
  });

  assert.equal(status, "conflict");
  assert.equal(await readFile(outside, "utf8"), personalWrapper);
});
