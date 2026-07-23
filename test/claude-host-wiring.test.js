import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { checkClaudeHostWiring } from "../src/doctor.js";

const cliCommand = 'node "${CLAUDE_PLUGIN_ROOT}/src/cli.js" hook subagent-stop';

function stopEntry(matcher, command = cliCommand) {
  return { matcher, hooks: [{ type: "command", command }] };
}

// Build a temp repo with a .claude-plugin/plugin.json and a hooks/hooks.json. `hooksRaw` overrides
// the hooks file with raw text (to test invalid JSON); otherwise `hooks` is JSON-serialized.
async function repo({ manifest = { name: "superloopy" }, hooks, hooksRaw, omitHooks = false, omitManifest = false } = {}) {
  const dir = await mkdtemp(join(tmpdir(), "superloopy-claude-wiring-"));
  if (!omitManifest) {
    await mkdir(join(dir, ".claude-plugin"), { recursive: true });
    await writeFile(join(dir, ".claude-plugin", "plugin.json"), JSON.stringify(manifest), "utf8");
  }
  if (!omitHooks) {
    await mkdir(join(dir, "hooks"), { recursive: true });
    await writeFile(join(dir, "hooks", "hooks.json"), hooksRaw ?? JSON.stringify(hooks), "utf8");
  }
  return dir;
}

const auditCommand = 'node "${CLAUDE_PLUGIN_ROOT}/src/cli.js" hook subagent-stop-audit';
const fullCrew = {
  hooks: {
    SubagentStop: [
      stopEntry("^superloopy:(?:franky|zoro|usopp|jinbe|nami)$"),
      stopEntry("^superloopy:robin$", auditCommand)
    ]
  }
};

test("checkClaudeHostWiring passes for a valid namespaced config", async () => {
  const result = await checkClaudeHostWiring(await repo({ hooks: fullCrew }));
  assert.equal(result.ok, true);
  assert.equal(result.matchers.length, 2);
});

test("checkClaudeHostWiring does NOT throw on an invalid regex matcher; reports it as a problem [round1-3]", async () => {
  const hooks = { hooks: { SubagentStop: [stopEntry("(?:superloopy:)?(?:franky|zoro|usopp|jinbe|nami)"), stopEntry("(robin", auditCommand)] } };
  const result = await checkClaudeHostWiring(await repo({ hooks }));
  assert.equal(result.ok, false);
  assert.match(result.message, /not a valid regex/);
});

test("checkClaudeHostWiring rejects a bare (un-namespaced) matcher via anchored coverage [round1-7]", async () => {
  const hooks = { hooks: { SubagentStop: [stopEntry("franky|zoro|usopp|jinbe|nami"), stopEntry("robin", auditCommand)] } };
  const result = await checkClaudeHostWiring(await repo({ hooks }));
  assert.equal(result.ok, false);
  assert.match(result.message, /plugin-namespaced agents/);
});

test("checkClaudeHostWiring requires the SAME entry to both match AND invoke the CLI — a broken audit entry is not masked by a healthy worker entry [round2-4]", async () => {
  const hooks = {
    hooks: {
      SubagentStop: [
        stopEntry("(?:superloopy:)?(?:franky|zoro|usopp|jinbe|nami)"),
        stopEntry("(?:superloopy:)?robin", "echo broken-audit")
      ]
    }
  };
  const result = await checkClaudeHostWiring(await repo({ hooks }));
  assert.equal(result.ok, false);
  assert.match(result.message, /superloopy:robin/);
});

test("checkClaudeHostWiring requires each exact matcher to invoke its own stop handler", async () => {
  const hooks = {
    hooks: {
      SubagentStop: [
        stopEntry("^superloopy:(?:franky|zoro|usopp|jinbe|nami)$", auditCommand),
        stopEntry("^superloopy:robin$", auditCommand)
      ]
    }
  };
  const result = await checkClaudeHostWiring(await repo({ hooks }));
  assert.equal(result.ok, false);
  assert.match(result.message, /superloopy:franky/);
});

test("checkClaudeHostWiring rejects a CLI entry that matches nothing propped up by a non-CLI entry that covers [round2-5]", async () => {
  const hooks = {
    hooks: {
      SubagentStop: [
        stopEntry("(?:superloopy:)?(?:franky|zoro|usopp|jinbe|nami|robin)", "echo not-the-cli"),
        stopEntry("(?:superloopy:)?nonexistent") // CLI, but matches no real agent
      ]
    }
  };
  const result = await checkClaudeHostWiring(await repo({ hooks }));
  assert.equal(result.ok, false);
  assert.match(result.message, /plugin-namespaced agents/);
});

test("checkClaudeHostWiring does not crash on a null element in the SubagentStop array [round2-6]", async () => {
  const hooks = {
    hooks: {
      SubagentStop: [
        null,
        stopEntry("^superloopy:(?:franky|zoro|usopp|jinbe|nami)$"),
        stopEntry("^superloopy:robin$", auditCommand)
      ]
    }
  };
  const result = await checkClaudeHostWiring(await repo({ hooks }));
  assert.equal(result.ok, true); // null entry safely skipped, rest is a full valid crew
});

test("checkClaudeHostWiring rejects a catch-all because role identities must be exact", async () => {
  const hooks = { hooks: { SubagentStop: [{ hooks: [{ type: "command", command: cliCommand }] }] } };
  const result = await checkClaudeHostWiring(await repo({ hooks }));
  assert.equal(result.ok, false);
  assert.match(result.message, /exact plugin identity matcher/);
});

test("checkClaudeHostWiring treats a literal `null` hooks.json as broken, not green [round2-3]", async () => {
  const result = await checkClaudeHostWiring(await repo({ hooksRaw: "null" }));
  assert.equal(result.ok, false);
  assert.match(result.message, /declares no SubagentStop hooks/);
});

test("checkClaudeHostWiring reports a single problem on invalid JSON (no misleading double) [round2-8]", async () => {
  const result = await checkClaudeHostWiring(await repo({ hooksRaw: "{ not valid json" }));
  assert.equal(result.ok, false);
  assert.match(result.message, /invalid JSON/);
  assert.doesNotMatch(result.message, /declares no SubagentStop/);
});

test("checkClaudeHostWiring fails when hooks/hooks.json is missing", async () => {
  const result = await checkClaudeHostWiring(await repo({ omitHooks: true }));
  assert.equal(result.ok, false);
  assert.match(result.message, /missing hooks\/hooks\.json/);
});

test("checkClaudeHostWiring fails when .claude-plugin/plugin.json is missing or misnamed", async () => {
  const missing = await checkClaudeHostWiring(await repo({ omitManifest: true, hooks: fullCrew }));
  assert.equal(missing.ok, false);
  assert.match(missing.message, /missing \.claude-plugin\/plugin\.json/);
  const misnamed = await checkClaudeHostWiring(await repo({ manifest: { name: "nope" }, hooks: fullCrew }));
  assert.equal(misnamed.ok, false);
  assert.match(misnamed.message, /name must be superloopy/);
});

test("README locales use Claude's update command and shell-specific cleanup blocks", async () => {
  const locales = ["README.md", "README.ko.md", "README.zh-CN.md", "README.ja.md", "README.es.md"];

  for (const file of locales) {
    const content = await readFile(file, "utf8");
    assert.equal(content.match(/\/plugin install superloopy@beefiker/g)?.length, 1, `${file}: install command`);
    assert.equal(content.match(/\/plugin update superloopy@beefiker/g)?.length, 1, `${file}: update command`);
    assert.match(content, /```sh\nrm -f ~\/\.local\/bin\/superloopy/);
    assert.match(content, /```powershell\nRemove-Item "\$env:APPDATA\\npm\\superloopy\.cmd"/);

    const mixedBlocks = [...content.matchAll(/```[^\n]*\n([\s\S]*?)```/g)]
      .map((match) => match[1])
      .filter((body) => body.includes("rm -f ") && body.includes("Remove-Item "));
    assert.deepEqual(mixedBlocks, [], `${file}: cleanup commands must not share a shell block`);
  }
});

test("Claude validation guide documents exact namespaced role identities", async () => {
  const guide = await readFile("docs/superloopy-claude-validation.md", "utf8");
  assert.match(guide, /\^superloopy:\(\?:franky\|zoro\|usopp\|jinbe\|nami\)\$/);
  assert.doesNotMatch(guide, /normalizeAgentType|\(\?:superloopy:\)\?/);
});
