# Superloopy Model Policy — Claude Code

Claude Code edition of the advisory model policy. Same principle as `docs/superloopy-model-policy.md`: model fields are **steering, not proof** — completion authority comes from Superloopy artifacts, `loop check`, and the deterministic gate, never from which model ran a lane.

`model-policy.json` is shared with the Codex policy. Claude subagent frontmatter keeps resolved model IDs or aliases pinned so a plugin install does not silently inherit a weaker parent/default model.

## Allowed values (Claude)

- Models: `claude-opus-5-5`, `haiku`. Standard and deep lanes pin Opus 5.5 explicitly; the fast navigation lane retains the host `haiku` alias.
- Opus 5.5 requires Claude Code 2.1.280 or later. A host can override or substitute a subagent model; inspect the running model in `/tasks` before claiming runtime routing.
- Reasoning depth is expressed in the subagent's instructions (Claude has no `service_tier`); review and gate lanes are told to reason at maximal rigor.

## Bundled subagent defaults (`agents/*.md`)

| Agent | Purpose | Profile | Model | Read-only | Maps from Codex |
| --- | --- | --- | --- | --- | --- |
| `franky` | Bounded implementation lane. | `standard` | `claude-opus-5-5` | no | gpt-6-sol / high |
| `zoro` | Skeptical code review lane. | `deep` | `claude-opus-5-5` | no (one report) | gpt-6-sol / xhigh |
| `usopp` | QA and regression lane. | `standard` | `claude-opus-5-5` | no (one report) | gpt-6-sol / high |
| `jinbe` | Final gate integration lane. | `deep` | `claude-opus-5-5` | no (one report) | gpt-6-sol / xhigh |
| `robin` | Evidence auditor lane. | `standard` | `claude-opus-5-5` | yes (no edit/write) | gpt-6-sol / high |
| `nami` | Read-only navigation lane. | `fast` | `haiku` | yes (Read/Grep/Glob) | gpt-6-luna / low |

## Rules

- Update `model-policy.json` first when Claude Code exposes a better default alias or pinned model for a profile, then update the resolved frontmatter pins and this document in the same change.
- Use the `model` frontmatter as a default only. A host or user may override it.
- A stronger model is never proof. The artifact, command transcript, audit verdict, or gate report is the proof.
- Read-only lanes (`robin`, `nami`) constrain via the `tools` allowlist, since plugin-bundled subagents ignore `permissionMode`; the real safeguard remains the in-process, hash-bound audit re-derivation.
- The Codex and Claude policies must stay in intent-sync: review/gate lanes deepest, navigation cheapest.
