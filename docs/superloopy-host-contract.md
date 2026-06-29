# Superloopy Host Contract

Superloopy does not spawn subagents. It rides the host runtime's native custom-agent and hook
mechanism and gates the result. This document pins what Superloopy expects from the host so drift
is visible and testable.

## Custom agents

`superloopy agents install` copies the bundled agent definitions into the personal Codex agents
directory (`$CODEX_HOME/agents` when set, otherwise `~/.codex/agents`). The host spawns them
through its native multi-agent dispatch when the parent delegates: the receipt workers
`fronk`, `zyro`, `usk`, `jumbo`, the read-only auditor `rovyn`, and the read-only navigator
`nomi`. `superloopy doctor` (dispatchCoherence) fails if any agent Superloopy dispatches is not installed
or not matched by a hook.

Superloopy provisions and tracks these agents; the host spawns them. Superloopy never spawns.

## Full-crew bookkeeping

For `loopy team`, `loopy crew`, `loopycrew`, and `ultrawork` runs, full-crew handoffs are mandatory bookkeeping even though they are not a spawn mechanism. The parent records each dispatch with `superloopy loop handoff`, updates the same handoff when the worker returns, and runs `superloopy loop fleet --json` before the final gate. The fleet summary is the durable place to see accepted, rejected, needs-context, and still-outstanding lanes before the parent records completion evidence.

The parent must still show a concise human-facing completion summary for each role: role, normalized verdict, artifact path, risk, and next action. Raw host close-agent output is not evidence and should not be the user's only signal that a role finished.

## Role routing is not guaranteed

The host's spawn surface (for example `multi_agent_v1.spawn_agent`) accepts a `message` plus
flags such as `agent_type`, `fork_context`, and `model`. It does **not** reliably select a
bundled TOML role, model, reasoning effort, or service tier by name alone — name-based role
routing is unverified from Superloopy's side. Therefore a dispatch must be **self-contained**: the
parent pastes the role's requirements and the bounded assignment into the spawn message and
judges the result by the delivered evidence, not by the name it requested. Superloopy already does
this — the receipt gate (`SUPERLOOPY_EVIDENCE`/`SUPERLOOPY_AUDIT`) and the deterministic floor judge what
a worker actually produced, never which role label was asked for.

## Model policy

Bundled agent TOML files carry explicit `model`, `model_reasoning_effort`, and `service_tier`
defaults. `docs/superloopy-model-policy.md` records the allowed values and role defaults, and
`superloopy doctor` fails if those TOML fields drift. These fields are advisory because the host
may ignore or override them. They improve crew routing efficiency, but they are never proof:
Superloopy accepts only artifacts, command transcripts, audit verdicts, and gate reports.

## SubagentStop hook payload

Superloopy's `SubagentStop` handlers read these fields from the JSON piped on stdin:

| Field | Use |
|---|---|
| `hook_event_name` | Must equal `SubagentStop`; otherwise the handler is a no-op. |
| `agent_type` | Matched against the hook matcher to pick the worker path (`fronk`/`zyro`/`usk`/`jumbo`), the auditor path (`rovyn`), or the read-only navigator path (`nomi`, which writes no receipt so its handler is a no-op). |
| `agent_id` | Keys the per-attempt counter. Optional — Superloopy falls back to a session/cwd key so the 3-attempt cap still counts. |
| `session_id` | Selects scoped `.superloopy/sessions/<id>/` state when present. |
| `cwd` | Repo root; required. |
| `last_assistant_message` | Scanned for the receipt (`SUPERLOOPY_EVIDENCE:`/`EVIDENCE_RECORDED:` for workers, `SUPERLOOPY_AUDIT:` for the auditor). |
| `transcript_path` | Tail-scanned for context-pressure markers; on a hit the handler pauses without burning an attempt. |

Handler output (stdout): a `block` decision re-prompts the subagent; an empty string allows the
stop.

## What Superloopy cannot verify (advisory limits)

Superloopy cannot confirm, from inside a hook, that the host:

- spawns the installed agents by name on dispatch;
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
