import { spawn, spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import {
  DEFAULT_LOCK_STALE_MS,
  acquireLock,
  appendUpdateLog,
  readState,
  resolveLockPath,
  resolveStatePath,
  writeState
} from "./auto-update-state.js";
import {
  compareVersions,
  defaultRunCommandForManualUpdate,
  detectAutoUpdateInstallFlow,
  parsePositiveInteger,
  parseVersion,
  resolveArgs,
  resolveCommand,
  resolveCurrentVersion,
  resolveLatestVersion,
  resolveSuperloopyUpdatePlan
} from "./auto-update-plan.js";
import { resolveSpawnInvocation } from "./spawn-command.js";

const DEFAULT_INTERVAL_MS = 24 * 60 * 60 * 1_000;
const DEFAULT_RETRY_INTERVAL_MS = 30 * 60 * 1_000;

export { resolveSuperloopyUpdatePlan };

export function resolveAutoUpdatePlan({ env = process.env, now = Date.now(), lastCheckedAt, lastAttemptedAt, lastStatus, installFlow } = {}) {
  if (env.SUPERLOOPY_AUTO_UPDATE_DISABLED === "1") {
    return { shouldRun: false, reason: "disabled" };
  }

  const intervalMs = parsePositiveInteger(env.SUPERLOOPY_AUTO_UPDATE_INTERVAL_MS, DEFAULT_INTERVAL_MS);
  const successStatus = lastStatus === undefined || lastStatus === "success";
  if (successStatus && typeof lastCheckedAt === "number" && intervalMs > 0 && now - lastCheckedAt < intervalMs) {
    return { shouldRun: false, reason: "throttled" };
  }
  const retryIntervalMs = parsePositiveInteger(env.SUPERLOOPY_AUTO_UPDATE_RETRY_INTERVAL_MS, DEFAULT_RETRY_INTERVAL_MS);
  if (!successStatus && typeof lastAttemptedAt === "number" && retryIntervalMs > 0 && now - lastAttemptedAt < retryIntervalMs) {
    return { shouldRun: false, reason: "retry-throttled" };
  }

  const flow = installFlow ?? detectAutoUpdateInstallFlow(env).flow;
  if (flow === "marketplace") return { shouldRun: false, reason: "marketplace-flow" };
  if (flow === "checkout") return { shouldRun: false, reason: "checkout-flow" };

  const currentVersion = resolveCurrentVersion(env);
  const latestVersion = resolveLatestVersion(env);
  const updatePlan = resolveSuperloopyUpdatePlan({
    currentVersion,
    latestVersion,
    command: resolveCommand(env),
    args: resolveArgs(env)
  });
  if (!updatePlan.shouldUpdate) return { shouldRun: false, reason: updatePlan.reason };

  // Auto-EXECUTION is opt-in. The updater runs code fetched from the npm
  // registry (`npx superloopy@latest`) in the background with no signature or
  // integrity pinning beyond the dist-tag — a compromised package/account would
  // execute silently on SessionStart. Default is therefore notice-only: the
  // version check still runs and the user is told an update exists, but nothing
  // executes unless the user explicitly set SUPERLOOPY_AUTO_UPDATE=on.
  if (String(env.SUPERLOOPY_AUTO_UPDATE ?? "").toLowerCase() !== "on") {
    return { shouldRun: false, reason: "opt-in-required", currentVersion, latestVersion };
  }

  return {
    shouldRun: true,
    command: updatePlan.command,
    args: updatePlan.args,
    currentVersion,
    latestVersion,
    env: {
      ...env,
      SUPERLOOPY_AUTO_UPDATE_DISABLED: "1"
    }
  };
}

export async function runSuperloopyManualUpdate({ env = process.env, dryRun = false, log = console.log, runCommand } = {}) {
  const commandRunner = runCommand ?? defaultRunCommandForManualUpdate;
  const currentVersion = resolveCurrentVersion(env);
  const latestVersion = resolveLatestVersion(env);
  const plan = resolveSuperloopyUpdatePlan({
    currentVersion,
    latestVersion,
    command: resolveCommand(env),
    args: resolveArgs(env)
  });
  if (!plan.shouldUpdate) {
    const printableVersion = currentVersion ?? "unknown";
    log(plan.reason === "up-to-date"
      ? `superloopy ${printableVersion} is already up to date.`
      : `Unable to check Superloopy updates (${plan.reason}).`);
    return plan.reason === "up-to-date" ? 0 : 1;
  }
  if (dryRun) {
    log(`${plan.command} ${plan.args.join(" ")}`);
    return 0;
  }
  await commandRunner(plan.command, plan.args, { cwd: process.cwd(), env });
  return 0;
}

export async function runAutoUpdateCheck({ env = process.env, now = Date.now() } = {}) {
  const statePath = resolveStatePath(env);
  const notices = [];
  const state = await settlePendingNotice({ env, now, statePath, state: await readState(statePath), notices });
  const installFlow = detectAutoUpdateInstallFlow(env);
  if (installFlow.flow === "unknown") {
    await appendUpdateLog(env, now, "install-flow-unknown", { reason: installFlow.reason });
  }
  const plan = resolveAutoUpdatePlan({
    env,
    now,
    lastCheckedAt: state.lastCheckedAt,
    lastAttemptedAt: state.lastAttemptedAt,
    lastStatus: state.lastStatus,
    installFlow: installFlow.flow
  });
  if (!plan.shouldRun) {
    if (plan.reason === "marketplace-flow") {
      await appendUpdateLog(env, now, "skipped", { kind: "marketplace-flow" });
      await writeState(statePath, { ...state, lastCheckedAt: now, lastStatus: "success" });
      notices.push(formatMarketplaceFlowNotice(resolveUpdateContext({ env })));
      return { started: false, reason: plan.reason, notices };
    }
    if (plan.reason === "checkout-flow") {
      return { started: false, reason: plan.reason, notices };
    }
    if (plan.reason === "opt-in-required") {
      // Update exists but auto-exec is not opted in: surface a notice and mark
      // the check successful so the daily throttle applies (no per-session nag).
      await appendUpdateLog(env, now, "skipped", { kind: "opt-in-required" });
      await writeState(statePath, { ...state, lastCheckedAt: now, lastStatus: "success" });
      notices.push(formatOptInRequiredNotice(plan));
      return { started: false, reason: plan.reason, notices };
    }
    await appendUpdateLog(env, now, "skipped", { reason: plan.reason });
    if (plan.reason === "up-to-date") {
      await writeState(statePath, { ...state, lastCheckedAt: now, lastStatus: "success" });
    }
    return { started: false, reason: plan.reason, notices };
  }

  const lockStaleMs = parsePositiveInteger(env.SUPERLOOPY_AUTO_UPDATE_LOCK_STALE_MS, DEFAULT_LOCK_STALE_MS);
  const lock = await acquireLock(resolveLockPath(env, statePath), now, lockStaleMs);
  if (lock === null) {
    await appendUpdateLog(env, now, "locked");
    return { started: false, reason: "locked", notices };
  }
  try {
    await appendUpdateLog(env, now, "started", { command: plan.command, args: plan.args });
    const pendingNotice = { fromVersion: plan.currentVersion, toVersion: plan.latestVersion, startedAt: now };
    if (env.SUPERLOOPY_AUTO_UPDATE_WAIT === "1") {
      const invocation = resolveSpawnInvocation(plan.command, plan.args);
      const result = spawnSync(invocation.command, invocation.args, {
        env: plan.env,
        stdio: "ignore"
      });
      const status = result.status ?? (result.error === undefined ? 0 : 1);
      await appendUpdateLog(env, now, "finished", { status });
      if (status === 0) {
        await writeState(statePath, { lastCheckedAt: now, lastAttemptedAt: now, lastStatus: "success", pendingNotice });
        await recordUpdateStartedNotice({ env, now, notices, pendingNotice });
      } else {
        await writeState(statePath, { lastAttemptedAt: now, lastStatus: "failed" });
      }
      return { started: true, status, notices };
    }

    const invocation = resolveSpawnInvocation(plan.command, plan.args);
    const child = spawn(invocation.command, invocation.args, {
      env: plan.env,
      stdio: "ignore",
      detached: true
    });
    await writeState(statePath, { lastAttemptedAt: now, lastStatus: "started", pendingNotice });
    await recordUpdateStartedNotice({ env, now, notices, pendingNotice });
    child.unref();
    return { started: true, notices };
  } finally {
    await lock.release();
  }
}

function formatMarketplaceFlowNotice(updateContext) {
  const versionText = updateContext.shouldUpdate
    ? `A newer Superloopy version is available: v${updateContext.currentVersion ?? "unknown"} -> v${updateContext.latestVersion}.`
    : "No newer Superloopy version was confirmed during this check.";
  return [
    "[Superloopy] Auto-update skipped: this Superloopy install is managed by the Codex plugin marketplace, so npx self-update was not started.",
    versionText,
    "Tell the user, in the user's preferred tone, to upgrade with `codex plugin marketplace upgrade beefiker` when they want the update, and explain that Codex will require hook re-approval after the upgrade."
  ].join(" ");
}

function formatOptInRequiredNotice({ currentVersion, latestVersion }) {
  return [
    `[Superloopy] Update available: v${currentVersion ?? "unknown"} -> v${latestVersion}.`,
    "Background auto-install is opt-in (it executes code fetched from npm).",
    "Tell the user they can update now with `npx --yes superloopy@latest install --force`,",
    "or enable background auto-updates by setting SUPERLOOPY_AUTO_UPDATE=on."
  ].join(" ");
}

function formatUpdateStartedNotice({ pendingNotice }) {
  return [
    `[Superloopy] Auto-update started in the background: v${pendingNotice.fromVersion} -> v${pendingNotice.toVersion}.`,
    "Tell the user, in the user's preferred tone, that a new Superloopy version is installing; recommend starting a new Codex session after it completes to apply the update."
  ].join(" ");
}

async function settlePendingNotice({ env, now, statePath, state, notices }) {
  const pendingNotice = state.pendingNotice;
  if (pendingNotice === undefined) return state;
  const current = parseVersion(resolveCurrentVersion(env));
  const target = parseVersion(pendingNotice.toVersion);
  if (current !== null && target !== null && compareVersions(current, target) < 0) return state;
  const nextState = { ...state };
  delete nextState.pendingNotice;
  await writeState(statePath, nextState);
  if (current !== null && target !== null) {
    notices.push(`[Superloopy] Auto-update completed: v${pendingNotice.fromVersion} -> v${pendingNotice.toVersion}. This session is already running the new version. Tell the user the auto-update was applied.`);
    await appendUpdateLog(env, now, "notified", {
      kind: "update-completed",
      fromVersion: pendingNotice.fromVersion,
      toVersion: pendingNotice.toVersion
    });
  }
  return nextState;
}

async function recordUpdateStartedNotice({ env, now, notices, pendingNotice }) {
  notices.push(formatUpdateStartedNotice({ pendingNotice }));
  await appendUpdateLog(env, now, "notified", {
    kind: "update-started",
    fromVersion: pendingNotice.fromVersion,
    toVersion: pendingNotice.toVersion
  });
}

function resolveUpdateContext({ env }) {
  const currentVersion = resolveCurrentVersion(env);
  const latestVersion = resolveLatestVersion(env);
  const plan = resolveSuperloopyUpdatePlan({ currentVersion, latestVersion });
  return { currentVersion, latestVersion, shouldUpdate: plan.shouldUpdate };
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runAutoUpdateCheck()
    .then(({ notices }) => {
      if (notices.length === 0) return;
      console.log(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "SessionStart",
          additionalContext: notices.join("\n\n")
        }
      }));
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(0);
    });
}
