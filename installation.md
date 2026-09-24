# Superloopy Agent Installation Guide

This file is for agents that receive a prompt like:

```text
install https://github.com/beefiker/superloopy
```

Install Superloopy from this repository into the current host, then verify the install. Do not add dependencies, do not edit the user's project code, and ask before removing or overwriting an existing install.

## Decide The Host

Use the first matching path:

1. If the current session is Codex or `codex` is the target, use the Codex flow.
2. If the current session is Claude Code or `claude` is the target, use the Claude Code flow.
3. If the current session is Google Antigravity or `antigravity`/`agy` is the target, use the Antigravity flow.
4. If the user only asked to inspect or test a checkout, use the local checkout flow.

Prerequisite for all flows: Node.js >= 22.

## Codex Flow

Run these commands from any directory:

```bash
codex plugin marketplace add https://github.com/beefiker/superloopy
codex plugin add superloopy@beefiker
```

Then restart Codex. If Codex asks to review hooks, approve them. The next approved session runs the `SessionStart` bootstrap, which installs the `superloopy` command and bundled agents.

Verify after restart:

```bash
superloopy doctor --json
```

If `superloopy` is not on `PATH`, read the bootstrap output. It prints the exact path line to add. If `codex plugin add` is unavailable or fails on plugin syntax, check the Codex version and update Codex CLI to a version that supports plugin marketplace commands.

## Claude Code Flow

Claude Code 2.1.280 or later is required for the pinned Opus 5.5 subagents. Run `claude update` before installing if your version is older.

Inside Claude Code, run:

```text
/plugin marketplace add beefiker/superloopy
/plugin install superloopy@beefiker
/reload-plugins
```

Approve hooks if prompted. Claude Code installs Superloopy as a plugin-bundled package: skills, subagents, and hooks stay inside the plugin root. There is no `~/.codex` bootstrap and no separate `superloopy` wrapper required.

Verify from the active plugin session:

```bash
node "${CLAUDE_PLUGIN_ROOT}/src/cli.js" doctor --json
```

If installing from an automation shell instead of the slash-command UI, use the Claude plugin CLI for the same marketplace source, then validate the installed cache:

```bash
claude plugin marketplace add https://github.com/beefiker/superloopy
claude plugin install superloopy@beefiker
claude plugin validate <installed-superloopy-plugin-root>
```

## Google Antigravity Flow

Install Superloopy into Antigravity with the `agy` CLI:

```bash
agy plugin install https://github.com/beefiker/superloopy
```

`agy plugin install` clones the repository into `~/.gemini/config/plugins/superloopy`, registers it in `~/.gemini/config/import_manifest.json`, and ingests the skills, agents, and hooks in one step.

Do not use `agy plugin import` for this: it takes `gemini` or `claude` as its source and migrates plugins already configured for those hosts, so it rejects a URL with `unknown import source or invalid path`.

Do not install by cloning into the plugin directory by hand either. `agy plugin enable <name>` only sets the enabled flag in `~/.gemini/config/config.json`; it does not add an `import_manifest.json` entry, so no component is ever ingested. It exits 0 and prints nothing, and `agy plugin validate` still reports the directory as ok, so the failure is silent.

Verify the plugin installation:

```bash
agy plugin validate ~/.gemini/config/plugins/superloopy
agy plugin list
```

`agy plugin validate` only checks the files on disk. `agy plugin list` must also show `superloopy` under `imports` — that is what separates a registered install from an unregistered directory.

Superloopy runs as a native Antigravity plugin: skills (`skills/`), custom subagents (`agents/`), and lifecycle hooks (`hooks.json`) load through Antigravity's plugin ingestion. On SessionStart, Superloopy installs the `superloopy` command wrapper into PATH (`~/.local/bin`) so CLI workflows (`superloopy loop ...`) are directly callable, while skills and agents stay plugin-bundled without writing into `~/.codex`.

## Local Checkout Flow

Use this only when the user asked for a checkout install or when marketplace install is unavailable:

```bash
git clone https://github.com/beefiker/superloopy
cd superloopy
node src/cli.js install --json
superloopy doctor --json
```

For Claude Code local development, point Claude Code at the checkout and reload plugins:

```bash
claude --plugin-dir "$(pwd)"
```

Then run `/reload-plugins` inside Claude Code.

## Update Existing Installs

Codex marketplace install:

```bash
codex plugin marketplace upgrade beefiker
```

Restart Codex and approve modified hooks if prompted. The next approved `SessionStart` automatically reconciles the generated wrapper, all six agents, and model-routing state from the new plugin version; no Superloopy migration command is required. If definitions changed, follow only the Codex restart notice so the host reloads them.

Claude Code marketplace install:

```text
/plugin marketplace update beefiker
/plugin install superloopy@beefiker
/reload-plugins
```

Verify:

```bash
node "${CLAUDE_PLUGIN_ROOT}/src/cli.js" doctor --json
```

## Completion Checklist For Agents

Before saying the install is done, report:

- Host installed: Codex, Claude Code, Google Antigravity, or local checkout.
- Command path used: marketplace, plugin install, or checkout.
- Verification result: `superloopy doctor --json`, `node "${CLAUDE_PLUGIN_ROOT}/src/cli.js" doctor --json`, `claude plugin validate`, or `agy plugin validate` plus `agy plugin list`.
- Any blocker, such as missing Node.js >= 22, old Codex CLI, auth/login failure, hook approval needed, or missing `PATH` entry.
