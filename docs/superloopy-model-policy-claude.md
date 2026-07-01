# Superloopy Model Policy — Claude Code

Claude Code edition of the advisory model policy. Same principle as `docs/superloopy-model-policy.md`: model fields are **steering, not proof** — completion authority comes from Superloopy artifacts, `loop check`, and the deterministic gate, never from which model ran a lane.

## Allowed values (Claude)

- Models (aliases): `opus`, `sonnet`, `haiku`. A pinned `claude-*` id is also accepted.
- Reasoning depth is expressed in the subagent's instructions (Claude has no `service_tier`); review and gate lanes are told to reason at maximal rigor.

## Bundled subagent defaults (`agents/*.md`)

| Agent | Purpose | Model | Read-only | Maps from Codex |
| --- | --- | --- | --- | --- |
| `franky` | Bounded implementation lane. | `sonnet` | no | gpt-5.5 / high |
| `zoro` | Skeptical code review lane. | `opus` | no (one report) | gpt-5.5 / xhigh |
| `usopp` | QA and regression lane. | `sonnet` | no (one report) | gpt-5.5 / high |
| `jinbe` | Final gate integration lane. | `opus` | no (one report) | gpt-5.5 / xhigh |
| `robin` | Evidence auditor lane. | `sonnet` | yes (no edit/write) | gpt-5.5 / high |
| `nami` | Read-only navigation lane. | `haiku` | yes (Read/Grep/Glob) | gpt-5.4-mini / low |

## Rules

- Use the `model` frontmatter as a default only. A host or user may override it.
- A stronger model is never proof. The artifact, command transcript, audit verdict, or gate report is the proof.
- Read-only lanes (`robin`, `nami`) constrain via the `tools` allowlist, since plugin-bundled subagents ignore `permissionMode`; the real safeguard remains the in-process, hash-bound audit re-derivation.
- The Codex and Claude policies must stay in intent-sync: review/gate lanes deepest, navigation cheapest.
