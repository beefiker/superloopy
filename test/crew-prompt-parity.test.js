import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { HOST_SPECIFIC_LINES, checkCrewPromptParity } from "../src/crew-prompt-parity.js";

async function tempCrewCopy() {
  const root = await mkdtemp(join(tmpdir(), "superloopy-crew-parity-"));
  await cp(join(process.cwd(), "agents"), join(root, "agents"), { recursive: true });
  await cp(join(process.cwd(), ".codex", "agents"), join(root, ".codex", "agents"), { recursive: true });
  return root;
}

async function rewrite(path, transform) {
  const next = transform(await readFile(path, "utf8"));
  await writeFile(path, next, "utf8");
  return next;
}

function lineOf(content, text) {
  return content.split(/\r?\n/u).indexOf(text) + 1;
}

test("shipped Claude and Codex crew prompts match beyond the host-specific allowlist", async () => {
  const result = await checkCrewPromptParity(process.cwd());
  assert.equal(result.ok, true, result.message);
  assert.equal(result.policy, "crew-prompts-match-across-hosts");
  assert.equal(result.hostSpecificLines, HOST_SPECIFIC_LINES.length);
  assert.deepEqual(HOST_SPECIFIC_LINES.map(({ agent }) => agent), ["forge"]);
});

test("crew prompt parity fails when the Claude prompt gains a line the Codex template lacks", async () => {
  const root = await tempCrewCopy();
  const added = "Never skip the smoke run.";
  const content = await rewrite(join(root, "agents", "probe.md"), (text) => text.replace("Return this summary:", `${added}\nReturn this summary:`));

  const result = await checkCrewPromptParity(root);
  assert.equal(result.ok, false);
  assert.deepEqual(Object.keys(result.drift), ["probe"]);
  assert.deepEqual(result.drift.probe, { claudeOnly: [{ line: lineOf(content, added), text: added }], codexOnly: [] });
  assert.match(result.message, new RegExp(`probe: agents/probe\\.md only: L${lineOf(content, added)} "${added}"; \\.codex/agents/probe\\.toml only: none`, "u"));
});

test("crew prompt parity fails when the Codex template gains a line the Claude prompt lacks", async () => {
  const root = await tempCrewCopy();
  const added = "- Prefer the narrowest reproduction.";
  const content = await rewrite(join(root, ".codex", "agents", "sentinel.toml"), (text) => text.replace("Review priorities:", `Review priorities:\n${added}`));

  const result = await checkCrewPromptParity(root);
  assert.equal(result.ok, false);
  assert.deepEqual(result.drift.sentinel, { claudeOnly: [], codexOnly: [{ line: lineOf(content, added), text: added }] });
  assert.match(result.message, /sentinel: agents\/sentinel\.md only: none; \.codex\/agents\/sentinel\.toml only: L\d+ "- Prefer the narrowest reproduction\."/u);
});

test("crew prompt parity reports a changed line on both sides", async () => {
  const root = await tempCrewCopy();
  await rewrite(join(root, ".codex", "agents", "arbiter.toml"), (text) => text.replace("Reason at maximal rigor.", "Reason carefully."));

  const result = await checkCrewPromptParity(root);
  assert.equal(result.ok, false);
  assert.match(result.drift.arbiter.claudeOnly[0].text, /Reason at maximal rigor\.$/u);
  assert.match(result.drift.arbiter.codexOnly[0].text, /Reason carefully\.$/u);
});

test("crew prompt parity ignores CRLF, indentation, repeated spaces, blank lines, and TOML escapes", async () => {
  const root = await tempCrewCopy();
  await rewrite(join(root, "agents", "assayer.md"), (text) => text.replace(/\r?\n/gu, "\r\n").replace("\r\n\r\n", "\r\n\r\n\r\n"));
  await rewrite(join(root, ".codex", "agents", "assayer.toml"), (text) => text.replace("You are assayer", "  You  are \\u0061ssayer"));

  const result = await checkCrewPromptParity(root);
  assert.equal(result.ok, true, result.message);
});

test("crew prompt parity fails when an allowlisted host-specific line no longer matches", async () => {
  const root = await tempCrewCopy();
  const [entry] = HOST_SPECIFIC_LINES;
  await rewrite(join(root, ".codex", "agents", `${entry.agent}.toml`), (text) => text.replace(entry.codex, entry.claude.replace("\"$CLAUDE_PLUGIN_ROOT/src/cli.js\"", "\\\"$CLAUDE_PLUGIN_ROOT/src/cli.js\\\"")));

  const result = await checkCrewPromptParity(root);
  assert.equal(result.ok, false);
  assert.match(result.message, /forge: host-specific allowlist entry 0 must match exactly one line in agents\/forge\.md and in \.codex\/agents\/forge\.toml/u);
});

test("crew prompt parity reports missing agent files and unreadable instructions", async () => {
  const root = await tempCrewCopy();
  await rewrite(join(root, ".codex", "agents", "pathfinder.toml"), (text) => text.replace('developer_instructions = """', 'instructions = """'));
  await rewrite(join(root, "agents", "probe.md"), (text) => text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/u, ""));
  await rewrite(join(root, ".codex", "agents", "arbiter.toml"), (text) => text.replace("You are arbiter", "\\UFFFFFFFF You are arbiter"));

  const result = await checkCrewPromptParity(root);
  assert.equal(result.ok, false);
  assert.match(result.message, /\.codex\/agents\/pathfinder\.toml has no readable instructions body/u);
  assert.match(result.message, /agents\/probe\.md has no readable instructions body/u);
  assert.match(result.message, /\.codex\/agents\/arbiter\.toml has no readable instructions body/u);
});
