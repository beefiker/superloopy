# Shared UX Contract

Use this reference once for every supported screen-based application UI route. It defines user-facing truth and proportional evidence; platform, shell, renderer, Web, and Qt references add their own ownership rules.

## Five-stage workflow

1. **Frame the delta.** Name the affected users, job, and desired outcome. Mark every material statement as evidence, assumption, or unknown and record confidence. Do not turn an assumption into a requirement by repeating it.
2. **Map journeys and capabilities.** Trace entry, action, system response, recovery, and exit for the affected journeys. Inventory the capabilities each step relies on and their owners.
3. **Specify behavior and invariants.** Define semantic results, state changes, failure truth, content, accessibility, adaptation, and persistence boundaries before polishing appearance.
4. **Choose claim-shaped evidence.** Match each claim to the narrowest evidence that can prove it on the actual target.
5. **Promote capability by capability.** Move simulated work toward production only with new real-target evidence for that capability. A neighboring proven capability does not promote it.

## Proportional artifacts

`UX_CONTRACT.md` is required for an expanded journey and for a new/redesigned/high-consequence surface; a narrow fix uses the compact evidence below.

- **Narrow fix:** record the UX delta, affected journey, risk, and regression proof in the existing evidence receipt. If behavior truly does not change, record `UX impact: unchanged` and why.
- **Expanded journey:** write a scoped `UX_CONTRACT.md` with the journey, capabilities, owners, invariants, risks, and evidence matrix.
- **New/redesigned/high-consequence surface:** write `UX_CONTRACT.md` with fuller discovery, content, accessibility, localization, adaptation, usability, and promotion evidence.

Do not demand exhaustive personas, every-route screenshots, or a new design-system artifact for a narrow change whose risk does not justify them.

## Capability record

Track these dimensions independently; do not collapse them into one status word:

| Dimension | Values | Meaning |
| --- | --- | --- |
| Role | `action`, `navigation`, `input`, `output` | What semantic job the capability performs. Decoration is not a capability. |
| Fidelity | `production`, `simulated`, `deferred` | Whether the real owner performs the outcome, a coherent prototype substitutes for it, or it is intentionally absent. |
| Availability | `enabled`, `temporarily unavailable` | Whether a meaningful prerequisite currently permits use. |
| Verification | `proven`, `unverified` | Whether current evidence supports the claim on the named target. |

For early design, record semantic intent and intended owner. Before production promotion, name the concrete command or handler, state owner, observable outcome, failure and recovery, lifetime, and evidence.

## Functional truth

- An enabled production affordance performs its advertised semantic outcome. Calling a handler, showing a toast or spinner, or reaching a mock adapter is not completion.
- A real failed operation is honest only when it avoids false success, reports the resulting state, and offers a recovery or next step.
- Simulated prototype capabilities may be enabled and coherent, but they cannot satisfy production or native acceptance until reclassified and proved against the real owner.
- A deferred future capability is normally omitted and has no operable affordance. Its availability is `N/A`, an applicability marker and not a third availability value, and its verification remains `unverified`.
- A stable top-level information architecture may retain an honestly unavailable signpost when product or platform convention makes that location meaningful. Record and render that signpost as a separate passive output capability with `production` fidelity and `enabled` availability, then classify its evidence independently as `proven` or `unverified`. It is never the deferred navigation affordance itself and must not be a button, link, or focus action.
- A temporarily unavailable state requires a real prerequisite, an accessible reason, and a useful next step. It is not a placeholder for permanently missing work.
- Decoration has no action, focus stop, interactive role, or misleading hover/pressed treatment.
- An editable-looking control must support edit, validate, commit, and cancel behavior. A permanent read-only value appears as output or is clearly read-only in appearance and semantics.

## Reduce input burden

For a constrained identifier with an authoritative source, prefer a suitable platform, toolkit, provider, or portal picker, then search, detection, suggestion, and recent values as the source permits. There is no universal picker for every path, font, executable, account, or expert identifier. Validated manual entry remains legitimate for arbitrary or expert data and as an explicit fallback.

Name validation timing, format, recovery, privacy, permissions, cancellation, and the resulting stored value. A picker dialog alone does not prove that the chosen value works after packaging or restart.

## Undo and reversible work

Undo is a domain command model, not a dump of UI events. Record user-visible intent, coalesce continuous changes, remove no-op commands, show a meaningful label for the next operation, and restore visible state. Passive hover, focus, scroll, and navigation noise is excluded by default; selection, navigation, and resize belong only when one is itself a meaningful mutation users reasonably expect to reverse. State Undo applicability explicitly for editor-like or reversible workflows instead of forcing it onto every form.

Test command boundaries, coalescing, no-op removal, redo invalidation, labels, restored selection/focus where relevant, and the real model result.

## State and persistence

Separate application defaults, user preferences, system-owned preferences, document or model state, scene or window restoration, sensitive values, and ephemeral UI. Name one owner and serialization boundary for each.

Every durability claim names its boundary: same view, revisit, restart, process recreation, supported upgrade, device transfer, or durable account state. Do not turn a toolkit API into a promise about reinstall or cross-device survival. A migration is explicit, idempotent where required, and scoped to supported version, package, and distribution channel. Prove old-to-new behavior with representative stored data and failure recovery.

## Information architecture, content, and recovery

Information architecture (IA) uses stable grouping and terminology, a visible location, clear entry and exit, an evident next step, task-oriented labels, meaningful headings and links, and one clear primary action where the task has one. Remove duplicate commands whose semantic result and context are the same; distinguish commands whose owners or consequences differ.

Use consequence-scaled error handling. Preserve input, identify the specific correction, prevent duplicate submission, and use review, reversal, or confirmation only when the consequence warrants it. Never report success before the durable owner confirms the result.

## Internationalization and bidirectionality

Internationalization begins during discovery. Avoid display-string concatenation; use locale-aware formatting, sorting, searching, pluralization, and input. Carry language and direction metadata, and define whether a product language override follows the system, persists locally, syncs, or is unavailable.

Test representative long text, unbroken content, bidirectional content, and taller-script content without assuming one universal expansion percentage. Mirroring is selective: content such as media controls, charts, maps, and user-authored direction may not mirror with surrounding navigation.

## Accessibility and adaptation

Prove names, roles, states, actions, focus order, visible focus, focus restoration, absence of traps, status announcements, and alternatives for complex pointer gestures. Equivalent semantic outcome and failure truth matter more than identical gestures. Apply keyboard, switch, touch, pointer, stylus, voice, and assistive-technology checks only where the platform or supported input makes them relevant.

Adaptive invariants preserve reachability and avoid unintended information or function loss across supported window sizes, orientation, zoom, text scaling, content variation, and input changes. Platform references own exact insets, posture, windowing, breakpoints, and legitimate two-dimensional exceptions.

## Evidence and promotion

- An executable target journey plus the resulting state proves function.
- Automation plus applicable keyboard, assistive-technology, and device checks supports an accessibility claim.
- Observing representative users completing believable tasks supports usability; a reviewer preference does not.
- Telemetry and outcome measures support live quality when their collection and interpretation are valid.
- Static contract tests prove policy packaging and routing, not that downstream applications are usable.

Record the target, build, state, owner, command or procedure, artifact, result, limitation, and reviewer for every material claim. An unavailable proof path is a blocker or explicit unverified claim, never a reason to substitute a prettier artifact.
