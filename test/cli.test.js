import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { lstat, mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { binShimSupportsSiblingFallback, installBinShim, SUPERLOOPY_AGENT_NAMES } from "../src/agents.js";
import { createLoop } from "../src/loop.js";

async function tempRepo() {
  return mkdtemp(join(tmpdir(), "superloopy-cli-"));
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

function isolatedInstallEnv(repo, overrides = {}) {
  return {
    ...process.env,
    CODEX_HOME: join(repo, "codex-home"),
    ...overrides
  };
}

function cliPathInvocation(binPath, args, platform = process.platform) {
  if (platform !== "win32") return { command: binPath, args, options: {} };
  return {
    command: quoteWindowsCmdArg(binPath),
    args,
    options: { shell: true }
  };
}

function spawnCliPath(binPath, args, options = {}) {
  const invocation = cliPathInvocation(binPath, args);
  return spawnSync(invocation.command, invocation.args, { ...options, ...invocation.options });
}

function quoteWindowsCmdArg(value) {
  return `"${String(value).replaceAll('"', '\\"')}"`;
}

test("CLI loop help shows the shortest evidence-backed flow", () => {
  const result = runCli(["loop", "help"]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Quick flow:/);
  assert.match(result.stdout, /superloopy loop begin --brief "Ship the task" --json/);
  assert.match(result.stdout, /superloopy loop prove -- <validation-command>/);
  assert.match(result.stdout, /superloopy loop check/);
  assert.match(result.stdout, /superloopy loop finish --evidence "criteria passed" --artifact \.superloopy\/evidence\/gate\.json --json/);
  assert.match(result.stdout, /superloopy loop handoff --agent NAME --assignment TEXT/);
  assert.match(result.stdout, /superloopy loop fleet \[--language TAG\] \[--session-id ID\] \[--json\]/);
  assert.match(result.stdout, /Pass evidence must be a non-empty artifact under the active evidence root\./);
});

test("CLI test wrapper routes Windows command files through cmd.exe", () => {
  const invocation = cliPathInvocation("C:\\tmp\\superloopy.cmd", ["--help"], "win32");

  assert.equal(invocation.command, "\"C:\\tmp\\superloopy.cmd\"");
  assert.deepEqual(invocation.args, ["--help"]);
  assert.deepEqual(invocation.options, { shell: true });
});

test("CLI entrypoint runs through a symlinked bin path", { skip: process.platform === "win32" ? "extensionless symlink execution is POSIX-only" : false }, async () => {
  const repo = await tempRepo();
  const binPath = join(repo, "superloopy");
  await symlink(join(process.cwd(), "src", "cli.js"), binPath);

  const result = spawnCliPath(binPath, ["--help"], {
    cwd: repo,
    encoding: "utf8",
    env: process.env,
    timeout: 10_000
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /superloopy loop <subcommand>/);
});

test("CLI agents install writes bundled custom agents to target", async () => {
  const repo = await tempRepo();
  const target = join(repo, "codex-agents");
  const env = isolatedInstallEnv(repo);

  const result = runCli(["agents", "install", "--target", target, "--compat", "--json"], { env });

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.target, target);
  assert.deepEqual(parsed.agents.map((agent) => agent.name), SUPERLOOPY_AGENT_NAMES);
  assert.deepEqual(parsed.agents.map((agent) => agent.status), SUPERLOOPY_AGENT_NAMES.map(() => "installed"));
  for (const name of SUPERLOOPY_AGENT_NAMES) {
    const content = await readFile(join(target, `${name}.toml`), "utf8");
    assert.match(content, new RegExp(`name = "${name}"`));
  }
});

test("CLI agents install refuses changed files unless forced", async () => {
  const repo = await tempRepo();
  const target = join(repo, "codex-agents");
  const env = isolatedInstallEnv(repo);
  const first = runCli(["agents", "install", "--target", target, "--compat", "--json"], { env });
  assert.equal(first.status, 0, first.stderr);

  const executorPath = join(target, "franky.toml");
  await writeFile(executorPath, "local edit\n", "utf8");

  const conflict = runCli(["agents", "install", "--target", target, "--compat", "--json"], { env });
  assert.equal(conflict.status, 1, conflict.stderr);
  const parsedConflict = JSON.parse(conflict.stdout);
  assert.equal(parsedConflict.ok, false);
  assert.equal(parsedConflict.conflicts[0].name, "franky");

  const forced = runCli(["agents", "install", "--target", target, "--compat", "--force", "--json"], { env });
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
    SUPERLOOPY_BIN_DIR: binDir,
    PATH: `${binDir}${process.platform === "win32" ? ";" : ":"}${process.env.PATH ?? ""}`
  };

  const result = runCli(["install", "--compat", "--json"], { cwd: repo, env });

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.bin.status, "installed");
  assert.equal(parsed.bin.target, join(binDir, process.platform === "win32" ? "superloopy.cmd" : "superloopy"));
  assert.equal(parsed.agents.target, join(codexHome, "agents"));
  assert.deepEqual(parsed.agents.agents.map((agent) => agent.status), SUPERLOOPY_AGENT_NAMES.map(() => "installed"));

  const help = spawnCliPath(join(binDir, process.platform === "win32" ? "superloopy.cmd" : "superloopy"), ["--help"], {
    cwd: repo,
    encoding: "utf8",
    env,
    timeout: 10_000
  });
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /superloopy loop <subcommand>/);
});

test("CLI install help exposes model refresh and deterministic compatibility controls", () => {
  const top = runCli(["--help"]);
  const agents = runCli(["agents", "help"]);

  assert.equal(top.status, 0, top.stderr);
  assert.equal(agents.status, 0, agents.stderr);
  assert.match(top.stdout, /superloopy install .*--refresh-models.*--compat/u);
  assert.match(top.stdout, /superloopy agents install .*--refresh-models.*--compat/u);
  assert.match(agents.stdout, /--refresh-models/u);
  assert.match(agents.stdout, /--compat/u);
});

test("CLI install help variants exit before wrapper, agent, state, or catalog-dependent mutation", async (t) => {
  const cases = [
    ["install --help", ["install", "--help"], /Installs the Superloopy command wrapper and managed Codex agents/u],
    ["install -h", ["install", "-h"], /Installs the Superloopy command wrapper and managed Codex agents/u],
    ["bin install --help", ["bin", "install", "--help"], /Installs a small superloopy command wrapper/u],
    ["bin install -h", ["bin", "install", "-h"], /Installs a small superloopy command wrapper/u],
    ["agents install --help", ["agents", "install", "--help"], /Installs bundled Superloopy custom agents/u],
    ["agents install -h", ["agents", "install", "-h"], /Installs bundled Superloopy custom agents/u]
  ];
  for (const [label, prefix, expectedHelp] of cases) {
    await t.test(label, async () => {
      const repo = await tempRepo();
      const target = join(repo, "agents-target");
      const binDir = join(repo, "bin-target");
      const emptyPath = join(repo, "empty-path");
      const codexHome = join(repo, "codex-home");
      await mkdir(emptyPath, { recursive: true });
      const env = isolatedInstallEnv(repo, { SUPERLOOPY_BIN_DIR: binDir, PATH: emptyPath });

      const result = runCli([...prefix, "--target", target, "--bin-dir", binDir], { cwd: repo, env });

      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /^Usage:/u);
      assert.match(result.stdout, expectedHelp);
      assert.equal(existsSync(binDir), false);
      assert.equal(existsSync(target), false);
      assert.equal(existsSync(join(codexHome, "agents")), false);
      assert.equal(existsSync(join(codexHome, "superloopy", "model-resolution.json")), false);
    });
  }
});

test("CLI bin install updates an older generated Superloopy shim without --force", async () => {
  const repo = await tempRepo();
  const binDir = join(repo, "bin");
  await mkdir(binDir, { recursive: true });
  const binPath = join(binDir, process.platform === "win32" ? "superloopy.cmd" : "superloopy");
  const oldShim = process.platform === "win32"
    ? '@echo off\r\nnode "C:\\Users\\me\\.codex\\plugins\\cache\\beefiker\\superloopy\\0.3.0\\src\\cli.js" %*\r\n'
    : "#!/usr/bin/env sh\nexec node '/Users/me/.codex/plugins/cache/beefiker/superloopy/0.3.0/src/cli.js' \"$@\"\n";
  await writeFile(binPath, oldShim, "utf8");

  const result = await installBinShim(repo, ["--bin-dir", binDir], {
    env: { PATH: `${binDir}${process.platform === "win32" ? ";" : ":"}${process.env.PATH ?? ""}` },
    homeDir: join(repo, "home")
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "updated");
  const updated = await readFile(binPath, "utf8");
  assert.notEqual(updated, oldShim);
  assert.match(updated, /src[\\/]cli\.js/);
});

test("CLI bin install updates a marked shim in a non-superloopy directory without --force [regression]", async () => {
  const repo = await tempRepo();
  const binDir = join(repo, "bin");
  await mkdir(binDir, { recursive: true });
  const binPath = join(binDir, process.platform === "win32" ? "superloopy.cmd" : "superloopy");
  // A shim we generated but installed from a checkout dir NOT named `superloopy` (e.g. `loopy`).
  const markedShim = process.platform === "win32"
    ? '@echo off\r\n@rem superloopy-generated bin shim\r\nnode "C:\\Users\\me\\loopy\\src\\cli.js" %*\r\n'
    : "#!/usr/bin/env sh\n# superloopy-generated bin shim\nexec node '/Users/me/loopy/src/cli.js' \"$@\"\n";
  await writeFile(binPath, markedShim, "utf8");

  const result = await installBinShim(repo, ["--bin-dir", binDir], {
    env: { PATH: `${binDir}${process.platform === "win32" ? ";" : ":"}${process.env.PATH ?? ""}` },
    homeDir: join(repo, "home")
  });
  assert.equal(result.ok, true);
  assert.equal(result.status, "updated");
});

test("CLI bin install refuses to overwrite a foreign (unmarked) shim without --force [regression]", async () => {
  const repo = await tempRepo();
  const binDir = join(repo, "bin");
  await mkdir(binDir, { recursive: true });
  const binPath = join(binDir, process.platform === "win32" ? "superloopy.cmd" : "superloopy");
  const foreignShim = process.platform === "win32"
    ? '@echo off\r\nnode "C:\\Users\\me\\other-tool\\src\\cli.js" %*\r\n'
    : "#!/usr/bin/env sh\nexec node '/Users/me/other-tool/src/cli.js' \"$@\"\n";
  await writeFile(binPath, foreignShim, "utf8");

  const result = await installBinShim(repo, ["--bin-dir", binDir], {
    env: { PATH: `${binDir}${process.platform === "win32" ? ";" : ":"}${process.env.PATH ?? ""}` },
    homeDir: join(repo, "home")
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, "conflict");
  assert.equal(await readFile(binPath, "utf8"), foreignShim); // left untouched
});

test("CLI bin install preserves a dangling wrapper symlink without force", {
  skip: process.platform === "win32" ? "file symlink creation is not reliably available on Windows CI" : false
}, async () => {
  const repo = await tempRepo();
  const binDir = join(repo, "bin");
  const outsideDir = join(repo, "outside");
  await mkdir(binDir, { recursive: true });
  await mkdir(outsideDir, { recursive: true });
  const binPath = join(binDir, "superloopy");
  const outsideTarget = join(outsideDir, "created-by-install");
  await symlink(outsideTarget, binPath);

  const result = await installBinShim(repo, ["--bin-dir", binDir], {
    env: { PATH: `${binDir}:${process.env.PATH ?? ""}` },
    homeDir: join(repo, "home"),
    platform: "linux"
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, "conflict");
  assert.equal((await lstat(binPath)).isSymbolicLink(), true);
  assert.equal(existsSync(outsideTarget), false);
});

test("CLI bin install never follows the wrapper symlink, even with force", {
  skip: process.platform === "win32" ? "file symlink creation is not reliably available on Windows CI" : false
}, async () => {
  const repo = await tempRepo();
  const binDir = join(repo, "bin");
  const outsideDir = join(repo, "outside");
  await mkdir(binDir, { recursive: true });
  await mkdir(outsideDir, { recursive: true });
  const binPath = join(binDir, "superloopy");
  const outsideTarget = join(outsideDir, "personal-wrapper");
  const personalWrapper = "personal wrapper\n";
  await writeFile(outsideTarget, personalWrapper, "utf8");
  await symlink(outsideTarget, binPath);

  const result = await installBinShim(repo, ["--bin-dir", binDir, "--force"], {
    env: { PATH: `${binDir}:${process.env.PATH ?? ""}` },
    homeDir: join(repo, "home"),
    platform: "linux"
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, "conflict");
  assert.equal((await lstat(binPath)).isSymbolicLink(), true);
  assert.equal(await readFile(outsideTarget, "utf8"), personalWrapper);
});

test("CLI bin install uses Windows-safe PATH detection and PowerShell hint", async () => {
  const repo = await tempRepo();
  const binDir = join(repo, "Bin");
  const result = await installBinShim(repo, ["--bin-dir", binDir], {
    env: { PATH: `"${binDir.toUpperCase()}";C:\\Windows\\System32` },
    homeDir: join(repo, "home"),
    platform: "win32"
  });

  assert.equal(result.ok, true);
  assert.equal(result.onPath, true);
  assert.equal(result.target, join(binDir, "superloopy.cmd"));
  assert.match(result.pathHint, /\[Environment\]::SetEnvironmentVariable\('Path'/);
  assert.doesNotMatch(result.pathHint, /%PATH%/);
  assert.doesNotMatch(result.next, /Add .* to PATH/);
});

test("CLI bin install defaults to a Windows-native npm shim directory", async () => {
  const repo = await tempRepo();
  const appData = join(repo, "AppData", "Roaming");
  const binDir = join(appData, "npm");
  const result = await installBinShim(repo, [], {
    env: { APPDATA: appData, Path: `"${binDir.toUpperCase()}";C:\\Windows\\System32` },
    homeDir: join(repo, "home"),
    platform: "win32"
  });

  assert.equal(result.ok, true);
  assert.equal(result.onPath, true);
  assert.equal(result.target, join(binDir, "superloopy.cmd"));
  const shim = await readFile(result.target, "utf8");
  assert.match(shim, /SUPERLOOPY_SHIM_CLI/);
  assert.equal(binShimSupportsSiblingFallback(shim, "win32"), true);
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
    env: { ...process.env, SUPERLOOPY_STOP_HOOK: "on" },
    input: `${JSON.stringify(payload)}\n`
  });

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.decision, "block");
  assert.match(parsed.reason, /superloopy loop status --json/);
  assert.match(parsed.reason, /superloopy loop guide --json/);
  assert.match(parsed.reason, /Next action: `superloopy loop next --json`/);
});

test("CLI loop guide --json returns the next exact command", async () => {
  const repo = await tempRepo();
  await mkdir(repo, { recursive: true });
  await createLoop(repo, ["--brief", "Ship"]);

  const result = runCli(["loop", "guide", "--json"], { cwd: repo });

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.guide.state, "start_goal");
  assert.equal(parsed.guide.nextAction.command, "superloopy loop next --json");
});

test("CLI loop create text shows the immediate next guide", async () => {
  const repo = await tempRepo();
  await mkdir(repo, { recursive: true });

  const result = runCli(["loop", "create", "--brief", "Ship"], { cwd: repo });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /superloopy plan created: 1 goal\(s\)/);
  assert.match(result.stdout, /State: start_goal/);
  assert.match(result.stdout, /Next action: `superloopy loop next --json`/);
  assert.match(result.stdout, /G001\/C001 pending -> `.superloopy\/evidence\/G001-C001.txt`/);
});

test("CLI loop status text shows the immediate next guide", async () => {
  const repo = await tempRepo();
  await mkdir(repo, { recursive: true });
  await createLoop(repo, ["--brief", "Ship"]);

  const result = runCli(["loop", "status"], { cwd: repo });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /superloopy status: 0\/1 goals complete/);
  assert.match(result.stdout, /State: start_goal/);
  assert.match(result.stdout, /Next action: `superloopy loop next --json`/);
});

test("CLI loop next text shows the immediate proof command", async () => {
  const repo = await tempRepo();
  await mkdir(repo, { recursive: true });
  await createLoop(repo, ["--brief", "Ship"]);

  const result = runCli(["loop", "next"], { cwd: repo });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /superloopy next: G001 Ship/);
  assert.match(result.stdout, /State: record_evidence/);
  assert.match(result.stdout, /Next action: `superloopy loop prove -- <validation-command>`/);
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
  assert.equal(parsed.guide.nextAction.command, "superloopy loop prove -- <validation-command>");
});

test("CLI loop begin text shows the immediate proof command", async () => {
  const repo = await tempRepo();
  await mkdir(repo, { recursive: true });

  const result = runCli(["loop", "begin", "--brief", "Ship"], { cwd: repo });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /superloopy began: G001 Ship/);
  assert.match(result.stdout, /Next action: `superloopy loop prove -- <validation-command>`/);
  assert.match(result.stdout, /Evidence tools: `superloopy loop trace --json`, `superloopy loop report --json`, `superloopy loop check --json`/);
});

test("CLI loop guide text shows capture template for active evidence", async () => {
  const repo = await tempRepo();
  await mkdir(repo, { recursive: true });
  await createLoop(repo, ["--brief", "Ship"]);
  runCli(["loop", "next", "--json"], { cwd: repo });

  const result = runCli(["loop", "guide"], { cwd: repo });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Next action: `superloopy loop prove -- <validation-command>`/);
  assert.match(result.stdout, /Proof target: G001\/C001 pass -> `.superloopy\/evidence\/G001-C001.txt`/);
  assert.match(result.stdout, /Capture template: `superloopy loop capture --goal-id G001 --criterion-id C001 --notes "<summary>" -- <validation-command>`/);
  assert.match(result.stdout, /Evidence template: `superloopy loop evidence --goal-id G001 --criterion-id C001 --status pass --artifact .superloopy\/evidence\/G001-C001.txt --notes "<summary>" --json`/);
  assert.match(result.stdout, /Evidence tools: `superloopy loop trace --json`, `superloopy loop report --json`, `superloopy loop check --json`/);
  assert.match(result.stdout, /Flow checklist:\n- \[complete\] Start or resume goal: `superloopy loop next --json`\n- \[current\] Record artifact-backed proof: `superloopy loop prove -- <validation-command>`\n- \[anytime\] Check evidence: `superloopy loop check --json`/);
  assert.match(result.stdout, /Proof plan:/);
  assert.match(result.stdout, /G001\/C001 pending capture `superloopy loop capture --goal-id G001 --criterion-id C001 --notes "<summary>" -- <validation-command>`/);
  assert.match(result.stdout, /G001\/C002 pending capture `superloopy loop capture --goal-id G001 --criterion-id C002 --notes "<summary>" -- <validation-command>`/);
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
  const evidenceDir = join(repo, ".superloopy", "evidence");
  await mkdir(evidenceDir, { recursive: true });
  await writeFile(join(evidenceDir, "receipt.txt"), "real proof\n", "utf8");
  const ok = runCli(["hook", "subagent-stop"], {
    cwd: repo,
    input: JSON.stringify({ hook_event_name: "SubagentStop", agent_type: "franky", session_id: "s", agent_id: "b", cwd: repo, last_assistant_message: "done\nSUPERLOOPY_EVIDENCE: .superloopy/evidence/receipt.txt" })
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
