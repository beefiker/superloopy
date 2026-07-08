# Superloopy Loop Golden Set
This is Superloopy's own long-running loop-engineering golden set. It scores Superloopy on explicit criteria, artifact-backed proof, strict continuation, local state, append-only history, repository clarity, and reviewable files.
Inventory scope: Git-visible repository files from `git ls-files --cached --others --exclude-standard`.
## Strict Rules
- Each improvement turn must record a score before claiming completion.
- Each new score must be greater than the previous score.
- Each accepted score must be greater than the previous accepted score for this golden-set version.
- If a turn lowers the score, skip that turn's changes and continue from the last accepted state.
- A score is invalid without command evidence, changed-file evidence, and a short next-turn improvement target.
- Pass evidence must be artifact-backed or test-backed. Narrative-only evidence is not enough.
## Threshold Model
| Score | Meaning |
| ---: | --- |
| 20 | Repository purpose is unclear and outdated references are common. |
| 40 | Runtime names are mostly clear, but docs/tests still expose stale lineage. |
| 60 | Runtime is clear, but public docs or tests still carry stale references. |
| 80 | Public surface is Superloopy-owned and compatibility behavior remains covered. |
| 100 | Fresh audit proves stale references are removed, doctor passes, and full tests pass. |
## Score Model
Total: 100 points.
| Category | Points | Strict evidence |
| --- | ---: | --- |
| Repository clarity | 25 | Git-visible files describe Superloopy behavior without stale lineage references. |
| Gate compatibility | 20 | Review and matrix gates remain accepted and strict. |
| File inventory discipline | 15 | Every Git-visible file appears here and in `docs/superloopy-file-audit.md`. |
| Loop continuity | 15 | Create, next, proof, report, check, finish, trace, and hooks remain covered. |
| Recorded judgment trail | 15 | This file records score history, command evidence, and next-turn targets. |
| Reviewability | 10 | Source, docs, tests, JSON, and YAML stay under the line cap. |
## Long-Running Goldens
| ID | Loop task | Command evidence | Strict pass rule |
| --- | --- | --- | --- |
| LG-01 | Repository inventory stays complete while files change. | `node --test test/audit.test.js test/file-audit.test.js` | Every Git-visible file is listed here and in `docs/superloopy-file-audit.md`; stale or incomplete audit rows fail. |
| LG-02 | A long loop can advance through create, next, proof, report, check, and finish. | `node --test test/loop.test.js test/cli-evidence.test.js test/loop-gates.test.js test/report.test.js` | Each command returns the next guide action and refuses completion until pass artifacts exist. |
| LG-03 | Hooks keep long-running work from ending early. | `node --test test/hooks.test.js test/golden-hooks.test.js` | Stop, prompt, receipt, scoped session, and steering hooks are fail-closed and guide-backed. |
| LG-04 | Goal parsing and scoped state stay stable across turns. | `node --test test/goals.test.js test/golden-matrix-gate.test.js` | `@goal` stories, scoped sessions, and matrix gate rows remain deterministic. |
| LG-05 | Quality gates reject weak proof. | `node --test test/golden-review-gate.test.js test/golden-matrix-gate.test.js test/loop-gates.test.js` | Weak QA, not-applicable shortcuts, missing matrix rows, and inline-only proof fail. |
| LG-06 | Public docs and packaging stay executable. | `node --test test/docs.test.js test/plugin.test.js test/doctor.test.js test/doctor-review-feedback.test.js test/wrapper-check.test.js` | Docs describe the real command surface, plugin hooks are valid, and doctor remains dependency-free. |
| LG-07 | Whole-repo health stays strict. | `npm test` and `node src/cli.js doctor --json` | All tests pass, doctor reports `ok: true`, and no hand-reviewable file exceeds the reviewability limit. |
| LG-08 | The continuation engine drives bounded multi-iteration work to evidence-backed completion. | `node --test test/golden-continuation.test.js` | Blocks while incomplete and under budget, resets the stall counter only above a recorded-proof high-water mark, and stops blocked-not-complete on a cap or no-progress; aggregate completion clears loop-control state. |
| LG-09 | Crew completion lines stay localized and presentation-only. | `node --test test/crew-lines.test.js test/fleet.test.js` | Terminal known crew handoffs may speak once in a supported catalog language, pending/unknown lanes stay quiet, and evidence/status fields remain authoritative. |
## File Evidence Inventory
| File | Evidence anchor | Strict pass rule |
| --- | --- | --- |
| `.agents/plugins/marketplace.json` | `test/plugin.test.js`, audit coverage. | Must expose the root Superloopy plugin as an installable Codex marketplace entry. |
| `.claude-plugin/marketplace.json` | Audit coverage. | Must expose superloopy as an installable Claude Code marketplace plugin pointing at this repo root. |
| `.claude-plugin/plugin.json` | Audit coverage; Claude plugin load. | Must declare the Claude plugin (name, skills, agents, hooks/hooks.json) so one repo installs on Claude Code. |
| `.codex-plugin/plugin.json` | `test/plugin.test.js`, doctor plugin manifest check. | Must expose `./skills/` and the packaged Superloopy hook files, including opt-in Stop. |
| `.codex/agents/franky.toml` | `test/docs.test.js`, audit coverage. | Must define the bounded Superloopy executor role, active evidence root, advisory model defaults, and `SUPERLOOPY_EVIDENCE` receipt. |
| `.codex/agents/jinbe.toml` | `test/docs.test.js`, audit coverage. | Must define the Superloopy gate-review role, active evidence root, advisory model defaults, and `SUPERLOOPY_EVIDENCE` receipt. |
| `.codex/agents/nami.toml` | `test/cli.test.js`, `test/doctor.test.js`, audit coverage. | Must define the read-only navigator role, advisory fast model defaults, return absolute paths, and write no evidence receipt; installed via SUPERLOOPY_AGENT_NAMES and matched by a SubagentStop matcher. |
| `.codex/agents/robin.toml` | `test/cli.test.js`, `test/doctor.test.js`, audit coverage. | Must define the robin auditor role, advisory model defaults, and the SUPERLOOPY_AUDIT verdict receipt; installed via SUPERLOOPY_AGENT_NAMES. |
| `.codex/agents/usopp.toml` | `test/docs.test.js`, audit coverage. | Must define the Superloopy QA role, active evidence root, advisory model defaults, and `SUPERLOOPY_EVIDENCE` receipt. |
| `.codex/agents/zoro.toml` | `test/docs.test.js`, audit coverage. | Must define the Superloopy code-review role, active evidence root, advisory model defaults, and `SUPERLOOPY_EVIDENCE` receipt. |
| `.github/assets/franky.png` | Audit coverage. | Must remain a README documentation image, not runtime plugin logic. |
| `.github/assets/jinbe.png` | Audit coverage. | Must remain a README documentation image, not runtime plugin logic. |
| `.github/assets/nami.png` | Audit coverage. | Must remain a README documentation image, not runtime plugin logic. |
| `.github/assets/robin.png` | Audit coverage. | Must remain a README documentation image, not runtime plugin logic. |
| `.github/assets/transferloom-clone-reference.png` | Audit coverage and README clone-demo reference. | Must remain a documentation screenshot for the validated Transferloom.com clone, not runtime plugin logic. |
| `.github/assets/usopp.png` | Audit coverage. | Must remain a README documentation image, not runtime plugin logic. |
| `.github/assets/zoro.png` | Audit coverage. | Must remain a README documentation image, not runtime plugin logic. |
| `.github/workflows/hol-plugin-scanner.yml` | Hashgraph catalog readiness and GitHub Actions. | Must run the HOL scanner against the plugin root with SHA-pinned actions and no runtime side effects. |
| `.github/workflows/test.yml` | Cross-platform test CI and GitHub Actions. | Must run `node --test` (no shell glob) across the ubuntu/windows/macos × Node 20/22 matrix with SHA-pinned actions and no runtime side effects. |
| `.gitignore` | Doctor runtime-boundary ignored samples and installed-cache docs coverage. | `.superloopy/`, logs, coverage, dependencies, OS noise, Codex marketplace metadata, and generated Astro output must stay out of source control. |
| `DESIGN.md` | Static landing-page design token contract. | Must keep the web preview's reference-inspired colors, typography, spacing, component states, motion, and depth explicit before UI edits. |
| `LICENSE` | Audit coverage and reviewability check. | Must remain a source file with no runtime implementation content. |
| `README.es.md` | `test/docs.test.js`, audit coverage. | Must provide the Spanish README locale and keep install commands aligned with the root README. |
| `README.ja.md` | `test/docs.test.js`, audit coverage. | Must provide the Japanese README locale and keep install commands aligned with the root README. |
| `README.ko.md` | `test/docs.test.js`, audit coverage. | Must provide the Korean README locale and keep install commands aligned with the root README. |
| `README.md` | `test/docs.test.js` public-doc assertions. | Must describe actual Superloopy install on both Codex and Claude Code, bootstrap, commands, evidence rules, hooks, gates, doctor checks, and locale links. |
| `README.zh-CN.md` | `test/docs.test.js`, audit coverage. | Must provide the Simplified Chinese README locale and keep install commands aligned with the root README. |
| `SECURITY.md` | Hashgraph catalog readiness. | Must document vulnerability reporting without publishing exploit details or secrets. |
| `agents/franky.md` | Audit coverage. | Must define the Claude bounded executor subagent and the SUPERLOOPY_EVIDENCE receipt. |
| `agents/jinbe.md` | Audit coverage. | Must define the Claude final gate-review subagent and the SUPERLOOPY_EVIDENCE receipt. |
| `agents/nami.md` | Audit coverage. | Must define the read-only Claude navigator subagent (writes no receipt) with a read-only tools allowlist. |
| `agents/robin.md` | Audit coverage. | Must define the read-only Claude auditor subagent, the SUPERLOOPY_AUDIT receipt, and a read-only tools allowlist. |
| `agents/usopp.md` | Audit coverage. | Must define the Claude QA subagent and the SUPERLOOPY_EVIDENCE receipt. |
| `agents/zoro.md` | Audit coverage. | Must define the Claude code-review subagent and the SUPERLOOPY_EVIDENCE receipt. |
| `docs/superloopy-claude-validation.md` | Audit coverage and reviewability check. | Must give a runnable Claude Code validation checklist covering install, components, the SubagentStop receipt/agent_type/env-var/steering linchpins, a full loop, and degrade-safety. |
| `docs/superloopy-crew-lines.md` | `test/docs.test.js`, audit coverage. | Must record the precedent pattern, no-copied-quotes rule, terminal-only behavior, and presentation-only authority boundary. |
| `docs/superloopy-design-audit.md` | `src/design-audit.js`, `test/doctor.test.js`. | Must keep required decision rows with reason, effect, and guard. |
| `docs/superloopy-file-audit.md` | `test/audit.test.js`, `src/file-audit.js`, doctor file-audit check. | Must list every Git-visible file with non-empty role and compatibility-boundary cells. |
| `docs/superloopy-gate-notes.md` | Doctor gate-notes check. | Must keep gate compatibility, native naming, golden scenario, and host contract sections visible. |
| `docs/superloopy-host-contract.md` | `test/cli.test.js`, doctor hostContract/gate-notes. | Must document the SubagentStop payload contract and the host behaviors Superloopy cannot verify. |
| `docs/superloopy-interop-superpowers.md` | `test/interop.test.js`, audit coverage. | Must document the Superpowers division of labor, best-effort detection, the override, and the doctor visibility check. |
| `docs/superloopy-loop-golden-set.md` | `test/docs.test.js` golden-set assertions. | Must list every Git-visible file, score each accepted run, and keep threshold history append-only. |
| `docs/superloopy-model-policy-claude.md` | `test/docs.test.js` model-policy assertions, audit coverage. | Must record the Claude model aliases and the advisory steering-not-proof rule mapped from the Codex policy. |
| `docs/superloopy-model-policy.md` | `test/docs.test.js`, `test/doctor.test.js`. | Must record allowed model values and state that model choice is steering, not proof. |
| `docs/superpowers/plans/2026-07-07-astro-landing.md` | Astro migration implementation plan. | Must record the migration steps, proof gates, and deployment path without adding plugin runtime behavior. |
| `docs/superpowers/specs/2026-07-07-astro-landing-design.md` | Astro landing design brief. | Must record the mobile, performance, image, and Cloudflare constraints for the website rewrite. |
| `hooks/hooks.json` | Audit coverage; Claude hook load. | Must route SessionStart/UserPromptSubmit/Stop/SubagentStop to the CLI via ${CLAUDE_PLUGIN_ROOT}, matching worker/navigator and auditor agent types. |
| `hooks/pre-tool-use.json` | `test/plugin.test.js`, doctor hook check. | Must route to `node "${PLUGIN_ROOT}/src/cli.js" hook pre-tool-use`. |
| `hooks/session-start.json` | `test/golden-hooks.test.js`, doctor hook check. | Must route first-launch bootstrap, marketplace update notices, and optional SessionStart context through the Superloopy CLI. |
| `hooks/stop.json` | Optional runtime hook file, direct hook tests. | Must route Stop continuation through the Superloopy CLI and stay inert unless `SUPERLOOPY_STOP_HOOK=on`. |
| `hooks/subagent-stop-audit.json` | `test/plugin.test.js`, doctor hook check. | Must route robin verdict validation through the Superloopy CLI. |
| `hooks/subagent-stop.json` | `test/plugin.test.js`, doctor hook check. | Must route executor, review, QA, and gate SubagentStop receipt validation through the Superloopy CLI. |
| `hooks/user-prompt-submit.json` | `test/plugin.test.js`, doctor hook check. | Must route prompt steering, the frontend-skill steer, and trigger-scoped context injection through the Superloopy CLI. |
| `installation.md` | `test/docs.test.js`, audit coverage. | Must give agents a root-level install contract for Codex and Claude Code from the GitHub URL, including verification and no-dependency boundaries. |
| `package-lock.json` | Hashgraph catalog readiness and npm audit surface. | Must lock only the dependency-free package root unless real dependencies are intentionally added. |
| `package.json` | `npm test`, doctor dependency check. | Must stay dependency-free and expose `superloopy`, `test`, `check`, and `sync-version` scripts. |
| `scripts/serve-web.mjs` | Browser QA preview server. | Must serve `web-superloopy/dist/` without dependencies and expose MIME types for landing WebGL assets. |
| `scripts/sync-version.mjs` | `test/sync-version.test.js`. | Must stamp `package.json` and `.codex-plugin/plugin.json` from one authoritative version without publishing or adding dependencies. |
| `web-superloopy/README.md` | Landing workspace notes: stack, vendored orbit runtime layout, and build commands. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/astro.config.mjs` | Astro static-site configuration for the Superloopy landing page. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/package-lock.json` | npm lockfile for the isolated Astro landing workspace. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/package.json` | Isolated Astro landing workspace with build, preview, and dev scripts. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/_headers` | Cloudflare Pages cache and security headers for the landing deployment. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/_nuxt/B3ZW860h.js` | Vendored deferred orbit-runtime chunk that boots the hero orbit iframe scene. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/_nuxt/B5CWAcHC.js` | Vendored deferred orbit-runtime chunk that boots the hero orbit iframe scene. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/_nuxt/BGJUq9Xl.js` | Vendored deferred orbit-runtime chunk that boots the hero orbit iframe scene. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/_nuxt/B_u25p9U.js` | Vendored deferred orbit-runtime chunk that boots the hero orbit iframe scene. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/_nuxt/Bf5EjdSh.js` | Vendored deferred orbit-runtime chunk that boots the hero orbit iframe scene. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/_nuxt/Bxf0_WhZ.js` | Vendored deferred orbit-runtime chunk that boots the hero orbit iframe scene. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/_nuxt/BzE5KGSD.js` | Vendored deferred orbit-runtime chunk that boots the hero orbit iframe scene. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/_nuxt/C_jbpiZQ.js` | Vendored deferred orbit-runtime chunk that boots the hero orbit iframe scene. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/_nuxt/CdqAplfn.js` | Vendored deferred orbit-runtime chunk that boots the hero orbit iframe scene. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/_nuxt/Cw6SDRPZ.js` | Vendored deferred orbit-runtime chunk that boots the hero orbit iframe scene. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/_nuxt/D3SU_gFM.js` | Vendored deferred orbit-runtime chunk that boots the hero orbit iframe scene. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/_nuxt/DRhX74SU.js` | Vendored deferred orbit-runtime chunk that boots the hero orbit iframe scene. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/_nuxt/DTod98oU.js` | Vendored deferred orbit-runtime chunk that boots the hero orbit iframe scene. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/_nuxt/Dp6Br8A9.js` | Vendored deferred orbit-runtime chunk that boots the hero orbit iframe scene. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/_nuxt/GMIvKI3C.js` | Vendored deferred orbit-runtime chunk that boots the hero orbit iframe scene. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/_nuxt/Geist_Mono-300-6.B_7UjwxQ.woff2` | Vendored deferred orbit-runtime chunk that boots the hero orbit iframe scene. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/_nuxt/Instrument_Sans-400-13.B5bTHO_g.woff2` | Vendored deferred orbit-runtime chunk that boots the hero orbit iframe scene. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/_nuxt/Instrument_Sans-400-14.BbzFLZTg.woff2` | Vendored deferred orbit-runtime chunk that boots the hero orbit iframe scene. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/_nuxt/KkTQbRs5.js` | Vendored deferred orbit-runtime chunk that boots the hero orbit iframe scene. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/_nuxt/LogoTile.B-K2MDYy.css` | Vendored deferred orbit-runtime chunk that boots the hero orbit iframe scene. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/_nuxt/XT-f8BUK.js` | Vendored deferred orbit-runtime chunk that boots the hero orbit iframe scene. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/_nuxt/builds/meta/587bbe40-e7b6-4f66-ab17-632623d299f6.json` | Vendored deferred orbit-runtime chunk that boots the hero orbit iframe scene. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/_nuxt/entry.Bn-A-Q0v.css` | Vendored deferred orbit-runtime chunk that boots the hero orbit iframe scene. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/_nuxt/index.DJdoYH0P.css` | Vendored deferred orbit-runtime chunk that boots the hero orbit iframe scene. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/_nuxt/kOqgKnzc.js` | Vendored deferred orbit-runtime chunk that boots the hero orbit iframe scene. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/_nuxt/ty4JC5yh.js` | Vendored deferred orbit-runtime chunk that boots the hero orbit iframe scene. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/_nuxt/w4_qzAi3.js` | Vendored deferred orbit-runtime chunk that boots the hero orbit iframe scene. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/_payload.json` | Vendored orbit-runtime hydration payload consumed by the hero orbit iframe. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/basis/basis_transcoder.js` | Basis/KTX2 texture transcoder used by the vendored orbit runtime and eye scene. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/basis/basis_transcoder.wasm` | Basis/KTX2 texture transcoder used by the vendored orbit runtime and eye scene. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/draco/draco_decoder.wasm` | Draco geometry decoder used by the landing WebGL model loaders. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/draco/draco_wasm_wrapper.js` | Draco geometry decoder used by the landing WebGL model loaders. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/favicon/android-chrome-192x192.png` | Favicon asset served by the landing page. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/favicon/android-chrome-512x512.png` | Favicon asset served by the landing page. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/favicon/apple-touch-icon.png` | Favicon asset served by the landing page. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/favicon/favicon-16x16.png` | Favicon asset served by the landing page. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/favicon/favicon-32x32.png` | Favicon asset served by the landing page. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/favicon/favicon.ico` | Favicon asset served by the landing page. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/fonts/0ce88599d2e95665-s.p.woff2` | Self-hosted landing-page display/body font. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/fonts/5efb1f4cfe660729-s.p.woff2` | Self-hosted landing-page display/body font. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/fonts/7fc63d81ed48df9b-s.p.woff2` | Self-hosted landing-page display/body font. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/fonts/c610bdeb33344a72-s.p.woff2` | Self-hosted landing-page display/body font. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/fonts/edfa245493c4c854-s.p.woff2` | Self-hosted landing-page display/body font. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/matcaps/1.webp` | Matcap texture for the crew glass pane sheen overlay. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/models/circles.gltf` | Landing WebGL model rendered by the loops band, footer, or steps scenes. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/models/star.gltf` | Landing WebGL model rendered by the loops band, footer, or steps scenes. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/og.jpg` | Open Graph share image for social link previews. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/orbit.html` | Vendored orbit-runtime host page embedded as the hero orbit iframe. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/webgl/models/crypto-inner-sphere-points.glb` | Orbit WebGL model or texture asset served to the landing hero and eye scenes. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/webgl/models/crypto-outer-sphere-points.glb` | Orbit WebGL model or texture asset served to the landing hero and eye scenes. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/webgl/models/eye.glb` | Orbit WebGL model or texture asset served to the landing hero and eye scenes. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/webgl/textures/eye-env.webp` | Eye scene environment panorama. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/webgl/textures/blurry_silver_mirrorball.ktx2` | Orbit WebGL model or texture asset served to the landing hero and eye scenes. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/webgl/textures/chrome-ring.ktx2` | Orbit WebGL model or texture asset served to the landing hero and eye scenes. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/webgl/textures/gradient-noise.jpg` | Orbit WebGL model or texture asset served to the landing hero and eye scenes. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/webgl/textures/hex-ao.ktx2` | Orbit WebGL model or texture asset served to the landing hero and eye scenes. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/webgl/textures/hex-normal.ktx2` | Orbit WebGL model or texture asset served to the landing hero and eye scenes. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/webgl/textures/normalMapSphere.ktx2` | Orbit WebGL model or texture asset served to the landing hero and eye scenes. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/webgl/textures/soft-light-env.webp` | Orbit WebGL model or texture asset served to the landing hero and eye scenes. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/webgl/textures/studio-env.ktx2` | Orbit WebGL model or texture asset served to the landing hero and eye scenes. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/public/webgl/textures/team-orb-env.jpg` | Orbit WebGL model or texture asset served to the landing hero and eye scenes. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/src/assets/generated/eye-glb-preview.webp` | Generated proof illustration used by the landing feature cards and carousel. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/src/assets/generated/final-gate.webp` | Generated proof illustration used by the landing feature cards and carousel. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/src/assets/generated/proof-evidence.webp` | Generated proof illustration used by the landing feature cards and carousel. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/src/assets/generated/skill-lanes.webp` | Generated proof illustration used by the landing feature cards and carousel. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/src/assets/generated/visible-progress.webp` | Generated proof illustration used by the landing feature cards and carousel. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/src/assets/panes/crew-01.webp` | Crew pane illustration rendered by the glass pane scene and its fallback grid. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/src/assets/panes/crew-02.webp` | Crew pane illustration rendered by the glass pane scene and its fallback grid. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/src/assets/panes/crew-03.webp` | Crew pane illustration rendered by the glass pane scene and its fallback grid. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/src/assets/panes/crew-04.webp` | Crew pane illustration rendered by the glass pane scene and its fallback grid. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/src/assets/panes/crew-05.webp` | Crew pane illustration rendered by the glass pane scene and its fallback grid. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/src/assets/panes/crew-06.webp` | Crew pane illustration rendered by the glass pane scene and its fallback grid. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/src/pages/index.astro` | Single-page landing markup: hero orbit, crew glass, feature cards, loops band, proof carousel, steps eye, install tabs, FAQ, and footer. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/src/scripts/app.js` | Landing interaction orchestrator: smooth scroll, preloader, header, menu, reveals, carousel, steps rail, install tabs, and accordions. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/src/scripts/eye-scene.js` | Native three.js port of the biology eye scene with cursor gaze tracking. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/src/scripts/glass-panes.js` | First-party Voronoi glass pane scene for the crew section. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/src/scripts/i18n.js` | Landing locale engine that re-renders copy from the EN markup source of truth. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/src/scripts/locales.js` | Landing locale dictionary (EN source text to de/ko/es). | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/src/scripts/orbit-embed.js` | Hero orbit iframe mount with readiness polling and NDC pointer forwarding. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/src/scripts/webgl.js` | Landing WebGL layers: dot-grid mouse-trail background and per-section GLTF model scenes. | Must stay website-only with no Superloopy CLI package coupling. |
| `web-superloopy/src/styles/global.css` | Landing design system: fonts, fluid type, gradients, component classes, keyframes, and section layouts. | Must stay website-only with no Superloopy CLI package coupling. |
| `skills/humanize-korean/SKILL.md` | `test/plugin.test.js`, audit coverage. | Must trigger for Korean AI-tone removal, preserve protected spans and register, run the audit script for file-backed output, and record Superloopy evidence. |
| `skills/humanize-korean/agents/openai.yaml` | `test/plugin.test.js`, audit coverage and reviewability check. | Must remain minimal Superloopy discovery metadata for Korean humanization. |
| `skills/humanize-korean/references/quality-rubric.md` | `test/plugin.test.js`, audit coverage and reviewability check. | Must define protected-token, Korean-ratio, change-rate, register, and grade gates. |
| `skills/humanize-korean/references/quick-rules.md` | `test/plugin.test.js`, audit coverage and reviewability check. | Must keep local Korean AI-tell rules and Superloopy additions without symlinked references. |
| `skills/humanize-korean/references/upstream-notice.md` | `test/plugin.test.js`, audit coverage and reviewability check. | Must attribute adapted `epoko77-ai/im-not-ai` ideas and keep the packaging boundary explicit. |
| `skills/humanize-korean/scripts/audit-humanize-output.mjs` | `test/humanize-korean.test.js`, audit coverage and reviewability check. | Must reject non-Korean input, fail missing protected tokens, report pattern deltas, and warn/fail by change rate without dependencies. |
| `skills/superloopy-clone/SKILL.md` | `test/plugin.test.js`, audit coverage. | Must describe authorized browser-assisted website cloning with specs, assets, build validation, visual QA, and Superloopy evidence receipts. |
| `skills/superloopy-clone/agents/openai.yaml` | Audit coverage and reviewability check. | Must remain minimal Superloopy discovery metadata for website cloning. |
| `skills/superloopy-doctor/SKILL.md` | `test/plugin.test.js`, doctor skill check, audit coverage. | Must diagnose Superloopy install health with `superloopy doctor --json`, plugin cache, wrapper, agents, hook/bootstrap, and no mutation before approval. |
| `skills/superloopy-doctor/agents/openai.yaml` | `test/plugin.test.js`, audit coverage and reviewability check. | Must remain minimal Superloopy discovery metadata for install diagnostics. |
| `skills/superloopy-frontend/SKILL.md` | `test/plugin.test.js`, audit coverage. | Must auto-activate on UI/visual work and enforce a DESIGN.md token gate, anti-slop rules, real-browser visual QA, and Superloopy evidence receipts. |
| `skills/superloopy-frontend/agents/openai.yaml` | `test/plugin.test.js`, audit coverage and reviewability check. | Must remain minimal Superloopy discovery metadata for frontend work. |
| `skills/superloopy-frontend/references/anti-slop.md` | Audit coverage and reviewability check. | Must keep the named-default bans, countable rules, consistency locks, real-asset mandate, and pre-flight checklist. |
| `skills/superloopy-frontend/references/design-system.md` | Audit coverage and reviewability check. | Must keep the 7-section DESIGN.md schema and loopy-native token-authoring guidance. |
| `skills/superloopy-frontend/references/design/_INDEX.md` | Audit coverage and reviewability check. | Must route brands/moods to one design-token file and point unknown brands at on-demand extraction. |
| `skills/superloopy-frontend/references/design/airbnb.md` | Audit coverage and reviewability check. | Must keep coral #ff385c to one element per viewport, Cereal body weight at 500 (never 400), and zero shadow on listing cards (whitespace + photo radius only). |
| `skills/superloopy-frontend/references/design/airtable.md` | Audit coverage and reviewability check. | Must keep positive letter-spacing (+0.08–0.28px) on body/labels and blue-tinted shadows (rgba(45,127,249,0.28)) rather than neutral-gray drops. |
| `skills/superloopy-frontend/references/design/amazon.md` | Audit coverage and reviewability check. | Must keep the layout dense (14px body, 4px-base spacing, gray-border separation) with the warm yellow/amber pill as the brightest action carrying dark #0f1111 text — never white text, never a blue CTA. |
| `skills/superloopy-frontend/references/design/apple.md` | Audit coverage and reviewability check. | Must keep #1d1d1f (never pure #000) for body text, #0071e3 reserved exclusively for actions/links, and the tonal-contrast depth strategy over shadow stacks. |
| `skills/superloopy-frontend/references/design/binance.md` | Audit coverage and reviewability check. | Must keep Binance Yellow #f0b90b as the only brand accent (all other color data-driven green/red), 50px pill CTAs, content cards <=12px, and shadows at ~5%. |
| `skills/superloopy-frontend/references/design/bmw.md` | Audit coverage and reviewability check. | Must keep the 60px display at weight 300 uppercase, BMW Blue #1C69D4 for interactive elements only (never backgrounds), and all corners at 0px. |
| `skills/superloopy-frontend/references/design/brex.md` | Audit coverage and reviewability check. | Must keep pure-black #0e0e0e as a primary surface (light/dark alternation), dark/black primary CTA with orange as accent-only, tight -2% heading tracking, and squared 6-16px radii (no pills). |
| `skills/superloopy-frontend/references/design/bugatti.md` | Audit coverage and reviewability check. | Must use scale not weight for hierarchy and keep the palette to black/white/#999999 — bolding for emphasis, adding any accent color, or using a 12-24px rounded card breaks the black-velvet-stand austerity. |
| `skills/superloopy-frontend/references/design/cal.md` | Audit coverage and reviewability check. | Must keep the palette grayscale (color only for links/product UI) and use 0 0 0 1px ring-shadow containment instead of CSS borders. |
| `skills/superloopy-frontend/references/design/canva.md` | Audit coverage and reviewability check. | Must keep the blue-purple gradient as the signature on hero washes and a headline word with generous 12-24px radii and soft shadows, never a flat single-tone purple UI or hard-edged geometry. |
| `skills/superloopy-frontend/references/design/claude.md` | Audit coverage and reviewability check. | Must keep warm-only neutrals, weight-500 serif display (no bold), terracotta #c96442 reserved for primary CTAs, ring shadows over drop shadows, and #f5f4ed bg over pure white. |
| `skills/superloopy-frontend/references/design/clickhouse.md` | Audit coverage and reviewability check. | Must keep pure-black background, Neon Volt as accent/CTA/border only (never a large fill), Inter weight 900 hero, and charcoal-border/inset depth over soft shadows. |
| `skills/superloopy-frontend/references/design/cohere.md` | Audit coverage and reviewability check. | Must keep 22px radius on all primary cards, interaction blue #1863dc strictly for hover/focus/active states, default ghost (transparent) buttons, and cool black-and-white surfaces. |
| `skills/superloopy-frontend/references/design/coinbase.md` | Audit coverage and reviewability check. | Must keep #0052ff used functionally only, 56px+ pill CTAs, weight-400 CoinbaseDisplay heroes at 1.00 line-height, and hard light/dark section cuts. |
| `skills/superloopy-frontend/references/design/cursor.md` | Audit coverage and reviewability check. | Must keep warm tones (#f2f1ed canvas, #26251e text, never pure white/black), CursorGothic at weight 400 with size-scaled negative tracking (-2.16px at 72px), and the #cf2d56 warm-crimson hover shift. |
| `skills/superloopy-frontend/references/design/datadog.md` | Audit coverage and reviewability check. | Must keep the 4px-base density and #632ca6 purple as the sole brand color, holding green/yellow/red strictly to semantic OK/warn/critical status rather than decoration. |
| `skills/superloopy-frontend/references/design/discord.md` | Audit coverage and reviewability check. | Must keep the design dark-first on layered grays with Blurple #5865f2 as the only hero color and generous 16-24px radii, never a light-first or tight-cornered mock. |
| `skills/superloopy-frontend/references/design/duolingo.md` | Audit coverage and reviewability check. | Must keep the 3D button as a solid darker bottom-border edge (border-bottom + 0 2px 0 hard edge, not blurred shadows) that translates down on active, with chunky 700-800 rounded type. |
| `skills/superloopy-frontend/references/design/elevenlabs.md` | Audit coverage and reviewability check. | Must keep weight-300 Waldenburg display (never bold), stacked sub-0.1-opacity inset+outline+lift shadows, positive Inter body tracking, and the warm-tinted stone CTA shadow rgba(78,50,23,...). |
| `skills/superloopy-frontend/references/design/ferrari.md` | Audit coverage and reviewability check. | Must keep Ferrari Red #DA291C restricted to a single primary CTA per view, body text on white at #181818 (not pure black), and all interactive corners at 2px radius. |
| `skills/superloopy-frontend/references/design/figma.md` | Audit coverage and reviewability check. | Must keep interface chrome black + white only (color confined to hero/product gradients), use variable weight stops 320–540 not 400/500/600/700, and dashed 2px focus outlines. |
| `skills/superloopy-frontend/references/design/framer.md` | Audit coverage and reviewability check. | Must keep the background pure #000000 (no warm dark), GT Walsheim display at weight 500 with -3 to -5.5px tracking, #0099FF as the only accent, and pill buttons at radius 40px+. |
| `skills/superloopy-frontend/references/design/gemini.md` | Audit coverage and reviewability check. | Must keep the gradient as a single accent (one word, icon, or focus border) on Material-neutral chrome with weight-400 headlines and warm #1f1f1f text, never as a full-bleed background or bold display. |
| `skills/superloopy-frontend/references/design/github.md` | Audit coverage and reviewability check. | Must keep elevation as the #f6f8fa canvas-subtle gray behind white cards plus a 1px #d1d9e0 border (no card drop-shadows), with green/red used only as merge/danger state signals. |
| `skills/superloopy-frontend/references/design/gitlab.md` | Audit coverage and reviewability check. | Must keep the orange as a two-stop gradient rationed to one primary action/accent per view, pairing it with the cool #1068bf blue secondary rather than a second warm action. |
| `skills/superloopy-frontend/references/design/google.md` | Audit coverage and reviewability check. | Must keep display headlines at weight 400, shadows tinted to #3c4043 (never pure black), and blue #1a73e8 as the only CTA fill — red/yellow/green stay status-and-logo only. |
| `skills/superloopy-frontend/references/design/groq.md` | Audit coverage and reviewability check. | Must keep monochrome plus the single coral #f55036 with no second accent or gradient, sharp 2-4px corners, mono metrics, and fast easing, never a blue/purple AI gradient or pill softening. |
| `skills/superloopy-frontend/references/design/hashicorp.md` | Audit coverage and reviewability check. | Must keep shadows at the 5% dual-layer whisper level with tight 2–8px radii, and inject color only through the correct product accent (Terraform purple, Vault yellow, etc.) one per component. |
| `skills/superloopy-frontend/references/design/huggingface.md` | Audit coverage and reviewability check. | Must keep yellow #ffd21e paired only with black #1b1b18 text, monospace for every model name/tag/metric, and flat bordered cards, never white-on-yellow buttons or enterprise-sanitized chrome. |
| `skills/superloopy-frontend/references/design/ibm.md` | Audit coverage and reviewability check. | Must keep 0px radius on buttons/inputs/cards, display type at weight 300 (no 700), depth via gray layering not shadows, and #0f62fe as the sole accent. |
| `skills/superloopy-frontend/references/design/intercom.md` | Audit coverage and reviewability check. | Must keep all interactive radii at 4px (no pills), Fin Orange #ff5600 reserved for AI/brand accents only, and warm oat borders #dedbd6 not cool gray. |
| `skills/superloopy-frontend/references/design/kraken.md` | Audit coverage and reviewability check. | Must keep buttons capped at 12px radius (no pills), purple confined to the #7132f5/#5741d8/#5b1ecf scale, bold-700 display, and whisper-level (~3%) shadows. |
| `skills/superloopy-frontend/references/design/lamborghini.md` | Audit coverage and reviewability check. | Must keep the background true #000000, gold #FFC000 limited to primary CTAs, display type uppercase at weight 400, and all corners at 0px. |
| `skills/superloopy-frontend/references/design/linear.md` | Audit coverage and reviewability check. | Must keep the tonal-shift depth model (elevation via rising white-opacity, translucent hairline borders, no drop shadows on dark) and the 400/510/590 weight ladder. |
| `skills/superloopy-frontend/references/design/loom.md` | Audit coverage and reviewability check. | Must keep the coral-to-violet gradient and the perfect-circle camera bubble with a gradient ring and soft glow, never a flat single-violet enterprise treatment or a squared-off bubble. |
| `skills/superloopy-frontend/references/design/mastercard.md` | Audit coverage and reviewability check. | Must keep cream #f3f0ee as the background (never white), body weight 450 (not 400), radius only at full-pill/40px/full-circle, and signal orange #cf4500 reserved for consent/legal (never marketing CTAs). |
| `skills/superloopy-frontend/references/design/mercedes.md` | Audit coverage and reviewability check. | Must keep display headlines at weight 400 and use the chrome gradient for metallic emphasis — bolding the hero or painting #00ADEF onto buttons inverts the quiet-status voice. |
| `skills/superloopy-frontend/references/design/mercury.md` | Audit coverage and reviewability check. | Must keep the cool blue-cast neutrals, hairline-border structure (not shadows), radius capped at 16px (no pills), and monospace tabular numerals on all money figures. |
| `skills/superloopy-frontend/references/design/meta.md` | Audit coverage and reviewability check. | Must keep Meta Blue #0064E0 (not Facebook Blue #1877F2) for actions, full pill buttons at radius 100px, radius >=8px everywhere, and Optimistic VF with ss01+ss02 on display. |
| `skills/superloopy-frontend/references/design/microsoft.md` | Audit coverage and reviewability check. | Must keep depth from acrylic blur plus layered neutral shadows, radius square-ish at 4px (no pills), and communication blue #0078d4 as the only action color — logo red/green/yellow never become UI fills. |
| `skills/superloopy-frontend/references/design/midjourney.md` | Audit coverage and reviewability check. | Must keep the palette black/white/gray with zero brand accent hue, serif display at weight 400, flat no-shadow cards, and controls hidden until hover, never adding a signature color or persistent buttons. |
| `skills/superloopy-frontend/references/design/minimax.md` | Audit coverage and reviewability check. | Must keep white as the structural background with all color from product cards, purple-tinted featured-card shadows, pink #ea5ec1 as decorative-only, and headings at weight 500-600, never tinting content sections or going weight 700. |
| `skills/superloopy-frontend/references/design/mintlify.md` | Audit coverage and reviewability check. | Must keep full-pill radius on buttons and inputs, reserve mint #18E299 for CTA/hover/focus only, and separate via 5%-opacity borders on a single white field (no gray bands). |
| `skills/superloopy-frontend/references/design/miro.md` | Audit coverage and reviewability check. | Must keep display at Roobert weight 400 with strong negative tracking and ring-shadow (rgb(224,226,232) 0 0 0 1px) depth, never bold display or heavy drop shadows. |
| `skills/superloopy-frontend/references/design/mistral.md` | Audit coverage and reviewability check. | Must keep an exclusively warm palette, weight-400 type with size-driven hierarchy, near-zero border-radius (sharp corners), and amber-tinted multilayer golden shadows. |
| `skills/superloopy-frontend/references/design/mongodb.md` | Audit coverage and reviewability check. | Must keep the forest-black #001e2b canvas with teal-tinted shadows (rgba(0,30,43,…)) and reserve neon #00ed64 for accents/underlines on dark, never large fills or body text. |
| `skills/superloopy-frontend/references/design/netflix.md` | Audit coverage and reviewability check. | Must keep the canvas at true #000, button radius at a sharp 4px (no pills), depth via scale(1.08) plus bottom scrims, and red #e50914 functional only — never a decorative wash. |
| `skills/superloopy-frontend/references/design/netlify.md` | Audit coverage and reviewability check. | Must keep the directional teal→cyan gradient (and its cyan glow on the #13262f teal-slate console) as the signature rather than a flat single teal, with the rounded display face at weight 700–800. |
| `skills/superloopy-frontend/references/design/nike.md` | Audit coverage and reviewability check. | Must keep the interface greyscale with #111111 (not #000) text on white, flat depth (no card shadows or hover lift), pill CTAs at radius 30px, and Futura uppercase only at 24px+. |
| `skills/superloopy-frontend/references/design/notion.md` | Audit coverage and reviewability check. | Must keep foreground as rgba(0,0,0,0.95) (never pure black), borders at rgba(0,0,0,0.1), and depth as multi-layer faint shadow stacks rather than a single hard drop. |
| `skills/superloopy-frontend/references/design/nvidia.md` | Audit coverage and reviewability check. | Must keep #76b900 as a border/underline/outline signal (never a surface fill except on hover), 2px radius, and weight 700 as the default voice. |
| `skills/superloopy-frontend/references/design/nytimes.md` | Audit coverage and reviewability check. | Must keep 0px corners on images and story tiles, hierarchy by serif size and rule weight, and color restricted to grayscale plus the #326891 link blue. |
| `skills/superloopy-frontend/references/design/ollama.md` | Audit coverage and reviewability check. | Must keep a strictly grayscale palette (only the blue focus ring is chromatic), the binary 12px/9999px radius system with nothing in between, zero shadows, and type weights limited to 400 and 500. |
| `skills/superloopy-frontend/references/design/openai.md` | Audit coverage and reviewability check. | Must keep the palette monochrome with teal #10a37f reserved for rare brand moments, black pill primary CTAs, no decorative color/gradient hero, and a ~720px reading column. |
| `skills/superloopy-frontend/references/design/perplexity.md` | Audit coverage and reviewability check. | Must keep a single petrol-teal #20808d accent across links/CTAs/citations, body line-height >= 1.5, the ask/search bar as the hero object, and inline citation chips as the page rhythm. |
| `skills/superloopy-frontend/references/design/pinterest.md` | Audit coverage and reviewability check. | Must keep neutrals warm/olive (never cool steel), plum black #211922 for primary text (not #000), 16px-rounded buttons (never pill), and a flat shadow-minimal masonry surface. |
| `skills/superloopy-frontend/references/design/plaid.md` | Audit coverage and reviewability check. | Must keep truly-neutral grays (no warm/cool cast), monochrome black primary CTA with indigo as link/icon/connection-line accent only, body line-height 1.6 with airy spacing, and squared 6-16px radii. |
| `skills/superloopy-frontend/references/design/playstation.md` | Audit coverage and reviewability check. | Must set display headlines 22px+ at weight 300 and apply the full cyan + white-border + blue-ring + 1.2x-scale hover to primary buttons — bolding the display or letting cyan appear at rest inverts the quiet-authority voice and breaks the power-on interaction signature. |
| `skills/superloopy-frontend/references/design/porsche.md` | Audit coverage and reviewability check. | Must keep corners at 0-4px and ration #D5001C to one CTA or marker per view — rounding into pills or spreading the red across links, badges, and fills dilutes the engineered-instrument identity. |
| `skills/superloopy-frontend/references/design/posthog.md` | Audit coverage and reviewability check. | Must keep warm parchment background (never pure white), the olive/sage text+border family, and the hover-only #F54E00 orange text flash. |
| `skills/superloopy-frontend/references/design/railway.md` | Audit coverage and reviewability check. | Must keep the magenta-violet gradient spent on exactly one role per view, the dark canvas cool-violet (not neutral black), and headings capped at weight 600. |
| `skills/superloopy-frontend/references/design/ramp.md` | Audit coverage and reviewability check. | Must keep the warm sand canvas (#fcfbf7, never white), dark CTA with yellow as accent-only (never the button fill at body scale), uppercase-monospace labels, and radius 8-14px. |
| `skills/superloopy-frontend/references/design/raycast.md` | Audit coverage and reviewability check. | Must keep the background at #07080a (not pure black), positive +0.2px body tracking with weight-500 baseline, multi-layer inset/outer shadow pairs, and opacity-0.6 hover transitions. |
| `skills/superloopy-frontend/references/design/renault.md` | Audit coverage and reviewability check. | Must keep all buttons at 0px radius and reserve #EFDF00 for exactly one super-primary CTA per screen — rounding buttons into pills or repeating the yellow erases the pressed-metal precision and collapses the conversion hierarchy. |
| `skills/superloopy-frontend/references/design/replicate.md` | Audit coverage and reviewability check. | Must keep 9999px radius on every element, brand red #ea2804 confined to gradients/accent borders (never flat fills), dotted #bbbbbb underlines on links, and heavy 700-weight display at 48px+. |
| `skills/superloopy-frontend/references/design/resend.md` | Audit coverage and reviewability check. | Must keep every border frost-blue (never neutral gray) and the background at true #000000, using frost hairlines instead of box-shadows for all depth. |
| `skills/superloopy-frontend/references/design/revolut.md` | Audit coverage and reviewability check. | Must keep weight-500 (never bold) display with heavy negative tracking, 9999px pills at 14px 32px padding, zero shadows, and semantic colors held to product only. |
| `skills/superloopy-frontend/references/design/robinhood.md` | Audit coverage and reviewability check. | Must keep the dark-first #0a0a0a canvas, dark text on the green button, green reserved strictly for up/go (red #ff5000 for down), depth via surface-lightness steps not shadows, and tabular-mono prices. |
| `skills/superloopy-frontend/references/design/rolex.md` | Audit coverage and reviewability check. | Must center compositions with ceremonial whitespace and treat green as a rationed seal — left-aligned SaaS layouts or scattering green across links, badges, and borders kills the engraved-plaque authority. |
| `skills/superloopy-frontend/references/design/runwayml.md` | Audit coverage and reviewability check. | Must keep the single-typeface system (one geometric sans across 48px display to 11px tags), true-black bg with cool blue-gray muted text, zero shadows, and display headlines at weight 400 with negative tracking — never bold. |
| `skills/superloopy-frontend/references/design/sanity.md` | Audit coverage and reviewability check. | Must keep grays pure achromatic, hover every interactive element to the same #0052ef, and use only 12px or full-pill radius (nothing between) with colorimetric surface-step depth, not shadows. |
| `skills/superloopy-frontend/references/design/sentry.md` | Audit coverage and reviewability check. | Must keep purple-tinted blacks/borders (never #000000 or neutral gray), the inset shadow on primary buttons, Dammit Sans as hero-only, and uppercase+0.2px button labels. |
| `skills/superloopy-frontend/references/design/shopify.md` | Audit coverage and reviewability check. | Must keep display type at weight 330-400 (never 600-700), Neon Green #36F4A4 restricted to focus rings/small accents, and the cool-only palette with stacked multi-layer shadows (no single drop). |
| `skills/superloopy-frontend/references/design/slack.md` | Audit coverage and reviewability check. | Must keep display at Lato weight 900, CTAs green (#007a5a) not aubergine, and aubergine reserved for sidebar chrome with confetti hues used only as categorical accents. |
| `skills/superloopy-frontend/references/design/spacex.md` | Audit coverage and reviewability check. | Must keep text directly on full-viewport photography (no cards/shadows), all-uppercase D-DIN with positive tracking 0.96-1.17px, and the palette limited to black plus spectral white #f0f0fa. |
| `skills/superloopy-frontend/references/design/spotify.md` | Audit coverage and reviewability check. | Must keep dark surfaces as primary (no light theme), Spotify Green #1ed760 functional-only (play/active/CTA, never decorative), and heavy 0.3-0.5 opacity shadows for visible elevation. |
| `skills/superloopy-frontend/references/design/starbucks.md` | Audit coverage and reviewability check. | Must keep the warm cream canvas (not white), the four greens mapped to distinct roles, 50px full-pill buttons with scale(0.95) active, and gold reserved for Rewards ceremony only. |
| `skills/superloopy-frontend/references/design/stripe.md` | Audit coverage and reviewability check. | Must keep weight-300 display type, navy #061b31 (not black) headings, 4-8px radius (no pills), and blue-tinted layered shadows. |
| `skills/superloopy-frontend/references/design/substack.md` | Audit coverage and reviewability check. | Must keep long-form body in a serif at ~20px/1.60 on a ~620px measure with the orange #ff6719 reserved for subscribe/brand moments only. |
| `skills/superloopy-frontend/references/design/supabase.md` | Audit coverage and reviewability check. | Must keep emerald (#3ecf8e/#00c573) confined to logo/links/accent-borders, border-color stepping for depth with no box-shadows, and 1.0 hero line-height. |
| `skills/superloopy-frontend/references/design/superhuman.md` | Audit coverage and reviewability check. | Must keep Super Sans at non-standard weights 460/540 with 0.96 display line-height, Warm Cream #e9e5dd buttons, and Lavender #cbb7fb as the sole accent, never conventional weights or bright CTAs. |
| `skills/superloopy-frontend/references/design/tesla.md` | Audit coverage and reviewability check. | Must keep zero box-shadows, #3E6AE1 as the sole chromatic color reserved for primary CTAs, typography at weights 400-500 only with normal letter-spacing, and 4px button radius. |
| `skills/superloopy-frontend/references/design/theverge.md` | Audit coverage and reviewability check. | Must keep the #131313 canvas (no light mode), mint/ultraviolet as hazard accents and tile fills (never washes), rounded corners (no squares), color-as-elevation (no box-shadow), and Manuka only at 60px+. |
| `skills/superloopy-frontend/references/design/together.md` | Audit coverage and reviewability check. | Must keep #010120 midnight-blue for dark sections (never gray-black), midnight-blue-tinted elevation shadow rgba(1,1,32,0.1), magenta/orange confined to illustrations, sharp 4/8px radius, and negative tracking on The Future. |
| `skills/superloopy-frontend/references/design/uber.md` | Audit coverage and reviewability check. | Must keep true #000000/#ffffff (no off-whites or near-blacks), 999px radius on all buttons/chips/nav, and whisper-soft black-only shadows with no gradients. |
| `skills/superloopy-frontend/references/design/vercel.md` | Audit coverage and reviewability check. | Must keep shadow-as-border (0 0 0 1px rgba(0,0,0,0.08)) instead of CSS borders, the #fafafa inner ring on cards, and the 400/500/600-only weight system. |
| `skills/superloopy-frontend/references/design/warp.md` | Audit coverage and reviewability check. | Must keep text warm parchment #faf9f6 (never pure white), the palette monochromatic warm-gray with no accent hue, and weight capped at Medium 500. |
| `skills/superloopy-frontend/references/design/webflow.md` | Audit coverage and reviewability check. | Must keep functional radius at 4px (never past 8px), Webflow Blue #146EF5 as the only CTA fill (secondary palette for illustration only), and the 5-layer cascading shadow rather than a single drop shadow. |
| `skills/superloopy-frontend/references/design/wired.md` | Audit coverage and reviewability check. | Must keep border-radius 0 on all rectangular elements (50% icons / 1920px text-pills only), zero box-shadow (rules and 2px black borders for depth), color confined to grayscale plus #057DBC, and WiredDisplay/BreveText/Apercu/WiredMono in their fixed roles. |
| `skills/superloopy-frontend/references/design/wise.md` | Audit coverage and reviewability check. | Must keep weight-900 display at 0.85 line-height, green #9fe870 limited to buttons/accents with dark-green #163300 text (never green-on-green), and scale hover/active animation. |
| `skills/superloopy-frontend/references/design/xai.md` | Audit coverage and reviewability check. | Must keep #1f2228 bg (never pure black), GeistMono display/buttons vs universalSans body with no role overlap, hover that dims to 0.5 opacity, sharp 0px corners, and no shadows or accent color. |
| `skills/superloopy-frontend/references/design/zapier.md` | Audit coverage and reviewability check. | Must keep warm cream #fffefb / warm-black #201515 (never pure white or black) and define structure with sand #c5c0b1 borders rather than box-shadow elevation. |
| `skills/superloopy-frontend/references/image-first.md` | Audit coverage and reviewability check. | Must require a visual target + written spec before coding, one-image-per-section, anti-drift, and a degrade path when no imagegen tool exists. |
| `skills/superloopy-frontend/references/perfection.md` | Audit coverage and reviewability check. | Must keep the design-system compliance check, the real-browser Lighthouse protocol (npx, no bundled dep), the anti-gaming list, and the evidence artifact. |
| `skills/superloopy-frontend/scripts/ds-compliance.mjs` | `test/ds-compliance.test.js`. | Must flag undeclared hex and off-scale spacing against DESIGN.md and exit non-zero on violations, dependency-free. |
| `skills/superloopy-frontend/scripts/visual-diff.mjs` | `test/visual-diff.test.js`. | Must decode 8-bit PNGs and emit dimensionsMatch, diffRatio, similarityScore, alphaChannelIntact, and ranked grid hotspots with no dependencies. |
| `skills/superloopy-loop/SKILL.md` | `test/docs.test.js`, doctor skill check. | Must describe guide, proof, capture, evidence, check, finish, gates, and receipt rules accurately. |
| `skills/superloopy-loop/agents/openai.yaml` | Audit coverage and reviewability check. | Must remain minimal Superloopy discovery metadata. |
| `skills/superloopy-research/SKILL.md` | `test/plugin.test.js`, audit coverage. | Must describe exhaustive deep research with EXPAND waves, claim verification, cited synthesis, and Superloopy evidence receipts. |
| `skills/superloopy-research/agents/openai.yaml` | Audit coverage and reviewability check. | Must remain minimal Superloopy discovery metadata for deep research. |
| `src/agents.js` | `test/cli.test.js`, `test/golden-hooks.test.js`, audit coverage. | Must install bundled Superloopy custom agents and command wrapper, skip identical files, and refuse changed local files unless `--force` is used. |
| `src/args.js` | CLI and loop tests using parsed flags/stdin/JSON. | Must parse shared CLI inputs without dependencies. |
| `src/artifacts.js` | Gate and evidence tests. | Must reject missing, empty, symlink, outside-root, and invalid gate artifacts. |
| `src/audit-gate-verify.js` | `test/golden-review-gate.test.js`, `test/golden-matrix-gate.test.js`. | Must re-derive and verify every cited audit verdict at completion; reject hand-written/unbound verdicts (never force-complete). |
| `src/audit-hooks.js` | `test/golden-audit-hooks.test.js`. | Must re-derive the floor in-process and accept only verdicts hash-bound to that fresh re-run; block forged/stale/missing verdicts; idempotent on replay. |
| `src/audit-verdict.js` | `test/golden-audit-verdict.test.js`. | Must enforce structural rules and symmetric floor dominance (the LLM cannot upgrade OR flip a non-reproducing re-run). |
| `src/audit.js` | `test/golden-audit.test.js`. | Must re-run command-backed criteria, cache unchanged work, and mark non-reproducing re-runs inconclusive (never auto-fail). |
| `src/auto-update-plan.js` | `test/auto-update.test.js`. | Must compare semver versions, resolve current/latest versions, honor env overrides, and build the default future npx update command. |
| `src/auto-update-state.js` | `test/auto-update.test.js`. | Must persist auto-update state/logs and guard concurrent update attempts with a stale-safe lock. |
| `src/auto-update.js` | `test/auto-update.test.js`, `test/golden-hooks.test.js`. | Must report marketplace-managed updates, throttle/check state, and run npx self-update only for explicit npx-local snapshots. |
| `src/begin.js` | CLI begin tests. | Must create a plan, start the first goal, and return an immediate proof guide. |
| `src/capture.js` | CLI evidence tests. | Must write command transcripts and mark pass/fail from command exit status. |
| `src/check.js` | Loop-gate and CLI evidence tests. | Must be non-mutating and print warnings plus repair commands for every unresolved or invalid proof. |
| `src/cli.js` | CLI, plugin, doctor, and crew-line tests. | Must dispatch install, loop, bin, agents, doctor, hook commands, generic comparison-check flags, symlinked bin execution, doctor-root resolution, and status-safe handoff/fleet text. |
| `src/comparison-similarity.js` | Doctor comparison tests. | Must compare code-shaped files only when an explicit comparison path is provided. |
| `src/continuation.js` | `test/golden-continuation.test.js`. | Must drive bounded continuation toward evidence-backed completion and mark blocked (never complete) on a cap or stall. |
| `src/crew-lines.js` | `test/crew-lines.test.js`, `test/fleet.test.js`. | Must generate original deterministic supported-catalog lines only for known terminal crew handoffs and format them without mutating persisted state. |
| `src/design-audit.js` | Doctor design-audit tests. | Must fail missing sections, decisions, or incomplete guards. |
| `src/doctor-skills.js` | `test/doctor.test.js`, `test/doctor-review-feedback.test.js`, `node src/cli.js doctor --json`. | Must require every shipped skill directory, validate each `SKILL.md` frontmatter name, and return structured failures for unreadable skill paths. |
| `src/doctor.js` | `test/doctor.test.js`, `test/claude-host-wiring.test.js`, `node src/cli.js doctor --json`. | Must verify package, hooks, Claude host wiring, bundled skills, audits, comparison status, Codex + Claude model policy, and hand-reviewable file sizes while ignoring generated Codex marketplace install metadata and copied `web/_nuxt/` payloads; must list a non-git root's own filesystem instead of consulting an enclosing Git repository. |
| `src/engineer.js` | `test/engineer.test.js`, `test/hooks.test.js` engineer-trigger tests. | Must wake the loop engineer on a leading `loopy` keyword or its Korean alias `루피` without mutating state itself, escalate to crew fan-out only on `team`/`crew`/`팀`/`크루`, and detect frontend/visual or Korean-writing intent for guidance-only skill steers. |
| `src/file-audit.js` | `test/file-audit.test.js`, doctor file-audit check. | Must fail missing, stale, or incomplete inventory rows in source checkouts while exempting packaging-stripped repo-only rows in packed (non-git) roots. |
| `src/finish.js` | CLI evidence and loop-gate tests. | Must only finalize after all criteria have valid pass artifacts, then write gate and report artifacts. |
| `src/fleet.js` | `test/fleet.test.js`, `test/crew-lines.test.js`. | Must record handoffs under a lock, require evidence for accepted verdicts, reconcile dispatched-vs-outstanding, normalize APPROVE/PASS/REJECT-style verdicts, and decorate terminal known crew lanes for output only. |
| `src/goals.js` | `test/goals.test.js`, loop tests. | Must keep deterministic goal parsing, criteria lookup, completion guards, and evidence collection. |
| `src/guide.js` | CLI, docs, hook, and evidence tests. | Must produce next action, proof target, proof plan, templates, recorded evidence, and blockers. |
| `src/help.js` | CLI help tests. | Must show the shortest evidence-backed flow and pass-artifact rule. |
| `src/hooks.js` | Hook and golden-hook tests. | Must keep startup bootstrap, marketplace update notices, stop continuation, prompt context, steering, scoped roots, and receipt validation fail-closed. |
| `src/install-flow.js` | `test/auto-update.test.js`. | Must distinguish marketplace, checkout, future npx-local snapshot, and unknown install states so unsafe npx updates stay off. |
| `src/interop.js` | `test/interop.test.js`. | Must detect a neighboring Superpowers install best-effort across both hosts, honor the `SUPERLOOPY_SUPERPOWERS` override, and never mutate state or fail a hook. |
| `src/loop.js` | Core loop and CLI tests. | Must preserve lifecycle state, ledger appends, evidence recording, review, checkpoint, status, and steering. |
| `src/plan-trust.js` | Audit trust-gate tests. | Must fail closed: an audit re-run of a command never executed or approved on this machine must refuse without executing. |
| `src/matrix-gate.js` | Matrix gate golden tests. | Must validate compatible matrix gate shape through Superloopy artifacts only. |
| `src/model-policy.js` | `test/doctor.test.js`. | Must fail doctor when the Codex model-policy doc/TOML defaults or the Claude model-policy doc/`agents/*.md` model frontmatter drift. |
| `src/plan-summary.js` | Guide and status tests through loop outputs. | Must summarize progress without mutating state. |
| `src/pre-tool-use.js` | `test/pre-tool-use.test.js`, `test/golden-hooks.test.js`. | Must block malformed `create_goal` payloads and premature native `update_goal` completion. |
| `src/prove.js` | CLI evidence tests. | Must record command evidence against the active unresolved criterion and return the next guide. |
| `src/receipt.js` | `test/host-adapter.test.js`, hook tests. | Must recover the worker receipt from last_assistant_message when present, else from the decoded final turn of the subagent transcript, failing closed (re-prompt) when the final message exceeds the tail window, host-agnostically. |
| `src/report.js` | Report and CLI evidence tests. | Must write portable evidence reports with summary counts, warnings, timestamps, artifacts, timeline, and next action. |
| `src/review-gate.js` | Review gate golden tests. | Must validate strict five-section review gate shape through Superloopy artifacts only. |
| `src/source-checkout.js` | `test/doctor-packed.test.js`, `test/file-audit.test.js`. | Must classify own-`.git` roots and tracked monorepo subdirectories as source checkouts and packed/ignored install roots as installs, so no enclosing repo answers for an install. |
| `src/spawn-command.js` | `test/auto-update.test.js`. | Must route npm/npx through Windows `.cmd` shims and leave other commands unchanged. |
| `src/store.js` | Loop, hook, and scoped-session tests. | Must normalize sessions, isolate `.superloopy/` state, write JSON atomically, and append ledger entries. |
| `src/subagent-attempts.js` | `npm test`, doctor reviewability. | Must count the 3-attempt cap (with a session/cwd fallback key) and record the exhaustion ledger signal. |
| `src/trace.js` | Loop-gate and CLI evidence tests. | Must show artifact-backed proof, warnings, missing proof, suggested paths, ledger timeline, and evidence summary counts. |
| `src/wrapper-check.js` | `test/wrapper-check.test.js`, `test/doctor.test.js`. | Must read the installed bin wrapper and advise (never fail) when it points at a stale or pruned versioned cache after an upgrade; informational, no-throw, dependency-injectable, and aware of resilient sibling-fallback shims. |
| `test/audit.test.js` | `npm test`. | Must fail if repo files are missing from audit or hand-reviewable file-size limits are exceeded. |
| `test/auto-update.test.js` | `npm test`. | Must prove marketplace skip notices, checkout skip behavior, future npx-local snapshot behavior, semver planning, install-flow detection, and Windows npx shims. |
| `test/claude-host-wiring.test.js` | `npm test`. | Must verify the doctor Claude-host-wiring check: manifest/hooks presence, SubagentStop CLI wiring, namespaced matcher coverage, and safe handling of invalid regex/JSON. |
| `test/cli-evidence.test.js` | `npm test`. | Must cover public evidence commands and finalization behavior end to end. |
| `test/cli.test.js` | `npm test`. | Must cover install, symlinked bin execution, help, create, begin, next, status, guide, and hook smoke paths. |
| `test/concurrency.test.js` | `npm test`. | Must prove withFileLock serializes concurrent writers, re-enters nested same-path calls, reclaims stale locks, and fails closed on timeout. |
| `test/crew-lines.test.js` | `npm test`. | Must prove crew completion lines are original deterministic localized presentation, pending/unknown lanes stay silent, and CLI status remains visible. |
| `test/docs.test.js` | `npm test`. | Must keep README, skill, gate notes, design audit, and this golden set aligned with enforced behavior. |
| `test/doctor-packed.test.js` | `npm test`. | Must prove `doctor --json` reports ok against an npm-pack-shaped root (no `.git`, `.gitignore`, or `package-lock.json`) run from an arbitrary cwd, including a root nested in a parent Git repository that ignores it. |
| `test/doctor-review-feedback.test.js` | `npm test`. | Must cover review-requested doctor hardening for broken checkout manifests and non-directory skills paths. |
| `test/doctor.test.js` | `npm test`. | Must cover doctor checks for package, audits, comparison, design decisions, model policy, generated install metadata, and reviewability. |
| `test/ds-compliance.test.js` | `npm test`. | Must verify DESIGN.md token parsing and undeclared-color/off-scale-spacing detection. |
| `test/engineer.test.js` | `npm test`. | Must keep team/crew escalation parsing strict and inject the crew fan-out directive only on `loopy team`. |
| `test/file-audit.test.js` | `npm test`. | Must prove the file-audit verifier fails stale inventory rows. |
| `test/fleet.test.js` | `npm test`. | Must prove verdict normalization, artifact-bound accept verdicts, handoff recording/update, fleet reconciliation, crew-line decoration, and the parallel-cap warning. |
| `test/goals.test.js` | `npm test`. | Must keep goal parsing, seeded criteria, lookup, and completion guards strict. |
| `test/golden-audit-hooks.test.js` | `npm test`. | Must keep verdict-receipt hash binding and fail-closed blocking strict. |
| `test/golden-audit-verdict.test.js` | `npm test`. | Must keep verdict structure and floor-dominance rules strict. |
| `test/golden-audit.test.js` | `npm test`. | Must keep audit re-run floor, caching, and inconclusive handling strict. |
| `test/golden-continuation.test.js` | `npm test`. | Must keep the continuation engine bounded, progress-gated, and blocked-not-complete on a cap or stall. |
| `test/golden-helpers.js` | Golden tests. | Must provide Superloopy-owned fixtures. |
| `test/helpers/trust-isolate.js` | `npm test`. | Must isolate the plan-trust ledger to a temp dir so tests never touch the real user-home trust store. |
| `test/golden-hooks.test.js` | `npm test`. | Must keep hook continuation, scoped state, steering, receipts, and manifest behavior strict. |
| `test/golden-matrix-gate.test.js` | `npm test`. | Must keep Superloopy's `@goal` and matrix compatibility strict. |
| `test/golden-review-gate.test.js` | `npm test`. | Must keep strict five-section review-gate acceptance and rejection behavior. |
| `test/hooks.test.js` | `npm test`. | Must cover hook unit behavior for guards, receipts, steering, context, and stop handling. |
| `test/host-adapter.test.js` | `npm test`. | Must verify direct and transcript-fallback receipt recovery for both evidence and audit receipts, including trailing-newline, oversized-final-message, tool-use-only, and stale-token cases. |
| `test/humanize-korean.test.js` | `node --test test/humanize-korean.test.js`. | Must prove the Korean humanizer audit script accepts preserved Korean output and rejects non-Korean or token-dropping output. |
| `test/interop.test.js` | `npm test`. | Must cover Superpowers detection, the informational doctor interop check, and coexistence routing in loop guidance. |
| `test/loop-gates.test.js` | `npm test`. | Must cover gate, report, trace, check, review, finish, and checkpoint behavior. |
| `test/loop.test.js` | `npm test`. | Must cover core lifecycle, evidence recording, steering, and command capture. |
| `test/plugin.test.js` | `npm test`. | Must verify plugin manifest, hook route integrity, and packaged skill metadata. |
| `test/pre-tool-use.test.js` | `npm test`. | Must verify Superloopy blocks native complete status until aggregate completion is real. |
| `test/report.test.js` | `npm test`. | Must verify report artifacts remain portable and guide-backed. |
| `test/subagent-receipt.test.js` | `npm test`. | Must prove the attempt cap counts without agent_id and records a ledger signal on exhaustion. |
| `test/sync-version.test.js` | `npm test`. | Must prove Superloopy package and plugin manifest versions are stamped from one release version. |
| `test/visual-diff.test.js` | `npm test`. | Must verify PNG encode/decode round-trip and diff scoring, hotspot ranking, alpha, and dimension behavior. |
| `test/wrapper-check.test.js` | `npm test`. | Must cover generated wrapper parsing, stale/dangling/recovered wrapper advice, first-PATH precedence, and no-wrapper silence without touching real user wrappers. |

## Run History

| Turn | Score | Command evidence | Changed files | What changed | Next-turn target |
| --- | ---: | --- | --- | --- | --- |
| Turn 0 | 70 | Existing repo had `npm test`, doctor checks, gate notes, and file audit, but inherited names were part of the contract. | None in this file. | Baseline: strict evidence machinery existed, but naming carried visible lineage. | Remove stale names without dropping gate compatibility. |
| Turn 1 | 88 | `npm test`; `node src/cli.js doctor --json`. | `docs/superloopy-loop-golden-set.md`, `docs/superloopy-file-audit.md`, `test/docs.test.js`, `test/doctor.test.js`. | Added strict golden set and inventory checks. | Raise score by making naming Superloopy-native. |
| Turn 2 | 96 | Targeted gate, docs, audit, and doctor tests. | Runtime modules, docs, tests, skill metadata, and doctor contract. | Renamed public/internal contracts to review gate, matrix gate, design audit, and generic comparison scan while preserving strict gates. | Reach 100 with fresh audit, doctor, and full tests. |
| Turn 3 | 100 | Final `rg` audit; final `node src/cli.js doctor --json`; final `npm test`. | Final audit records and inventory rows. | Fresh audit from current files confirms Superloopy-owned names and preserved gate compatibility. | Keep docs and doctor checks focused as files change. |
| Turn 4 | 100 | `node scripts/validate-clone.mjs` in the Transferloom clone workspace; targeted docs/plugin tests; `node src/cli.js doctor --json`. | README locales, `skills/superloopy-clone/SKILL.md`, docs/tests inventory, and clone-demo image. | Added troubleshooting for stale Codex CLI installs and a validated Transferloom.com clone reference. | Keep reference examples evidence-backed and local-path-free. |
