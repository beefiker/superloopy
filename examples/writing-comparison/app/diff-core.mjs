const TOKEN_PATTERN = /\s+|[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]+/gu;
const MAX_BLOCK_LCS = 220;
// Token alignment allocates left * right cells, so it needs its own ceiling:
// diffDocuments' fallback funnels an entire document into one replace hunk.
const MAX_TOKEN_LCS_CELLS = 4_000_000;

function lineText(line) {
  return line.endsWith("\r") ? line.slice(0, -1) : line;
}

function isBlank(line) {
  return /^\s*$/u.test(lineText(line));
}

function isFenceStart(line) {
  return /^\s*(`{3,}|~{3,})/.exec(lineText(line));
}

function isHeading(line) {
  return /^ {0,3}#{1,6}(?:\s|$)/u.test(lineText(line));
}

function isTableLine(line) {
  return /^\s*\|.*\|\s*$/u.test(lineText(line));
}

function isListLine(line) {
  return /^\s*(?:[-+*]|\d+[.)])\s+/u.test(lineText(line));
}

function isBlockquote(line) {
  return /^\s*>/u.test(lineText(line));
}

function appendBlock(blocks, type, lines, start, end, source, lineOffsets) {
  const raw = lines.slice(start, end).join("\n");
  const sourceStartOffset = lineOffsets[start];
  const sourceEndOffset = sourceStartOffset + raw.length;
  const previous = blocks.at(-1);
  const block = { type, raw };
  Object.defineProperties(block, {
    sourceStartLine: { value: start + 1 },
    sourceEndLine: { value: end },
    sourceBefore: { value: source.slice(previous?.sourceEndOffset ?? 0, sourceStartOffset) },
    sourceEndOffset: { value: sourceEndOffset }
  });
  blocks.push(block);
}

export function splitBlocks(text) {
  const source = String(text ?? "");
  const lines = source.split("\n");
  const lineOffsets = [];
  let offset = 0;
  for (const line of lines) {
    lineOffsets.push(offset);
    offset += line.length + 1;
  }
  const blocks = [];
  const append = (type, start, end) => appendBlock(blocks, type, lines, start, end, source, lineOffsets);
  let index = 0;

  while (index < lines.length) {
    if (isBlank(lines[index])) {
      index += 1;
      continue;
    }

    if (index === 0 && lineText(lines[index]) === "---") {
      let end = index + 1;
      while (end < lines.length && lineText(lines[end]) !== "---") end += 1;
      // Only a closed block is frontmatter. An unclosed leading `---` is a
      // thematic break, and treating it as frontmatter swallowed the document.
      if (end < lines.length) {
        append("frontmatter", index, end + 1);
        index = end + 1;
        continue;
      }
    }

    const fence = isFenceStart(lines[index]);
    if (fence) {
      const marker = fence[1];
      const closing = new RegExp(`^\\s*${marker[0]}{${marker.length},}\\s*$`);
      let end = index + 1;
      while (end < lines.length && !closing.test(lineText(lines[end]))) end += 1;
      if (end < lines.length) end += 1;
      append("fence", index, end);
      index = end;
      continue;
    }

    if (isHeading(lines[index])) {
      append("heading", index, index + 1);
      index += 1;
      continue;
    }

    if (isTableLine(lines[index])) {
      let end = index + 1;
      while (end < lines.length && isTableLine(lines[end])) end += 1;
      append("table", index, end);
      index = end;
      continue;
    }

    if (isListLine(lines[index])) {
      let end = index + 1;
      while (end < lines.length && (isListLine(lines[end]) || /^\s+/u.test(lines[end]))) end += 1;
      append("list", index, end);
      index = end;
      continue;
    }

    if (isBlockquote(lines[index])) {
      let end = index + 1;
      while (end < lines.length && isBlockquote(lines[end])) end += 1;
      append("blockquote", index, end);
      index = end;
      continue;
    }

    let end = index + 1;
    while (
      end < lines.length &&
      !isBlank(lines[end]) &&
      !isFenceStart(lines[end]) &&
      !isHeading(lines[end]) &&
      !isTableLine(lines[end]) &&
      !isListLine(lines[end]) &&
      !isBlockquote(lines[end])
    ) end += 1;
    append("paragraph", index, end);
    index = end;
  }

  if (blocks.length > 0) {
    const last = blocks.at(-1);
    Object.defineProperty(last, "sourceAfter", { value: source.slice(last.sourceEndOffset) });
  }

  return blocks;
}

function tokenize(text) {
  return String(text ?? "").match(TOKEN_PATTERN) ?? [];
}

function coalesceTokens(parts) {
  return parts.reduce((result, part) => {
    const previous = result.at(-1);
    if (previous && previous.type === part.type) previous.value += part.value;
    else result.push({ ...part });
    return result;
  }, []);
}

function fallbackAlignment(left, right, equals) {
  let prefix = 0;
  while (prefix < left.length && prefix < right.length && equals(left[prefix], right[prefix])) prefix += 1;

  let suffix = 0;
  while (
    suffix < left.length - prefix &&
    suffix < right.length - prefix &&
    equals(left[left.length - suffix - 1], right[right.length - suffix - 1])
  ) suffix += 1;

  const operations = [];
  for (let i = 0; i < prefix; i += 1) operations.push({ type: "equal", left: i, right: i });
  for (let i = prefix; i < left.length - suffix; i += 1) operations.push({ type: "remove", left: i });
  for (let i = prefix; i < right.length - suffix; i += 1) operations.push({ type: "add", right: i });
  for (let i = suffix; i > 0; i -= 1) {
    operations.push({ type: "equal", left: left.length - i, right: right.length - i });
  }
  return operations;
}

function align(left, right, equals) {
  // Uint16Array wraps past 65535, which yields a wrong alignment rather than a
  // slow one, so widen the cell once either side can exceed that.
  const Scores = Math.min(left.length, right.length) > 65_535 ? Uint32Array : Uint16Array;
  const scores = Array.from({ length: left.length + 1 }, () => new Scores(right.length + 1));
  for (let leftIndex = left.length - 1; leftIndex >= 0; leftIndex -= 1) {
    for (let rightIndex = right.length - 1; rightIndex >= 0; rightIndex -= 1) {
      scores[leftIndex][rightIndex] = equals(left[leftIndex], right[rightIndex])
        ? scores[leftIndex + 1][rightIndex + 1] + 1
        : Math.max(scores[leftIndex + 1][rightIndex], scores[leftIndex][rightIndex + 1]);
    }
  }

  const operations = [];
  let leftIndex = 0;
  let rightIndex = 0;
  while (leftIndex < left.length || rightIndex < right.length) {
    if (leftIndex < left.length && rightIndex < right.length && equals(left[leftIndex], right[rightIndex])) {
      operations.push({ type: "equal", left: leftIndex, right: rightIndex });
      leftIndex += 1;
      rightIndex += 1;
    } else if (rightIndex === right.length || (leftIndex < left.length && scores[leftIndex + 1][rightIndex] >= scores[leftIndex][rightIndex + 1])) {
      operations.push({ type: "remove", left: leftIndex });
      leftIndex += 1;
    } else {
      operations.push({ type: "add", right: rightIndex });
      rightIndex += 1;
    }
  }
  return operations;
}

export function diffTokens(left, right) {
  const leftTokens = tokenize(left);
  const rightTokens = tokenize(right);
  // Beyond the budget, report the pair as a whole-side replacement instead of
  // allocating a matrix that would exhaust memory.
  if (leftTokens.length * rightTokens.length > MAX_TOKEN_LCS_CELLS) {
    return coalesceTokens([
      ...leftTokens.map((value) => ({ type: "remove", value })),
      ...rightTokens.map((value) => ({ type: "add", value }))
    ]);
  }
  const operations = align(leftTokens, rightTokens, (a, b) => a === b);
  return coalesceTokens(operations.map((operation) => ({
    type: operation.type,
    value: operation.type === "add" ? rightTokens[operation.right] : leftTokens[operation.left]
  })));
}

function groupBlockOperations(operations, leftBlocks, rightBlocks) {
  const groups = [];
  let index = 0;
  while (index < operations.length) {
    const isEqual = operations[index].type === "equal";
    const entries = [];
    while (index < operations.length && (operations[index].type === "equal") === isEqual) {
      const operation = operations[index];
      entries.push({
        type: operation.type,
        left: operation.left === undefined ? null : { index: operation.left, block: leftBlocks[operation.left] },
        right: operation.right === undefined ? null : { index: operation.right, block: rightBlocks[operation.right] }
      });
      index += 1;
    }
    groups.push(entries);
  }
  return groups;
}

function sideRange(entries, side) {
  const present = entries.map((entry) => entry[side]).filter(Boolean);
  if (present.length === 0) return null;
  return {
    start: present[0].index + 1,
    end: present.at(-1).index + 1,
    blocks: present.map((entry) => entry.block)
  };
}

function sectionNames(blocks) {
  let active = "";
  return blocks.map((block) => {
    if (block.type === "heading") active = block.raw.replace(/^\s*#+\s*/u, "").replace(/\s+#+\s*$/u, "");
    return active;
  });
}

// Only `rightAudits` is ever supplied (app.mjs passes version.audits). The four
// other accepted shapes were unreachable, so preservation could only ever read
// "unknown" while looking like a working guard.
function preservationFor(context) {
  const audits = Array.isArray(context?.rightAudits) ? context.rightAudits : [];
  if (audits.length === 0) return "unknown";

  let hasPositiveEvidence = false;
  for (const audit of audits) {
    const protectedCheck = audit?.checks?.protected;
    const missing = protectedCheck?.missing?.values ?? protectedCheck?.missing;
    const explicitFailure = protectedCheck?.ok === false ||
      (Array.isArray(missing) && missing.length > 0) || audit?.ok === false;
    if (explicitFailure) return "fail";
    if (protectedCheck?.ok === true || audit?.ok === true) hasPositiveEvidence = true;
  }
  return hasPositiveEvidence ? "pass" : "unknown";
}

function classify(op, left, right, tokens) {
  if (op === "equal") return "wording";
  // Compare the digit runs inside changed tokens: "18427건" is one token, so a
  // whole-token digit test can never match in Korean.
  const digitsFor = (type) => tokens
    .filter((token) => token.type === type || token.type === "equal")
    .flatMap((token) => token.value.match(/\p{N}+/gu) ?? []);
  const removedDigits = digitsFor("remove").join("\u0000");
  const addedDigits = digitsFor("add").join("\u0000");
  const changedNumber = removedDigits !== addedDigits;
  if (changedNumber) return "number/protected";
  if (!left || !right || left.blocks.length !== right.blocks.length || left.blocks.some((block, index) => block.type !== right.blocks[index]?.type)) return "structure";
  const leftRaw = left.blocks.map((block) => block.raw).join("\n\n");
  const rightRaw = right.blocks.map((block) => block.raw).join("\n\n");
  if (leftRaw !== rightRaw && leftRaw.replace(/\s+/gu, "") === rightRaw.replace(/\s+/gu, "")) return "format";
  return "wording";
}

export function diffDocuments(left, right, context = {}) {
  const leftSource = String(left ?? "");
  const rightSource = String(right ?? "");
  const leftBlocks = splitBlocks(leftSource);
  const rightBlocks = splitBlocks(rightSource);
  const blocksMatch = (a, b) => a.type === b.type && a.raw === b.raw;
  const operations = leftBlocks.length > MAX_BLOCK_LCS || rightBlocks.length > MAX_BLOCK_LCS
    ? fallbackAlignment(leftBlocks, rightBlocks, blocksMatch)
    : align(leftBlocks, rightBlocks, blocksMatch);
  const leftSections = sectionNames(leftBlocks);
  const rightSections = sectionNames(rightBlocks);
  const preservation = preservationFor(context);

  const hunks = groupBlockOperations(operations, leftBlocks, rightBlocks).map((entries, index) => {
    const contains = new Set(entries.map((entry) => entry.type));
    const op = contains.has("equal") ? "equal" : contains.has("remove") && contains.has("add") ? "replace"
      : contains.has("remove") ? "remove" : "add";
    const leftRange = sideRange(entries, "left");
    const rightRange = sideRange(entries, "right");
    const tokens = op === "equal" ? [] : diffTokens(
      leftRange?.blocks.map((block) => block.raw).join("\n\n") ?? "",
      rightRange?.blocks.map((block) => block.raw).join("\n\n") ?? ""
    );
    const sectionIndex = rightRange?.start ? rightRange.start - 1 : leftRange?.start ? leftRange.start - 1 : 0;
    const section = rightRange ? rightSections[sectionIndex] : leftSections[sectionIndex];
    return {
      id: `change-${index + 1}`,
      op,
      left: leftRange,
      right: rightRange,
      section,
      kind: classify(op, leftRange, rightRange, tokens),
      tokens,
      preservation
    };
  });
  if (hunks.length === 0 && leftSource !== rightSource) {
    hunks.push({
      id: "change-1",
      op: "replace",
      left: { start: 1, end: 1, blocks: [{ type: "paragraph", raw: leftSource }] },
      right: { start: 1, end: 1, blocks: [{ type: "paragraph", raw: rightSource }] },
      section: "",
      kind: "format",
      tokens: diffTokens(leftSource, rightSource),
      preservation
    });
  }
  Object.defineProperties(hunks, {
    sourceLeft: { value: leftSource },
    sourceRight: { value: rightSource }
  });
  return hunks;
}

export function summarizeDiff(hunks) {
  const summary = { equal: 0, add: 0, remove: 0, replace: 0, changedTokens: 0 };
  for (const hunk of hunks) {
    summary[hunk.op] += 1;
    summary.changedTokens += hunk.tokens.filter((token) => token.type !== "equal").length;
  }
  return summary;
}
