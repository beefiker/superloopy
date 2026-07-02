# Superloopy × Superpowers Coexistence

Superloopy is built to sit next to complementary plugins instead of competing with them. This note records how it coordinates with the [Superpowers](https://github.com/obra/superpowers) methodology plugin when both are installed.

## Division of labor

The two plugins own different halves of the same loop:

- **Superpowers owns the front of the loop** — brainstorming, planning, and the implementation methodology. These ship as auto-triggering skills (`brainstorming`, `writing-plans`, `test-driven-development`, and its code-review skills), not slash commands.
- **Superloopy owns proof-of-done** — repo-local criteria, command-backed evidence re-run at `finish`, and the final quality gate.

When Superpowers is present, Superloopy defers the design/plan/TDD ceremony to it and keeps itself as the outer evidence gate, so the same task is never planned or reviewed twice.

## How detection works

`src/interop.js` exposes `detectSuperpowers(env, homeDir)`. It is **advisory only**: it never fails a hook, never mutates state, and returns `{ installed, source }`.

- **Override first.** `SUPERLOOPY_SUPERPOWERS=on|off` forces the answer; `auto` (or unset) auto-detects. `source` is then `env-override`.
- **Filesystem scan (both hosts).** Otherwise it does a bounded scan of the plugin roots for each host — the nearest `plugins` ancestor of `CLAUDE_PLUGIN_ROOT`, `~/.claude/plugins` (Claude Code), and `CODEX_HOME/plugins` or `~/.codex/plugins` (Codex). A directory named `superpowers` that carries plugin markers, or the signature `using-superpowers` skill, counts as installed. `source` is then `filesystem`.

A plugin's on-disk layout is not a stable contract, so detection is best-effort by design. A miss just means Superloopy runs solo; a false positive only adds a few guidance lines the agent can ignore. The `SUPERLOOPY_SUPERPOWERS` override is the escape hatch either way.

## Where routing happens

Detection feeds the loop engineer's injected guidance in `src/engineer.js`:

- On any `loopy` invocation — starting a loop, resuming one, or when the previous aggregate is already complete — `interopBlock()` appends three coexistence lines (front-of-loop to Superpowers, proof-of-done to Superloopy, one orchestrator per task).
- On `loopy team <task>`, the crew playbook adds a line telling the agent to pick a single orchestrator and reserve the Superloopy crew for evidence lanes.

This is guidance only — the completion floor and evidence gates are unchanged whether or not Superpowers is present.

## Visibility

`superloopy doctor` includes an informational `interop` check. It always reports `ok`, and its message states whether Superpowers was detected and that coexistence guidance is active. A neighbor plugin's absence never fails Superloopy's own health.
