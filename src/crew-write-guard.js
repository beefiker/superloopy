// Host-enforced write scope for Superloopy's non-implementing crew lanes on Claude Code.
//
// sentinel, probe, arbiter, and assayer may write only their own report/verdict artifacts. Their
// frontmatter already strips Edit/NotebookEdit (assayer keeps no shell at all); this PreToolUse
// guard covers the file-writing tools that remain, denying any target outside the active evidence
// root. Claude fires plugin PreToolUse hooks inside subagents with `agent_type` set to the
// plugin-scoped name (`superloopy:sentinel`), so a parent-session write is never affected.
//
// Not covered: shell redirection from lanes that keep Bash (sentinel, probe, arbiter need it to
// run tests and the Superloopy CLI). Codex exposes no path-scoped sandbox (`read-only` would also
// block the report), so these lanes stay prompt-guarded there. The completion floor still decides.
import { isAbsolute, resolve } from "node:path";
import { projectRealPath, resolveEvidenceOutputPath } from "./artifacts.js";
import { matchesAgentType } from "./receipt.js";
import { scopeFromSessionId } from "./store.js";
import { resolveWorkspaceRoot } from "./workspace-identity.js";

export const WRITE_SCOPED_ROLES = ["sentinel", "probe", "arbiter", "assayer"];
const FILE_WRITE_TOOLS = new Set(["Write", "Edit", "MultiEdit", "NotebookEdit"]);

// Returns a deny reason, or null when the call is not a scoped crew write or stays in bounds.
export function crewWriteDenial(payload, host) {
  if (!FILE_WRITE_TOOLS.has(payload.tool_name)) return null;
  const role = WRITE_SCOPED_ROLES.find((name) => matchesAgentType({ host, agentType: payload.agent_type, role: name }));
  if (role === undefined) return null;
  const input = payload.tool_input;
  const target = input !== null && typeof input === "object" ? input.file_path ?? input.notebook_path : undefined;
  if (typeof target !== "string" || target.trim() === "" || typeof payload.cwd !== "string") {
    return `Superloopy ${role} lane: ${payload.tool_name} call has no resolvable target path; ${role} may write only under the active evidence root.`;
  }
  const root = resolveWorkspaceRoot(payload.cwd);
  // Compare real paths: the host may report /var/... while the workspace root resolves to
  // /private/var/..., and a symlinked directory under the evidence root must count as outside it.
  const realTarget = projectRealPath(isAbsolute(target) ? resolve(target) : resolve(payload.cwd, target));
  for (const scope of [scopeFromSessionId(payload.session_id), undefined]) {
    try {
      resolveEvidenceOutputPath(root, realTarget, scope);
      return null;
    } catch {
      // try the next evidence root
    }
  }
  return `Superloopy ${role} lane is not an implementer: ${payload.tool_name} to ${target} is outside the active evidence root (.superloopy/evidence/). Write only your report or verdict there; leave product files to forge.`;
}
