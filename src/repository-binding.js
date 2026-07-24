import { isAbsolute, posix } from "node:path";
import { readFlag } from "./args.js";
import {
  appendLedger,
  goalsPath,
  nowIso,
  readPlanUnchecked,
  scopeFromSessionId,
  withFileLock,
  writePlan
} from "./store.js";
import { bindingMatches, createRepositoryBinding, validBinding } from "./workspace-identity.js";

export async function inspectRepositoryBinding(cwd, plan) {
  if (plan.version === 1 && plan.repositoryBinding === undefined) {
    return { status: "legacy_unbound", resumable: false, next: bindCommand(plan.sessionId) };
  }
  if (plan.version !== 2 || !validBinding(plan.repositoryBinding)) {
    return { status: "invalid", resumable: false, next: null };
  }
  if (!(await bindingMatches(cwd, plan.repositoryBinding))) {
    return {
      status: "mismatch",
      resumable: false,
      expected: plan.repositoryBinding.identity.slice(0, 12),
      next: null
    };
  }
  return { status: "bound", resumable: true, rootLabel: plan.repositoryBinding.rootLabel };
}

export async function bindLegacyLoop(cwd, argv = []) {
  if (!argv.includes("--confirm-current-root")) {
    throw new Error("Binding a legacy plan requires --confirm-current-root.");
  }
  const scope = scopeFromSessionId(readFlag(argv, "--session-id"));
  return await withFileLock(goalsPath(cwd, scope), async () => {
    const plan = await readPlanUnchecked(cwd, scope);
    const current = await inspectRepositoryBinding(cwd, plan);
    if (current.status === "bound") return { ok: true, kind: "repository_bound", alreadyBound: true, plan };
    if (current.status !== "legacy_unbound") throw new Error(`Cannot bind plan with repository status: ${current.status}.`);
    validateLegacyPaths(plan);
    const now = nowIso();
    plan.version = 2;
    plan.repositoryBinding = await createRepositoryBinding(cwd);
    plan.updatedAt = now;
    await writePlan(cwd, plan, scope);
    await appendLedger(cwd, {
      at: now,
      kind: "repository_bound",
      identity: plan.repositoryBinding.identity.slice(0, 12),
      rootLabel: plan.repositoryBinding.rootLabel
    }, scope);
    return { ok: true, kind: "repository_bound", alreadyBound: false, plan };
  });
}

function validateLegacyPaths(plan) {
  for (const key of ["briefPath", "evidencePath", "goalsPath", "ledgerPath"]) {
    const value = plan[key];
    if (typeof value !== "string" || value.length === 0 || isAbsolute(value) || value.includes("\\") || escapes(value)) {
      throw new Error(`Cannot bind legacy plan: ${key} must be a confined repository-relative path.`);
    }
  }
}

function escapes(value) {
  const normalized = posix.normalize(value);
  return normalized === ".." || normalized.startsWith("../");
}

function bindCommand(sessionId) {
  const session = typeof sessionId === "string" && sessionId.length > 0 ? ` --session-id ${sessionId}` : "";
  return `superloopy loop bind --confirm-current-root${session} --json`;
}
