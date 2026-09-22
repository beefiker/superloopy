// Exclusive evidence publication: private-directory staging, no-follow descriptor writes, an
// atomic rename commit point, and shared path-confinement primitives. Split from artifacts.js so
// the shared gate module stays reviewable; artifacts.js re-exports the public surface.
import { constants, lstatSync, readdirSync, realpathSync, watch } from "node:fs";
import { chmod, link, mkdir, open, rename, rm, rmdir } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { SUPERLOOPY_DIR, withFileLock } from "./store.js";

export function isPathInsideDirectory(filePath, directoryPath) {
  const rel = relative(directoryPath, filePath);
  return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
}
// One lock target per project, kept inside .superloopy so the .lock file is covered by the
// runtime gitignore boundary and any crash residue stays out of the user's tracked tree.
// Callers validate the .superloopy path for symlinks before acquiring the lock.
export function evidencePublicationLockTarget(projectRootPath) {
  return join(realpathSync(projectRootPath), SUPERLOOPY_DIR, "evidence-publication");
}

export async function writeEvidenceOutputFileExclusive(artifact, content, options = "utf8") {
  const finalDirectory = dirname(artifact.absolutePath);
  const publishRoot = dirname(finalDirectory);
  if (!isPathInsideDirectory(publishRoot, artifact.rootPath)) {
    throw new Error(`Exclusive evidence publication requires a <group>/<report>/<file> path below the evidence root: ${artifact.relativePath}`);
  }
  rejectOutputTargetForWrite(artifact);
  await mkdir(publishRoot, { recursive: true });
  rejectOutputTargetForWrite(artifact);
  return withFileLock(evidencePublicationLockTarget(artifact.projectRootPath), () => writeEvidenceOutputFileExclusiveLocked(artifact, content, options, finalDirectory, publishRoot), { timeoutMs: 60000 });
}

async function writeEvidenceOutputFileExclusiveLocked(artifact, content, options, finalDirectory, publishRoot) {
  rejectOutputTargetForWrite(artifact);
  const publishRootHandle = await openConfinedDirectory(artifact, publishRoot);
  const stageDirectory = join(
    publishRoot,
    `.${basename(finalDirectory)}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`,
  );
  let stageDirectoryHandle, stageDirectoryStat, stagedArtifact, openedFile, claimStat;
  let scrubAnchor, scrubHandle, scrubPath;
  // rename() is the commit point: before it, every failure rolls the staging back; after it, the
  // report is published and NOTHING below may truncate or remove it — finalization failures
  // surface as errors the caller reconciles through recover.
  let renamed = false;
  try {
    claimStat = await claimFinalDirectory(artifact, finalDirectory);
    assertDirectoryConfined(artifact, finalDirectory, claimStat);
    await mkdir(stageDirectory, { mode: 0o700 });
    stageDirectoryStat = lstatSync(stageDirectory, { bigint: true });
    stageDirectoryHandle = await openConfinedDirectory(artifact, stageDirectory, stageDirectoryStat);
    stagedArtifact = {
      ...artifact,
      absolutePath: join(stageDirectory, basename(artifact.absolutePath)),
    };
    openedFile = await guardDirectoryIdentityDuringWrite(
      artifact,
      stageDirectory,
      stageDirectoryStat,
      async (signal, assertGuard) => {
        const file = await writeOpenedExclusiveFile(stagedArtifact, content, options, signal, assertGuard);
        try {
          await syncDirectoryHandle(stageDirectoryHandle);
          return file;
        } catch (error) {
          await scrubOpenedFile(file.handle);
          await file.handle.close().catch(() => {});
          throw error;
        }
      },
    );
    assertDirectoryConfined(artifact, stageDirectory, stageDirectoryStat);
    rejectOutputTargetForWrite(artifact);
    if (process.platform === "win32") {
      await chmod(stageDirectory, 0o777 & ~process.umask());
    } else {
      await openedFile.handle.chmod(0o444);
      await openedFile.handle.sync();
      // Widen the 0o700 staging mode to the umask default before the rename commit so the
      // published directory is readable by the identities the deployment allows (the pre-split
      // code published 0o555; plain 0o700 would hide evidence from separate-identity gates).
      await stageDirectoryHandle.chmod(0o777 & ~process.umask());
    }
    assertDirectoryConfined(artifact, stageDirectory, stageDirectoryStat);
    await syncDirectoryHandle(stageDirectoryHandle);
    if (process.platform === "win32") {
      scrubAnchor = `${stageDirectory}.scrub`;
      scrubPath = scrubAnchor;
      await link(stagedArtifact.absolutePath, scrubAnchor);
      const anchorStat = lstatSync(scrubAnchor, { bigint: true });
      if (!sameFile(openedFile.openedStat, anchorStat) || !anchorStat.isFile()) {
        throw new Error(`Evidence artifact scrub anchor changed during exclusive creation: ${artifact.relativePath}`);
      }
      await syncDirectoryHandle(publishRootHandle);
      await openedFile.handle.close();
      openedFile.handle = null;
      assertDirectoryConfined(artifact, stageDirectory, stageDirectoryStat);
    }
    let claimNow;
    try {
      claimNow = lstatSync(finalDirectory, { bigint: true });
    } catch {
      throw new Error(`Evidence artifact directory changed during exclusive creation: ${artifact.relativePath}`);
    }
    if (!sameFile(claimStat, claimNow)) {
      throw new Error(`Evidence artifact already exists: ${artifact.relativePath}`);
    }
    // Windows rename cannot replace the claim directory; POSIX rename replaces it atomically.
    if (process.platform === "win32") await rmdir(finalDirectory);
    try {
      await rename(stageDirectory, finalDirectory);
    } catch (error) {
      // A win32 EACCES/EPERM is a conflict only when something actually occupies the target;
      // a genuine ACL denial (nothing there — the claim was just removed) surfaces raw so the
      // operator is not sent into a contradictory write-says-exists/recover-says-missing loop.
      const conflict = ["EEXIST", "ENOTDIR", "ENOTEMPTY"].includes(error?.code)
        || (process.platform === "win32" && ["EACCES", "EPERM"].includes(error?.code) && lstatNoFollow(finalDirectory) !== null);
      if (conflict) {
        throw new Error(`Evidence artifact already exists: ${artifact.relativePath}`);
      }
      throw error;
    }
    renamed = true;
    if (process.platform === "win32") {
      scrubHandle = await openVerifiedAnchor(scrubAnchor, openedFile.openedStat);
      await scrubHandle.chmod(0o444);
      await scrubHandle.sync();
    }
    await syncDirectoryHandle(publishRootHandle);
    assertOpenedTargetConfined(artifact, openedFile.openedStat);
    if (scrubAnchor) {
      await rm(scrubAnchor);
      scrubAnchor = undefined;
      await scrubHandle.chmod(0o444);
      await scrubHandle.sync();
      await syncDirectoryHandle(publishRootHandle);
      const committedStat = await scrubHandle.stat({ bigint: true });
      if (!sameFile(openedFile.openedStat, committedStat) || (committedStat.mode & 0o222n) !== 0n) {
        throw new Error(`Evidence artifact did not remain read-only during exclusive creation: ${artifact.relativePath}`);
      }
      assertOpenedTargetConfined(artifact, openedFile.openedStat);
    }
    await scrubHandle?.close().catch(() => {});
    scrubHandle = null;
  } finally {
    if (!renamed && openedFile?.handle) await scrubOpenedFile(openedFile.handle);
    if (!renamed && scrubHandle) await scrubOpenedFile(scrubHandle);
    if (!renamed && !openedFile?.handle && !scrubHandle && scrubPath && openedFile) {
      await scrubAnchorIfSame(scrubPath, openedFile.openedStat);
    }
    await openedFile?.handle?.close().catch(() => {});
    await scrubHandle?.close().catch(() => {});
    await stageDirectoryHandle?.close().catch(() => {});
    if (!renamed && stageDirectoryStat) {
      await removeStageDirectoryIfStillConfined(artifact, stageDirectory, stageDirectoryStat);
    }
    if (!renamed && claimStat) await removeClaimIfStillEmpty(finalDirectory, claimStat);
    // Pre-commit anchors are staging litter; a post-commit anchor is left for recover, which
    // removes it under the lock and restores the report mode (rm would flip it on Windows).
    if (scrubAnchor && !renamed) await rm(scrubAnchor, { force: true }).catch(() => {});
    await publishRootHandle.close().catch(() => {});
  }
}

// mkdir is the atomic claim on the final directory name. An existing EMPTY directory holds no
// report — a crashed claim or a pre-created empty path — and is adopted after confinement checks;
// anything else fails closed so an existing report is never replaced.
async function claimFinalDirectory(artifact, finalDirectory) {
  try {
    await mkdir(finalDirectory, { mode: 0o700 });
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
    let empty = false;
    try {
      const existing = lstatSync(finalDirectory);
      empty = existing.isDirectory() && !existing.isSymbolicLink() && readdirSync(finalDirectory).length === 0;
    } catch {
      empty = false;
    }
    if (!empty) throw new Error(`Evidence artifact already exists: ${artifact.relativePath}`);
  }
  return lstatSync(finalDirectory, { bigint: true });
}

async function removeClaimIfStillEmpty(finalDirectory, claimStat) {
  try {
    const current = lstatSync(finalDirectory, { bigint: true });
    if (!sameFile(claimStat, current) || !current.isDirectory()) return;
    await rmdir(finalDirectory);
  } catch {
    // Leave an uncertain claim in place; an empty claim is adopted by the next attempt.
  }
}
async function writeOpenedExclusiveFile(artifact, content, options, signal, assertGuard) {
  const flags = constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW ?? 0);
  let handle;
  try {
    handle = await open(artifact.absolutePath, flags, 0o666);
  } catch (error) {
    if (error?.code === "EEXIST") {
      throw new Error(`Evidence artifact already exists: ${artifact.relativePath}`);
    }
    throw error;
  }

  let openedStat, completed = false;
  try {
    openedStat = await handle.stat({ bigint: true });
    assertOpenedTargetConfined(artifact, openedStat);
    await handle.writeFile(content, writeOptionsWithSignal(options, signal));
    await handle.sync();
    assertGuard();
    completed = true;
    return { handle, openedStat };
  } finally {
    if (!completed) {
      await scrubOpenedFile(handle);
      await handle.close();
      if (openedStat) await removeOpenedTargetIfStillConfined(artifact, openedStat);
    }
  }
}

async function scrubOpenedFile(handle) {
  try {
    await handle.truncate(0);
    await handle.sync();
  } catch {
    // Preserve the original failure; the same writable descriptor gets the safest cleanup available.
  }
}

// O_NOFOLLOW is undefined on the only platform that reaches these anchor opens (win32), so an
// explicit lstat rejects a swapped-in symlink before the open; the post-open stat comparison
// still guards the non-symlink swap on volumes that report real inode identity.
function rejectSymlinkAnchor(path) {
  const linkStat = lstatNoFollow(path);
  if (!linkStat || linkStat.isSymbolicLink() || !linkStat.isFile()) {
    throw new Error("Evidence artifact scrub anchor changed during exclusive creation.");
  }
}

async function scrubAnchorIfSame(path, openedStat) {
  let handle;
  try {
    rejectSymlinkAnchor(path);
    const flags = constants.O_WRONLY | (constants.O_NOFOLLOW ?? 0);
    handle = await open(path, flags);
    const anchorStat = await handle.stat({ bigint: true });
    if (!sameFile(openedStat, anchorStat) || !anchorStat.isFile()) return;
    await scrubOpenedFile(handle);
  } catch {
    // Preserve the publication failure; never follow or scrub a replacement anchor.
  } finally {
    await handle?.close().catch(() => {});
  }
}

async function openVerifiedAnchor(path, openedStat) {
  let handle;
  try {
    rejectSymlinkAnchor(path);
    const flags = constants.O_WRONLY | (constants.O_NOFOLLOW ?? 0);
    handle = await open(path, flags);
    const anchorStat = await handle.stat({ bigint: true });
    if (!sameFile(openedStat, anchorStat) || !anchorStat.isFile()) throw new Error("Evidence artifact scrub anchor changed during exclusive creation.");
    return handle;
  } catch (error) {
    await handle?.close().catch(() => {});
    throw error;
  }
}

async function openConfinedDirectory(artifact, path, expectedStat = undefined) {
  const flags = constants.O_RDONLY | (constants.O_DIRECTORY ?? 0) | (constants.O_NOFOLLOW ?? 0);
  let handle;
  try {
    handle = await open(path, flags);
  } catch (error) {
    if (process.platform !== "win32" || !["EACCES", "EISDIR", "EPERM"].includes(error?.code)) throw error;
    const pathStat = expectedStat ?? lstatSync(path, { bigint: true });
    assertDirectoryConfined(artifact, path, pathStat);
    return { chmod: async (mode) => chmod(path, mode), close: async () => {}, sync: async () => {} };
  }
  try {
    const openedStat = await handle.stat({ bigint: true });
    const pathStat = expectedStat ?? lstatSync(path, { bigint: true });
    if (!openedStat.isDirectory() || !sameFile(openedStat, pathStat)) {
      throw new Error(`Evidence artifact directory changed during exclusive creation: ${artifact.relativePath}`);
    }
    assertDirectoryConfined(artifact, path, openedStat);
    return handle;
  } catch (error) {
    await handle.close();
    throw error;
  }
}

async function guardDirectoryIdentityDuringWrite(artifact, path, expectedStat, operation) {
  const controller = new AbortController();
  let guardError;
  const verify = () => {
    if (guardError) return;
    try {
      assertDirectoryConfined(artifact, path, expectedStat);
    } catch (error) {
      guardError = error;
      controller.abort(error);
    }
  };
  let watcher;
  try {
    watcher = watch(dirname(path), { persistent: false }, verify);
    watcher.on("error", () => {
      watcher?.close();
      watcher = undefined;
    });
  } catch {
    // Polling below remains the portable identity guard when watching is unavailable.
  }
  const timer = setInterval(verify, 5);
  timer.unref();
  const assertGuard = () => {
    verify();
    if (guardError) throw guardError;
  };
  try {
    const result = await operation(controller.signal, assertGuard);
    assertGuard();
    return result;
  } catch (error) {
    if (guardError) throw guardError;
    throw error;
  } finally {
    clearInterval(timer);
    watcher?.close();
  }
}

// Filesystems that cannot fsync a directory (several FUSE/network mounts, Docker Desktop bind
// mounts, WSL2 drvfs) report EINVAL/ENOSYS/ENOTSUP; treat that as "no directory durability
// available" everywhere instead of failing the publication. Windows additionally rejects
// directory handles outright with the broader set below.
const DIRECTORY_SYNC_UNSUPPORTED_CODES = ["EINVAL", "ENOSYS", "ENOTSUP"];
const WINDOWS_DIRECTORY_SYNC_TOLERATED_CODES = [...DIRECTORY_SYNC_UNSUPPORTED_CODES, "EACCES", "EBADF", "EISDIR", "EPERM"];

async function syncDirectoryHandle(handle) {
  try {
    await handle.sync();
  } catch (error) {
    const tolerated = process.platform === "win32" ? WINDOWS_DIRECTORY_SYNC_TOLERATED_CODES : DIRECTORY_SYNC_UNSUPPORTED_CODES;
    if (!tolerated.includes(error?.code)) throw error;
  }
}

// Shared no-follow directory sync for evidence consumers (the backend recover path), so the
// open-fallback and errno policy cannot diverge from the publication path above.
export async function syncEvidenceDirectory(path) {
  let handle;
  try {
    handle = await open(path, constants.O_RDONLY | (constants.O_DIRECTORY ?? 0) | (constants.O_NOFOLLOW ?? 0));
  } catch (error) {
    if (process.platform === "win32" && ["EACCES", "EISDIR", "EPERM"].includes(error?.code)) return;
    throw error;
  }
  try {
    await syncDirectoryHandle(handle);
  } finally {
    await handle.close().catch(() => {});
  }
}

function writeOptionsWithSignal(options, signal) {
  if (typeof options === "string") return { encoding: options, signal };
  return { ...(options ?? {}), signal };
}

function assertDirectoryConfined(artifact, path, openedStat) {
  rejectSymlinkInExistingPath(artifact.projectRootPath, path, artifact.relativePath);
  let directoryStat;
  try {
    directoryStat = lstatSync(path, { bigint: true });
  } catch {
    throw new Error(`Evidence artifact directory changed during exclusive creation: ${artifact.relativePath}`);
  }
  if (!sameFile(openedStat, directoryStat) || !directoryStat.isDirectory()) {
    throw new Error(`Evidence artifact directory changed during exclusive creation: ${artifact.relativePath}`);
  }
  const realProject = realpathSync(artifact.projectRootPath);
  const realRoot = realpathSync(artifact.rootPath);
  const realDirectory = realpathSync(path);
  if (!isPathInsideDirectory(realRoot, realProject) || !isPathInsideDirectory(realDirectory, realRoot)) {
    throw new Error("Evidence artifact directory must remain confined during exclusive creation.");
  }
}

async function removeStageDirectoryIfStillConfined(artifact, stageDirectory, openedStat) {
  try {
    assertDirectoryConfined(artifact, stageDirectory, openedStat);
    await rm(stageDirectory, { recursive: true, force: true });
  } catch {
    // Never recursively remove a path whose original directory identity was lost.
  }
}

function assertOpenedTargetConfined(artifact, openedStat) {
  rejectOutputTargetForWrite(artifact);
  const targetStat = lstatSync(artifact.absolutePath, { bigint: true });
  if (!sameFile(openedStat, targetStat) || !targetStat.isFile()) {
    throw new Error(`Evidence artifact changed during exclusive creation: ${artifact.relativePath}`);
  }
  const realProject = realpathSync(artifact.projectRootPath);
  const realRoot = realpathSync(artifact.rootPath);
  const realTarget = realpathSync(artifact.absolutePath);
  if (!isPathInsideDirectory(realRoot, realProject) || !isPathInsideDirectory(realTarget, realRoot)) {
    throw new Error("Evidence artifact must remain confined during exclusive creation.");
  }
}

async function removeOpenedTargetIfStillConfined(artifact, openedStat) {
  try {
    const targetStat = lstatSync(artifact.absolutePath, { bigint: true });
    if (!sameFile(openedStat, targetStat)) return;
    assertOpenedTargetConfined(artifact, openedStat);
    await rm(artifact.absolutePath, { force: true });
  } catch {
    // A failed write is never reported as a receipt; remove only the same confined inode.
  }
}

function sameFile(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

export function rejectOutputTargetForWrite(artifact) {
  if (artifact.projectRootPath) {
    rejectSymlinkInExistingPath(artifact.projectRootPath, artifact.absolutePath, artifact.relativePath);
  }
  const targetStat = lstatNoFollow(artifact.absolutePath);
  if (!targetStat) return;
  if (targetStat.isSymbolicLink()) {
    throw new Error(`Evidence artifact write target must not be a symlink: ${artifact.relativePath}`);
  }
  if (!targetStat.isFile()) {
    throw new Error(`Evidence artifact is not a file: ${artifact.relativePath}`);
  }
}

export function lstatNoFollow(path) {
  try {
    return lstatSync(path);
  } catch {
    return null;
  }
}

export function rejectSymlinkInExistingPath(root, target, artifactPath) {
  const rel = relative(root, target);
  const segments = rel.split(/[\\/]+/u).filter(Boolean);
  let cursor = resolve(root);
  for (const segment of segments) {
    cursor = join(cursor, segment);
    const stat = lstatNoFollow(cursor);
    if (!stat) continue;
    if (stat.isSymbolicLink()) {
      throw new Error(`Evidence artifact must not cross a symlink: ${artifactPath}`);
    }
  }
}
