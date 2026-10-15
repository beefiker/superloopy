# Superloopy Host Contract

Superloopy does not spawn subagents. It rides the host runtime's native custom-agent and hook
mechanism and gates the result. This document pins what Superloopy expects from the host so drift
is visible and testable.

## Custom agents

`superloopy agents install` copies the bundled agent definitions into the personal Codex agents
directory (`$CODEX_HOME/agents` when set, otherwise `~/.codex/agents`). On Claude Code and Google
Antigravity, agent definitions are bundled within the plugin and ingested directly by the host runtime.
The host spawns them through its native multi-agent dispatch when the parent delegates: the receipt workers
`forge`, `sentinel`, `probe`, `arbiter`, the read-only auditor `assayer`, and the read-only navigator
`pathfinder`. `superloopy doctor` (dispatchCoherence) fails if any agent Superloopy dispatches is not installed
or not matched by a hook.

Superloopy provisions and tracks these agents; the host spawns them. Superloopy never spawns.

Each agent ships twice: `agents/<name>.md` for Claude Code and Google Antigravity, and
`.codex/agents/<name>.toml` for Codex. `superloopy doctor` (crewPromptParity) fails with a per-agent
line diff when the two instruction bodies differ, except for the host-specific lines allowlisted in
`src/crew-prompt-parity.js`. Edit both files together.

## Full-crew bookkeeping

For `loopy team`, `loopy crew`, `loopycrew`, and `ultrawork` runs, full-crew handoffs are mandatory bookkeeping even though they are not a spawn mechanism. The parent records each dispatch with `superloopy loop handoff`, updates the same handoff when the worker returns, and runs `superloopy loop fleet --json` before the final gate. The fleet summary is the durable place to see accepted, rejected, needs-context, and still-outstanding lanes before the parent records completion evidence.

The parent must still show a concise human-facing completion summary for each role: role, normalized verdict, artifact path, risk, and next action. Raw host close-agent output is not evidence and should not be the user's only signal that a role finished.

## Role routing and identity

The parent uses the native subagent controls exposed by the current host and selects a configured
crew name when named selection is available. It must not invent arguments that the host's current
schema does not expose. Every dispatch remains **self-contained**: the parent pastes the role's
requirements and bounded assignment into the message.

Configured names provide steering; the host-owned stop callback supplies the role identity that
Superloopy matches exactly. If the host cannot attest that identity or the resolved model, the
lane is reported as `role_unverified` or `model_unverified`. The receipt gate
(`SUPERLOOPY_EVIDENCE`/`SUPERLOOPY_AUDIT`) and deterministic floor still judge what the worker
actually produced.

## Model policy

`model-policy.json` records the allowed model values and profile assignments, and bundled agent
TOML files carry explicit resolved `model`, `model_reasoning_effort`, and `service_tier` pins.
`docs/superloopy-model-policy.md` explains that contract, and `superloopy doctor` fails if the
catalog, docs, or TOML fields drift. These fields are advisory because the host may ignore or
override them, but Superloopy does not omit them just to inherit a parent/default model. They
improve crew routing efficiency, but they are never proof: Superloopy accepts only artifacts,
command transcripts, audit verdicts, and gate reports. The orchestrator is the user's host session
and runs on the user's selected model (`gpt-6-astra` is allowed when selected); Superloopy never
pins it, and crew lanes never inherit it.

The structured doctor value is `modelRoutingVerification: "unverified"` until a host can attest both the resolved `agent_type` and model. A spawn surface that lacks either signal is reported as `model_unverified`; the parent must not claim that the configured GPT-6 tuple was enforced at runtime.

## SubagentStop hook payload

Superloopy's `SubagentStop` handlers read these fields from the JSON piped on stdin:

| Field | Use |
|---|---|
| `hook_event_name` | Must equal `SubagentStop`; otherwise the handler is a no-op. |
| `agent_type` | Matched against the hook matcher to pick the worker path (`forge`/`sentinel`/`probe`/`arbiter`), the auditor path (`assayer`), or the read-only navigator path (`pathfinder`, which writes no receipt so its handler is a no-op). |
| `agent_id` | Keys the per-attempt counter. Optional — Superloopy falls back to a session/cwd key so the 3-attempt cap still counts. |
| `session_id` | Selects scoped `.superloopy/sessions/<id>/` state when present. |
| `cwd` | Repo root; required. |
| `last_assistant_message` | When present and non-empty, the sole receipt source (`SUPERLOOPY_EVIDENCE:`/`EVIDENCE_RECORDED:` for workers, `SUPERLOOPY_AUDIT:` for the auditor); a stale token elsewhere never satisfies the stop (Codex). |
| `agent_transcript_path` / `transcript_path` | When `last_assistant_message` is absent (Claude), the receipt is recovered from the subagent's own transcript — `agent_transcript_path` preferred, else `transcript_path` — reading only the decoded final turn. The same source is tail-scanned for context-pressure markers; on a hit the handler pauses without burning an attempt. |

Handler output (stdout): a `block` decision re-prompts the subagent; an empty string allows the
stop.

## PreToolUse hook (Codex planning nudge; Claude crew write scope)

On Codex a `PreToolUse` hook matches only the native planning tools `create_goal` and
`update_goal`. It denies a `create_goal` that carries anything beyond `objective`, and denies an
`update_goal status=complete` issued before Superloopy has recorded aggregate completion. That is a
workflow nudge — it keeps the Codex plan from being marked done ahead of the evidence — not a
dangerous-command blocker.

On Claude Code `hooks/hooks.json` matches `Write`, `Edit`, `MultiEdit`, and `NotebookEdit`. Claude
fires plugin hooks inside subagents with `agent_type` set to the plugin-scoped name, so when the
caller is `superloopy:sentinel`, `superloopy:probe`, `superloopy:arbiter`, or `superloopy:assayer`
the hook denies any target whose real path is outside the active evidence root: the session's
root when that session has its own plan, otherwise the global root, the same choice receipt
resolution makes (`src/crew-write-guard.js`). Their frontmatter also removes `Edit`/`MultiEdit`/`NotebookEdit`, and
`assayer` is limited to `Read, Grep, Glob, Write`. Neither hook inspects shell or network tools. As
with every hook, completion authority never rests here — it is the deterministic in-process floor
(`loop check`/`review`/`finish`).

### What neither host can restrict further

Checked against the host docs on 2026-10-15; the remaining crew write limits are prompt text:

- **Shell writes from sentinel, probe, and arbiter.** They keep `Bash` to run tests and the CLI,
  and test runs write build output and caches inside the repo (`target/`, `build/`,
  `node_modules/.cache`, `__pycache__`), so no path rule can allow those and still block product
  edits. Claude's Bash sandbox is session-wide and a plugin cannot enable it; plugin subagents
  ignore `permissionMode` and `hooks` frontmatter ([sub-agents](https://code.claude.com/docs/en/sub-agents.md)).
  `isolation: worktree` would hide the uncommitted diff under review and keep the report out of
  the parent's evidence root.
- **Every Codex lane.** A custom agent file can only switch capabilities off
  (`features.shell_tool`, …); `sandbox_mode` and `approval_policy` in it are ignored and the
  agent inherits the parent session's sandbox ([Codex subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents.md)).
  So `pathfinder.toml`'s `sandbox_mode = "read-only"` states intent and is not enforced. Turning
  the shell off is no option either: on Codex the shell is how a lane reads files.

A lane that edits product files anyway is still caught where it matters: the parent records proof
only through the CLI, and completion re-runs every command-backed criterion in-process.

Research worker/query/wave profiles are also advisory on every host. Codex can expose local
`Agent` dispatches to `PreToolUse`, but Superloopy intentionally does not deny dispatch based on a
usage target. Hosted searches are not universally observable by hooks, so query totals may be
journal-derived or `unknown`; they are never presented as enforced limits.

## Stop hook (bounded continuation)

Plugin hooks are installed for every session, so the Stop hook must not take over a session that
never asked for a loop. With `SUPERLOOPY_STOP_HOOK` unset it drives only a host session whose
user started or resumed a loop with a trigger (`loopy …`, `loopycrew`, `ultrawork`, `loopywork`):
UserPromptSubmit writes `.superloopy/stop-engaged/<session_id>.json`, and any later plain prompt
from that user removes it. A `SUPERLOOPY_STEER` prompt, an output-style toggle, or Codex replaying
the continuation reason as a prompt (it carries `This is an automatic Superloopy continuation.`)
keeps it. `on` drives every session with unresolved work; any other non-empty value disables it.
A payload without `session_id` is never engaged by default. Claude Code does not fire Stop on a
user interrupt, and Codex reports an interrupt as its own `Interrupt` event.

While engaged, the bounded engine in `src/continuation.js` decides; its stall and iteration caps
mark the loop `blocked` rather than run on. Each continuation also lists, once, every worker or
auditor that exhausted its receipt attempts since the last report (`subagent_attempt_exhausted`,
`audit_attempt_exhausted`, then `worker_exhaustion_reported` in the ledger), because the parent
otherwise sees only that worker's last message.

## What Superloopy cannot verify (advisory limits)

Superloopy cannot confirm, from inside a hook, that the host:

- spawns the installed agents by name on dispatch;
- exposes resolved-model attestation for the launched worker;
- routes a dispatch to the requested TOML role (model, effort, and service tier are not
  selectable by name) — so the parent must paste the role's requirements into the message and
  judge by delivered evidence, never by the role label it asked for;
- emits `SubagentStop` with `agent_type`/`agent_id` populated;
- honors a subagent hook `block` decision by re-prompting that subagent;
- spawns the auditor or navigator read-only / isolated.

If any of these does not hold, the hook-layer gates degrade to advisory. Completion still
remains gated by the deterministic floor: `loop check`/`review`/`checkpoint` re-derive every
passed command-backed criterion in-process, on the CLI path, independent of any hook.
`superloopy doctor` (hostContract) restates these limits.
