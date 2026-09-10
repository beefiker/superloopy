import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { isAntigravityHost } from "../src/agents.js";
import { canonicalAgentType, matchesAgentType } from "../src/receipt.js";

test("Antigravity and Gemini plugin manifests match package version and author", async () => {
  const pkg = JSON.parse(await readFile("package.json", "utf8"));
  const geminiPlugin = JSON.parse(await readFile(".gemini-plugin/plugin.json", "utf8"));
  const geminiExt = JSON.parse(await readFile("gemini-extension.json", "utf8"));
  const rootPlugin = JSON.parse(await readFile("plugin.json", "utf8"));

  assert.equal(geminiPlugin.name, "superloopy");
  assert.equal(geminiPlugin.version, pkg.version);
  assert.equal(geminiPlugin.author.name, "beefiker");
  assert.equal(geminiPlugin.license, "MIT");

  assert.equal(geminiExt.name, "superloopy");
  assert.equal(geminiExt.version, pkg.version);
  assert.equal(geminiExt.author.name, "beefiker");

  assert.equal(rootPlugin.name, "superloopy");
  assert.equal(rootPlugin.version, pkg.version);
  assert.equal(rootPlugin.author.name, "beefiker");
  assert.equal(rootPlugin.license, "MIT");
});

test("isAntigravityHost detects Antigravity plugin and host environment signals", () => {
  assert.equal(isAntigravityHost({ ANTIGRAVITY_PLUGIN_ROOT: "/path/to/plugin" }), true);
  assert.equal(isAntigravityHost({ GEMINI_PLUGIN_ROOT: "/path/to/plugin" }), true);
  assert.equal(isAntigravityHost({ SUPERLOOPY_HOST: "antigravity" }), true);
  assert.equal(isAntigravityHost({ SUPERLOOPY_HOST: "codex", ANTIGRAVITY_PLUGIN_ROOT: "/path" }), false);
  assert.equal(isAntigravityHost({}), false);
  assert.equal(isAntigravityHost({ OTHER_ENV: "value" }), false);
});

test("canonicalAgentType and matchesAgentType resolve Antigravity host agent types", () => {
  assert.equal(canonicalAgentType("antigravity", "franky"), "superloopy:franky");
  assert.equal(canonicalAgentType("antigravity", "zoro"), "superloopy:zoro");
  assert.equal(canonicalAgentType("antigravity", "unknown"), null);
  assert.equal(matchesAgentType({ host: "antigravity", agentType: "franky", role: "franky" }), true);
  assert.equal(matchesAgentType({ host: "antigravity", agentType: "superloopy:franky", role: "franky" }), true);
  assert.equal(matchesAgentType({ host: "antigravity", agentType: "zoro", role: "franky" }), false);
});
