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
3. If the user only asked to inspect or test a checkout, use the local checkout flow.

Prerequisite for all flows: Node.js >= 20.

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
codex plugin add superloopy@beefiker
```

Restart Codex, approve modified hooks if prompted, then verify:

```bash
superloopy doctor --json
```

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

- Host installed: Codex, Claude Code, or local checkout.
- Command path used: marketplace or checkout.
- Verification result: `superloopy doctor --json`, `node "${CLAUDE_PLUGIN_ROOT}/src/cli.js" doctor --json`, or `claude plugin validate`.
- Any blocker, such as missing Node.js >= 20, old Codex CLI, auth/login failure, hook approval needed, or missing `PATH` entry.
