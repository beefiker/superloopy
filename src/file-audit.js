import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export async function checkFileAudit(cwd, options) {
  const path = join(cwd, options.auditPath);
  if (!existsSync(path)) return fail(`Missing ${options.auditPath}.`);
  try {
    const audit = await readFile(path, "utf8");
    const files = options.listFiles(cwd);
    const rows = parseAuditRows(audit);
    const rowByFile = new Map(rows.map((row) => [row.file, row]));
    const fileSet = new Set(files);
    const missing = files.filter((file) => !audit.includes(`\`${file}\``));
    const missingRows = files.filter((file) => !rowByFile.has(file));
    const staleRows = rows.map((row) => row.file).filter((file) => !fileSet.has(file));
    const incompleteRows = files.filter((file) => {
      const row = rowByFile.get(file);
      return row !== undefined && (row.role.length === 0 || row.referenceBoundary.length === 0);
    });
    const missingPolicy = [];
    if (!/does not vendor/u.test(audit)) missingPolicy.push("vendor-boundary");
    if (!/Original Loopy role/u.test(audit)) missingPolicy.push("original-role");
    if (!/Loopy-native boundary/u.test(audit)) missingPolicy.push("native-boundary");
    if (missing.length > 0) return fail(`File audit missing entries: ${missing.join(", ")}.`);
    if (missingRows.length > 0) return fileAuditFail(`File audit missing inventory rows: ${missingRows.join(", ")}.`, options, files, rows, missing, missingRows, incompleteRows, staleRows);
    if (staleRows.length > 0) return fileAuditFail(`File audit rows without Git-visible files: ${staleRows.join(", ")}.`, options, files, rows, missing, missingRows, incompleteRows, staleRows);
    if (incompleteRows.length > 0) return fileAuditFail(`File audit rows missing role or reference boundary: ${incompleteRows.join(", ")}.`, options, files, rows, missing, missingRows, incompleteRows, staleRows);
    if (missingPolicy.length > 0) return fail(`File audit missing policy evidence: ${missingPolicy.join(", ")}.`);
    return fileAuditPass(options, files, rows, missing, missingRows, incompleteRows, staleRows);
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

function fileAuditPass(options, files, rows, missing, missingRows, incompleteRows, staleRows) {
  return {
    ok: true,
    auditPath: options.auditPath,
    covered: files.length,
    rows: rows.length,
    missing,
    missingRows,
    incompleteRows,
    staleRows,
    policy: options.policy ?? "loopy-native-boundary"
  };
}

function fileAuditFail(message, options, files, rows, missing, missingRows, incompleteRows, staleRows) {
  return {
    ...fileAuditPass(options, files, rows, missing, missingRows, incompleteRows, staleRows),
    ok: false,
    message
  };
}

function parseAuditRows(audit) {
  return audit
    .split("\n")
    .filter((line) => line.startsWith("| `"))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 3 && /^`[^`]+`$/u.test(cells[0]))
    .map((cells) => ({
      file: cells[0].slice(1, -1),
      role: cells[1],
      referenceBoundary: cells[2]
    }));
}

function fail(message) {
  return { ok: false, message };
}
