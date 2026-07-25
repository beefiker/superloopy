import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { runStopHook, runUserPromptSubmitHook } from "../src/hooks.js";
import { bindLegacyLoop } from "../src/repository-binding.js";
import { createLoop, statusLoop } from "../src/loop.js";

const CLI = join(process.cwd(), "src", "cli.js");

async function repo(prefix = "superloopy-binding-") {
  return mkdtemp(join(tmpdir(), prefix));
}

async function withStopHookEnabled(fn) {
  const previous = process.env.SUPERLOOPY_STOP_HOOK;
  process.env.SUPERLOOPY_STOP_HOOK = "on";
  try {
    return await fn();
  } finally {
    if (previous === undefined) delete process.env.SUPERLOOPY_STOP_HOOK;
    else process.env.SUPERLOOPY_STOP_HOOK = previous;
  }
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

test("CLI discovers and binds a legacy plan created in a Git subdirectory", async () => {
  const root = await repo();
  spawnSync("git", ["init", "-q", root]);
  const packageRoot = join(root, "packages", "app");
  await mkdir(packageRoot, { recursive: true });
  await createLoop(packageRoot, ["--brief", "Legacy package"]);
  const path = join(packageRoot, ".superloopy", "goals.json");
  const plan = JSON.parse(await readFile(path, "utf8"));
  plan.version = 1;
  delete plan.repositoryBinding;
  await writeFile(path, `${JSON.stringify(plan, null, 2)}\n`);

  const status = spawnSync(process.execPath, [CLI, "loop", "status", "--json"], {
    cwd: packageRoot,
    encoding: "utf8"
  });
  assert.equal(status.status, 1, status.stderr);
  assert.equal(JSON.parse(status.stdout).binding.status, "legacy_unbound");

  const binding = spawnSync(
    process.execPath,
    [CLI, "loop", "bind", "--confirm-current-root", "--json"],
    { cwd: packageRoot, encoding: "utf8" }
  );
  assert.equal(binding.status, 0, binding.stderr);
  assert.equal(JSON.parse(binding.stdout).plan.version, 2);
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

test("Stop hook never resumes or mutates mismatched repository state", async () => withStopHookEnabled(async () => {
  const source = await repo();
  const target = await repo("superloopy-binding-stop-");
  await createLoop(source, ["--brief", "Source"]);
  await mkdir(join(target, ".superloopy"), { recursive: true });
  await writeFile(
    join(target, ".superloopy", "goals.json"),
    await readFile(join(source, ".superloopy", "goals.json"))
  );

  const output = await runStopHook({
    hook_event_name: "Stop",
    cwd: target,
    stop_hook_active: false
  });

  assert.equal(output, "");
  assert.equal(existsSync(join(target, ".superloopy", "loop-control.json")), false);
  assert.equal(existsSync(join(target, ".superloopy", "ledger.jsonl")), false);
}));

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

test("legacy bind guidance normalizes an untrusted session id", async () => {
  const root = await repo();
  await createLoop(root, ["--brief", "Legacy"]);
  const path = join(root, ".superloopy", "goals.json");
  const plan = JSON.parse(await readFile(path, "utf8"));
  plan.version = 1;
  delete plan.repositoryBinding;
  plan.sessionId = "abc; touch /tmp/pwn";
  await writeFile(path, `${JSON.stringify(plan, null, 2)}\n`);

  const status = await statusLoop(root);
  assert.equal(
    status.binding.next,
    "superloopy loop bind --confirm-current-root --session-id abc-touch-tmp-pwn --json"
  );
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
