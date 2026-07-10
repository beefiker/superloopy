import { constants } from "node:fs";
import { lstat, open } from "node:fs/promises";

const NOFOLLOW = constants.O_NOFOLLOW ?? 0;

export async function installOneTextFile(targetPath, content, force, mode, options = {}) {
  let pathStats;
  try { pathStats = await lstat(targetPath); }
  catch (error) { if (error?.code !== "ENOENT") throw error; }
  if (pathStats === undefined) return createTextFile(targetPath, content, mode);
  if (!pathStats.isFile()) return "conflict";

  const openedForRead = await openVerifiedFile(targetPath, constants.O_RDONLY | NOFOLLOW, pathStats);
  if (openedForRead === null) return "conflict";
  const { handle: readHandle, stats: readStats } = openedForRead;
  try {
    const targetContent = await readHandle.readFile("utf8");
    if (targetContent === content) {
      if (mode !== undefined) await readHandle.chmod(mode);
      return "unchanged";
    }
    if (!force && !options.replaceIf?.(targetContent)) return "conflict";
    await options.beforeReplace?.();
    return replaceTextFile(targetPath, content, mode, readStats);
  } finally {
    await readHandle.close();
  }
}

async function createTextFile(targetPath, content, mode) {
  let handle;
  try { handle = await open(targetPath, "wx"); }
  catch (error) {
    if (isPathRace(error)) return "conflict";
    throw error;
  }
  try {
    await handle.writeFile(content, "utf8");
    if (mode !== undefined) await handle.chmod(mode);
    return "installed";
  } finally {
    await handle.close();
  }
}

async function replaceTextFile(targetPath, content, mode, expectedStats) {
  const openedForWrite = await openVerifiedFile(targetPath, constants.O_WRONLY | NOFOLLOW, expectedStats);
  if (openedForWrite === null) return "conflict";
  const { handle } = openedForWrite;
  try {
    await handle.truncate(0);
    await handle.writeFile(content, "utf8");
    if (mode !== undefined) await handle.chmod(mode);
    return "updated";
  } finally {
    await handle.close();
  }
}

async function openVerifiedFile(path, flags, expectedStats) {
  let handle;
  try { handle = await open(path, flags); }
  catch (error) {
    if (isPathRace(error)) return null;
    throw error;
  }
  try {
    const stats = await handle.stat();
    const currentStats = await lstat(path);
    if (!stats.isFile() || !currentStats.isFile()
      || !sameFile(stats, currentStats) || !sameFile(stats, expectedStats)) {
      await handle.close();
      return null;
    }
    return { handle, stats };
  } catch (error) {
    await handle.close();
    if (isPathRace(error)) return null;
    throw error;
  }
}

function sameFile(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

function isPathRace(error) {
  return error?.code === "EEXIST" || error?.code === "ELOOP" || error?.code === "ENOENT";
}
