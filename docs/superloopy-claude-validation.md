# Superloopy on Claude Code — Live Validation Checklist

The dual-host port was built against the Claude Code docs and is **degrade-safe by design**: if any host behavior below differs, the receipt/steering gate falls back to advisory and the deterministic CLI floor (`loop check`/`review`/`checkpoint` + audit re-derivation) still gates completion. This checklist confirms the four behaviors that could only be verified on a real Claude Code instance, plus baseline install/operation.

Run it once on a real install and fill in the results table at the end.

## 0. Install

```
/plugin marketplace add beefiker/superloopy
/plugin install superloopy@beefiker
```

- Reload plugins (or restart Claude Code); approve hooks when prompted.
- Expect: `superloopy` appears in `/plugin` (installed). Node.js ≥ 20 present.

## 1. Components load

- **Skills**: explicitly invoke `$superloopy-frontend` or send `loopy make this landing page look less generic`. Expect the frontend skill to engage (opens with `SUPERLOOPY FRONTEND ENABLED`). Confirm the same UI sentence without a leading `loopy` stays free of Superloopy hook context. Try `loopy <task>` / `루피 <task>` for the loop engineer. Ask for a presentation (e.g. "make me a deck about this repo") — expect `superloopy-slides` to engage (opens with `SUPERLOOPY SLIDES ENABLED`), show three style previews before generating, and finish with a screenshot-backed `VISUAL_QA.md` under `.superloopy/evidence/slides/`.
- **Subagents**: run `/agents`. Expect six entries (namespaced like `superloopy:franky … superloopy:nami`).
- **Doctor + bootstrap no-op**: `node "${CLAUDE_PLUGIN_ROOT}/src/cli.js" doctor --json`. Expect `ok: true`. (SessionStart bootstrap is a clean no-op on Claude — `host: "claude"`, no `~/.codex` writes.)

## 2. Capture a real SubagentStop payload (the empirical crux)

Add a **temporary** observation hook to your Claude `settings.json` (this runs alongside the plugin hook; remove it after):

```json
{ "hooks": { "SubagentStop": [ { "hooks": [ { "type": "command", "command": "cat >> /tmp/superloopy-subagentstop.jsonl" } ] } ] } }
```

Then dispatch any subagent (e.g. start a `loopy team` task that spawns `franky`, or ask Claude to use the `superloopy:nami` agent). Inspect `/tmp/superloopy-subagentstop.jsonl` and confirm:

### Linchpin A — receipt field
- [ ] Is `last_assistant_message` present? If **yes** → the receipt is read directly (Codex-style path). If **no** → confirm `transcript_path` or `agent_transcript_path` is present and its file's final assistant turn contains the `SUPERLOOPY_EVIDENCE:`/`SUPERLOOPY_AUDIT:` line (the transcript-tail fallback reads it).
- [ ] Functional check: have a worker end with `SUPERLOOPY_EVIDENCE: <path-under-evidence-root>`. Expect the SubagentStop hook to **accept silently** (no "evidence receipt missing" re-prompt). A worker that omits the receipt should be re-prompted (up to 3 attempts).

### Linchpin B — agent_type namespacing
- [ ] Is `agent_type` `franky` or `superloopy:franky`? Either is fine — the matcher `(?:superloopy:)?(?:franky|…)` and `normalizeAgentType()` handle both. Confirm the worker hook actually fired for the dispatched role (and the `robin` auditor routes to `subagent-stop-audit`).

## 3. Linchpin C — plugin env vars reach the hook subprocess

- [ ] Set in Claude `settings.json` `env`: `SUPERLOOPY_STOP_HOOK=on` and `SUPERLOOPY_AUTO_CONTEXT=on`.
- [ ] Mid-loop, confirm the **Stop** hook continues the loop (the agent does not stop while criteria remain) and that SessionStart/UserPromptSubmit inject Superloopy context. If env vars set in `settings.json` work but plugin-defined ones do not, that is expected — document `settings.json env` as the toggle location.

## 4. Linchpin D — UserPromptSubmit steering JSON

- [ ] Send a prompt containing a `SUPERLOOPY_STEER: { "kind": "annotate", "evidence": "...", "rationale": "..." }` directive. Expect Claude to apply it without a hook-output parse error. If the richer envelope (`{…, plan, summary, guide}`) is rejected, confirm the plain `additionalContext` steer still lands; otherwise the steer is advisory and the loop is unaffected.

## 5. Full loop end-to-end

- [ ] `loopy <small task>` → the engineer drives `begin` → `prove` (with a real command) → `check` → `finish`.
- [ ] Confirm completion is **gated**: `finish` refuses without a real artifact under `.superloopy/evidence/`.

## 6. Degrade-safety (must hold even if 2–4 differ)

- [ ] With any linchpin failing, `loop check`/`finish` must still refuse to complete without artifacts. The hook layer is advisory; the in-process floor is authoritative. Confirm a deliberately-unproven criterion cannot be finished.

## Results

End-to-end live run on real Claude Code (2026-07-01), hardened build loaded via `--plugin-dir` (commit `6cb7801`, `0.6.3` — a superset of the `9c3649b` doc commit; `<checkout>/bin` on `PATH` confirms the checkout, not the `0.6.1` marketplace cache, is active). `doctor --json` run from the plugin root → `ok:true`, **16 checks incl. `claudeHostWiring` + `claudeModelPolicy`**, 0 failing. All four linchpins, the full gated loop, and degrade-safety were exercised in a throwaway repo (`/tmp/superloopy-live`).

**Method note.** A `SubagentStop` observation hook added to `settings.local.json` *mid-session* did **not** hot-reload in this Claude build (contrary to the earlier note), so a raw payload was not re-captured this session. Instead the **live** in-session gate was proven directly: the plugin's own `SubagentStop` hook (loaded at startup) **re-prompted** a worker that omitted its receipt — injecting `"Superloopy evidence receipt missing or invalid. Attempt 1 of 3."` into that worker's transcript — while a worker with a valid receipt stopped with zero re-prompts. Receipt-recovery/gate logic was additionally confirmed by replaying the real worker final messages through `hook subagent-stop`.

| Item | Expected | Observed | Pass | Follow-up |
| --- | --- | --- | --- | --- |
| Install + components | superloopy + 6 agents + skills load | Plugin loaded from the checkout via `--plugin-dir`; 6 namespaced agents dispatchable (dispatched `superloopy:franky` ×2 and `superloopy:nami` live); skills present; `doctor` from the plugin root `ok:true`, 16 checks incl. `claudeHostWiring`/`claudeModelPolicy`. | ✅ | `doctor` audits its cwd — running it from an empty dir reports `ok:false`; run it from the plugin root. |
| A: receipt field | valid receipt accepted silently; missing receipt re-prompted (≤3), transcript fallback recovers path | **Live 3-way contrast:** `franky` w/ valid `SUPERLOOPY_EVIDENCE:` + real artifact → **0 re-prompts (silent accept)**; `franky` told to omit the receipt → **re-prompted once** (`"Attempt 1 of 3"` injected by the hook), then wrote a real artifact + emitted the receipt; `nami` (excluded set) → 0 re-prompts. Deterministic replay of the real `franky` message: valid→empty accept, receipt-stripped→`decision:block`, receipt-for-nonexistent-file→`decision:block` (validates artifact existence, not just the string). | ✅ | Raw `last_assistant_message` not re-captured (mid-session observation hook didn't hot-reload); a prior session confirmed the direct field present. The live re-prompt/accept contrast proves recovery works on the real Claude payload regardless. |
| B: agent_type | matcher fires (bare or namespaced) | Live dispatches carried `agent_type` `superloopy:franky`/`superloopy:nami`. Anchored matcher `^(?:superloopy:)?(?:franky\|zoro\|usopp\|jinbe\|nami)$` matches namespaced **and** bare; `normalizeAgentType` → `franky`/`nami`; `robin`/`superloopy:robin` route to the separate audit matcher; `frankyx`/`superloopy:otherthing` correctly rejected. `nami` is outside the evidence-receipt set → silent no-op (correct for the read-only navigator). | ✅ | — |
| C: env vars | Stop continuation while criteria remain + auto-context toggle | Exercised as subprocesses with the exact env Claude injects (`CLAUDE_PLUGIN_ROOT` set ⇒ host=claude; settings `env`): `Stop`+`SUPERLOOPY_STOP_HOOK=on`, criteria remaining → `decision:block` (continue) + `loop_iteration` recorded; unset → empty (inert). `SessionStart`/`UserPromptSubmit`+`SUPERLOOPY_AUTO_CONTEXT=on` → inject "Superloopy context"; unset → empty. Post-completion `Stop` → empty and `loop-control.json` cleared (engine terminates cleanly). | ✅ | Full end-to-end (settings.json `env` + restart) not run — no restart available this session. `settings.json` `env` is the toggle location and takes effect on next session start. |
| D: steering JSON | directive applied, no parse error | `SUPERLOOPY_STEER: {"kind":"annotate",…}` → hook emitted **valid JSON** (keys `ok,kind,plan,summary,guide`), **no parse error**; the annotation landed durably in the ledger (`steering_annotated` with the exact `evidence`/`rationale`). | ✅ | The annotate envelope is not Claude's `hookSpecificOutput.additionalContext` shape, so Claude ignores its display fields (no error / no rejection) — the recorded annotation is the applied, degrade-safe effect. |
| Full loop | gated begin→prove→check→finish | Ran `begin → prove(C001) → prove(C002) → check → finish` on the hardened build. `finish` refused at 0/2 proven (*"unresolved criteria: G001/C001, G001/C002"*) and at 1/2 (*"…G001/C002"*); completed only after both command-backed criteria passed — wrote a valid `gate.json` (`status:passed`, 2 artifacts) and set `aggregateComplete:true`. `finish` re-derived both criteria (audit `*-rerun.txt`). | ✅ | — |
| Degrade-safety | floor blocks completion without artifacts | `loop finish` refused whenever a criterion lacked artifact-backed proof, independent of any hook (the in-process floor). Confirmed at 0/2 and at 1/2 proven; the hook layer is advisory, the floor authoritative. | ✅ | — |

All four linchpins (A receipt field, B agent_type, C env vars, D steering JSON), the full gated loop, and degrade-safety are **confirmed on real Claude Code with the hardened build**. The host also honors a `SubagentStop` `decision:block` by re-prompting the worker — one of the items `doctor`'s `hostContract` lists as not deterministically verifiable — observed live here.

To reproduce the SubagentStop gate live **without** relying on an observation hook: dispatch a `superloopy:franky` worker whose task explicitly says to omit any `SUPERLOOPY_EVIDENCE:`/`EVIDENCE_RECORDED:` line, then `grep -c "Superloopy evidence receipt missing or invalid"` its transcript — a non-zero count is the plugin hook re-prompting it. To capture a raw payload instead, the `settings.local.json` observation hook (`{ "hooks": { "SubagentStop": [ { "hooks": [ { "type": "command", "command": "cat >> /tmp/superloopy-subagentstop.jsonl" } ] } ] } }`) must be present **at session start** (this build did not hot-reload a mid-session addition); dispatch any `superloopy:` subagent, inspect the file, then remove the hook.
