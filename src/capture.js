import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { readFlag } from "./args.js";
import { resolveEvidenceOutputPath, writeEvidenceOutputFile } from "./artifacts.js";
import { evidenceLoop } from "./loop.js";
import { recordTrustedCommand } from "./plan-trust.js";
import { resolveSpawnInvocation } from "./spawn-command.js";
import { ensureSuperloopyDirs, evidenceRelativeDir, nowIso, scopeFromSessionId } from "./store.js";

const MAX_CAPTURE_STREAM_BYTES = 10 * 1024 * 1024;

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
  const commandResult = await runCommand(invocation, cwd);
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
  await writeEvidenceOutputFile(artifact, renderCaptureTranscript(cwd, capture, commandResult));
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
    truncatedLine("stdout", commandResult.stdoutTruncatedBytes),
    "[stderr]",
    commandResult.stderr ?? "",
    truncatedLine("stderr", commandResult.stderrTruncatedBytes)
  ].filter((line) => line !== "").join("\n");
}

function truncatedLine(stream, truncatedBytes) {
  return truncatedBytes > 0
    ? `[${stream} truncated after ${MAX_CAPTURE_STREAM_BYTES} bytes; ${truncatedBytes} additional bytes omitted]`
    : "";
}

function runCommand(invocation, cwd) {
  return new Promise((resolve) => {
    const stdout = captureStreamBuffer();
    const stderr = captureStreamBuffer();
    let error;
    const child = spawn(invocation.command, invocation.args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"]
    });
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.on("error", (caught) => {
      error = caught;
    });
    child.on("close", (status, signal) => {
      resolve({
        status,
        signal,
        error,
        stdout: stdout.text(),
        stderr: stderr.text(),
        stdoutTruncatedBytes: stdout.truncatedBytes(),
        stderrTruncatedBytes: stderr.truncatedBytes()
      });
    });
  });
}

function captureStreamBuffer() {
  const chunks = [];
  let kept = 0;
  let truncated = 0;
  return {
    push(chunk) {
      const buffer = Buffer.from(chunk);
      if (kept < MAX_CAPTURE_STREAM_BYTES) {
        const available = MAX_CAPTURE_STREAM_BYTES - kept;
        const take = Math.min(available, buffer.length);
        if (take > 0) chunks.push(buffer.subarray(0, take));
        kept += take;
        truncated += buffer.length - take;
      } else {
        truncated += buffer.length;
      }
    },
    text() {
      return Buffer.concat(chunks).toString("utf8");
    },
    truncatedBytes() {
      return truncated;
    }
  };
}

function readScope(argv) {
  return scopeFromSessionId(readFlag(argv, "--session-id"));
}

function required(argv, flag) {
  const value = readFlag(argv, flag)?.trim();
  if (!value) throw new Error(`Missing ${flag}.`);
  return value;
}
