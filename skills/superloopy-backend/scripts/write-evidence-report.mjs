#!/usr/bin/env node

import { realpathSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { resolveEvidenceArtifact, resolveEvidenceOutputPath, writeEvidenceOutputFileExclusive } from "../../../src/artifacts.js";
import { evidenceRelativeDir, scopeFromSessionId } from "../../../src/store.js";

const PORTABLE_REPORT_ID = /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/u;
const WINDOWS_RESERVED = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])$/iu;

export function validateReportId(value) {
  if (
    typeof value !== "string"
    || value.length > 128
    || !PORTABLE_REPORT_ID.test(value)
    || WINDOWS_RESERVED.test(value)
  ) {
    throw new Error("report id must be 1-128 ASCII letters/digits joined by single hyphens and must not be a Windows reserved name");
  }
  return value.toLowerCase();
}

export function scopeForEvidenceRoot(value) {
  const normalized = typeof value === "string" ? value.replaceAll("\\", "/").replace(/\/$/u, "") : "";
  if (normalized === evidenceRelativeDir()) return { root: normalized, scope: undefined };

  const match = normalized.match(/^\.superloopy\/sessions\/([^/]+)\/evidence$/u);
  const scope = scopeFromSessionId(match?.[1]);
  if (!scope || evidenceRelativeDir(scope) !== normalized) {
    throw new Error("evidence root must be the active .superloopy/evidence or .superloopy/sessions/<session-id>/evidence root");
  }
  return { root: normalized, scope };
}

export async function writeBackendEvidenceReport({ projectRoot, evidenceRoot, reportId, content }) {
  const workspaceRoot = realpathSync(resolve(projectRoot));
  if (!statSync(workspaceRoot).isDirectory()) throw new Error("project root must be an existing directory");
  const resolvedRoot = scopeForEvidenceRoot(evidenceRoot);
  const safeReportId = validateReportId(reportId);
  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error("backend evidence report must contain non-whitespace content");
  }
  const path = `${resolvedRoot.root}/superloopy-backend/${safeReportId}/backend-skill-report.md`;
  const artifact = resolveEvidenceOutputPath(workspaceRoot, path, resolvedRoot.scope);
  await writeEvidenceOutputFileExclusive(artifact, content, "utf8");
  return artifact.relativePath;
}

export function recoverBackendEvidenceReport({ projectRoot, evidenceRoot, reportId }) {
  const workspaceRoot = realpathSync(resolve(projectRoot));
  if (!statSync(workspaceRoot).isDirectory()) throw new Error("project root must be an existing directory");
  const resolvedRoot = scopeForEvidenceRoot(evidenceRoot);
  const safeReportId = validateReportId(reportId);
  const path = `${resolvedRoot.root}/superloopy-backend/${safeReportId}/backend-skill-report.md`;
  const artifact = resolveEvidenceArtifact(workspaceRoot, path, resolvedRoot.scope);
  const artifactStat = statSync(artifact.absolutePath);
  if (artifactStat.nlink !== 1 || (artifactStat.mode & 0o222) !== 0) {
    throw new Error("existing backend evidence report is not fully committed: expected one read-only file link");
  }
  return artifact.relativePath;
}

async function readStandardInput() {
  process.stdin.setEncoding("utf8");
  let content = "";
  for await (const chunk of process.stdin) content += chunk;
  return content;
}

async function main(argv) {
  const [command, projectRoot, evidenceRoot, reportId, ...extra] = argv;
  if (!projectRoot || !evidenceRoot || !reportId || extra.length > 0 || !["recover", "write"].includes(command)) {
    throw new Error("usage: write-evidence-report.mjs <write|recover> <project-root> <active-evidence-root> <qualified-report-id> [< report.md]");
  }
  const path = command === "write"
    ? await writeBackendEvidenceReport({ projectRoot, evidenceRoot, reportId, content: await readStandardInput() })
    : recoverBackendEvidenceReport({ projectRoot, evidenceRoot, reportId });
  process.stdout.write(`${path}\n`);
}

function isCliEntry(argvPath) {
  if (!argvPath) return false;
  try {
    return realpathSync(argvPath) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isCliEntry(process.argv[1])) {
  try {
    await main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`write-evidence-report: ${error.message}\n`);
    process.exitCode = 2;
  }
}
