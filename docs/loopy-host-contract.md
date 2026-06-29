# Loopy Host Contract

Loopy does not spawn subagents. It rides the host runtime's native custom-agent and hook
mechanism and gates the result. This document pins what Loopy expects from the host so drift
is visible and testable.

## Custom agents

`loopy agents install` copies the bundled agent definitions into the personal Codex agents
directory (`$CODEX_HOME/agents` when set, otherwise `~/.codex/agents`). The host spawns them
through its native multi-agent dispatch when the parent delegates: the receipt workers
`franky`, `zoro`, `usopp`, `jinbe`, the read-only auditor `robin`, and the read-only navigator
`nami`. `loopy doctor` (dispatchCoherence) fails if any agent Loopy dispatches is not installed
or not matched by a hook.

Loopy provisions and tracks these agents; the host spawns them. Loopy never spawns.

## Full-crew bookkeeping

For `loopy team`, `loopy crew`, `loopycrew`, and `ultrawork` runs, full-crew handoffs are mandatory bookkeeping even though they are not a spawn mechanism. The parent records each dispatch with `loopy loop handoff`, updates the same handoff when the worker returns, and runs `loopy loop fleet --json` before the final gate. The fleet summary is the durable place to see accepted, rejected, needs-context, and still-outstanding lanes before the parent records completion evidence.

The parent must still show a concise human-facing completion summary for each role: role, normalized verdict, artifact path, risk, and next action. Raw host close-agent output is not evidence and should not be the user's only signal that a role finished.

## Role routing is not guaranteed

The host's spawn surface (for example `multi_agent_v1.spawn_agent`) accepts a `message` plus
flags such as `agent_type`, `fork_context`, and `model`. It does **not** reliably select a
bundled TOML role, model, reasoning effort, or service tier by name alone — name-based role
routing is unverified from Loopy's side. Therefore a dispatch must be **self-contained**: the
parent pastes the role's requirements and the bounded assignment into the spawn message and
judges the result by the delivered evidence, not by the name it requested. Loopy already does
this — the receipt gate (`LOOPY_EVIDENCE`/`LOOPY_AUDIT`) and the deterministic floor judge what
a worker actually produced, never which role label was asked for.

## Model policy

Bundled agent TOML files carry explicit `model`, `model_reasoning_effort`, and `service_tier`
defaults. `docs/loopy-model-policy.md` records the allowed values and role defaults, and
`loopy doctor` fails if those TOML fields drift. These fields are advisory because the host
may ignore or override them. They improve crew routing efficiency, but they are never proof:
Loopy accepts only artifacts, command transcripts, audit verdicts, and gate reports.

## SubagentStop hook payload

Loopy's `SubagentStop` handlers read these fields from the JSON piped on stdin:

| Field | Use |
|---|---|
| `hook_event_name` | Must equal `SubagentStop`; otherwise the handler is a no-op. |
| `agent_type` | Matched against the hook matcher to pick the worker path (`franky`/`zoro`/`usopp`/`jinbe`), the auditor path (`robin`), or the read-only navigator path (`nami`, which writes no receipt so its handler is a no-op). |
| `agent_id` | Keys the per-attempt counter. Optional — Loopy falls back to a session/cwd key so the 3-attempt cap still counts. |
| `session_id` | Selects scoped `.loopy/sessions/<id>/` state when present. |
| `cwd` | Repo root; required. |
| `last_assistant_message` | Scanned for the receipt (`LOOPY_EVIDENCE:`/`EVIDENCE_RECORDED:` for workers, `LOOPY_AUDIT:` for the auditor). |
| `transcript_path` | Tail-scanned for context-pressure markers; on a hit the handler pauses without burning an attempt. |

Handler output (stdout): a `block` decision re-prompts the subagent; an empty string allows the
stop.

## What Loopy cannot verify (advisory limits)

Loopy cannot confirm, from inside a hook, that the host:

- spawns the installed agents by name on dispatch;
- routes a dispatch to the requested TOML role (model, effort, and service tier are not
  selectable by name) — so the parent must paste the role's requirements into the message and
  judge by delivered evidence, never by the role label it asked for;
- emits `SubagentStop` with `agent_type`/`agent_id` populated;
- honors a subagent hook `block` decision by re-prompting that subagent;
- spawns the auditor or navigator read-only / isolated.

If any of these does not hold, the hook-layer gates degrade to advisory. Completion still
remains gated by the deterministic floor: `loop check`/`review`/`checkpoint` re-derive every
passed command-backed criterion in-process, on the CLI path, independent of any hook. `loopy
doctor` (hostContract) restates these limits.
