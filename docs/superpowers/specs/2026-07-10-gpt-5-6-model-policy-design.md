# GPT-5.6 Model Policy Design

## Goal

Move Superloopy's Codex agent defaults to the GPT-5.6 family while preserving the existing centralized-policy contract: one source of truth in `model-policy.json`, explicit resolved pins in every bundled agent TOML, and doctor checks that reject drift instead of silently inheriting a host default.

## Profile Mapping

| Profile | Model | Effort | Tier | Agents |
| --- | --- | --- | --- | --- |
| `standard` | `gpt-5.6-terra` | `high` | `priority` | `franky`, `usopp`, `robin` |
| `deep` | `gpt-5.6-sol` | `xhigh` | `priority` | `zoro`, `jinbe` |
| `fast` | `gpt-5.6-luna` | `low` | `fast` | `nami` |

This follows the current Codex role guidance: Terra for everyday work, Sol for complex or high-value judgment, and Luna for clear, repeatable work. Superloopy pins the explicit tier IDs rather than the `gpt-5.6` alias so each lane's capability and cost intent remains reviewable.

## Policy Data

Update the shared policy version to `2026-07-10`. Add the three GPT-5.6 tier IDs to the Codex allowed-model list and retain the existing GPT-5.5, GPT-5.4, GPT-5.4 Mini, and GPT-5.3 Codex Spark IDs as accepted compatibility values. The bundled defaults move to GPT-5.6, but no automatic runtime fallback or parent-model inheritance is introduced.

Keep the existing `high`, `xhigh`, and `low` profile efforts. Do not add `max` or `ultra` in this change: the current policy validates effort globally rather than per model, and the narrow migration does not need either setting. Service tiers remain unchanged.

## Resolved Pins And Documentation

Update all six `.codex/agents/*.toml` files to the resolved profile model. Update the Codex model-policy document's allowed list and defaults table, plus the Codex mapping column in the Claude policy document. Claude's own aliases and assignments do not change.

`src/model-policy.js` and `src/doctor.js` remain unchanged because policy loading, profile resolution, and drift detection are already data-driven. The host contract, design audit, file audit, golden set, and READMEs remain model-version-neutral apart from inventorying this design document.

## Availability And Failure Behavior

Current Codex documentation and the live local model catalog list Sol, Terra, and Luna. Some OpenAI availability documentation still describes workspace-scoped preview access, so older model IDs remain allowed for deliberate manual compatibility. If a host cannot use a pinned GPT-5.6 model, it should fail visibly; Superloopy must not silently fall through to an unknown or weaker parent default.

## Validation

- Add failing doctor assertions for the new policy version and all three resolved profile models before changing policy data.
- Add documentation assertions for Sol, Terra, and Luna.
- Run the focused doctor and docs tests.
- Run `superloopy doctor --json` and require both model-policy checks to pass.
- Run the full test suite and `git diff --check`.
- For a release, separately bump and synchronize package/plugin versions and confirm `npm pack --dry-run --json` includes the policy data, docs, and agent TOMLs.

## Out Of Scope

This change does not alter frontend skill routing, prompt text, Claude models, model discovery, runtime fallback behavior, service-tier policy, or plugin versioning. Those remain separate follow-up decisions.
