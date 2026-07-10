# Superloopy Model Policy

Superloopy's bundled agent model fields are steering, not proof. They give the host sensible defaults for cost and depth, but completion authority still comes from Superloopy artifacts, `loop check`, and the quality gate.

`model-policy.json` is the source of truth for allowed values, reusable profiles, and per-agent profile assignment. Each Codex profile contains an ordered list of complete model, effort, and tier candidate tuples. `codex.compatibilityModel` declares the model that every profile must place in the second candidate position. Resolution selects the first tuple that the current catalog supports in full. The bundled `.codex/agents/*.toml` files stay pinned to the preferred resolved model IDs so Superloopy never falls through to a weak parent/default model by accident.

## Allowed Fields

Allowed models:

- `gpt-5.6-terra`
- `gpt-5.6-sol`
- `gpt-5.6-luna`
- `gpt-5.5`
- `gpt-5.4`
- `gpt-5.4-mini`
- `gpt-5.3-codex-spark`

Allowed reasoning efforts: `low`, `medium`, `high`, `xhigh`.

Allowed service tiers: `priority`, `fast`, `efficient`.

## Profile Candidates

| Profile | Preferred tuple | Compatibility tuple |
| --- | --- | --- |
| `standard` | `gpt-5.6-terra` / `high` / `priority` | `gpt-5.5` / `high` / `priority` |
| `deep` | `gpt-5.6-sol` / `xhigh` / `priority` | `gpt-5.5` / `xhigh` / `priority` |
| `fast` | `gpt-5.6-luna` / `low` / `fast` | `gpt-5.5` / `low` / `fast` |

Availability is resolved before an agent is launched. A compatibility selection is explicit; Superloopy never retries a worker with a different model after launch.

## Upgrade And Diagnosis

`legacy-agent-manifests.json` records complete SHA-256 manifests for known pre-managed Superloopy fleets. The installer adopts an exact legacy fleet and upgrades it without `--force` only when all six Superloopy-owned regular files match one complete manifest. Any edit, missing owned file, mixed release, symlink, or unknown hash at those six names remains an all-or-conflict stop; unrelated personal agent filenames are preserved and do not participate in ownership detection.

With no managed state, ordinary doctor stays offline but distinguishes no installation, an exact migratable legacy fleet, and an unmanaged conflict. `superloopy doctor --refresh-models` may perform one read-only `model/list` comparison even before installation and reports whether preferred GPT-5.6 tuples, compatibility-only tuples, no supported tuple, or unknown availability are visible. It never writes state or agent files.

Doctor also compares a generated command wrapper with the plugin root being diagnosed. A wrapper that runs another checkout or cache is a split-brain warning with a repair command that invokes the diagnosed root directly.

## Runtime Verification Boundary

Configured routing is not runtime attestation. The host must expose `agent_type` and the resolved model for Superloopy to verify that a GPT-5.6 pin was honored. When either signal is unavailable, crew guidance reports `model_unverified`; artifact-backed completion still works, but the model identity must not be described as gated or proven.

## Bundled Preferred Defaults

| Agent | Purpose | Profile | Model | Effort | Tier |
| --- | --- | --- | --- | --- | --- |
| `franky` | Bounded implementation lane. | `standard` | `gpt-5.6-terra` | `high` | `priority` |
| `zoro` | Skeptical code review lane. | `deep` | `gpt-5.6-sol` | `xhigh` | `priority` |
| `usopp` | QA and regression lane. | `standard` | `gpt-5.6-terra` | `high` | `priority` |
| `jinbe` | Final gate integration lane. | `deep` | `gpt-5.6-sol` | `xhigh` | `priority` |
| `robin` | Evidence auditor lane. | `standard` | `gpt-5.6-terra` | `high` | `priority` |
| `nami` | Read-only navigation lane. | `fast` | `gpt-5.6-luna` | `low` | `fast` |

## Rules

- Update `model-policy.json` first when a new Codex model becomes available, then update the preferred TOML pins and this document in the same change.
- Resolve candidates as complete tuples. A model is not usable for a profile unless that same catalog item supports the candidate's reasoning effort and service tier.
- Use the bundled TOML fields as defaults only. A host may ignore or override them, but the repo never omits them just to inherit a parent/default model.
- Describe model routing as configured unless the host attests both the resolved role and model; otherwise use `model_unverified`.
- Do not treat a stronger model as proof. The artifact, command transcript, audit verdict, or gate report is the proof.
- Prefer smaller or faster defaults only for read-only navigation and other low-risk lookup work.
- Review and final-gate lanes get deeper effort because they judge other evidence.
- `superloopy doctor --json` checks `model-policy.json`, this document, and every bundled agent TOML for drift.
