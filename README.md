<div align="center">

# 🌀 Loopy

**Loop engineering for Codex.** Type `loopy <task>` — an agent does the work, proves each piece with real evidence, and only then says it's done.

<p>
  <a href="README.md">English</a> ·
  <a href="README.ko.md">한국어</a> ·
  <a href="README.zh-CN.md">中文(简体)</a> ·
  <a href="README.ja.md">日本語</a> ·
  <a href="README.es.md">Español</a>
</p>

<img src=".github/assets/franky.png" width="92" alt="franky" />&nbsp;<img src=".github/assets/zoro.png" width="92" alt="zoro" />&nbsp;<img src=".github/assets/usopp.png" width="92" alt="usopp" />&nbsp;<img src=".github/assets/jinbe.png" width="92" alt="jinbe" />&nbsp;<img src=".github/assets/robin.png" width="92" alt="robin" />&nbsp;<img src=".github/assets/nami.png" width="92" alt="nami" />

<sub><b>the crew</b> — optional subagents, one job each</sub>

</div>

## Use it

After installing, type your task in Codex with a leading `loopy`:

```
loopy fix the failing login test and prove it with evidence
```

The agent plans it, proves each piece with a real file, and reports back — you don't run any commands yourself. The packaged Stop hook stays quiet unless `LOOPY_STOP_HOOK=on`.

## The crew

For bigger work, Loopy ships six optional subagents under `.codex/agents/` — each owns one lane. They install automatically with the plugin (no command needed); `loopy agents install` just re-copies them if you ever need it. Their advisory model defaults are documented in `docs/loopy-model-policy.md` and checked by `loopy doctor`.

<table>
  <tr>
    <td align="center" width="33%"><img src=".github/assets/franky.png" width="190" alt="franky" /><br /><b>franky</b><br /><sub>builds it</sub></td>
    <td align="center" width="33%"><img src=".github/assets/zoro.png" width="190" alt="zoro" /><br /><b>zoro</b><br /><sub>reviews it</sub></td>
    <td align="center" width="33%"><img src=".github/assets/usopp.png" width="190" alt="usopp" /><br /><b>usopp</b><br /><sub>tests it</sub></td>
  </tr>
  <tr>
    <td align="center"><img src=".github/assets/jinbe.png" width="190" alt="jinbe" /><br /><b>jinbe</b><br /><sub>gates it</sub></td>
    <td align="center"><img src=".github/assets/robin.png" width="190" alt="robin" /><br /><b>robin</b><br /><sub>audits it</sub></td>
    <td align="center"><img src=".github/assets/nami.png" width="190" alt="nami" /><br /><b>nami</b><br /><sub>finds it</sub></td>
  </tr>
</table>

**Summon the crew** with `loopy team <task>` — or `loopy crew`, the one-word `loopycrew`, or just `ultrawork <task>`. Loopy fans the work out across the lanes in parallel and still proves every piece before it calls it done. A plain `loopy <task>` stays solo and only delegates when the slices are clearly independent.

For full crew runs, the parent records each lane with `loopy loop handoff`, checks `loopy loop fleet --json`, and keeps the human final gate report separate from the machine gate JSON. A gate report can be Markdown evidence; `loopy loop finish --artifact` is for `.json` quality gate output.

When a tracked crew handoff finishes, Loopy can print one original crew line before the normal `handoff` or `fleet` status. It follows the user's language from the assignment or scoped brief when it matches the supported catalog, with English as the safe fallback. The line is personality only; the verdict, evidence artifact, outstanding list, and attention list stay authoritative.

## Install

Needs Node.js ≥ 20. Loopy is dependency-free — zero runtime dependencies, just Node.

```
codex plugin marketplace add https://github.com/beefiker/loopy
codex plugin add loopy@beefiker
```

Restart Codex twice: approve the hooks, then reload. The first approved session runs a `SessionStart` hook that does a one-time bootstrap — it installs the `loopy` command and the agents. If `loopy` isn't found, its folder isn't on your `PATH`; the bootstrap prints the exact line to add. Check everything with `loopy doctor`.

Installing from a checkout instead? Run `node src/cli.js install --json`.

<sub>MIT licensed.</sub>
