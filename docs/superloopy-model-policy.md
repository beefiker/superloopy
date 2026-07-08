# Superloopy Model Policy

Superloopy's bundled agent model fields are steering, not proof. They give the host sensible defaults for cost and depth, but completion authority still comes from Superloopy artifacts, `loop check`, and the quality gate.

`model-policy.json` is the source of truth for allowed values, reusable profiles, and per-agent profile assignment. The bundled `.codex/agents/*.toml` files stay pinned to resolved model IDs so Superloopy never falls through to a weak parent/default model by accident.

## Allowed Fields

Allowed models:

- `gpt-5.5`
- `gpt-5.4`
- `gpt-5.4-mini`
- `gpt-5.3-codex-spark`

Allowed reasoning efforts: `low`, `medium`, `high`, `xhigh`.

Allowed service tiers: `priority`, `fast`, `efficient`.

## Bundled Defaults

| Agent | Purpose | Profile | Model | Effort | Tier |
| --- | --- | --- | --- | --- | --- |
| `franky` | Bounded implementation lane. | `standard` | `gpt-5.5` | `high` | `priority` |
| `zoro` | Skeptical code review lane. | `deep` | `gpt-5.5` | `xhigh` | `priority` |
| `usopp` | QA and regression lane. | `standard` | `gpt-5.5` | `high` | `priority` |
| `jinbe` | Final gate integration lane. | `deep` | `gpt-5.5` | `xhigh` | `priority` |
| `robin` | Evidence auditor lane. | `standard` | `gpt-5.5` | `high` | `priority` |
| `nami` | Read-only navigation lane. | `fast` | `gpt-5.4-mini` | `low` | `fast` |

## Rules

- Update `model-policy.json` first when a new Codex model becomes available, then update the resolved TOML pins and this document in the same change.
- Use the bundled TOML fields as defaults only. A host may ignore or override them, but the repo never omits them just to inherit a parent/default model.
- Do not treat a stronger model as proof. The artifact, command transcript, audit verdict, or gate report is the proof.
- Prefer smaller or faster defaults only for read-only navigation and other low-risk lookup work.
- Review and final-gate lanes get deeper effort because they judge other evidence.
- `superloopy doctor --json` checks `model-policy.json`, this document, and every bundled agent TOML for drift.
