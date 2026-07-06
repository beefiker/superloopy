import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { resolveAutoUpdatePlan, resolveSuperloopyUpdatePlan, runAutoUpdateCheck } from "../src/auto-update.js";
import { detectInstallFlow } from "../src/install-flow.js";
import { resolveSpawnInvocation } from "../src/spawn-command.js";

function autoUpdateEnv(root, extra = {}) {
  return {
    SUPERLOOPY_CURRENT_VERSION: "1.0.0",
    SUPERLOOPY_LATEST_VERSION: "1.0.1",
    SUPERLOOPY_AUTO_UPDATE_STATE_PATH: join(root, "state.json"),
    SUPERLOOPY_AUTO_UPDATE_LOG_PATH: join(root, "auto-update.log"),
    ...extra
  };
}

async function makeStorePluginRoot(prefix) {
  const root = await mkdtemp(join(tmpdir(), prefix));
  const pluginRoot = join(root, "store", "superloopy", "1.0.0");
  await mkdir(pluginRoot, { recursive: true });
  return { root, pluginRoot };
}

test("auto update plan schedules the Superloopy npx installer only for npx-local installs", () => {
  const plan = resolveAutoUpdatePlan({
    env: { SUPERLOOPY_CURRENT_VERSION: "1.0.0", SUPERLOOPY_LATEST_VERSION: "1.0.1", SUPERLOOPY_AUTO_UPDATE: "on" },
    now: 90_000_000,
    lastCheckedAt: 0,
    installFlow: "npx-local"
  });

  assert.equal(plan.shouldRun, true);
  assert.equal(plan.command, "npx");
  assert.deepEqual(plan.args, ["--yes", "superloopy@latest", "install", "--force"]);
});

test("auto update execution is opt-in: without SUPERLOOPY_AUTO_UPDATE=on it is notice-only", () => {
  const plan = resolveAutoUpdatePlan({
    env: { SUPERLOOPY_CURRENT_VERSION: "1.0.0", SUPERLOOPY_LATEST_VERSION: "1.0.1" },
    now: 90_000_000,
    lastCheckedAt: 0,
    installFlow: "npx-local"
  });

  assert.equal(plan.shouldRun, false);
  assert.equal(plan.reason, "opt-in-required");
  assert.equal(plan.latestVersion, "1.0.1");
});

test("auto update plan skips checkout installs instead of pointing wrappers at npx cache paths", () => {
  const plan = resolveAutoUpdatePlan({
    env: { SUPERLOOPY_CURRENT_VERSION: "1.0.0", SUPERLOOPY_LATEST_VERSION: "1.0.1" },
    now: 90_000_000,
    lastCheckedAt: 0,
    installFlow: "checkout"
  });

  assert.equal(plan.shouldRun, false);
  assert.equal(plan.reason, "checkout-flow");
});

test("auto update plan skips marketplace installs and leaves the marketplace upgrade path to Codex", () => {
  const plan = resolveAutoUpdatePlan({
    env: { SUPERLOOPY_CURRENT_VERSION: "1.0.0", SUPERLOOPY_LATEST_VERSION: "1.0.1" },
    now: 90_000_000,
    lastCheckedAt: 0,
    installFlow: "marketplace"
  });

  assert.equal(plan.shouldRun, false);
  assert.equal(plan.reason, "marketplace-flow");
});

test("Superloopy update plan handles semver and malformed versions", () => {
  assert.equal(resolveSuperloopyUpdatePlan({ currentVersion: "1.0.1", latestVersion: "1.0.1" }).reason, "up-to-date");
  assert.equal(resolveSuperloopyUpdatePlan({ currentVersion: "1.0.1-beta.1", latestVersion: "1.0.1" }).shouldUpdate, true);
  assert.equal(resolveSuperloopyUpdatePlan({ currentVersion: "1.0.0", latestVersion: "latest" }).reason, "unknown-latest");
});

test("spawn invocation uses Windows cmd shims for npm and npx only", () => {
  assert.deepEqual(resolveSpawnInvocation("npx", ["--yes", "superloopy@latest"], "win32"), {
    command: "cmd.exe",
    args: ["/d", "/s", "/c", "npx.cmd", "--yes", "superloopy@latest"]
  });
  assert.deepEqual(resolveSpawnInvocation("node", ["src/cli.js"], "win32"), {
    command: "node",
    args: ["src/cli.js"]
  });
});

test("install flow detects marketplace, npx snapshot, workspace, and unknown snapshot states", async () => {
  const { root, pluginRoot } = await makeStorePluginRoot("superloopy-install-flow-");

  assert.deepEqual(detectInstallFlow({ pluginRoot }), {
    flow: "marketplace",
    reason: "install-snapshot-absent"
  });

  await writeFile(join(pluginRoot, "superloopy-install.json"), JSON.stringify({ packageName: "superloopy", version: "1.0.0" }));
  assert.deepEqual(detectInstallFlow({ pluginRoot }), {
    flow: "npx-local",
    reason: "install-snapshot-present"
  });

  const workspaceRoot = join(root, "workspace");
  const workspacePlugin = join(workspaceRoot, ".codex-plugin");
  await mkdir(workspacePlugin, { recursive: true });
  await writeFile(join(workspaceRoot, "package.json"), JSON.stringify({ name: "superloopy", version: "1.0.0" }));
  assert.deepEqual(detectInstallFlow({ pluginRoot: workspacePlugin }), {
    flow: "checkout",
    reason: "workspace-tree"
  });

  const unknownRoot = join(root, "unknown");
  await mkdir(join(unknownRoot, "superloopy-install.json"), { recursive: true });
  assert.equal(detectInstallFlow({ pluginRoot: unknownRoot }).flow, "unknown");
});

test("marketplace auto update check records a skipped state and returns an upgrade notice", async () => {
  const { root, pluginRoot } = await makeStorePluginRoot("superloopy-auto-update-marketplace-");
  const spawnLogPath = join(root, "spawn.log");
  const env = autoUpdateEnv(root, {
    PLUGIN_ROOT: pluginRoot,
    SUPERLOOPY_AUTO_UPDATE_INTERVAL_MS: "0",
    SUPERLOOPY_AUTO_UPDATE_WAIT: "1",
    SUPERLOOPY_AUTO_UPDATE_COMMAND: process.execPath,
    SUPERLOOPY_AUTO_UPDATE_ARGS_JSON: JSON.stringify(["-e", `require("node:fs").writeFileSync(${JSON.stringify(spawnLogPath)}, "ok")`])
  });

  const result = await runAutoUpdateCheck({ env, now: 123_456 });

  assert.equal(result.started, false);
  assert.equal(result.reason, "marketplace-flow");
  assert.equal(result.notices.length, 1);
  assert.match(result.notices[0], /codex plugin marketplace upgrade beefiker/);
  assert.match(result.notices[0], /hook re-approval/);
  await assert.rejects(readFile(spawnLogPath, "utf8"), { code: "ENOENT" });
  assert.deepEqual(JSON.parse(await readFile(env.SUPERLOOPY_AUTO_UPDATE_STATE_PATH, "utf8")), {
    lastCheckedAt: 123_456,
    lastStatus: "success"
  });
});

test("npx-local auto update check runs the configured installer command and persists pending notice", async () => {
  const { root, pluginRoot } = await makeStorePluginRoot("superloopy-auto-update-npx-");
  await writeFile(join(pluginRoot, "superloopy-install.json"), JSON.stringify({ packageName: "superloopy", version: "1.0.0" }));
  const spawnLogPath = join(root, "spawn.log");
  const env = autoUpdateEnv(root, {
    PLUGIN_ROOT: pluginRoot,
    SUPERLOOPY_AUTO_UPDATE: "on",
    SUPERLOOPY_AUTO_UPDATE_INTERVAL_MS: "0",
    SUPERLOOPY_AUTO_UPDATE_WAIT: "1",
    SUPERLOOPY_AUTO_UPDATE_COMMAND: process.execPath,
    SUPERLOOPY_AUTO_UPDATE_ARGS_JSON: JSON.stringify(["-e", `require("node:fs").writeFileSync(${JSON.stringify(spawnLogPath)}, "ok")`])
  });

  const result = await runAutoUpdateCheck({ env, now: 123_456 });

  assert.equal(result.started, true);
  assert.equal(result.status, 0);
  assert.equal(await readFile(spawnLogPath, "utf8"), "ok");
  assert.deepEqual(JSON.parse(await readFile(env.SUPERLOOPY_AUTO_UPDATE_STATE_PATH, "utf8")), {
    lastCheckedAt: 123_456,
    lastAttemptedAt: 123_456,
    lastStatus: "success",
    pendingNotice: {
      fromVersion: "1.0.0",
      toVersion: "1.0.1",
      startedAt: 123_456
    }
  });
});

test("npx-local auto update check without opt-in emits an update notice and never spawns the installer", async () => {
  const { root, pluginRoot } = await makeStorePluginRoot("superloopy-auto-update-optin-");
  await writeFile(join(pluginRoot, "superloopy-install.json"), JSON.stringify({ packageName: "superloopy", version: "1.0.0" }));
  const spawnLogPath = join(root, "spawn.log");
  const env = autoUpdateEnv(root, {
    PLUGIN_ROOT: pluginRoot,
    SUPERLOOPY_AUTO_UPDATE_INTERVAL_MS: "0",
    SUPERLOOPY_AUTO_UPDATE_WAIT: "1",
    SUPERLOOPY_AUTO_UPDATE_COMMAND: process.execPath,
    SUPERLOOPY_AUTO_UPDATE_ARGS_JSON: JSON.stringify(["-e", `require("node:fs").writeFileSync(${JSON.stringify(spawnLogPath)}, "ok")`])
  });

  const result = await runAutoUpdateCheck({ env, now: 123_456 });

  assert.equal(result.started, false);
  assert.equal(result.reason, "opt-in-required");
  assert.equal(result.notices.length, 1);
  assert.match(result.notices[0], /Update available/);
  assert.match(result.notices[0], /SUPERLOOPY_AUTO_UPDATE=on/);
  await assert.rejects(readFile(spawnLogPath, "utf8"), { code: "ENOENT" });
  assert.deepEqual(JSON.parse(await readFile(env.SUPERLOOPY_AUTO_UPDATE_STATE_PATH, "utf8")), {
    lastCheckedAt: 123_456,
    lastStatus: "success"
  });
});
