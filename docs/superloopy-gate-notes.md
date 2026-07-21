# Superloopy Gate Notes

Superloopy keeps strict completion evidence while using Superloopy-owned names in code, docs, tests, and public commands.

## Gate Compatibility

- Default gate: `status: "passed"` plus non-empty artifact paths under the active evidence root.
- Review gate: `codeReview`, `manualQa`, `gateReview`, `iteration`, `criteriaCoverage`, and `audit` sections must all validate.
- Matrix gate: `architectReview`, `executorQa`, `iteration`, and `audit` sections must all validate.
- Audit section: `recommendation: "APPROVE"`, a non-empty `verdicts` array of resolvable verdict artifacts, and empty `blockers`. Mandatory for review and matrix gates; opt-in for the default gate via `SUPERLOOPY_AUDIT=on`. Structural validation only checks the section is well-formed and the verdict files resolve. **Completion-time provenance** (`audit-gate-verify.js`, wired into `review`/`checkpoint`) then re-derives **every passed criterion's** floor in-process (not just the cited ones) and requires each cited verdict to be a hash-bound pass over that fresh re-run — so a regressed command criterion can't be skipped and a section pointing at hand-written verdict files cannot authorize completion. The deterministic re-run is the source of truth, re-derived at decision time and never trusted from the worker-writable `.superloopy/audit-state.json`; the `robin` LLM verdict is advisory and downgrade-only. Scope limit: the deterministic guarantee is strong for **command-backed** criteria (Superloopy re-runs the command); a **manual (commandless)** criterion is re-validated for artifact existence only — its correctness rests on the auditor's judgment and human review, not the floor. Prefer command-backed proof.
- Actor fields must be non-empty but are not tied to hard-coded role names.
- Artifact references must resolve inside `.superloopy/evidence/` or the active scoped evidence root, must not be symlinks, and must be non-empty files.
- `superloopy loop review --artifact` and `superloopy loop finish --artifact` write the machine quality gate and require a `.json` path. Human Markdown gate reports, such as a crew final-gate report, must be recorded as separate evidence artifacts.

### Claim-shaped surface evidence

Review-gate `manualQa.surfaceEvidence` and matrix-gate `executorQa.surfaceEvidence` support proportional proof without letting one composite artifact silently stand in for every owner or target. A new scoped row represents exactly one concrete target and one affected owner. Its `target`, `owner`, non-empty `claims`, and `scopeReason` fields are an all-or-nothing group; partial, empty, duplicate, vague, unknown, or surface-incompatible metadata fails closed.

`target` is an object with three required fields:

- `id` is a stable portable slug: lowercase ASCII letters/digits joined by single hyphens. It identifies one execution target, such as `windows-11-tauri-shell` or `chrome-128-windows-11`. The aggregate tokens `all`, `any`, `every`, `multi`, `multiple`, `cross`, `universal`, `supported`, `targets`, `devices`, `platforms`, and `browsers` are rejected when they appear as slug tokens or form a compact aggregate-only ID such as `alltargets` or `supporteddevices`. A short ID such as `desktop`, `mobile`, or `web` is syntactically valid; the required `platform` and concrete `environment` fields keep it from acting as an aggregate target assertion.
- `platform` is one lowercase alphanumeric symbolic platform ID such as `windows`, `android`, `ios`, `macos`, `linux`, or `web`. It names one platform, never a list or free-text combination.
- `environment` names the exact runtime, device, application shell, or browser build used for proof and may include its host OS, for example `Tauri 2.8.2 native shell on Windows 11 24H2 x64` or `Chrome 128.0.6613.86 on Windows 11 24H2 x64`. Aggregate target-set phrases such as `all supported browsers`, `any devices`, or `cross-platform` are rejected.

The `surface` label describes the delivery/composition being exercised; it does not replace the structured target. Reuse a `target.id` for multiple owners only when they are genuinely parts of the same execution target, and then create a separate row for each owner. Free-text framework names are not a complete registry. A named Chrome/Chromium, Firefox, Safari, or Edge build on Android, iOS, macOS, Windows, or Linux remains browser-owned unless the row names a native application owner; a WebView, Tauri/Electron/Capacitor/Cordova bridge, or separately named native application uses its own owner row.

Owners are `browser`, `native`, `hybrid`, `renderer`, `cli`, `tui`, `http`, or `data` when the named surface actually exposes that owner. For an embedded or hybrid surface, `browser` means the client, `native` means the shell, and `hybrid` means the bridge/composition. Claims are the owner-applicable subset of `interaction`, `visual`, `accessibility`, `target`, `package-lifecycle`, `renderer`, `http`, and `data`. `scopeReason` explains why that one owner and its selected claims changed. These fields establish a mechanical minimum, not the truth of the declared scope; review must still detect an omitted owner, target, or claim.

The complete accepted artifact-kind vocabulary is: `cli-transcript`, `log`, `failure-mode-test`, `browser-automation`, `screenshot`, `image`, `http-dump`, `data-diff`, `cli-replay`, `pty-capture`, `app-automation-transcript`, `client-automation-transcript`, `api-package-test-report`, `accessibility-tree`, `device-report`, `package-lifecycle-report`, and `renderer-trace`. Acceptance into this vocabulary does not make a kind compatible with every owner: `failure-mode-test`, for example, normally proves an adversarial case rather than a surface claim. Every referenced artifact must resolve to a non-empty, non-symlink file inside the active evidence boundary.

### Scoped owner/claim proof minimums

The validator unions the minimum for every selected claim. A structured target description never substitutes for a `device-report` when that report is required.

| Owner | Allowed claim | Minimum referenced proof |
| --- | --- | --- |
| `cli` | `interaction` | One of `cli-transcript`, `log`, or `cli-replay`. |
| `tui` | `interaction` | One of `pty-capture`, `cli-transcript`, `log`, or `cli-replay`. |
| `tui` | `visual` | `screenshot`/`image`, or a `pty-capture`. |
| `browser` | `interaction` | `browser-automation` or `client-automation-transcript`. |
| `browser` | `visual` | `screenshot` or `image`. |
| `browser` | `accessibility` | `accessibility-tree` plus browser/client interaction proof. |
| `browser` | `target` | `device-report`. |
| `browser` | `package-lifecycle` | `package-lifecycle-report`. |
| `native` | `interaction` | `app-automation-transcript` plus `device-report`. |
| `native` | `visual` | `screenshot`/`image` plus `device-report`. |
| `native` | `accessibility` | `accessibility-tree`, `app-automation-transcript`, and `device-report`. |
| `native` | `target` | `device-report`. |
| `native` | `package-lifecycle` | `package-lifecycle-report` plus `device-report`. |
| `hybrid` | any allowed claim | Every scoped hybrid row first needs browser/client interaction, shell `app-automation-transcript`, and `device-report`; then add `screenshot`/`image` for `visual`, `accessibility-tree` for `accessibility`, or `package-lifecycle-report` for `package-lifecycle`. |
| `renderer` | `interaction` | One of browser, client, or application automation. |
| `renderer` | `visual` | `screenshot` or `image`. |
| `renderer` | `accessibility` | `accessibility-tree` plus browser/client/application interaction proof. |
| `renderer` | `target` | `device-report`. |
| `renderer` | `renderer` | `renderer-trace`. |
| `http` | `http` | `http-dump`. |
| `data` | `data` | `data-diff` or `api-package-test-report`. |

Resolved proof is attributable to one scoped target-owner slice. Within `surfaceEvidence`, each scoped `target.id` + `target.platform` + `owner` slice may appear only once — one generic target ID may recur across distinct platforms — and two different scoped slices may not cite the same resolved artifact path. Duplicate resolved paths are also rejected when `artifactRefs` are declared, even under different artifact IDs. Reusing a path cannot turn one execution into independent target proof. `adversarialCases` and matrix `contractCoverage` do not declare their own `target` or `owner`; they reference artifact IDs and, for matrix coverage, contract-bound surface/adversarial rows. Those references inherit the relevant surface slice instead of creating a second slice. This exclusivity tightening does not reinterpret legacy unscoped literal rows.

Matrix contract coverage must cite a surface or adversarial proof row with the same `contractRef`; direct artifact-only coverage, duplicate proof IDs, empty adversarial artifacts, or proof/scope fields hidden on `not_applicable` rows fail closed. Contract and adversarial references cannot declare a new target-owner slice or override the scoped surface row they cite.

The following complete fragment can be copied under a review gate's `manualQa` object for a native shell slice. The files must already exist and be non-empty:

```json
{
  "artifactRefs": [
    {
      "id": "windows-shell-action",
      "kind": "app-automation-transcript",
      "description": "Native menu activation and resulting shell state on the named target.",
      "path": ".superloopy/evidence/frontend/20260720T120000Z-tauri-menu/windows-shell-action.txt"
    },
    {
      "id": "windows-shell-device",
      "kind": "device-report",
      "description": "Exact Windows, architecture, Tauri runtime, and package identity.",
      "path": ".superloopy/evidence/frontend/20260720T120000Z-tauri-menu/windows-shell-device.json"
    }
  ],
  "surfaceEvidence": [
    {
      "id": "surface-windows-tauri-shell",
      "criterionRef": "C001",
      "surface": "Tauri desktop native shell",
      "target": {
        "id": "windows-11-tauri-shell",
        "platform": "windows",
        "environment": "Tauri 2.8.2 native shell on Windows 11 24H2 x64"
      },
      "owner": "native",
      "claims": ["interaction", "target"],
      "scopeReason": "The changed menu command and target integration are owned by the Windows shell.",
      "invocation": "Launch the packaged app and activate File > Import with keyboard and pointer.",
      "verdict": "passed",
      "artifactRefs": ["windows-shell-action", "windows-shell-device"]
    }
  ]
}
```

For a matrix row, use `contractRef` in the surface row and bind `contractCoverage` to that same contract as described above.

### Exact legacy absence compatibility

When **all four** scoped fields (`target`, `owner`, `claims`, and `scopeReason`) are absent, the row remains unscoped and uses the prior surface-family behavior. Supplying only some of them is never legacy mode.

- Review exact normalized `browser` or `gui` literals retain image-only (`screenshot`/`image`) compatibility. Exact review `web` and richer browser labels do not get that exception and require the normal browser-family floor.
- Matrix exact normalized `browser`, `gui`, or `web` literals retain automation plus image proof. Matrix exact normalized `native`, `desktop`, or `tui` literals retain the former one-of screenshot/image, PTY, or app-automation proof.
- Every other unscoped label uses its conservative classified family floor. Browser target adjectives such as `mobile Web`, `desktop browser`, PWA, or extension remain browser-owned; an embedded WebView remains browser-client plus native-shell hybrid.
- The structured-target and cross-target artifact-exclusivity rules apply to new scoped surface slices. Existing legacy unscoped literal contracts retain their former meaning and are not retroactively split into inferred target-owner combinations.

## Golden Scenarios

`test/golden-hooks.test.js`, `test/golden-review-gate.test.js`, and `test/golden-matrix-gate.test.js` verify:

- context-pressure Stop silence
- strict `create_goal` guard wording
- trigger-scoped context injection on `UserPromptSubmit`
- ordinary prompt silence when active Superloopy state exists
- malformed steering fail-closed behavior
- unsafe steering rejection
- invalid target fail-closed behavior
- scoped session isolation
- scoped hook context injection
- scoped steering isolation from global state
- `SUPERLOOPY_EVIDENCE` and legacy receipt compatibility
- symlink evidence rejection
- three-attempt subagent receipt state
- five-section review gate acceptance
- weak manual QA quality gate rejection
- `@goal` story splitting
- empty `@goal` block rejection
- matrix gate acceptance
- inline-only executor QA proof rejection
- not-applicable adversarial case rejection
- structured singular target objects plus proportional owner-and-claim surface evidence
- invalid/vague/multi-target scope rejection and composite-owner enforcement
- one scoped surface row per target-platform-owner slice, independent resolved artifacts between different surface slices, and adversarial/coverage references that cannot invent a new slice
- exact unscoped review/matrix legacy literal compatibility
- one-time SessionStart bootstrap for the command wrapper and bundled agents
- quiet default plugin continuation hook registration
- packaged Stop hook that remains runtime opt-in through `SUPERLOOPY_STOP_HOOK=on`
- premature native `update_goal status=complete` rejection while Superloopy aggregate completion is incomplete
- accepted fleet handoffs requiring active-root evidence artifacts
- crew completion lines staying presentation-only beside handoff and fleet status
- model policy defaults checked by doctor
- commandless manual proof and exhausted-attempt warnings in trace, check, and report

Evidence trace: Superloopy's `trace` view shows artifact-backed proof, missing proof, suggested artifact paths, summary counts, and timestamped ledger events.

Evidence report: Superloopy writes a portable report artifact with an Evidence Summary section, recorded evidence, artifact capture times, a timestamped timeline, next action, and proof plan.

Evidence warnings: Superloopy surfaces commandless manual proof and exhausted worker/auditor attempts as warnings. They do not replace the strict proof floor; they point the parent toward stronger command-backed evidence or a smaller respawned lane.

Flow checklist guide: Superloopy's guide and hooks show start or resume, record artifact-backed proof, check evidence, and finish with quality gate.

## Host Contract

Superloopy rides the host's native subagents. The precise `SubagentStop` payload contract and the host behaviors Superloopy cannot verify (advisory limits) are documented in `docs/superloopy-host-contract.md`. Absent host support the hook gates degrade to advisory, while the deterministic completion floor still gates completion on the CLI path.
