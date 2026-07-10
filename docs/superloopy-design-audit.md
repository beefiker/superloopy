# Superloopy Design Audit

This doctor-verified audit records Superloopy's own design decisions. It exists to keep compatibility behavior explicit without making external lineage part of the product contract.

## Design Decisions

| Decision | Reason | Effect | Guard |
| --- | --- | --- | --- |
| `gate-shape-compatibility` | Existing users may have strict review or matrix gate JSON. | Superloopy keeps both shapes accepted through local validators. | `test/golden-review-gate.test.js`, `test/golden-matrix-gate.test.js`, and `src/artifacts.js`. |
| `actor-field-policy` | Exact external role literals made compatibility too specific. | Actor fields now require non-empty identity text instead of a hard-coded role name. | `src/review-gate.js` and review-gate golden tests. |
| `native-naming` | Public code, docs, and tests should describe Superloopy behavior directly. | Modules, tests, docs, CLI flags, and metadata use Superloopy-owned terms. | `test/docs.test.js` and `docs/superloopy-gate-notes.md`. |
| `recorded-thresholds` | Later analysis should compare against earlier judgments. | `docs/superloopy-loop-golden-set.md` stores score history and command evidence in one tracked place. | `docs/superloopy-loop-golden-set.md` and `test/docs.test.js`. |
| `model-policy` | Crew lanes need explicit cost/depth pins, and preferred preview models are not available on every Codex surface. | `model-policy.json` defines ordered complete model/effort/tier tuples. Managed personal-agent installation resolves them before launch, reuses a valid cache for 24 hours, and replaces only hash-matching managed files so user edits remain conflicts. Availability failure never causes a post-launch retry or model switch. | `src/model-policy.js`, `src/model-resolution.js`, `src/managed-agents.js`, `test/model-resolution.test.js`, `test/model-resolution-cache.test.js`, `test/model-install.test.js`, and the no-thread/turn/prompt assertion in `test/model-catalog.test.js`. |
| `crew-lines` | Crew handoffs should feel alive without weakening evidence discipline. | Known crew lanes can emit original terminal-state lines in presentation output only; persisted state and gate authority stay mechanical. | `docs/superloopy-crew-lines.md`, `src/crew-lines.js`, `test/crew-lines.test.js`, and `test/fleet.test.js`. |
| `frontend-quality-skill` | UI work needs a repeatable anti-AI-slop discipline without letting a lexical classifier seize backend or mixed tasks. | A bundled, explicitly invoked `superloopy-frontend` skill gates UI with a DESIGN.md token contract, named anti-slop rules, and a real-browser visual-QA evidence artifact; it ships a loopy-native brand design-token library (~47 teardowns + on-demand extraction), an image-first discipline, a dependency-free PNG visual-diff script, and a measured quality gate (design-system compliance script + npx Lighthouse protocol). The prompt hook recognizes exact Superloopy invocation tokens and structured steering instead of frontend vocabulary; all prose is independently authored, scripts use only Node built-ins, and no external design files or dependencies are vendored. | `skills/superloopy-frontend/SKILL.md`, `src/engineer.js`, `src/hooks.js`, `test/plugin.test.js`, `test/engineer.test.js`, `test/hooks.test.js`, and the file-audit/golden-set inventories. |
| `korean-humanizer-skill` | Korean users need a Codex-native AI-tone-removal workflow with stronger proof than a prompt-only port. | Superloopy ships a local `humanize-korean` skill with packaged references, attribution, deterministic audit metrics, and evidence artifacts. | `skills/humanize-korean/SKILL.md`, `skills/humanize-korean/scripts/audit-humanize-output.mjs`, `test/humanize-korean.test.js`, `test/plugin.test.js`, and the file-audit/golden-set inventories. |
| `slides-skill` | Presentation work needs the same show-don't-tell style discovery and rendered-screenshot proof as other visual lanes, and rebuilding a mature template library from scratch would be weaker than adapting one. | A bundled `superloopy-slides` skill generates zero-dependency single-file HTML decks on a fixed 16:9 stage: three rendered style previews the user picks from, a vendored MIT `frontend-slides` template pack (audited by provenance and exempt from the line cap, like the landing-page orbit bundles), and completion gated on rendered-screenshot visual QA under `.superloopy/evidence/slides/`. | `skills/superloopy-slides/SKILL.md`, `skills/superloopy-slides/LICENSE`, `test/plugin.test.js`, `test/doctor.test.js`, and the file-audit/golden-set inventories. |
| `dual-host-support` | Superloopy's core is host-agnostic and users want it on Claude Code as well as Codex. | A parallel `.claude-plugin/` manifest + marketplace, `hooks/hooks.json`, `agents/*.md`, and a Claude model-policy doc let one repo install on both hosts; a shared `src/receipt.js` recovers the SubagentStop receipt from last_assistant_message or the subagent transcript tail, and `isClaudeHost` makes bootstrap a no-op on Claude — the deterministic floor stays host-agnostic. | `.claude-plugin/plugin.json`, `src/receipt.js`, `src/agents.js`, `test/host-adapter.test.js`, and the file-audit/golden-set inventories. |

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
