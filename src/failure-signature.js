import { createHash } from "node:crypto";

// Identity of a failing proof: the command, how it exited, and the tail of its output with
// run-to-run noise rewritten to fixed placeholders. Equal signatures mean "failed the same
// way"; an edit that moves the failure (another assertion, value, or failing test) changes
// the tail and so the signature. Only the token classes below count as noise. Small numbers
// stay significant because assertion values and pass/fail counts are signal.
const RAW_TAIL_CHARS = 64 * 1024;
const SIGNATURE_TAIL_CHARS = 8192;

// Order matters: whole timestamps and paths are rewritten before the stack-position and
// long-number rules could split them into partial matches. Every pattern must stay linear
// on 64KB of hostile output: no rule may fail late from many start positions in one token.
const NOISE_RULES = [
  [/\u001b\[[0-9;?]*[ -/]*[@-~]/gu, ""], // ANSI color/cursor escapes
  [/\r\n?/gu, "\n"],
  [/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/giu, "<uuid>"],
  [/\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:[.,]\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?/gu, "<time>"],
  [/\b\d{1,2}:\d{2}:\d{2}(?:[.,]\d+)?\b/gu, "<time>"],
  [/(?:\/private)?\/var\/folders\/[^\s'"`)\]]+|\/tmp\/[^\s'"`)\]]+/gu, "<tmp>"],
  // Whole Windows path tokens always match, so the scan never restarts inside one token.
  [/\b[A-Za-z]:\\[^\s'"`)\]]+/gu, (path) => (/\\Temp\\/iu.test(path) ? "<tmp>" : path)],
  // xcodebuild: `in 0.012 (0.015) seconds` carries two timings before one unit.
  [/\b\d+(?:\.\d+)?\s?\(\d+(?:\.\d+)?\)\s?(?:seconds?|secs?|s)\b/gu, "<duration>"],
  [/\b\d+(?:\.\d+)?\s?(?:ns|μs|µs|us|ms|s|secs?|seconds?|mins?|minutes?)\b/gu, "<duration>"],
  [/\b(duration_ms|duration|elapsed|took|pid|port|seed)(\s*[=:]?\s*)\d+(?:\.\d+)?/giu, "$1$2<n>"],
  [/\b0x[0-9a-f]+\b/giu, "<addr>"],
  [/:\d+:\d+\b/gu, ":<line>:<col>"],
  [/\bline \d+\b/gu, "line <n>"],
  [/\b(?=[0-9a-f]*\d)(?=[0-9a-f]*[a-f])[0-9a-f]{7,}\b/giu, "<hex>"],
  // Epoch seconds/millis and nanosecond clocks. Shorter numbers stay significant: they are
  // as likely to be an assertion's expected/received value as an unlabeled PID.
  [/\d{10,}/gu, "<n>"]
];

export function failureSignature(command, commandResult) {
  return createHash("sha256")
    .update(JSON.stringify([
      command,
      commandResult.status,
      commandResult.signal,
      commandResult.error?.message ?? null,
      normalizeFailureOutput(commandResult.stdout),
      normalizeFailureOutput(commandResult.stderr)
    ]))
    .digest("hex")
    .slice(0, 16);
}

// Normalize before taking the signature window, and start every cut window at a line
// boundary: slicing raw text first would shift the window whenever earlier noise changes
// length (`9ms` vs `1234ms`) and break an otherwise identical streak.
export function normalizeFailureOutput(text) {
  const normalized = NOISE_RULES.reduce(
    (current, [pattern, replacement]) => current.replace(pattern, replacement),
    lineAlignedTail(text ?? "", RAW_TAIL_CHARS)
  );
  return lineAlignedTail(normalized, SIGNATURE_TAIL_CHARS);
}

function lineAlignedTail(text, maxChars) {
  if (text.length <= maxChars) return text;
  const tail = text.slice(-maxChars);
  const firstBreak = tail.indexOf("\n");
  // Drop the partial first line only when a full line follows; a single line longer than
  // the window (with or without a trailing newline) keeps its last maxChars characters.
  return firstBreak === -1 || firstBreak >= tail.trimEnd().length ? tail : tail.slice(firstBreak + 1);
}
