import { appendFile, mkdir, open, readFile, rm, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export const DEFAULT_LOCK_STALE_MS = 10 * 60 * 1_000;

export function resolveStatePath(env) {
  if (env.SUPERLOOPY_AUTO_UPDATE_STATE_PATH?.trim()) return env.SUPERLOOPY_AUTO_UPDATE_STATE_PATH;
  const dataRoot = env.PLUGIN_DATA?.trim() || join(homedir(), ".local", "share", "superloopy");
  return join(dataRoot, "auto-update.json");
}

export function resolveLogPath(env) {
  if (env.SUPERLOOPY_AUTO_UPDATE_LOG_PATH?.trim()) return env.SUPERLOOPY_AUTO_UPDATE_LOG_PATH;
  const dataRoot = env.PLUGIN_DATA?.trim() || join(homedir(), ".local", "share", "superloopy");
  return join(dataRoot, "auto-update.log");
}

export function resolveLockPath(env, statePath) {
  if (env.SUPERLOOPY_AUTO_UPDATE_LOCK_PATH?.trim()) return env.SUPERLOOPY_AUTO_UPDATE_LOCK_PATH;
  return `${statePath}.lock`;
}

export async function acquireLock(lockPath, now, staleMs = DEFAULT_LOCK_STALE_MS) {
  await mkdir(dirname(lockPath), { recursive: true });
  const token = `${process.pid} ${now}`;
  try {
    const handle = await open(lockPath, "wx");
    await handle.writeFile(`${token}\n`);
    await handle.close();
    return {
      release: () => releaseIfOwned(lockPath, token)
    };
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) throw error;
    if (!(await removeStaleLock(lockPath, now, staleMs))) return null;
    return acquireLock(lockPath, now, 0);
  }
}

export async function readState(statePath) {
  try {
    const raw = await readFile(statePath, "utf8");
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return {};
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid Superloopy auto-update state JSON: ${statePath}`);
    }
    throw error;
  }
}

export async function writeState(statePath, state) {
  await mkdir(dirname(statePath), { recursive: true });
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);
}

export async function appendUpdateLog(env, now, event, details = {}) {
  const logPath = resolveLogPath(env);
  await mkdir(dirname(logPath), { recursive: true });
  const entry = {
    timestamp: new Date(now).toISOString(),
    event,
    ...details
  };
  await appendFile(logPath, `${JSON.stringify(entry)}\n`);
}

async function removeStaleLock(lockPath, now, staleMs) {
  if (staleMs <= 0) return false;
  let content;
  try {
    content = await readFile(lockPath, "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return true;
    throw error;
  }
  const token = parseLockToken(content);
  if (token !== null) {
    try {
      process.kill(token.pid, 0);
      return false;
    } catch (error) {
      if (!(error instanceof Error) || !("code" in error) || error.code !== "ESRCH") return false;
      return await removeIfContentMatches(lockPath, content);
    }
  }
  try {
    const lockStat = await stat(lockPath);
    if (now - lockStat.mtimeMs < staleMs) return false;
    return await removeIfContentMatches(lockPath, content);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return true;
    throw error;
  }
}

function parseLockToken(content) {
  const parts = content.trim().split(/\s+/u);
  if (parts.length < 2) return null;
  const pid = Number.parseInt(parts[0], 10);
  const createdAt = Number.parseInt(parts[1], 10);
  if (!Number.isInteger(pid) || pid <= 0 || !Number.isInteger(createdAt)) return null;
  return { pid, createdAt };
}

async function removeIfContentMatches(lockPath, content) {
  try {
    if (await readFile(lockPath, "utf8") !== content) return false;
    await rm(lockPath, { force: true });
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return true;
    throw error;
  }
}

async function releaseIfOwned(lockPath, token) {
  try {
    if ((await readFile(lockPath, "utf8")).trim() === token) {
      await rm(lockPath, { force: true });
    }
  } catch {
    // best-effort release
  }
}
