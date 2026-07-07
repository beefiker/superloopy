import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { readFlag } from "./args.js";
import { resolveEvidenceOutputPath } from "./artifacts.js";
import { evidenceLoop } from "./loop.js";
import { recordTrustedCommand } from "./plan-trust.js";
import { resolveSpawnInvocation } from "./spawn-command.js";
import { ensureSuperloopyDirs, evidenceRelativeDir, nowIso, scopeFromSessionId } from "./store.js";

// Shared deterministic re-run core: spawn a command, derive pass/fail from the
// exit status exactly as capture does, and write a transcript artifact. Reused
// by the audit engine so an audit re-run is byte-for-byte the same path as the
// original proof.
export async function runCaptured(cwd, command, artifact) {
  await mkdir(dirname(artifact.absolutePath), { recursive: true });
  const startedAt = nowIso();
  // Windows: `npm`/`npx` are .cmd shims that Node refuses to spawn directly
  // (CVE-2024-27980 hardening) -> ENOENT and every command-backed proof fails.
  // Route the known shim set through cmd.exe exactly like auto-update does.
  const invocation = resolveSpawnInvocation(command[0], command.slice(1));
  const commandResult = spawnSync(invocation.command, invocation.args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024
  });
  const finishedAt = nowIso();
  const status = commandResult.status === 0 && commandResult.signal === null && commandResult.error === undefined ? "pass" : "fail";
  const capture = {
    command,
    status,
    exitCode: commandResult.status,
    signal: commandResult.signal,
    artifact: artifact.relativePath,
    startedAt,
    finishedAt
  };
  if (commandResult.error) capture.error = commandResult.error.message;
  await writeFile(artifact.absolutePath, renderCaptureTranscript(cwd, capture, commandResult), "utf8");
  return capture;
}

export async function captureLoop(cwd, argv) {
  const { options, command } = splitCaptureArgv(argv);
  const scope = readScope(options);
  const goalId = required(options, "--goal-id");
  const criterionId = required(options, "--criterion-id");
  const artifactPath = readFlag(options, "--artifact") ?? `${evidenceRelativeDir(scope)}/${goalId}-${criterionId}-capture.txt`;
  const artifact = resolveEvidenceOutputPath(cwd, artifactPath, scope);
  const notes = readFlag(options, "--notes");
  await ensureSuperloopyDirs(cwd, scope);

  // This command was typed locally (CLI argv of capture/prove), not read from a
  // repo file — record it as trusted so the audit engine may re-run it later.
  // Audit itself never records trust; it only consumes it (see plan-trust.js).
  await recordTrustedCommand(cwd, command);
  const capture = await runCaptured(cwd, command, artifact);
  const evidenceArgs = [
    "--goal-id",
    goalId,
    "--criterion-id",
    criterionId,
    "--status",
    capture.status,
    "--artifact",
    artifact.relativePath,
    "--command",
    JSON.stringify(command),
    "--exit-code",
    String(capture.exitCode)
  ];
  if (notes !== undefined) evidenceArgs.push("--notes", notes);
  if (scope?.sessionId) evidenceArgs.push("--session-id", scope.sessionId);
  const result = await evidenceLoop(cwd, evidenceArgs);
  return { ...result, capture };
}

function splitCaptureArgv(argv) {
  const delimiter = argv.indexOf("--");
  if (delimiter === -1 || delimiter === argv.length - 1) {
    throw new Error("Missing capture command. Use `-- COMMAND [ARGS...]`.");
  }
  return {
    options: argv.slice(0, delimiter),
    command: argv.slice(delimiter + 1)
  };
}

function renderCaptureTranscript(cwd, capture, commandResult) {
  return [
    "Superloopy command capture",
    `startedAt: ${capture.startedAt}`,
    `finishedAt: ${capture.finishedAt}`,
    `cwd: ${cwd}`,
    `status: ${capture.status}`,
    `exitCode: ${capture.exitCode}`,
    `signal: ${capture.signal}`,
    `command: ${JSON.stringify(capture.command)}`,
    capture.error === undefined ? "" : `error: ${capture.error}`,
    "",
    "[stdout]",
    commandResult.stdout ?? "",
    "[stderr]",
    commandResult.stderr ?? ""
  ].filter((line) => line !== "").join("\n");
}

function readScope(argv) {
  return scopeFromSessionId(readFlag(argv, "--session-id"));
}

function required(argv, flag) {
  const value = readFlag(argv, flag)?.trim();
  if (!value) throw new Error(`Missing ${flag}.`);
  return value;
}
