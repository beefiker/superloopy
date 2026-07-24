import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { runUserPromptSubmitHook } from "../src/hooks.js";
import { bindLegacyLoop } from "../src/repository-binding.js";
import { createLoop, statusLoop } from "../src/loop.js";

const CLI = join(process.cwd(), "src", "cli.js");

async function repo(prefix = "superloopy-binding-") {
  return mkdtemp(join(tmpdir(), prefix));
}

test("new plans carry a valid version 2 repository binding", async () => {
  const root = await repo();
  const result = await createLoop(root, ["--brief", "Bind workspace"]);
  assert.equal(result.plan.version, 2);
  assert.match(result.plan.repositoryBinding.identity, /^[a-f0-9]{64}$/u);
});

test("CLI commands from a child directory reuse the canonical root plan", async () => {
  const root = await repo();
  await createLoop(root, ["--brief", "Child invocation"]);
  const child = join(root, "src", "nested");
  await mkdir(child, { recursive: true });
  const result = spawnSync(process.execPath, [CLI, "loop", "status", "--json"], { cwd: child, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).binding.status, "bound");
});

test("copied plan state reports mismatch and refuses CLI mutation", async () => {
  const source = await repo();
  const target = await repo("superloopy-binding-copy-");
  await createLoop(source, ["--brief", "Source"]);
  await mkdir(join(target, ".superloopy"), { recursive: true });
  await writeFile(join(target, ".superloopy", "goals.json"), await readFile(join(source, ".superloopy", "goals.json")));
  const status = await statusLoop(target);
  assert.equal(status.binding.status, "mismatch");
  const mutation = spawnSync(process.execPath, [CLI, "loop", "next", "--json"], { cwd: target, encoding: "utf8" });
  assert.equal(mutation.status, 1);
  assert.match(mutation.stderr, /repository is mismatch/i);
});

test("copied plan state refuses steering and engineer resume hooks", async () => {
  const source = await repo();
  const target = await repo("superloopy-binding-hooks-");
  await createLoop(source, ["--brief", "Source"]);
  await mkdir(join(target, ".superloopy"), { recursive: true });
  const copied = await readFile(join(source, ".superloopy", "goals.json"));
  const targetPlan = join(target, ".superloopy", "goals.json");
  await writeFile(targetPlan, copied);
  const steering = await runUserPromptSubmitHook({
    hook_event_name: "UserPromptSubmit",
    cwd: target,
    session_id: "thread-copy",
    turn_id: "turn-copy",
    prompt: 'SUPERLOOPY_STEER: {"kind":"add_goal","title":"Wrong repo","objective":"Do not add","rationale":"copied state","requestId":"copy-1"}'
  });
  const engineer = JSON.parse(await runUserPromptSubmitHook({
    hook_event_name: "UserPromptSubmit",
    cwd: target,
    prompt: "loopy continue"
  }));
  assert.equal(steering, "");
  assert.deepEqual(await readFile(targetPlan), copied);
  assert.match(engineer.hookSpecificOutput.additionalContext, /repository binding is mismatch/i);
});

test("legacy plans require explicit confined binding", async () => {
  const root = await repo();
  await createLoop(root, ["--brief", "Legacy"]);
  const path = join(root, ".superloopy", "goals.json");
  const plan = JSON.parse(await readFile(path, "utf8"));
  plan.version = 1;
  delete plan.repositoryBinding;
  await writeFile(path, `${JSON.stringify(plan, null, 2)}\n`);
  assert.equal((await statusLoop(root)).binding.status, "legacy_unbound");
  const result = await bindLegacyLoop(root, ["--confirm-current-root"]);
  assert.equal(result.plan.version, 2);
  assert.equal((await statusLoop(root)).binding.status, "bound");
});

test("legacy binding rejects escaping stored paths", async () => {
  const root = await repo();
  await createLoop(root, ["--brief", "Legacy"]);
  const path = join(root, ".superloopy", "goals.json");
  const plan = JSON.parse(await readFile(path, "utf8"));
  plan.version = 1;
  delete plan.repositoryBinding;
  plan.evidencePath = "../outside";
  await writeFile(path, `${JSON.stringify(plan, null, 2)}\n`);
  await assert.rejects(bindLegacyLoop(root, ["--confirm-current-root"]), /confined repository-relative path/i);
});
