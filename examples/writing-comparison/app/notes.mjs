// Inline "why did this sentence change" notes. Each sample may ship a
// samples/<id>/notes.json whose entries anchor an explanation to an exact
// sentence of one version; build-data.mjs validates the anchors and embeds
// them as version.notes. This module wraps each anchor occurrence in the
// rendered panes and shows the explanation in a shared tooltip.

// Pure: first occurrence of `anchor` in `text`, as [start, end), or null.
export function findAnchorRange(text, anchor) {
  const start = text.indexOf(anchor);
  return start === -1 ? null : { start, end: start + anchor.length };
}

// Anchors are authored against the raw Markdown (that is what the build
// validates), but the rendered panes drop Markdown syntax: `<code>` loses its
// backticks and `<li>` loses the `1. ` / `- [ ] ` marker. This produces the
// rendered-text form of an anchor so it still matches there.
export function normalizeAnchor(anchor) {
  return anchor.replace(/^(?:- \[[ xX]\] |[-*+] |\d+\. )/u, "").replaceAll("`", "");
}

// Raw form first (matches the source pane), rendered form second.
export function findAnchorMatch(text, anchor) {
  return findAnchorRange(text, anchor) ?? findAnchorRange(text, normalizeAnchor(anchor));
}

// Pure: given the lengths of consecutive text segments and a [start, end)
// range over their concatenation, return the slice each segment contributes:
// [{ segment, start, end }] with segment-local offsets. Used to wrap an
// anchor that the diff highlighter split across multiple text nodes.
export function anchorSliceRanges(segmentLengths, start, end) {
  const slices = [];
  let offset = 0;
  segmentLengths.forEach((length, segment) => {
    const sliceStart = Math.max(start, offset);
    const sliceEnd = Math.min(end, offset + length);
    if (sliceStart < sliceEnd) slices.push({ segment, start: sliceStart - offset, end: sliceEnd - offset });
    offset += length;
  });
  return slices;
}

function paneTextNodes(root) {
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) {
    if (!walker.currentNode.parentElement?.closest(".visually-hidden, .pane-label")) nodes.push(walker.currentNode);
  }
  return nodes;
}

function wrapSlice(node, sliceStart, sliceEnd, note, noteId, focusable) {
  const target = sliceStart > 0 ? node.splitText(sliceStart) : node;
  if (sliceEnd - sliceStart < target.data.length) target.splitText(sliceEnd - sliceStart);
  const span = node.ownerDocument.createElement("span");
  span.className = "note-anchor";
  span.dataset.noteId = noteId;
  span.dataset.noteRule = note.rule;
  span.dataset.noteText = note.note;
  if (note.from) span.dataset.noteFrom = note.from;
  if (focusable) span.tabIndex = 0;
  target.parentNode.replaceChild(span, target);
  span.append(target);
}

let nextNoteId = 0;

// Wraps every note anchor found inside `root`. Text nodes are re-collected
// per note because wrapping mutates the tree; panes are small enough that
// the quadratic cost stays invisible. The diff highlighter may split one
// anchor across several spans; every fragment shares a note id so the whole
// sentence activates together. Returns the number of anchored notes.
export function annotateNoteAnchors(root, notes) {
  let anchored = 0;
  for (const note of notes ?? []) {
    const nodes = paneTextNodes(root);
    const text = nodes.map((node) => node.data).join("");
    const range = findAnchorMatch(text, note.anchor);
    if (!range) continue;
    const slices = anchorSliceRanges(nodes.map((node) => node.data.length), range.start, range.end);
    const noteId = String(nextNoteId += 1);
    const firstSegment = slices[0]?.segment;
    // Wrap back to front so earlier segment offsets stay valid; only the
    // first fragment joins the tab order so keyboard users visit each note once.
    for (const slice of [...slices].reverse()) {
      wrapSlice(nodes[slice.segment], slice.start, slice.end, note, noteId, slice.segment === firstSegment);
    }
    anchored += 1;
  }
  return anchored;
}

function tooltipHtmlParts(document, anchor) {
  const rule = document.createElement("p");
  rule.className = "note-tooltip-rule";
  rule.textContent = anchor.dataset.noteRule;
  const body = document.createElement("p");
  body.className = "note-tooltip-body";
  body.textContent = anchor.dataset.noteText;
  const parts = [rule, body];
  if (anchor.dataset.noteFrom) {
    const from = document.createElement("p");
    from.className = "note-tooltip-from";
    from.textContent = `원문: ${anchor.dataset.noteFrom}`;
    parts.push(from);
  }
  return parts;
}

function positionTooltip(tooltip, anchor, window) {
  const rect = anchor.getBoundingClientRect();
  tooltip.style.left = "0px";
  tooltip.style.top = "0px";
  tooltip.hidden = false;
  const width = tooltip.offsetWidth;
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
  const below = rect.bottom + 8;
  const top = below + tooltip.offsetHeight > window.innerHeight - 8 ? Math.max(8, rect.top - tooltip.offsetHeight - 8) : below;
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

// One tooltip for the whole document view, driven by event delegation so it
// survives every re-render. Hover and keyboard focus show it; Escape, blur,
// leaving the anchor, or scrolling hides it. Click toggles for touch.
export function installNoteTooltip(container, windowRef = typeof window === "undefined" ? null : window) {
  if (!windowRef) return null;
  const document = container.ownerDocument;
  const tooltip = document.createElement("div");
  tooltip.className = "note-tooltip";
  tooltip.id = "note-tooltip";
  tooltip.setAttribute("role", "tooltip");
  tooltip.hidden = true;
  document.body.append(tooltip);
  let currentId = null;

  const fragmentsOf = (noteId) => [...container.querySelectorAll(`.note-anchor[data-note-id="${noteId}"]`)];
  const clearActive = () => {
    for (const fragment of container.querySelectorAll(".note-anchor.note-active")) {
      fragment.classList.remove("note-active");
      fragment.removeAttribute("aria-describedby");
    }
  };
  const show = (anchor) => {
    const noteId = anchor.dataset.noteId;
    if (noteId === currentId && !tooltip.hidden) return;
    clearActive();
    const fragments = fragmentsOf(noteId);
    for (const fragment of fragments) {
      fragment.classList.add("note-active");
      // Without this reference a screen reader lands on the anchor and hears
      // only the sentence text, with no sign a note exists.
      fragment.setAttribute("aria-describedby", tooltip.id);
    }
    tooltip.replaceChildren(...tooltipHtmlParts(document, anchor));
    positionTooltip(tooltip, fragments[0] ?? anchor, windowRef);
    currentId = noteId;
  };
  const hide = () => {
    clearActive();
    tooltip.hidden = true;
    currentId = null;
  };
  const anchorOf = (event) => (event.target instanceof Element ? event.target.closest(".note-anchor") : null);

  container.addEventListener("mouseover", (event) => {
    const anchor = anchorOf(event);
    if (anchor) show(anchor);
  });
  container.addEventListener("mouseout", (event) => {
    if (anchorOf(event) && !(event.relatedTarget instanceof Element && event.relatedTarget.closest(".note-anchor"))) hide();
  });
  container.addEventListener("focusin", (event) => {
    const anchor = anchorOf(event);
    if (anchor) show(anchor);
  });
  container.addEventListener("focusout", (event) => {
    if (anchorOf(event)) hide();
  });
  container.addEventListener("click", (event) => {
    const anchor = anchorOf(event);
    if (!anchor) return;
    if (anchor.dataset.noteId === currentId && !tooltip.hidden) hide();
    else show(anchor);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !tooltip.hidden) hide();
  });
  document.addEventListener("scroll", hide, { capture: true, passive: true });
  return tooltip;
}
