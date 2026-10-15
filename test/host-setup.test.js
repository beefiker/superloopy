import assert from "node:assert/strict";
import test from "node:test";

import { main } from "../src/cli.js";
import { formatHostSetupResult, runHostSetup } from "../src/host-setup.js";
import { runSetupCommand, selfUpdatePlan, wantsHostDoctor } from "../src/setup-command.js";
import { resolveSpawnInvocation } from "../src/spawn-command.js";

const RELEASED = "0.26.0";

// A stateful stand-in for the claude / codex / agy CLIs: plugin commands change what the next
// `plugin list --json` reports, the way the real hosts do.
function fakeHosts(state) {
  const calls = [];
  const ok = (stdout = "") => ({ status: 0, stdout, stderr: "" });
  const fail = (stderr) => ({ status: 1, stdout: "", stderr });
  const run = (command, args) => {
    const line = [command, ...args].join(" ");
    calls.push(line);
    const host = { claude: "claude", codex: "codex", agy: "antigravity" }[command];
    const current = state[host];
    if (current?.failOn !== undefined && line.startsWith(current.failOn)) return fail(current.failMessage ?? "boom");
    if (command !== "git" && (current === undefined || current.cli === false)) return { status: null, stdout: "", stderr: "", error: Object.assign(new Error("spawn ENOENT"), { code: "ENOENT" }) };
    if (args[0] === "--version") return ok(`${command} 9.9.9\n`);
    if (command === "claude") {
      if (line === "claude plugin list --json") return ok(JSON.stringify(current.version ? [{ id: "superloopy@beefiker", version: current.version, scope: "user", installPath: "/c/superloopy", enabled: current.enabled !== false }] : []));
      if (line === "claude plugin marketplace list --json") return ok(JSON.stringify(current.marketplace ? [{ name: "beefiker" }] : []));
      if (line === "claude plugin marketplace add beefiker/superloopy") { current.marketplace = true; return ok(); }
      if (line === "claude plugin install superloopy@beefiker" && current.marketplace) { current.version = RELEASED; return ok(); }
      if (line === "claude plugin marketplace update beefiker") return ok();
      if (line === "claude plugin update superloopy@beefiker") { current.version = current.serves ?? RELEASED; return ok(); }
      if (line.startsWith("claude plugin validate")) return ok(JSON.stringify({ success: current.valid !== false }));
    }
    if (command === "codex") {
      if (current.listError) return ok(current.listError);
      if (line === "codex plugin list --json") return ok(JSON.stringify({ installed: current.version ? [{ pluginId: "superloopy@beefiker", name: "superloopy", version: current.version, installed: true }] : [] }));
      if (line === "codex plugin marketplace list --json") return ok(JSON.stringify({ marketplaces: current.marketplace ? [{ name: "beefiker" }] : [] }));
      if (line === "codex plugin marketplace add beefiker/superloopy") { current.marketplace = true; return ok(); }
      if (line === "codex plugin marketplace upgrade beefiker") { current.snapshot = RELEASED; return ok(); }
      if (line === "codex plugin add superloopy@beefiker" && current.marketplace) { current.version = current.snapshot ?? RELEASED; return ok(); }
    }
    if (command === "agy") {
      if (line === "agy plugin list --json") return ok(JSON.stringify(current.version ? [{ name: "superloopy", version: current.version, path: "/g/superloopy" }] : []));
      if (line === "agy plugin install https://github.com/beefiker/superloopy") { current.version = RELEASED; return ok(); }
      if (line.startsWith("agy plugin validate")) return ok();
    }
    return fail(`unexpected: ${line}`);
  };
  return { run, calls };
}

const changing = (calls) => calls.filter((line) => !/ --version$| list --json$| validate /u.test(line));
const report = (result, host) => result.hosts.find((item) => item.host === host);

test("setup updates existing installs, leaves current ones alone, and installs nowhere new without consent", async () => {
  const { run, calls } = fakeHosts({
    claude: { version: "0.22.3", marketplace: true },
    codex: { version: RELEASED, marketplace: true },
    antigravity: { version: null }
  });
  const result = await runHostSetup({ mode: "setup", target: RELEASED, run, nodeVersion: "22.1.0" });

  assert.equal(result.ok, true);
  assert.deepEqual([report(result, "claude").before, report(result, "claude").after], ["0.22.3", RELEASED]);
  assert.equal(report(result, "codex").action, "current");
  assert.equal(report(result, "antigravity").action, "not-installed");
  assert.deepEqual(changing(calls), ["claude plugin marketplace update beefiker", "claude plugin update superloopy@beefiker"]);
});

test("an approved install registers the marketplace only when the host lacks it", async () => {
  const { run, calls } = fakeHosts({ claude: { version: null, marketplace: false }, codex: { version: null, marketplace: true }, antigravity: { cli: false } });
  const result = await runHostSetup({ mode: "setup", target: RELEASED, run, confirmInstall: async () => true, nodeVersion: "22.1.0" });

  assert.equal(result.ok, true);
  assert.equal(report(result, "claude").after, RELEASED);
  assert.equal(report(result, "codex").after, RELEASED);
  assert.equal(report(result, "antigravity").action, "unavailable");
  assert.deepEqual(changing(calls), [
    "claude plugin marketplace add beefiker/superloopy",
    "claude plugin install superloopy@beefiker",
    "codex plugin add superloopy@beefiker"
  ]);
});

test("update reinstalls Codex from the refreshed snapshot and re-runs the Antigravity install", async () => {
  const { run } = fakeHosts({ claude: { cli: false }, codex: { version: "0.23.1", marketplace: true }, antigravity: { version: "0.19.0" } });
  const result = await runHostSetup({ mode: "update", target: RELEASED, run, nodeVersion: "22.1.0" });

  assert.equal(report(result, "codex").after, RELEASED);
  assert.equal(report(result, "antigravity").after, RELEASED);
  assert.equal(result.ok, true);
});

test("a failing host step is reported with the host's own error and does not stop other hosts", async () => {
  const { run } = fakeHosts({
    claude: { version: "0.22.3", marketplace: true, failOn: "claude plugin update", failMessage: "Updating marketplace...\nhint: retry later\nerror: network unreachable\nhint: check proxy" },
    codex: { cli: false },
    antigravity: { version: "0.19.0" }
  });
  const result = await runHostSetup({ mode: "update", target: RELEASED, run, nodeVersion: "22.1.0" });

  assert.equal(result.ok, false);
  assert.equal(report(result, "claude").ok, false);
  assert.match(report(result, "claude").message, /claude plugin update superloopy@beefiker` failed: error: network unreachable$/u);
  assert.equal(report(result, "antigravity").after, RELEASED);
});

test("dry run and doctor change nothing; doctor fails on an outdated install and says how to fix it", async () => {
  for (const mode of ["setup", "doctor"]) {
    const { run, calls } = fakeHosts({ claude: { version: "0.22.3", marketplace: true }, codex: { cli: false }, antigravity: { version: null } });
    const result = await runHostSetup({ mode, target: RELEASED, run, dryRun: mode === "setup", confirmInstall: async () => true, nodeVersion: "22.1.0" });
    assert.deepEqual(changing(calls), [], mode);
    if (mode === "doctor") {
      assert.equal(result.ok, false);
      assert.equal(report(result, "claude").next, "npx superloopy@latest update");
      assert.equal(report(result, "claude").validate.ok, true);
      assert.equal(report(result, "antigravity").ok, true, "a host without Superloopy is not a failure");
    }
  }
});

test("doctor passes when every install is current, and fails on old Node or a host CLI that cannot list plugins", async () => {
  const current = { claude: { version: RELEASED, marketplace: true }, codex: { cli: false }, antigravity: { cli: false } };
  assert.equal((await runHostSetup({ mode: "doctor", target: RELEASED, run: fakeHosts(structuredClone(current)).run, nodeVersion: "22.1.0" })).ok, true);
  assert.equal((await runHostSetup({ mode: "doctor", target: RELEASED, run: fakeHosts(structuredClone(current)).run, nodeVersion: "20.19.0" })).ok, false);

  const { run } = fakeHosts({ claude: { cli: false }, codex: { listError: "Error: failed to load configuration" }, antigravity: { cli: false } });
  const broken = await runHostSetup({ mode: "doctor", target: RELEASED, run, nodeVersion: "22.1.0" });
  assert.equal(broken.ok, false);
  assert.match(report(broken, "codex").message, /codex plugin list --json` did not return a plugin list: Error: failed to load configuration/u);
});

test("self-update re-runs through npx only from an npm install with a newer release, once", () => {
  const base = { currentVersion: "0.25.0", latestVersion: RELEASED, argv: ["setup"], env: {} };
  const npmRoot = "/home/u/.npm/_npx/abc/node_modules/superloopy";
  const plan = selfUpdatePlan({ ...base, root: npmRoot });
  assert.deepEqual([plan.reexec, plan.command, plan.args], [true, "npx", ["--yes", `superloopy@${RELEASED}`, "setup"]]);
  assert.equal(plan.env.SUPERLOOPY_SELF_UPDATED, RELEASED);

  assert.equal(selfUpdatePlan({ ...base, root: "/work/superloopy" }).reexec, false, "a checkout never self-updates");
  assert.equal(selfUpdatePlan({ ...base, root: npmRoot, latestVersion: "0.25.0" }).reexec, false);
  assert.equal(selfUpdatePlan({ ...base, root: npmRoot, latestVersion: null }).reexec, false, "offline keeps the running copy");
  assert.equal(selfUpdatePlan({ ...base, root: npmRoot, env: { SUPERLOOPY_SELF_UPDATED: RELEASED } }).reexec, false, "no re-exec loop");
  assert.equal(selfUpdatePlan({ ...base, root: npmRoot, argv: ["setup", "--no-self-update"] }).reexec, false);
});

test("an outdated npm copy hands the whole command to the latest release and returns its exit code", async () => {
  const spawned = [];
  const output = { text: "", write(chunk) { this.text += chunk; } };
  const code = await runSetupCommand("update", ["--host", "claude"], {
    // An unnormalized path through node_modules: reads as an npm install, resolves to this repo.
    root: `${process.cwd()}/node_modules/..`,
    stdout: output,
    stderr: output,
    env: {},
    deps: {
      resolveLatestVersion: () => "99.0.0",
      spawnSync: (command, args) => { spawned.push([command, ...args].join(" ")); return { status: 7 }; },
      run: () => { throw new Error("hosts must not be touched by the outdated copy"); }
    }
  });
  assert.equal(code, 7);
  // On Windows npx is a .cmd shim, so the same arguments go through cmd.exe.
  const expected = resolveSpawnInvocation("npx", ["--yes", "superloopy@99.0.0", "update", "--host", "claude"]);
  assert.deepEqual(spawned, [[expected.command, ...expected.args].join(" ")]);
});

test("a mistyped option or stray word stops setup before any host or registry call", async () => {
  const untouched = { resolveLatestVersion: () => { throw new Error("registry must not be asked"); }, run: () => { throw new Error("hosts must not be touched"); } };
  const quiet = { write() {} };
  for (const argv of [["--hots", "claude", "--yes"], ["--dyr-run"], ["claude"], ["--host"]]) {
    await assert.rejects(runSetupCommand("setup", argv, { root: process.cwd(), stdout: quiet, stderr: quiet, env: {}, deps: untouched }), /setup argument|--host value/u, argv.join(" "));
  }

  // Through the CLI a usage error exits 2, so scripts can tell a typo from a failed host (1).
  const sink = { text: "", write(chunk) { this.text += chunk; } };
  assert.equal(await main(["setup", "--hots", "claude"], null, sink, sink, process.cwd()), 2);
  assert.match(sink.text, /Unknown setup argument: --hots/u);
});

test("doctor --hosts --json reports every host as JSON without changing anything", async () => {
  const { run, calls } = fakeHosts({ claude: { version: RELEASED, marketplace: true }, codex: { cli: false }, antigravity: { version: "0.19.0" } });
  const out = { text: "", write(chunk) { this.text += chunk; } };
  const code = await runSetupCommand("doctor", ["--hosts", "--json"], { root: process.cwd(), stdout: out, stderr: out, env: {}, deps: { resolveLatestVersion: () => null, run } });
  const result = JSON.parse(out.text);
  assert.equal(result.mode, "doctor");
  assert.equal(code, 1, "the outdated Antigravity install fails the check");
  assert.equal(report(result, "antigravity").next, "npx superloopy@latest update");
  assert.deepEqual(changing(calls), []);
});

test("under Node older than 22 nothing is installed or updated", async () => {
  const { run, calls } = fakeHosts({ claude: { version: "0.22.3", marketplace: true }, codex: { version: null, marketplace: true }, antigravity: { cli: false } });
  const result = await runHostSetup({ mode: "setup", target: RELEASED, run, confirmInstall: async () => true, nodeVersion: "20.19.0" });

  assert.deepEqual(changing(calls), []);
  assert.equal(result.ok, false);
  assert.match(report(result, "claude").message, /Node 20\.19\.0 is below 22; nothing was changed/u);
  const rendered = formatHostSetupResult(result);
  assert.match(rendered, /Claude Code: 0\.22\.3 is outdated/u);
  assert.match(rendered, /would run: claude plugin update superloopy@beefiker/u);
  assert.doesNotMatch(rendered, /updated|installed /u);
});

test("an update that lands below the target is a failure, not a success", async () => {
  const { run } = fakeHosts({ claude: { version: "0.22.3", marketplace: true, serves: "0.24.0" }, codex: { cli: false }, antigravity: { cli: false } });
  const result = await runHostSetup({ mode: "update", target: RELEASED, run, nodeVersion: "22.1.0" });

  assert.equal(report(result, "claude").after, "0.24.0");
  assert.equal(result.ok, false);
  assert.match(report(result, "claude").message, /GitHub serves 0\.24\.0 .* the target is 0\.26\.0/u);
});

test("a current but disabled plugin fails doctor and points at the enable command without enabling it", async () => {
  const { run, calls } = fakeHosts({ claude: { version: RELEASED, marketplace: true, enabled: false }, codex: { cli: false }, antigravity: { cli: false } });
  const doctor = await runHostSetup({ mode: "doctor", target: RELEASED, run, nodeVersion: "22.1.0" });
  assert.equal(doctor.ok, false);
  assert.equal(report(doctor, "claude").next, "claude plugin enable superloopy@beefiker");

  const setup = await runHostSetup({ mode: "setup", target: RELEASED, run, nodeVersion: "22.1.0" });
  assert.equal(report(setup, "claude").action, "disabled");
  assert.deepEqual(changing(calls), []);
});

test("plain doctor from an npm install reports hosts, unless a package-doctor option is given", () => {
  const npmRoot = "/home/u/.npm/_npx/abc/node_modules/superloopy";
  assert.equal(wantsHostDoctor([], npmRoot), true);
  assert.equal(wantsHostDoctor(["--json"], npmRoot), true);
  for (const option of [["--refresh-models"], ["--scope", "installed"], ["--root=/x"]]) assert.equal(wantsHostDoctor(option, npmRoot), false, option.join(" "));
  assert.equal(wantsHostDoctor([], "/work/superloopy"), false, "a checkout keeps the package doctor");
  assert.equal(wantsHostDoctor(["--hosts"], "/work/superloopy"), true);
});
