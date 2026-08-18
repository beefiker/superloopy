// Highlight sentinels. The replacement renderer injects these into a block's
// raw text to mark changed spans, then re-parses the block. They can land on a
// structural marker, so block parsing must look past them without dropping
// them — dropping one unbalances the <span> pair it belongs to.
export const TOKEN_OPEN = "\uE100";
export const TOKEN_CLOSE = "\uE101";
const MARK = "[\uE100\uE101]";

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isSafeUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function tableCells(line) {
  const trimmed = line.trim().replace(/^\|/u, "").replace(/\|$/u, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

function isTableDivider(cells) {
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/u.test(cell));
}

export function renderInline(value) {
  const codeValues = [];
  let html = escapeHtml(value).replace(/`([^`]+)`/gu, (_match, code) => {
    const marker = `\uE000${codeValues.length}\uE001`;
    codeValues.push(`<code>${code}</code>`);
    return marker;
  });

  html = html.replace(/\[([^\]]+)\]\(([^()\s]+)\)/gu, (match, label, url) => {
    const decodedUrl = url.replaceAll("&amp;", "&");
    return isSafeUrl(decodedUrl)
      ? `<a href="${url}" target="_blank" rel="noreferrer">${label}</a>`
      : match;
  });
  html = html.replace(/\*\*([^*]+)\*\*/gu, "<strong>$1</strong>");
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/gu, "<em>$1</em>");

  return html.replace(/\uE000(\d+)\uE001/gu, (_match, index) => codeValues[Number(index)]);
}

function renderList(raw) {
  const lines = raw.split("\n");
  const ordered = /^\s*\d+[.)]\s+/u.test(lines[0] ?? "");
  const items = [];
  let current = null;

  for (const line of lines) {
    const match = ordered
      ? /^\s*\d+[.)]\s+(.*)$/u.exec(line)
      : /^\s*[-+*]\s+(.*)$/u.exec(line);
    if (match) {
      if (current !== null) items.push(current);
      current = match[1];
    } else if (current !== null) {
      current += `\n${line.trim()}`;
    }
  }
  if (current !== null) items.push(current);

  const content = items.map((item) => {
    const checklist = /^\[([ xX])\]\s+(.*)$/u.exec(item);
    if (!checklist) return `<li>${renderInline(item).replaceAll("\n", "<br>")}</li>`;
    const checked = checklist[1].toLowerCase() === "x" ? " checked" : "";
    return `<li><input type="checkbox"${checked} disabled> ${renderInline(checklist[2]).replaceAll("\n", "<br>")}</li>`;
  }).join("");
  return `<${ordered ? "ol" : "ul"}>${content}</${ordered ? "ol" : "ul"}>`;
}

function renderTable(raw) {
  const rows = raw.split("\n").map(tableCells);
  const hasHeader = rows.length > 1 && isTableDivider(rows[1]);
  const bodyRows = hasHeader ? rows.slice(2) : rows;
  const head = hasHeader
    ? `<thead><tr>${rows[0].map((cell) => `<th>${renderInline(cell)}</th>`).join("")}</tr></thead>`
    : "";
  const body = bodyRows.map((cells) => `<tr>${cells.map((cell) => `<td>${renderInline(cell)}</td>`).join("")}</tr>`).join("");
  return `<table>${head}<tbody>${body}</tbody></table>`;
}

export function renderBlock(block) {
  const type = block?.type ?? "paragraph";
  const raw = String(block?.raw ?? "");

  if (type === "heading") {
    // Match the "#" marker even when highlight sentinels are interleaved, then
    // carry any sentinel found in the marker into the content so the opening
    // and closing marks stay paired.
    const match = new RegExp(`^([\\s\uE100\uE101]*(?:#${MARK}*){1,6}[\\s\uE100\uE101]*)(.*?)(?:\\s+#+\\s*)?$`, "u").exec(raw);
    if (match) {
      const level = (match[1].match(/#/gu) ?? []).length;
      const carried = (match[1].match(new RegExp(MARK, "gu")) ?? []).join("");
      return `<h${level}>${renderInline(carried + match[2])}</h${level}>`;
    }
  }
  if (type === "frontmatter") return `<pre class="frontmatter"><code>${escapeHtml(raw)}</code></pre>`;
  if (type === "fence") {
    const lines = raw.split("\n");
    const opening = /^\s*(`{3,}|~{3,})([^\s]*)/u.exec(lines[0] ?? "");
    const language = opening?.[2] ? ` class="language-${escapeHtml(opening[2])}"` : "";
    const content = lines.slice(1, opening && lines.at(-1)?.trim().startsWith(opening[1][0]) ? -1 : undefined).join("\n");
    return `<pre><code${language}>${escapeHtml(content)}</code></pre>`;
  }
  if (type === "blockquote") {
    const content = raw.split("\n").map((line) => renderInline(line.replace(/^\s*>\s?/u, ""))).join("<br>");
    return `<blockquote>${content}</blockquote>`;
  }
  if (type === "table") return renderTable(raw);
  if (type === "list") return renderList(raw);
  return `<p>${renderInline(raw).replaceAll("\n", "<br>")}</p>`;
}
