# Automatic Upgrade Migration Design

## Goal

After a user installs or upgrades Superloopy through Codex, the next approved Superloopy `SessionStart` must reconcile the command wrapper, the six Codex custom agents, model-routing state, and owned legacy files automatically. Normal migration must not require a user to discover or run a Superloopy repair command.

## Host boundary

Codex installs marketplace plugins into a versioned cache and does not run package lifecycle scripts. The documented plugin bundle supports skills, hooks, apps, MCP configuration, and assets, but not plugin-bundled personal custom-agent TOMLs. Personal custom agents live under `$CODEX_HOME/agents` and therefore still need a host-approved lifecycle action to materialize them.

The supported automatic boundary is the new plugin version's approved `SessionStart` hook. It executes that version's `src/cli.js` directly from the plugin root, so it must perform reconciliation without depending on an older `superloopy` wrapper or asking the user to invoke one.

Codex controls hook approval and process reloads. Superloopy cannot bypass hook review, restart the app, or truthfully claim that an already-running host reloaded changed agent definitions.

## Considered approaches

### 1. SessionStart reconciliation — selected

Run the existing transactional bootstrap on every approved Codex `SessionStart`. Reuse fresh state when nothing changed and automatically update only files whose ownership is proven by a managed marker plus its matching prior-state hash, or by an exact legacy release manifest.

This uses a supported lifecycle surface, is idempotent, and preserves the existing user-edit safety boundary.

### 2. Install-time package scripts — rejected

Running migration during marketplace extraction would avoid the lifecycle boundary, but Codex does not run package lifecycle scripts. Adding an npm script would not cover marketplace upgrades and would create inconsistent behavior between distribution paths.

### 3. Automatic forced replacement — rejected

Overwriting every named TOML would remove conflicts but could destroy user customizations. Superloopy must never trade convenience for silent data loss.

## Reconciliation flow

On every approved Codex `SessionStart`, the hook must:

1. Execute bootstrap from the currently loaded plugin root, independent of the installed wrapper.
2. Repoint a recognized generated Superloopy wrapper to the current plugin CLI. Foreign wrappers remain conflicts.
3. Resolve the current model policy. Reuse a fresh valid resolution; query `model/list` only under the existing cache-expiry, policy-change, target-change, or missing-state rules.
4. Preflight all six owned agent names before any mutation.
5. Automatically adopt a complete exact legacy fleet, including LF/CRLF-equivalent release files.
6. Automatically upgrade a complete managed fleet when its prior state and hashes prove ownership.
7. Commit all changed agent files and routing state transactionally. A failure must not leave a mixed fleet.
8. Stay silent when the wrapper, fleet, and state are already current.

The same reconciliation behavior must be used by direct `superloopy install`, but normal marketplace users must not need that command.

## Conflict behavior

Unrelated personal agent files are outside Superloopy ownership and remain untouched. If any of the six owned names is edited, partial, symlinked, or unknown, automatic migration fails closed for the whole fleet and preserves every original byte and inode covered by the existing transaction guarantees.

The hook may report the conflicting names and explain that Superloopy preserved user changes. It must not automatically add `--force`, overwrite the files, or present a normal upgrade as requiring a repair script. Deliberate replacement remains an exceptional recovery action after the user reviews the conflict.

## User experience

The normal path is:

1. The user installs or upgrades Superloopy through Codex.
2. The user approves changed hooks when Codex requests review.
3. The next session automatically reconciles the wrapper, agents, and routing state.
4. If Codex cannot use changed agent definitions in that same process, Superloopy asks only for a Codex restart; it does not ask the user to run a command.

Successful migration reports the resolved profiles when useful but does not print repair instructions. Unchanged sessions remain quiet. Conflicts describe preserved files without implying that destructive replacement is automatic.

## Testing

Automated coverage must prove:

- an exact pre-managed fleet migrates through `runSessionStartHook` with no flags or manual command;
- LF and CRLF legacy fleets both migrate automatically;
- an older managed fleet and generated wrapper reconcile to the current plugin root;
- a second SessionStart is idempotent, makes no catalog query, rewrites no state, and emits no migration context;
- an edited, partial, mixed, or symlinked owned fleet is preserved and reported as a conflict;
- unrelated personal agents remain byte-for-byte unchanged;
- Claude Code remains a clean no-op because its agents and hooks are plugin-bundled;
- normal upgrade documentation describes automatic reconciliation and does not require a post-upgrade Superloopy command.

## Acceptance criteria

- No normal install or upgrade path instructs users to run `superloopy install`, `superloopy agents install`, or a version-specific Node command to migrate.
- The first approved SessionStart from a new plugin version safely reconciles every proven-owned surface.
- Reconciliation is idempotent and does not weaken managed-file hash, lock, rollback, or conflict guarantees.
- User edits and unrelated personal agents are never overwritten automatically.
- Any remaining restart instruction is explicitly a Codex host reload requirement, not a migration command.
