import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  defaultLoopOutputStyle,
  isSayItStraightEnabled,
  parseLoopOutputStyleControl,
  renderSayItStraightLoopOverlay,
  updateSayItStraightOutput
} from "../src/loop-output-style.js";
import { createLoop, statusLoop } from "../src/loop.js";
import { writePlan as persistPlan } from "../src/store.js";

const tempRepo = () => mkdtemp(join(tmpdir(), "superloopy-output-style-"));

test("new global and scoped loops default say-it-straight on", async () => {
  const repo = await tempRepo();
  const global = await createLoop(repo, ["--brief", "Ship"]);
  const scoped = await createLoop(repo, ["--session-id", "beta", "--brief", "Verify"]);
  assert.deepEqual(global.plan.outputStyle, { sayItStraight: true });
  assert.deepEqual(scoped.plan.outputStyle, { sayItStraight: true });
});

test("legacy plans without outputStyle read as enabled", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Legacy"]);
  const path = join(repo, ".superloopy", "goals.json");
  const plan = JSON.parse(await readFile(path, "utf8"));
  delete plan.outputStyle;
  await writeFile(path, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
  const before = await readFile(path, "utf8");
  assert.equal(isSayItStraightEnabled((await statusLoop(repo)).plan), true);
  assert.equal(await readFile(path, "utf8"), before);
  assert.equal(isSayItStraightEnabled({ outputStyle: { sayItStraight: false } }), false);
});

test("force replacement resets a disabled loop to enabled", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "First"]);
  await updateSayItStraightOutput(repo, undefined, false);
  const replacement = await createLoop(repo, ["--force", "--brief", "Second"]);
  assert.equal(isSayItStraightEnabled(replacement.plan), true);
});

test("manual controls accept only exact standalone English and Korean commands", () => {
  for (const prompt of ["say-it-straight off", "say-it-straight off.", "직설 모드 끄기", "직설 모드 끄기!"]) {
    assert.equal(parseLoopOutputStyleControl(prompt)?.enabled, false, prompt);
  }
  for (const prompt of ["say-it-straight on", "직설 모드 켜기?"]) {
    assert.equal(parseLoopOutputStyleControl(prompt)?.enabled, true, prompt);
  }
  for (const prompt of ["please say-it-straight off", "quote 'say-it-straight off'", "say-it-straight off now", "직설 모드 끄기를 문서화해줘"]) {
    assert.equal(parseLoopOutputStyleControl(prompt), null, prompt);
  }
});

test("a scoped update changes only that loop and appends a ledger event", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Global"]);
  await createLoop(repo, ["--session-id", "beta", "--brief", "Scoped"]);
  await updateSayItStraightOutput(repo, { sessionId: "beta" }, false);
  assert.equal(isSayItStraightEnabled((await statusLoop(repo)).plan), true);
  assert.equal(isSayItStraightEnabled((await statusLoop(repo, ["--session-id", "beta"])).plan), false);
  const ledger = await readFile(join(repo, ".superloopy", "sessions", "beta", "ledger.jsonl"), "utf8");
  assert.match(ledger, /"kind":"output_style_changed"/u);
  assert.match(ledger, /"sayItStraight":false/u);
});

test("a ledger failure restores the exact prior plan", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  const planPath = join(repo, ".superloopy", "goals.json");
  const before = await readFile(planPath, "utf8");
  await assert.rejects(
    updateSayItStraightOutput(repo, undefined, false, {
      appendLedger: async () => { throw new Error("ledger unavailable"); }
    }),
    (error) => error.outputStyleFailure?.priorRestored === true
  );
  assert.equal(await readFile(planPath, "utf8"), before);
  assert.doesNotMatch(await readFile(join(repo, ".superloopy", "ledger.jsonl"), "utf8"), /output_style_changed/u);
});

test("a rollback failure reports the actual persisted output style", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  let writes = 0;
  await assert.rejects(
    updateSayItStraightOutput(repo, undefined, false, {
      appendLedger: async () => { throw new Error("ledger unavailable"); },
      writePlan: async (...args) => {
        writes += 1;
        if (writes === 2) throw new Error("rollback unavailable");
        return await persistPlan(...args);
      }
    }),
    (error) => error.outputStyleFailure?.priorRestored === false
      && error.outputStyleFailure.effectiveEnabled === false
  );
  assert.equal((await statusLoop(repo)).plan.outputStyle.sayItStraight, false);
  assert.doesNotMatch(await readFile(join(repo, ".superloopy", "ledger.jsonl"), "utf8"), /output_style_changed/u);
});

test("the compact overlay preserves authority and artifact isolation", () => {
  const overlay = renderSayItStraightLoopOverlay(true);
  assert.match(overlay, /user-facing progress reports and final answers/u);
  assert.match(overlay, /Do not silently rewrite task artifacts/u);
  assert.match(overlay, /evidence, validation, and completion requirements/u);
  assert.equal(renderSayItStraightLoopOverlay(false), "");
  assert.deepEqual(defaultLoopOutputStyle(), { sayItStraight: true });
});
