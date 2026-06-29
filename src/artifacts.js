import { existsSync, lstatSync, readFileSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
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
    throw new Error("Evidence artifact must live under .loopy/evidence.");
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
    throw new Error("Evidence artifact must resolve under .loopy/evidence.");
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
    throw new Error("Evidence artifact must live under .loopy/evidence.");
  }
  if (existsSync(resolved) && !statSync(resolved).isFile()) {
    throw new Error(`Evidence artifact is not a file: ${artifactPath}`);
  }
  return {
    absolutePath: resolved,
    relativePath: repoRelativePath(`${evidenceRelativeDir(scope)}/${rel}`)
  };
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
  // gates). When LOOPY_AUDIT=on, require a valid audit section here too.
  if (String(process.env.LOOPY_AUDIT ?? "off").toLowerCase() === "on") {
    result.audit = validateAuditSection(value.audit, (artifactPath) => resolveEvidenceArtifact(cwd, artifactPath, scope).relativePath);
  }
  return result;
}

function fail(message) {
  throw new Error(message);
}
