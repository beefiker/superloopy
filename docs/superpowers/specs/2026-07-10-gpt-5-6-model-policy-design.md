# GPT-5.6 Model Policy Design

## Goal

Prefer the GPT-5.6 family for Superloopy's Codex agents while keeping every installed agent explicitly pinned to a model the current Codex surface reports as available. When a preferred GPT-5.6 model is unavailable, resolve that profile to GPT-5.5 before installation. Never inherit an unknown parent/default model and never launch a second worker after a failed or ambiguous first launch.

## Profile Candidates

Each profile owns an ordered list of complete model tuples. Resolution selects the first tuple whose model, reasoning effort, and service tier are supported together.

| Profile | Preferred tuple | Compatibility tuple | Agents |
| --- | --- | --- | --- |
| `standard` | `gpt-5.6-terra` / `high` / `priority` | `gpt-5.5` / `high` / `priority` | `franky`, `usopp`, `robin` |
| `deep` | `gpt-5.6-sol` / `xhigh` / `priority` | `gpt-5.5` / `xhigh` / `priority` | `zoro`, `jinbe` |
| `fast` | `gpt-5.6-luna` / `low` / `fast` | `gpt-5.5` / `low` / `fast` | `nami` |

This keeps role intent reviewable: Sol handles the deepest review/gate lanes, Terra handles everyday implementation and evidence work, and Luna handles navigation. GPT-5.5 preserves each lane's existing effort when preview access is missing.

## Policy Data

`model-policy.json` remains the source of truth. Update its version to `2026-07-10`, add the three GPT-5.6 IDs to the allowed list, and express each Codex profile as ordered `candidates` rather than one model plus an unrelated fallback field. Retain GPT-5.5, GPT-5.4, GPT-5.4 Mini, and GPT-5.3 Codex Spark as allowed compatibility values.

Validate complete tuples, not model, effort, and tier independently. Do not add `max` or `ultra`; the approved mapping uses the existing `low`, `high`, and `xhigh` values. Claude policy and agent assignments do not change.

## Availability Discovery

Use the stable Codex app-server `model/list` method, not the raw models cache and not `codex debug models`, as the availability source. Query it immediately before materializing personal agent TOMLs.

The live query runs only when one of these conditions holds:

- no prior resolution exists;
- the model-policy version changed;
- the cached resolution is at least 24 hours old;
- the user explicitly requests `--refresh-models`.

Every SessionStart may read the small resolution record, but it must not start app-server while the record is fresh. A failed or malformed live query is `unknown`, not proof that GPT-5.6 is unavailable. Keep an existing managed resolution on `unknown`; on a fresh install, materialize the explicit GPT-5.5 compatibility tuples and disclose that conservative choice.

## Managed Agent Installation

`superloopy install` and `superloopy agents install` resolve all six agents before writing any file. Stage the complete set and install it atomically enough that a conflict or resolution failure cannot leave a mixed preferred/compatibility fleet.

Installed files carry a Superloopy managed marker. Persist the policy version, check time, selected tuples, availability source, and generated file hashes under `$CODEX_HOME/superloopy/`, never inside a versioned plugin cache. Replace only files whose managed hash still matches; preserve unknown or user-edited files as conflicts unless the user supplies `--force`.

SessionStart may perform the same managed installation check. Agent definitions changed during SessionStart apply only after Codex restarts, so any changed resolution must emit a visible restart instruction.

## Doctor And Disclosure

Keep the existing repository drift check, then add an installed-resolution check that compares:

- the current policy version;
- the cached/live availability result;
- the persisted resolved tuples;
- the actual fields in `$CODEX_HOME/agents/*.toml`.

Doctor and install JSON must report `requestedModel`, `resolvedModel`, `reason`, `checkedAt`, and whether a restart is required. A compatibility resolution is healthy but visibly degraded; missing GPT-5.5, unsupported tuple fields, stale managed hashes, or mixed installed profiles fail.

Do not log prompts, credentials, account email, workspace IDs, or raw authentication tokens.

## Failure Safety

Model routing occurs before agent launch. Superloopy must not retry a worker on GPT-5.5 after a GPT-5.6 launch error because it cannot prove the first worker performed no tool call or mutation. Network errors, timeouts, 401/403, workspace-policy denials, 429, 5xx, cancellation, context failures, and safety refusals never trigger a model change.

If model access changes after installation, the host may visibly reject the stale pin until the next resolution check and restart. That bounded failure is safer than duplicate or silent work.

## Validation

- Add failing pure resolver tests for full, partial, missing, stale, and malformed model catalogs.
- Add failing installer tests for managed upgrades, user edits, atomic conflicts, cache reuse, refresh, and conservative first install.
- Add failing doctor tests for preferred, degraded compatibility, stale, mixed, and unsupported installed tuples.
- Exercise a real local `model/list` handshake without starting a model turn.
- Run focused CLI, doctor, docs, hook, and policy tests.
- Run `superloopy doctor --json`, the full test suite, `npm pack --dry-run --json`, and `git diff --check`.

## Out Of Scope

This change does not add post-launch retries, parent-model inheritance, provider failover, model changes for Claude, prompt-routing changes, or release-version bumps. Runtime model overrides may be investigated later only on hosts that expose typed pre-execution failures and idempotent dispatch.
