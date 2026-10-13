import assert from "node:assert/strict";
import test from "node:test";

import { failureSignature, normalizeFailureOutput } from "../src/failure-signature.js";

function failed(stdout, { status = 1, stderr = "" } = {}) {
  return { status, signal: null, stdout, stderr };
}

function sameFailure(left, right, command = ["npm", "test"]) {
  return failureSignature(command, left) === failureSignature(command, right);
}

test("run-to-run noise does not change a failure's signature", () => {
  const run = ({ time, clock, ms, pid, uuid, sha, tmp, addr, line, epoch, port, xcode }) => failed(
    `\u001b[31mnot ok 2 - totals\u001b[0m (${ms}ms)\r\n` +
    `${time} worker pid=${pid} port ${port} at ${addr} job ${uuid} build ${sha} epoch ${epoch} [${clock}]\n` +
    `Error: missing ${tmp}/out.json\n    at total (file:///repo/src/total.js:${line})\n` +
    `Executed 3 tests, with 1 failure (0 unexpected) in ${xcode} seconds\n` +
    "AssertionError: expected 3, received 4\n"
  );
  assert.ok(sameFailure(
    run({ time: "2026-10-13T04:12:55.123Z", clock: "04:12:55", ms: "9", pid: "812", uuid: "3f2b8c1e-9a4d-4e2b-8f11-0c9d2e7a6b55", sha: "4bb19dd", tmp: "/var/folders/ab/x_1/T/superloopy-AbC9", addr: "0x7ffee4b8", line: "12:5", epoch: "1760328775123", port: "53412", xcode: "0.012 (0.015)" }),
    run({ time: "2026-10-14T21:03:07.9+09:00", clock: "21:03:07", ms: "1234.5", pid: "40211", uuid: "0d9e8f7a-1b2c-4d3e-8f4a-5b6c7d8e9f00", sha: "ecf7d7c6604d", tmp: "/tmp/superloopy-Zq81", addr: "0x10a2", line: "14:9", epoch: "1760410987000", port: "61001", xcode: "0.034 (0.041)" })
  ));
});

test("a moved failure changes the signature", () => {
  const base = failed("not ok 3 - totals\nAssertionError: expected 3, received 4\n# pass 17\n# fail 1\n");
  assert.equal(sameFailure(base, failed("not ok 3 - totals\nAssertionError: expected 5, received 4\n# pass 17\n# fail 1\n")), false, "assertion value");
  assert.equal(sameFailure(failed("AssertionError: expected 12345, got 54321\n"), failed("AssertionError: expected 99999, got 11111\n")), false, "large assertion values");
  assert.equal(sameFailure(base, failed("not ok 3 - discounts\nAssertionError: expected 3, received 4\n# pass 17\n# fail 1\n")), false, "failing test");
  assert.equal(sameFailure(base, failed("not ok 3 - totals\nAssertionError: expected 3, received 4\n# pass 18\n# fail 0\n")), false, "pass/fail counts");
  assert.equal(sameFailure(base, failed(base.stdout, { status: 2 })), false, "exit status");
  assert.equal(failureSignature(["npm", "test"], base) === failureSignature(["npm", "run", "lint"], base), false, "command");
});

test("long output keeps one signature when earlier noise changes length", () => {
  // Earlier lines change length run to run (`9ms` vs `1009ms`); the signature window must
  // still land on the same normalized tail instead of shifting by those characters.
  const run = (duration) => failed(
    `${Array.from({ length: 3000 }, (_, index) => `ok ${index % 7} - case (${duration(index)}ms)`).join("\n")}\nnot ok - boom expected 3\n`
  );
  assert.ok(sameFailure(run((index) => index % 10), run((index) => 1000 + index)));
});

test("a single line longer than the window keeps its tail", () => {
  assert.equal(sameFailure(failed(`${"X".repeat(8300)}\n`), failed(`${"Y".repeat(8300)}\n`)), false, "trailing newline");
  assert.equal(sameFailure(failed("X".repeat(70000)), failed("Y".repeat(70000))), false, "no newline");
});

test("hostile output normalizes in linear time", () => {
  // A rule that fails late from many start positions inside one token goes quadratic: the
  // former Windows temp-path rule took ~1.1s on the first input. Linear rules take a few ms.
  const size = 64 * 1024;
  const hostile = {
    windowsDrives: "C:\\".repeat(size / 3),
    hexRun: "a1".repeat(size / 2),
    digitDots: "1.".repeat(size / 2),
    colonDigits: ":1".repeat(size / 2),
    ansiOpeners: "\u001b[".repeat(size / 2),
    labels: "pid ".repeat(size / 4)
  };
  for (const [name, text] of Object.entries(hostile)) {
    const started = performance.now();
    normalizeFailureOutput(text);
    assert.ok(performance.now() - started < 250, `${name} took too long`);
  }
});
