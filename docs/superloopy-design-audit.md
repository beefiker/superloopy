# Superloopy Design Audit

This doctor-verified audit records Superloopy's own design decisions. It exists to keep compatibility behavior explicit without making external lineage part of the product contract.

## Design Decisions

| Decision | Reason | Effect | Guard |
| --- | --- | --- | --- |
| `gate-shape-compatibility` | Existing users may have strict review or matrix gate JSON. | Superloopy keeps both shapes accepted through local validators. | `test/golden-review-gate.test.js`, `test/golden-matrix-gate.test.js`, and `src/artifacts.js`. |
| `actor-field-policy` | Exact external role literals made compatibility too specific. | Actor fields now require non-empty identity text instead of a hard-coded role name. | `src/review-gate.js` and review-gate golden tests. |
| `native-naming` | Public code, docs, and tests should describe Superloopy behavior directly. | Modules, tests, docs, CLI flags, and metadata use Superloopy-owned terms. | `test/docs.test.js` and `docs/superloopy-gate-notes.md`. |
| `recorded-thresholds` | Later analysis should compare against earlier judgments. | `docs/superloopy-loop-golden-set.md` stores score history and command evidence in one tracked place. | `docs/superloopy-loop-golden-set.md` and `test/docs.test.js`. |
| `model-policy` | Crew lanes need explicit cost/depth defaults without treating model choice as correctness. | Bundled agent TOML files carry advisory model, effort, and tier defaults, with Nami optimized for navigation and review/gate lanes using deeper effort. | `docs/superloopy-model-policy.md`, `src/model-policy.js`, and `test/doctor.test.js`. |
| `crew-lines` | Crew handoffs should feel alive without weakening evidence discipline. | Known crew lanes can emit original terminal-state lines in presentation output only; persisted state and gate authority stay mechanical. | `docs/superloopy-crew-lines.md`, `src/crew-lines.js`, `test/crew-lines.test.js`, and `test/fleet.test.js`. |
| `frontend-quality-skill` | UI work needs a repeatable anti-AI-slop discipline, not ad-hoc prompting, and should auto-activate on visual work. | A bundled `superloopy-frontend` skill gates UI with a DESIGN.md token contract, named anti-slop rules, and a real-browser visual-QA evidence artifact; it ships a loopy-native brand design-token library (~47 teardowns + on-demand extraction), an image-first discipline, a dependency-free PNG visual-diff script, and a measured quality gate (design-system compliance script + npx Lighthouse protocol); the prompt hook detects frontend intent and injects a guidance-only steer toward it; all prose is independently authored, scripts use only Node built-ins, and no external design files or dependencies are vendored. | `skills/superloopy-frontend/SKILL.md`, `src/engineer.js`, `test/plugin.test.js`, `test/engineer.test.js`, `test/hooks.test.js`, and the file-audit/golden-set inventories. |
| `korean-humanizer-skill` | Korean users need a Codex-native AI-tone-removal workflow with stronger proof than a prompt-only port. | Superloopy ships a local `humanize-korean` skill with packaged references, attribution, deterministic audit metrics, and evidence artifacts. | `skills/humanize-korean/SKILL.md`, `skills/humanize-korean/scripts/audit-humanize-output.mjs`, `test/humanize-korean.test.js`, `test/plugin.test.js`, and the file-audit/golden-set inventories. |

## Compatibility Boundary

Superloopy supports strict gate shapes as data contracts, not as implementation lineage. The accepted shapes are:

- Review gate: reviewer, manual QA, gate review, iteration, and criteria coverage.
- Matrix gate: architecture review, executor QA, and iteration.
- Default gate: status plus artifact list.

All paths resolve through Superloopy evidence confinement.

## Decision Log

- Turn 0: baseline audit found inherited names across runtime, docs, skill metadata, and tests.
- Turn 1: runtime modules, CLI flags, docs, tests, and audit policy were renamed to Superloopy-owned terms while preserving strict gate behavior.
- Final completion requires a fresh audit plus `node src/cli.js doctor --json` and `npm test`.
