# Loopy Model Policy

Loopy's bundled agent model fields are steering, not proof. They give the host sensible defaults for cost and depth, but completion authority still comes from Loopy artifacts, `loop check`, and the quality gate.

## Allowed Fields

Allowed models:

- `gpt-5.5`
- `gpt-5.4`
- `gpt-5.4-mini`
- `gpt-5.3-codex-spark`

Allowed reasoning efforts: `low`, `medium`, `high`, `xhigh`.

Allowed service tiers: `priority`, `fast`, `efficient`.

## Bundled Defaults

| Agent | Purpose | Model | Effort | Tier |
| --- | --- | --- | --- | --- |
| `franky` | Bounded implementation lane. | `gpt-5.5` | `high` | `priority` |
| `zoro` | Skeptical code review lane. | `gpt-5.5` | `xhigh` | `priority` |
| `usopp` | QA and regression lane. | `gpt-5.5` | `high` | `priority` |
| `jinbe` | Final gate integration lane. | `gpt-5.5` | `xhigh` | `priority` |
| `robin` | Evidence auditor lane. | `gpt-5.5` | `high` | `priority` |
| `nami` | Read-only navigation lane. | `gpt-5.4-mini` | `low` | `fast` |

## Rules

- Use the bundled TOML fields as defaults only. A host may ignore or override them.
- Do not treat a stronger model as proof. The artifact, command transcript, audit verdict, or gate report is the proof.
- Prefer smaller or faster defaults only for read-only navigation and other low-risk lookup work.
- Review and final-gate lanes get deeper effort because they judge other evidence.
- `loopy doctor --json` checks this document and every bundled agent TOML for drift.
