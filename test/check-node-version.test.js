import assert from "node:assert/strict";
import test from "node:test";

import { unmetNodeEngine } from "../scripts/check-node-version.mjs";

test("unmetNodeEngine compares major, minor, and patch against a >= floor", () => {
  assert.equal(unmetNodeEngine(">=22.0.0", "v20.19.0"), true);
  assert.equal(unmetNodeEngine(">=22.0.0", "v22.0.0"), false);
  assert.equal(unmetNodeEngine(">=22.4.0", "v22.3.9"), true);
  assert.equal(unmetNodeEngine(">=22.4.0", "v24.0.0"), false);
  assert.equal(unmetNodeEngine(">=22", "v21.99.99"), true);
});

test("unmetNodeEngine rejects ranges it cannot evaluate instead of passing them", () => {
  assert.throws(() => unmetNodeEngine("^22.0.0", "v22.1.0"), /Unsupported engines.node range/);
});
