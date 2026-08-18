import { escapeHtml, renderBlock, TOKEN_OPEN, TOKEN_CLOSE } from "./markdown.mjs";

function safeAttribute(value) {
  return escapeHtml(value);
}

function labelFor(op) {
  if (op === "add") return "Added";
  if (op === "remove") return "Removed";
  if (op === "replace") return "Changed";
  return "Unchanged";
}

function classFor(op, side) {
  if (op === "equal") return "diff-context";
  if (op === "replace") return side === "left" ? "diff-remove diff-change" : "diff-add diff-change";
  if (op === "remove") return "diff-remove";
  return "diff-add";
}

function sideRange(hunk, side) {
  return hunk?.[side] ?? null;
}


function replacementBlocks(hunk, side) {
  const range = sideRange(hunk, side);
  const source = range.blocks.map((block) => block.raw).join("\n\n");
  const changedType = side === "left" ? "remove" : "add";
  const relevantTokens = hunk.tokens.filter((token) => token.type === "equal" || token.type === changedType);
  const ranges = [];
  let tokenOffset = 0;

  for (const token of relevantTokens) {
    const end = tokenOffset + token.value.length;
    if (token.type === changedType && end > tokenOffset) ranges.push({ start: tokenOffset, end });
    tokenOffset = end;
  }

  if (tokenOffset !== source.length || ranges.length === 0) return range.blocks.map(renderBlock).join("");

  let blockOffset = 0;
  return range.blocks.map((block) => {
    const blockStart = blockOffset;
    const blockEnd = blockStart + block.raw.length;
    const insertions = [];
    for (const changed of ranges) {
      const start = Math.max(changed.start, blockStart);
      const end = Math.min(changed.end, blockEnd);
      if (start < end) {
        insertions.push({ offset: start - blockStart, value: TOKEN_OPEN });
        insertions.push({ offset: end - blockStart, value: TOKEN_CLOSE });
      }
    }

    let raw = block.raw;
    for (const insertion of insertions.sort((a, b) => b.offset - a.offset)) {
      raw = `${raw.slice(0, insertion.offset)}${insertion.value}${raw.slice(insertion.offset)}`;
    }
    blockOffset = blockEnd + 2;
    return renderBlock({ ...block, raw });
  }).join("").replaceAll(TOKEN_OPEN, `<span class="token-${changedType}">`).replaceAll(TOKEN_CLOSE, "</span>");
}

function renderedHunk(hunk, side) {
  const range = sideRange(hunk, side);
  const classes = range ? hunk.op === "replace" ? "diff-change" : classFor(hunk.op, side) : "diff-empty";
  const content = range ? hunk.op === "replace" ? replacementBlocks(hunk, side) : range.blocks.map(renderBlock).join("") : "";
  const label = range ? labelFor(hunk.op === "replace" ? "replace" : hunk.op) : "No content";
  const id = safeAttribute(hunk.id);
  return `<section class="diff-hunk ${classes}" data-hunk-id="${id}"><span class="visually-hidden">${label}</span>${content}</section>`;
}

export function renderSideBySide(hunks, options = {}) {
  const changes = Array.isArray(hunks) ? hunks : [];
  const leftLabel = safeAttribute(options.leftLabel ?? "Left document");
  const rightLabel = safeAttribute(options.rightLabel ?? "Right document");
  return `<section class="diff-panes"><article class="diff-pane" data-side="left" aria-label="${leftLabel}">${changes.map((hunk) => renderedHunk(hunk, "left")).join("")}</article><article class="diff-pane" data-side="right" aria-label="${rightLabel}">${changes.map((hunk) => renderedHunk(hunk, "right")).join("")}</article></section>`;
}

function physicalLines(source) {
  if (source === "") return [];
  const lines = source.split("\n");
  if (source.endsWith("\n")) lines.pop();
  return lines;
}

function sourceDocument(hunks, side) {
  const entries = [];
  let reconstructed = "";
  let fallbackLine = 1;

  hunks.forEach((hunk, hunkIndex) => {
    const range = sideRange(hunk, side);
    if (!range) return;
    range.blocks.forEach((block, blockIndex) => {
      const before = typeof block.sourceBefore === "string" ? block.sourceBefore : entries.length === 0 ? "" : "\n\n";
      reconstructed += before;
      const startLine = Number.isInteger(block.sourceStartLine) ? block.sourceStartLine : fallbackLine + physicalLines(before).length;
      const lines = physicalLines(block.raw);
      const endLine = Number.isInteger(block.sourceEndLine) ? block.sourceEndLine : startLine + lines.length - 1;
      entries.push({ block, hunk, hunkIndex, blockIndex, startLine, endLine });
      reconstructed += block.raw;
      fallbackLine = endLine;
    });
  });
  const last = entries.at(-1);
  if (last && typeof last.block.sourceAfter === "string") reconstructed += last.block.sourceAfter;
  const documentSource = side === "left" ? hunks.sourceLeft : hunks.sourceRight;
  return { entries, lines: physicalLines(typeof documentSource === "string" ? documentSource : reconstructed) };
}

function replacementTokenLines(hunk, side, entries) {
  const rows = [""];
  for (const token of hunk.tokens) {
    const relevant = token.type === "equal" || (token.type === "remove" && side === "left") || (token.type === "add" && side === "right");
    if (!relevant) continue;
    const tokenClass = token.type === "remove" ? "token-remove" : token.type === "add" ? "token-add" : "";
    const pieces = token.value.split("\n");
    pieces.forEach((piece, index) => {
      const escaped = escapeHtml(piece);
      rows[rows.length - 1] += tokenClass && piece !== "" ? `<span class="${tokenClass}">${escaped}</span>` : escaped;
      if (index < pieces.length - 1) rows.push("");
    });
  }

  const byLine = new Map();
  let tokenLine = 0;
  entries.forEach((entry, index) => {
    const lineCount = physicalLines(entry.block.raw).length;
    for (let offset = 0; offset < lineCount; offset += 1) byLine.set(entry.startLine + offset, rows[tokenLine + offset] ?? "");
    tokenLine += lineCount;
    if (index < entries.length - 1) tokenLine += 1;
  });
  return byLine;
}

function emptyRow(hunk) {
  return `<pre class="source-row diff-empty" data-hunk-id="${safeAttribute(hunk.id)}"><span class="visually-hidden">No content</span></pre>`;
}

function sourceRows(hunks, side, oppositeSide) {
  const document = sourceDocument(hunks, side);
  const opposite = sourceDocument(hunks, oppositeSide);
  if (hunks.length === 0) {
    return document.lines.map((text, index) => {
      const line = index + 1;
      return `<pre class="source-row diff-context" data-line="${line}" aria-label="Unchanged line ${line}">${escapeHtml(text)}</pre>`;
    }).join("");
  }
  const entriesByLine = new Map();
  const entriesByHunk = new Map();
  for (const entry of document.entries) {
    for (let line = entry.startLine; line <= entry.endLine; line += 1) entriesByLine.set(line, entry);
    const group = entriesByHunk.get(entry.hunkIndex) ?? [];
    group.push(entry);
    entriesByHunk.set(entry.hunkIndex, group);
  }

  const tokenMarkup = new Map();
  hunks.forEach((hunk, hunkIndex) => {
    if (hunk.op === "replace") {
      for (const [line, html] of replacementTokenLines(hunk, side, entriesByHunk.get(hunkIndex) ?? [])) tokenMarkup.set(line, html);
    }
  });

  const groupedRows = Array.from({ length: hunks.length }, () => []);
  document.lines.forEach((text, index) => {
    const line = index + 1;
    const entry = entriesByLine.get(line);
    const nextEntry = document.entries.find((candidate) => candidate.startLine > line);
    const hunkIndex = entry?.hunkIndex ?? nextEntry?.hunkIndex ?? document.entries.at(-1)?.hunkIndex ?? 0;
    const hunk = hunks[hunkIndex];
    const classes = entry ? classFor(entry.hunk.op, side) : "diff-context";
    const label = entry ? labelFor(entry.hunk.op) : "Unchanged";
    const content = tokenMarkup.get(line) ?? escapeHtml(text);
    groupedRows[hunkIndex].push(`<pre class="source-row ${classes}" data-hunk-id="${safeAttribute(hunk.id)}" data-line="${line}" aria-label="${label} line ${line}">${content}</pre>`);
  });

  return hunks.map((hunk, index) => {
    const rows = groupedRows[index];
    if (rows.length > 0 || sideRange(hunk, side)) return rows.join("");
    const oppositeEntries = opposite.entries.filter((entry) => entry.hunkIndex === index);
    const count = Math.max(1, oppositeEntries.reduce((total, entry) => total + physicalLines(entry.block.raw).length, 0));
    return Array.from({ length: count }, () => emptyRow(hunk)).join("");
  }).join("");
}

export function renderSource(hunks, options = {}) {
  const changes = Array.isArray(hunks) ? hunks : [];
  const leftLabel = safeAttribute(options.leftLabel ?? "Left source");
  const rightLabel = safeAttribute(options.rightLabel ?? "Right source");
  return `<section class="source-panes"><article class="source-pane" data-side="left" aria-label="${leftLabel}">${sourceRows(changes, "left", "right")}</article><article class="source-pane" data-side="right" aria-label="${rightLabel}">${sourceRows(changes, "right", "left")}</article></section>`;
}

function tokenHtml(tokens, side) {
  return tokens.map((token) => {
    if (token.type === "equal") return escapeHtml(token.value);
    if (token.type === "remove" && side === "left") return `<span class="token-remove">${escapeHtml(token.value)}</span>`;
    if (token.type === "add" && side === "right") return `<span class="token-add">${escapeHtml(token.value)}</span>`;
    return "";
  }).join("");
}

function unifiedRow(hunk, side, content) {
  const isAddition = side === "right" && hunk.op !== "equal";
  const gutter = isAddition ? "+" : side === "left" && hunk.op !== "equal" ? "−" : " ";
  const label = gutter === "+" ? "Added" : gutter === "−" ? "Removed" : "Unchanged";
  const classes = gutter === "+" ? "diff-add" : gutter === "−" ? "diff-remove" : "diff-context";
  return `<pre class="unified-row ${classes}" data-hunk-id="${safeAttribute(hunk.id)}"><span class="visually-hidden">${label}</span><span class="unified-gutter">${gutter}</span><span class="unified-content">${content}</span></pre>`;
}

export function renderUnified(hunks) {
  const changes = Array.isArray(hunks) ? hunks : [];
  const rows = changes.flatMap((hunk) => {
    if (hunk.op === "equal") {
      return (hunk.left?.blocks ?? hunk.right?.blocks ?? []).map((block) => unifiedRow(hunk, "equal", escapeHtml(block.raw)));
    }
    if (hunk.op === "replace") {
      return [unifiedRow(hunk, "left", tokenHtml(hunk.tokens, "left")), unifiedRow(hunk, "right", tokenHtml(hunk.tokens, "right"))];
    }
    if (hunk.op === "remove") return (hunk.left?.blocks ?? []).map((block) => unifiedRow(hunk, "left", escapeHtml(block.raw)));
    return (hunk.right?.blocks ?? []).map((block) => unifiedRow(hunk, "right", escapeHtml(block.raw)));
  });
  return `<section class="unified-stream" aria-label="Unified document diff">${rows.join("")}</section>`;
}
