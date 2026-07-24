export const CONTEXT_ESTIMATOR = "mixed-v1";

export function measureContext(text) {
  const points = Array.from(text);
  let ascii = 0;
  for (const point of points) {
    if (point.codePointAt(0) <= 0x7f) ascii += 1;
  }
  const nonAscii = points.length - ascii;
  return {
    characters: points.length,
    utf8Bytes: Buffer.byteLength(text, "utf8"),
    estimatedTokens: Math.ceil(ascii / 4 + nonAscii / 1.5),
    estimator: CONTEXT_ESTIMATOR
  };
}

export function appendContextCost(text) {
  const body = typeof text === "string" ? text.trim() : "";
  if (body.length === 0) return "";
  let output = body;
  for (let index = 0; index < 8; index += 1) {
    const measured = measureContext(output);
    const next = `${body}\n\nSuperloopy context cost: ${measured.characters.toLocaleString("en-US")} chars · ${measured.utf8Bytes.toLocaleString("en-US")} UTF-8 bytes · ~${measured.estimatedTokens.toLocaleString("en-US")} estimated tokens (${measured.estimator})`;
    if (next === output) return output;
    output = next;
  }
  return output;
}

export function formatMeasuredAdditionalContext(hookEventName, additionalContext, extra = {}) {
  const measured = appendContextCost(additionalContext);
  if (measured.length === 0) return "";
  return `${JSON.stringify({
    ...extra,
    hookSpecificOutput: {
      ...(extra.hookSpecificOutput ?? {}),
      hookEventName,
      additionalContext: measured
    }
  })}\n`;
}
