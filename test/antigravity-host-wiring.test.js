import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { checkAntigravityHostWiring } from "../src/doctor.js";

const cliCommand = 'node "${PLUGIN_ROOT}/src/cli.js" hook subagent-stop --host antigravity';
const auditCommand = 'node "${PLUGIN_ROOT}/src/cli.js" hook subagent-stop-audit --host antigravity';

const validHooks = {
  superloopy: {
    SessionStart: [
      {
        hooks: [
          { type: "command", command: 'node "${PLUGIN_ROOT}/src/cli.js" hook session-start --host antigravity', timeout: 30 }
        ]
      }
    ],
    SubagentStop: [
      {
        matcher: "^(?:superloopy:)?(?:franky|zoro|usopp|jinbe|nami)$",
        hooks: [
          { type: "command", command: cliCommand, timeout: 5 }
        ]
      },
      {
        matcher: "^(?:superloopy:)?robin$",
        hooks: [
          { type: "command", command: auditCommand, timeout: 5 }
        ]
      }
    ]
  }
};

async function createRepo({
  plugin = { name: "superloopy", version: "0.18.0" },
  geminiPlugin = { name: "superloopy", version: "0.18.0" },
  extension = { name: "superloopy", version: "0.18.0" },
  hooks = validHooks,
  omitHooks = false,
  omitPlugin = false,
  omitGeminiPlugin = false,
  omitExtension = false
} = {}) {
  const dir = await mkdtemp(join(tmpdir(), "superloopy-ag-wiring-"));
  if (!omitPlugin) {
    await writeFile(join(dir, "plugin.json"), JSON.stringify(plugin), "utf8");
  }
  if (!omitGeminiPlugin) {
    await mkdir(join(dir, ".gemini-plugin"), { recursive: true });
    await writeFile(join(dir, ".gemini-plugin", "plugin.json"), JSON.stringify(geminiPlugin), "utf8");
  }
  if (!omitExtension) {
    await writeFile(join(dir, "gemini-extension.json"), JSON.stringify(extension), "utf8");
  }
  if (!omitHooks) {
    await writeFile(join(dir, "hooks.json"), JSON.stringify(hooks), "utf8");
  }
  return dir;
}

test("checkAntigravityHostWiring passes for valid repo configuration", async () => {
  const dir = await createRepo();
  const result = await checkAntigravityHostWiring(dir);
  assert.equal(result.ok, true);
  assert.equal(result.policy, "antigravity-host-wiring-present-and-namespaced");
  assert.equal(result.matchers.length, 2);
});

test("checkAntigravityHostWiring fails if plugin.json is missing or invalid", async () => {
  const missing = await checkAntigravityHostWiring(await createRepo({ omitPlugin: true }));
  assert.equal(missing.ok, false);
  assert.match(missing.message, /missing plugin\.json/);

  const wrongName = await checkAntigravityHostWiring(await createRepo({ plugin: { name: "other", version: "0.18.0" } }));
  assert.equal(wrongName.ok, false);
  assert.match(wrongName.message, /plugin\.json name must be superloopy/);
});

test("checkAntigravityHostWiring fails if .gemini-plugin/plugin.json is missing", async () => {
  const missing = await checkAntigravityHostWiring(await createRepo({ omitGeminiPlugin: true }));
  assert.equal(missing.ok, false);
  assert.match(missing.message, /missing \.gemini-plugin\/plugin\.json/);
});

test("checkAntigravityHostWiring fails if gemini-extension.json is missing", async () => {
  const missing = await checkAntigravityHostWiring(await createRepo({ omitExtension: true }));
  assert.equal(missing.ok, false);
  assert.match(missing.message, /missing gemini-extension\.json/);
});

test("checkAntigravityHostWiring fails if hooks.json is missing or lacks SessionStart", async () => {
  const missing = await checkAntigravityHostWiring(await createRepo({ omitHooks: true }));
  assert.equal(missing.ok, false);
  assert.match(missing.message, /missing hooks\.json/);

  const noSessionStart = {
    superloopy: {
      SubagentStop: validHooks.superloopy.SubagentStop
    }
  };
  const missingSession = await checkAntigravityHostWiring(await createRepo({ hooks: noSessionStart }));
  assert.equal(missingSession.ok, false);
  assert.match(missingSession.message, /missing SessionStart hook/);
});

test("checkAntigravityHostWiring fails if SubagentStop does not cover namespaced agents", async () => {
  const bareOnly = {
    superloopy: {
      SessionStart: validHooks.superloopy.SessionStart,
      SubagentStop: [
        {
          matcher: "^(?:franky|zoro|usopp|jinbe|nami)$",
          hooks: [{ type: "command", command: cliCommand }]
        },
        {
          matcher: "^robin$",
          hooks: [{ type: "command", command: auditCommand }]
        }
      ]
    }
  };
  const result = await checkAntigravityHostWiring(await createRepo({ hooks: bareOnly }));
  assert.equal(result.ok, false);
  assert.match(result.message, /no CLI-invoking SubagentStop hook covers namespaced agents/);
});

test("checkAntigravityHostWiring reports invalid regex matchers in hooks.json", async () => {
  const brokenRegex = {
    superloopy: {
      SessionStart: validHooks.superloopy.SessionStart,
      SubagentStop: [
        {
          matcher: "([a-z",
          hooks: [{ type: "command", command: cliCommand }]
        }
      ]
    }
  };
  const result = await checkAntigravityHostWiring(await createRepo({ hooks: brokenRegex }));
  assert.equal(result.ok, false);
  assert.match(result.message, /not a valid regex/);
});
