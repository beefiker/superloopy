import { existsSync, lstatSync, readFileSync, realpathSync, statSync } from "node:fs";
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
    relativePath: repoRelativePath(`${evidenceRelativeDir(scope)}/${rel}`)
  };
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
