import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { LOOPY_AGENT_NAMES } from "../src/agents.js";
import { createLoop } from "../src/loop.js";

async function tempRepo() {
  return mkdtemp(join(tmpdir(), "loopy-cli-"));
}

function runCli(args, options = {}) {
  return spawnSync(process.execPath, [join(process.cwd(), "src/cli.js"), ...args], {
    cwd: options.cwd ?? process.cwd(),
    encoding: "utf8",
    env: options.env ?? process.env,
    input: options.input,
    timeout: 10_000
  });
}

test("CLI loop help shows the shortest evidence-backed flow", () => {
  const result = runCli(["loop", "help"]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Quick flow:/);
  assert.match(result.stdout, /loopy loop begin --brief "Ship the task" --json/);
  assert.match(result.stdout, /loopy loop prove -- <validation-command>/);
  assert.match(result.stdout, /loopy loop check/);
  assert.match(result.stdout, /loopy loop finish --evidence "criteria passed" --artifact \.loopy\/evidence\/gate\.json --json/);
  assert.match(result.stdout, /loopy loop handoff --agent NAME --assignment TEXT/);
  assert.match(result.stdout, /loopy loop fleet \[--language TAG\] \[--session-id ID\] \[--json\]/);
  assert.match(result.stdout, /Pass evidence must be a non-empty artifact under the active evidence root\./);
});

test("CLI entrypoint runs through a symlinked bin path", async () => {
  const repo = await tempRepo();
  const binPath = join(repo, "loopy");
  await symlink(join(process.cwd(), "src", "cli.js"), binPath);

  const result = spawnSync(binPath, ["--help"], {
    cwd: repo,
    encoding: "utf8",
    env: process.env,
    timeout: 10_000
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /loopy loop <subcommand>/);
});

test("CLI agents install writes bundled custom agents to target", async () => {
  const repo = await tempRepo();
  const target = join(repo, "codex-agents");

  const result = runCli(["agents", "install", "--target", target, "--json"]);

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.target, target);
  assert.deepEqual(parsed.agents.map((agent) => agent.name), LOOPY_AGENT_NAMES);
  assert.deepEqual(parsed.agents.map((agent) => agent.status), LOOPY_AGENT_NAMES.map(() => "installed"));
  for (const name of LOOPY_AGENT_NAMES) {
    const content = await readFile(join(target, `${name}.toml`), "utf8");
    assert.match(content, new RegExp(`name = "${name}"`));
  }
});

test("CLI agents install refuses changed files unless forced", async () => {
  const repo = await tempRepo();
  const target = join(repo, "codex-agents");
  const first = runCli(["agents", "install", "--target", target, "--json"]);
  assert.equal(first.status, 0, first.stderr);

  const executorPath = join(target, "franky.toml");
  await writeFile(executorPath, "local edit\n", "utf8");

  const conflict = runCli(["agents", "install", "--target", target, "--json"]);
  assert.equal(conflict.status, 1, conflict.stderr);
  const parsedConflict = JSON.parse(conflict.stdout);
  assert.equal(parsedConflict.ok, false);
  assert.equal(parsedConflict.conflicts[0].name, "franky");

  const forced = runCli(["agents", "install", "--target", target, "--force", "--json"]);
  assert.equal(forced.status, 0, forced.stderr);
  const restored = await readFile(executorPath, "utf8");
  assert.match(restored, /name = "franky"/);
});

test("CLI install writes command wrapper and bundled agents", async () => {
  const repo = await tempRepo();
  const home = join(repo, "home");
  const codexHome = join(home, ".codex");
  const binDir = join(repo, "bin");
  const env = {
    ...process.env,
    HOME: home,
    CODEX_HOME: codexHome,
    LOOPY_BIN_DIR: binDir,
    PATH: `${binDir}${process.platform === "win32" ? ";" : ":"}${process.env.PATH ?? ""}`
  };

  const result = runCli(["install", "--json"], { cwd: repo, env });

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.bin.status, "installed");
  assert.equal(parsed.bin.target, join(binDir, process.platform === "win32" ? "loopy.cmd" : "loopy"));
  assert.equal(parsed.agents.target, join(codexHome, "agents"));
  assert.deepEqual(parsed.agents.agents.map((agent) => agent.status), LOOPY_AGENT_NAMES.map(() => "installed"));

  const help = spawnSync(join(binDir, process.platform === "win32" ? "loopy.cmd" : "loopy"), ["--help"], {
    cwd: repo,
    encoding: "utf8",
    env,
    timeout: 10_000
  });
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /loopy loop <subcommand>/);
});

test("CLI hook stop emits a continuation block for unresolved loop work", async () => {
  const repo = await tempRepo();
  await mkdir(repo, { recursive: true });
  await createLoop(repo, ["--brief", "Ship"]);
  const payload = {
    hook_event_name: "Stop",
    cwd: repo,
    stop_hook_active: false
  };

  const result = runCli(["hook", "stop"], {
    env: { ...process.env, LOOPY_STOP_HOOK: "on" },
    input: `${JSON.stringify(payload)}\n`
  });

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.decision, "block");
  assert.match(parsed.reason, /loopy loop status --json/);
  assert.match(parsed.reason, /loopy loop guide --json/);
  assert.match(parsed.reason, /Next action: `loopy loop next --json`/);
});

test("CLI loop guide --json returns the next exact command", async () => {
  const repo = await tempRepo();
  await mkdir(repo, { recursive: true });
  await createLoop(repo, ["--brief", "Ship"]);

  const result = runCli(["loop", "guide", "--json"], { cwd: repo });

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.guide.state, "start_goal");
  assert.equal(parsed.guide.nextAction.command, "loopy loop next --json");
});

test("CLI loop create text shows the immediate next guide", async () => {
  const repo = await tempRepo();
  await mkdir(repo, { recursive: true });

  const result = runCli(["loop", "create", "--brief", "Ship"], { cwd: repo });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /loopy plan created: 1 goal\(s\)/);
  assert.match(result.stdout, /State: start_goal/);
  assert.match(result.stdout, /Next action: `loopy loop next --json`/);
  assert.match(result.stdout, /G001\/C001 pending -> `.loopy\/evidence\/G001-C001.txt`/);
});

test("CLI loop status text shows the immediate next guide", async () => {
  const repo = await tempRepo();
  await mkdir(repo, { recursive: true });
  await createLoop(repo, ["--brief", "Ship"]);

  const result = runCli(["loop", "status"], { cwd: repo });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /loopy status: 0\/1 goals complete/);
  assert.match(result.stdout, /State: start_goal/);
  assert.match(result.stdout, /Next action: `loopy loop next --json`/);
});

test("CLI loop next text shows the immediate proof command", async () => {
  const repo = await tempRepo();
  await mkdir(repo, { recursive: true });
  await createLoop(repo, ["--brief", "Ship"]);

  const result = runCli(["loop", "next"], { cwd: repo });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /loopy next: G001 Ship/);
  assert.match(result.stdout, /State: record_evidence/);
  assert.match(result.stdout, /Next action: `loopy loop prove -- <validation-command>`/);
});

test("CLI loop begin creates and starts the first goal", async () => {
  const repo = await tempRepo();
  await mkdir(repo, { recursive: true });

  const result = runCli(["loop", "begin", "--brief", "- Build\n- Verify", "--mode", "strict", "--json"], {
    cwd: repo
  });

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.kind, "begun");
  assert.equal(parsed.goal.id, "G001");
  assert.equal(parsed.goal.status, "in_progress");
  assert.equal(parsed.plan.goals.length, 2);
  assert.equal(parsed.guide.nextAction.command, "loopy loop prove -- <validation-command>");
});

test("CLI loop begin text shows the immediate proof command", async () => {
  const repo = await tempRepo();
  await mkdir(repo, { recursive: true });

  const result = runCli(["loop", "begin", "--brief", "Ship"], { cwd: repo });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /loopy began: G001 Ship/);
  assert.match(result.stdout, /Next action: `loopy loop prove -- <validation-command>`/);
  assert.match(result.stdout, /Evidence tools: `loopy loop trace --json`, `loopy loop report --json`, `loopy loop check --json`/);
});

test("CLI loop guide text shows capture template for active evidence", async () => {
  const repo = await tempRepo();
  await mkdir(repo, { recursive: true });
  await createLoop(repo, ["--brief", "Ship"]);
  runCli(["loop", "next", "--json"], { cwd: repo });

  const result = runCli(["loop", "guide"], { cwd: repo });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Next action: `loopy loop prove -- <validation-command>`/);
  assert.match(result.stdout, /Proof target: G001\/C001 pass -> `.loopy\/evidence\/G001-C001.txt`/);
  assert.match(result.stdout, /Capture template: `loopy loop capture --goal-id G001 --criterion-id C001 --notes "<summary>" -- <validation-command>`/);
  assert.match(result.stdout, /Evidence template: `loopy loop evidence --goal-id G001 --criterion-id C001 --status pass --artifact .loopy\/evidence\/G001-C001.txt --notes "<summary>" --json`/);
  assert.match(result.stdout, /Evidence tools: `loopy loop trace --json`, `loopy loop report --json`, `loopy loop check --json`/);
  assert.match(result.stdout, /Flow checklist:\n- \[complete\] Start or resume goal: `loopy loop next --json`\n- \[current\] Record artifact-backed proof: `loopy loop prove -- <validation-command>`\n- \[anytime\] Check evidence: `loopy loop check --json`/);
  assert.match(result.stdout, /Proof plan:/);
  assert.match(result.stdout, /G001\/C001 pending capture `loopy loop capture --goal-id G001 --criterion-id C001 --notes "<summary>" -- <validation-command>`/);
  assert.match(result.stdout, /G001\/C002 pending capture `loopy loop capture --goal-id G001 --criterion-id C002 --notes "<summary>" -- <validation-command>`/);
});

test("CLI hook subagent-stop honors the host contract over stdin", async () => {
  const repo = await tempRepo();

  // Missing receipt -> block (re-prompt the worker).
  const missing = runCli(["hook", "subagent-stop"], {
    cwd: repo,
    input: JSON.stringify({ hook_event_name: "SubagentStop", agent_type: "franky", session_id: "s", agent_id: "a", cwd: repo, last_assistant_message: "done" })
  });
  assert.equal(missing.status, 0, missing.stderr);
  assert.equal(JSON.parse(missing.stdout).decision, "block");

  // Valid, non-blank receipt -> empty output (allow the stop).
  const evidenceDir = join(repo, ".loopy", "evidence");
  await mkdir(evidenceDir, { recursive: true });
  await writeFile(join(evidenceDir, "receipt.txt"), "real proof\n", "utf8");
  const ok = runCli(["hook", "subagent-stop"], {
    cwd: repo,
    input: JSON.stringify({ hook_event_name: "SubagentStop", agent_type: "franky", session_id: "s", agent_id: "b", cwd: repo, last_assistant_message: "done\nLOOPY_EVIDENCE: .loopy/evidence/receipt.txt" })
  });
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(ok.stdout.trim(), "");

  // Missing agent_type -> documented fail-open (no-op): this is the host-contract dependency.
  const noType = runCli(["hook", "subagent-stop"], {
    cwd: repo,
    input: JSON.stringify({ hook_event_name: "SubagentStop", cwd: repo, last_assistant_message: "done" })
  });
  assert.equal(noType.status, 0, noType.stderr);
  assert.equal(noType.stdout.trim(), "");
});
