import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const REQUIRED_SECTIONS = ["Design Decisions", "Compatibility Boundary", "Decision Log"];
const REQUIRED_DECISIONS = ["gate-shape-compatibility", "actor-field-policy", "native-naming", "recorded-thresholds"];

export async function checkDesignAudit(cwd, options) {
  const path = join(cwd, options.auditPath);
  if (!existsSync(path)) return fail(`Missing ${options.auditPath}.`);
  try {
    const audit = await readFile(path, "utf8");
    const rows = parseDecisionRows(audit);
    const rowByDecision = new Map(rows.map((row) => [row.decision, row]));
    const missingSections = REQUIRED_SECTIONS.filter((section) => !audit.includes(`## ${section}`));
    const missingDecisions = REQUIRED_DECISIONS.filter((decision) => !rowByDecision.has(decision));
    const incompleteRows = rows
      .filter((row) => row.reason.length === 0 || row.effect.length === 0 || row.guard.length === 0)
      .map((row) => row.decision);

    if (missingSections.length > 0) {
      return designAuditFail(`Design audit missing sections: ${missingSections.join(", ")}.`, options, rows, missingSections, missingDecisions, incompleteRows);
    }
    if (missingDecisions.length > 0) {
      return designAuditFail(`Design audit missing required decisions: ${missingDecisions.join(", ")}.`, options, rows, missingSections, missingDecisions, incompleteRows);
    }
    if (incompleteRows.length > 0) {
      return designAuditFail(`Design audit rows missing reason, effect, or guard: ${incompleteRows.join(", ")}.`, options, rows, missingSections, missingDecisions, incompleteRows);
    }
    return designAuditPass(options, rows, missingSections, missingDecisions, incompleteRows);
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

function designAuditPass(options, rows, missingSections, missingDecisions, incompleteRows) {
  return {
    ok: true,
    auditPath: options.auditPath,
    rows: rows.length,
    requiredRows: REQUIRED_DECISIONS.length,
    missingSections,
    missingDecisions,
    incompleteRows
  };
}

function designAuditFail(message, options, rows, missingSections, missingDecisions, incompleteRows) {
  return {
    ...designAuditPass(options, rows, missingSections, missingDecisions, incompleteRows),
    ok: false,
    message
  };
}

function parseDecisionRows(audit) {
  return audit
    .split("\n")
    .filter((line) => line.startsWith("| `"))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 4 && /^`[^`]+`$/u.test(cells[0]))
    .map((cells) => ({
      decision: cells[0].slice(1, -1),
      reason: cells[1],
      effect: cells[2],
      guard: cells[3]
    }));
}

function fail(message) {
  return { ok: false, message };
}
