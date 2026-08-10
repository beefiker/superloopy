import { constants, existsSync, lstatSync, readFileSync, realpathSync, statSync, watch } from "node:fs";
import { chmod, link, mkdir, open, rename, rm } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { validateAuditSection } from "./audit-verdict.js";
import { isMatrixQualityGate, validateMatrixQualityGate } from "./matrix-gate.js";
import { isReviewQualityGate, validateReviewQualityGate } from "./review-gate.js";
import { evidenceDir, evidenceRelativeDir, repoRelativePath } from "./store.js";

// An artifact up to this size must contain non-whitespace to satisfy the content floor;
// larger artifacts (assumed non-trivial) skip the read. Mirrors the SubagentStop hook.
const MAX_BLANK_CHECK_BYTES = 1_000_000;

export function resolveEvidenceArtifact(cwd, artifactPath, scope) {
  if (typeof artifactPath !== "string" || artifactPath.trim().length === 0) {
    throw new Error("Missing evidence artifact path.");
  }
  const root = resolve(evidenceDir(cwd, scope));
  const resolved = isAbsolute(artifactPath) ? resolve(artifactPath) : resolve(cwd, artifactPath);
  const rel = relative(root, resolved);
  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error("Evidence artifact must live under .superloopy/evidence.");
  }
  if (!existsSync(resolved)) {
    throw new Error(`Evidence artifact does not exist: ${artifactPath}`);
  }
  if (lstatSync(resolved).isSymbolicLink()) {
    throw new Error(`Evidence artifact must not be a symlink: ${artifactPath}`);
  }
  const realRoot = realpathSync(root);
  const realArtifact = realpathSync(resolved);
  if (!isPathInsideDirectory(realArtifact, realRoot)) {
    throw new Error("Evidence artifact must resolve under .superloopy/evidence.");
  }
  const stat = statSync(resolved);
  if (!stat.isFile()) {
    throw new Error(`Evidence artifact is not a file: ${artifactPath}`);
  }
  if (stat.size <= 0) {
    throw new Error(`Evidence artifact is empty: ${artifactPath}`);
  }
  // Content floor: a small artifact must carry non-whitespace, so a blank/whitespace-only
  // placeholder cannot satisfy the gate via the CLI (evidence/check/finish) any more than via
  // the SubagentStop hook. Only artifacts above the threshold (assumed non-trivial) skip the read.
  if (stat.size <= MAX_BLANK_CHECK_BYTES && readFileSync(resolved, "utf8").trim().length === 0) {
    throw new Error(`Evidence artifact is blank: ${artifactPath}`);
  }
  return {
    absolutePath: resolved,
    relativePath: repoRelativePath(`${evidenceRelativeDir(scope)}/${rel}`),
    size: stat.size
  };
}

function isPathInsideDirectory(filePath, directoryPath) {
  const rel = relative(directoryPath, filePath);
  return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
}

export function resolveEvidenceOutputPath(cwd, artifactPath, scope) {
  if (typeof artifactPath !== "string" || artifactPath.trim().length === 0) {
    throw new Error("Missing evidence artifact path.");
  }
  const root = resolve(evidenceDir(cwd, scope));
  const resolved = isAbsolute(artifactPath) ? resolve(artifactPath) : resolve(cwd, artifactPath);
  const rel = relative(root, resolved);
  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error("Evidence artifact must live under .superloopy/evidence.");
  }
  rejectSymlinkInExistingPath(cwd, resolved, artifactPath);
  // Threat model: a malicious repo can pre-create the evidence path as a symlink
  // (file OR directory component, including a dangling link) pointing outside the
  // repo; runCaptured() would then write the capture transcript THROUGH the link —
  // an arbitrary file overwrite with attacker-influenced content. Mirror the
  // read-side defense: lstat (not stat/existsSync, which follow links) so dangling
  // symlinks are caught too, reject symlink targets outright, and re-confine the
  // symlink-resolved real destination to the real evidence root before any write.
  const targetStat = lstatNoFollow(resolved);
  if (targetStat) {
    if (targetStat.isSymbolicLink()) {
      throw new Error(`Evidence artifact must not be a symlink: ${artifactPath}`);
    }
    if (!targetStat.isFile()) {
      throw new Error(`Evidence artifact is not a file: ${artifactPath}`);
    }
  }
  if (!isPathInsideDirectory(projectRealPath(resolved), projectRealPath(root))) {
    throw new Error("Evidence artifact must resolve under .superloopy/evidence.");
  }
  return {
    absolutePath: resolved,
    projectRootPath: resolve(cwd),
    rootPath: root,
    relativePath: repoRelativePath(`${evidenceRelativeDir(scope)}/${rel}`)
  };
}

export async function writeEvidenceOutputFile(artifact, content, options = "utf8") {
  const dir = dirname(artifact.absolutePath);
  await mkdir(dir, { recursive: true });
  rejectOutputTargetForWrite(artifact);
  const tmpPath = join(dir, `.${basename(artifact.absolutePath)}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`);
  let handle;
  try {
    handle = await open(tmpPath, "wx", 0o666);
    await handle.writeFile(content, options);
    await handle.close();
    handle = null;
    rejectOutputTargetForWrite(artifact);
    await rename(tmpPath, artifact.absolutePath);
  } catch (error) {
    await rm(tmpPath, { force: true }).catch(() => {});
    throw error;
  } finally {
    if (handle) await handle.close();
  }
}

export async function writeEvidenceOutputFileExclusive(artifact, content, options = "utf8") {
  const finalDirectory = dirname(artifact.absolutePath);
  const publishRoot = dirname(finalDirectory);
  await mkdir(publishRoot, { recursive: true });
  rejectOutputTargetForWrite(artifact);
  rejectExistingPublishedDirectory(finalDirectory, artifact.relativePath);
  const publishRootHandle = await openConfinedDirectory(artifact, publishRoot);
  const stageDirectory = join(
    publishRoot,
    `.${basename(finalDirectory)}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`,
  );
  let stageDirectoryHandle;
  let stageDirectoryStat;
  let stagedArtifact;
  let openedFile;
  let scrubAnchor;
  let scrubPath;
  let published = false;
  try {
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
    rejectExistingPublishedDirectory(finalDirectory, artifact.relativePath);
    if (process.platform === "win32") {
      await chmod(stageDirectory, 0o777 & ~process.umask());
    } else {
      await stageDirectoryHandle.chmod(0o777 & ~process.umask());
      await openedFile.handle.chmod(0o444);
      await openedFile.handle.sync();
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
    try {
      await rename(stageDirectory, finalDirectory);
    } catch (error) {
      if (error?.code === "EEXIST" || error?.code === "ENOTEMPTY") {
        throw new Error(`Evidence artifact already exists: ${artifact.relativePath}`);
      }
      throw error;
    }
    if (process.platform === "win32") await chmod(artifact.absolutePath, 0o444);
    await syncDirectoryHandle(publishRootHandle);
    assertOpenedTargetConfined(artifact, openedFile.openedStat);
    if (scrubAnchor) {
      await rm(scrubAnchor);
      scrubAnchor = undefined;
    }
    published = true;
  } finally {
    if (!published && openedFile?.handle) await scrubOpenedFile(openedFile.handle);
    if (!published && !openedFile?.handle && scrubPath && openedFile) {
      await scrubAnchorIfSame(scrubPath, openedFile.openedStat);
    }
    await openedFile?.handle?.close().catch(() => {});
    await stageDirectoryHandle?.close().catch(() => {});
    if (!published && stageDirectoryStat) {
      await removeStageDirectoryIfStillConfined(artifact, finalDirectory, stageDirectoryStat);
      await removeStageDirectoryIfStillConfined(artifact, stageDirectory, stageDirectoryStat);
    }
    if (scrubAnchor) {
      await rm(scrubAnchor, { force: true }).catch(() => {});
    }
    await publishRootHandle.close().catch(() => {});
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

  const openedStat = await handle.stat({ bigint: true });
  let completed = false;
  try {
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
      await removeOpenedTargetIfStillConfined(artifact, openedStat);
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

async function scrubAnchorIfSame(path, openedStat) {
  let handle;
  try {
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

async function syncDirectoryHandle(handle) {
  try {
    await handle.sync();
  } catch (error) {
    if (process.platform !== "win32" || !["EBADF", "EINVAL", "ENOTSUP", "EPERM"].includes(error?.code)) {
      throw error;
    }
  }
}

function writeOptionsWithSignal(options, signal) {
  if (typeof options === "string") return { encoding: options, signal };
  return { ...(options ?? {}), signal };
}

function rejectExistingPublishedDirectory(path, artifactPath) {
  if (lstatNoFollow(path)) throw new Error(`Evidence artifact already exists: ${artifactPath}`);
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
  const realProject = realpathSync(artifact.projectRootPath ?? dirname(artifact.rootPath));
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

function rejectOutputTargetForWrite(artifact) {
  if (artifact.projectRootPath || artifact.rootPath) {
    rejectSymlinkInExistingPath(artifact.projectRootPath ?? artifact.rootPath, artifact.absolutePath, artifact.relativePath);
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

function lstatNoFollow(path) {
  try {
    return lstatSync(path);
  } catch {
    return null;
  }
}

function rejectSymlinkInExistingPath(root, target, artifactPath) {
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

// Resolve the deepest existing ancestor through realpath, then re-append the
// not-yet-created suffix. This surfaces symlinked directories anywhere in the
// chain (e.g. .superloopy/evidence itself replaced by a link out of the repo):
// the projected real path lands outside the projected real root and is rejected.
function projectRealPath(path) {
  let existing = path;
  const suffix = [];
  while (!existsSync(existing)) {
    const parent = dirname(existing);
    if (parent === existing) break;
    suffix.unshift(basename(existing));
    existing = parent;
  }
  const real = existsSync(existing) ? realpathSync(existing) : existing;
  return suffix.length > 0 ? join(real, ...suffix) : real;
}

export function validateQualityGate(cwd, value, scope) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Quality gate must be an object.");
  }
  if (isReviewQualityGate(value)) {
    return validateReviewQualityGate(value, (artifactPath) => resolveEvidenceArtifact(cwd, artifactPath, scope).relativePath);
  }
  if (isMatrixQualityGate(value)) {
    return validateMatrixQualityGate(value, (artifactPath) => resolveEvidenceArtifact(cwd, artifactPath, scope).relativePath);
  }
  const artifacts = value.artifacts;
  if (!Array.isArray(artifacts) || artifacts.length === 0) {
    throw new Error("Quality gate requires a non-empty artifacts array.");
  }
  const result = {
    status: value.status === "passed" ? "passed" : fail("Quality gate status must be passed."),
    artifacts: artifacts.map((artifact) => resolveEvidenceArtifact(cwd, artifact, scope))
  };
  // Audit is opt-in for the default gate (mandatory only for review/matrix
  // gates). When SUPERLOOPY_AUDIT=on, require a valid audit section here too.
  if (String(process.env.SUPERLOOPY_AUDIT ?? "off").toLowerCase() === "on") {
    result.audit = validateAuditSection(value.audit, (artifactPath) => resolveEvidenceArtifact(cwd, artifactPath, scope).relativePath);
  }
  return result;
}

function fail(message) {
  throw new Error(message);
}
