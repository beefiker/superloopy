// Trust boundary for plan-recorded commands.
//
// Threat model: `.superloopy/goals.json` lives INSIDE the repo, so a cloned
// repository can ship a poisoned plan whose `criterion.command` is attacker
// code (e.g. ["node","-e","..."] with status:"pass"). The audit engine re-runs
// passed criteria's commands deterministically — without a trust check, merely
// running `superloopy loop audit/finish` in a hostile repo is remote code
// execution. Defense: a command is only re-executable after it was seen
// locally — either this machine's CLI captured it (`loop capture` / `loop
// prove`, i.e. the user or their agent typed it in this session) or the user
// explicitly approved the plan with `superloopy loop trust`. The approval
// ledger lives OUTSIDE the repo (user home, keyed by repo path) precisely so
// repo contents cannot forge trust; absence of the ledger fails closed.
import { createHash } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { readFlag } from "./args.js";
import { nowIso, readPlan, scopeFromSessionId, writeJsonAtomic } from "./store.js";

export function trustStorePath(cwd, env = process.env) {
  // SUPERLOOPY_TRUST_DIR exists for tests; production callers never set it.
  const baseDir = env.SUPERLOOPY_TRUST_DIR?.trim() || join(homedir(), ".superloopy", "trust");
  const repoKey = createHash("sha256").update(resolve(cwd)).digest("hex");
  return join(baseDir, `${repoKey}.json`);
}

export function commandDigest(command) {
  return createHash("sha256").update(JSON.stringify(command)).digest("hex");
}

async function readTrustStore(cwd) {
  try {
    const parsed = JSON.parse(await readFile(trustStorePath(cwd), "utf8"));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && parsed.commands && typeof parsed.commands === "object") {
      return parsed;
    }
  } catch {
    // absent or unreadable -> empty store: nothing is trusted (fail-closed)
  }
  return { version: 1, commands: {} };
}

export async function isTrustedCommand(cwd, command) {
  if (!Array.isArray(command) || command.length === 0) return false;
  const store = await readTrustStore(cwd);
  return Boolean(store.commands[commandDigest(command)]);
}

export async function recordTrustedCommand(cwd, command) {
  if (!Array.isArray(command) || command.length === 0) return false;
  const store = await readTrustStore(cwd);
  const digest = commandDigest(command);
  if (store.commands[digest]) return false;
  store.commands[digest] = { command, trustedAt: nowIso() };
  const path = trustStorePath(cwd);
  await mkdir(dirname(path), { recursive: true });
  await writeJsonAtomic(path, store);
  return true;
}

// Explicit user approval of every command currently in the plan — the escape
// hatch for plans that arrived with the repo (handoff, resumed session on a new
// machine). Deliberately a separate, human-invoked CLI verb so an agent cannot
// silently launder a poisoned plan mid-loop.
export async function trustPlanCommands(cwd, plan) {
  const commands = [];
  for (const goal of plan.goals ?? []) {
    for (const criterion of goal.criteria ?? []) {
      if (Array.isArray(criterion.command) && criterion.command.length > 0) {
        commands.push({ criterion: `${goal.id}/${criterion.id}`, command: criterion.command });
      }
    }
  }
  let added = 0;
  for (const entry of commands) {
    if (await recordTrustedCommand(cwd, entry.command)) added += 1;
  }
  return { total: commands.length, added, alreadyTrusted: commands.length - added, commands };
}

// CLI verb: `superloopy loop trust [--session-id ID]`.
export async function trustLoop(cwd, argv = []) {
  const scope = scopeFromSessionId(readFlag(argv, "--session-id"));
  const plan = await readPlan(cwd, scope);
  const result = await trustPlanCommands(cwd, plan);
  return { ok: true, ...result, store: trustStorePath(cwd) };
}
