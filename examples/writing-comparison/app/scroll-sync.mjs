// Scroll UI for the two-pane comparison: hunk-anchored scroll syncing and a
// clickable overview ruler that maps every changed hunk onto the pane height.
//
// Proportional syncing drifts once the two documents distribute their length
// differently (a compressed B variant against its original), so the sync maps
// through the hunk edges both panes share instead. The pure geometry is
// exported for tests; attachComparisonScrollUi wires it to the rendered DOM.

const ANCHOR_FRACTION = 0.3;

function clamp(value, low, high) {
  return Math.min(high, Math.max(low, value));
}

// Control points (source offset → target offset) for every hunk edge present
// in both panes. Non-monotone points are dropped so interpolation never runs
// backwards when an empty counterpart collapses to a hairline.
export function buildAnchorMap(sourceEntries, targetEntries) {
  const targetsById = new Map(targetEntries.map((entry) => [entry.id, entry]));
  const points = [];
  for (const entry of sourceEntries) {
    const counterpart = targetsById.get(entry.id);
    if (!counterpart) continue;
    const candidates = [
      { s: entry.top, t: counterpart.top },
      { s: entry.top + entry.height, t: counterpart.top + counterpart.height }
    ];
    for (const point of candidates) {
      const last = points.at(-1);
      if (!last || (point.s > last.s && point.t >= last.t)) points.push(point);
    }
  }
  return points;
}

// Piecewise-linear interpolation over the control points; offsets outside the
// mapped span clamp to the nearest edge. Null when there is nothing to map.
export function mapOffset(points, offset) {
  if (points.length < 2) return null;
  if (offset <= points[0].s) return points[0].t;
  const last = points.at(-1);
  if (offset >= last.s) return last.t;
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];
    if (offset > to.s) continue;
    const span = to.s - from.s;
    const fraction = span > 0 ? (offset - from.s) / span : 0;
    return from.t + fraction * (to.t - from.t);
  }
  return last.t;
}

// Target scrollTop that keeps the content under the source pane's anchor line
// (a fixed fraction into its viewport) aligned with its counterpart. The exact
// scroll extremes snap so both panes finish their documents together.
export function anchoredTargetScrollTop(source, target, anchorFraction = ANCHOR_FRACTION) {
  const sourceRange = source.scrollHeight - source.clientHeight;
  const targetRange = target.scrollHeight - target.clientHeight;
  if (sourceRange <= 0 || targetRange <= 0) return null;
  if (source.scrollTop <= 0) return 0;
  if (source.scrollTop >= sourceRange) return targetRange;
  const points = buildAnchorMap(source.entries ?? [], target.entries ?? []);
  const mapped = mapOffset(points, source.scrollTop + source.clientHeight * anchorFraction);
  if (mapped === null) return null;
  return clamp(mapped - target.clientHeight * anchorFraction, 0, targetRange);
}

// The pre-anchor behaviour, kept as the fallback for a pane pair that carries
// no shared hunk ids (or whose measurement produced nothing).
export function proportionalTargetScrollTop(source, target) {
  const sourceRange = source.scrollHeight - source.clientHeight;
  const targetRange = target.scrollHeight - target.clientHeight;
  if (sourceRange <= 0 || targetRange <= 0) return null;
  return (source.scrollTop / sourceRange) * targetRange;
}

// Fractional ruler geometry for the changed hunks; a hunk missing from the
// measured pane is skipped rather than drawn at a guessed position.
export function rulerMarks(changedHunks, entries, scrollHeight) {
  if (!(scrollHeight > 0)) return [];
  const entriesById = new Map(entries.map((entry) => [entry.id, entry]));
  return changedHunks.flatMap(({ id, op }) => {
    const entry = entriesById.get(id);
    if (!entry) return [];
    return [{
      id,
      op,
      top: clamp(entry.top / scrollHeight, 0, 1),
      height: clamp(entry.height / scrollHeight, 0, 1)
    }];
  });
}

export function viewportBand(scrollTop, clientHeight, scrollHeight) {
  if (!(scrollHeight > 0) || clientHeight >= scrollHeight) return { top: 0, height: 1 };
  return {
    top: clamp(scrollTop / scrollHeight, 0, 1),
    height: clamp(clientHeight / scrollHeight, 0, 1)
  };
}

// Hunk extents in pane content coordinates. Source mode renders many rows per
// hunk, so rows aggregate into one entry spanning the first to the last.
function measurePane(pane) {
  const paneOrigin = pane.getBoundingClientRect().top - pane.scrollTop;
  const byId = new Map();
  for (const element of pane.querySelectorAll("[data-hunk-id]")) {
    const rect = element.getBoundingClientRect();
    const top = rect.top - paneOrigin;
    const bottom = top + rect.height;
    const entry = byId.get(element.dataset.hunkId);
    if (entry) {
      entry.top = Math.min(entry.top, top);
      entry.bottom = Math.max(entry.bottom, bottom);
    } else {
      byId.set(element.dataset.hunkId, { top, bottom });
    }
  }
  return {
    scrollHeight: pane.scrollHeight,
    clientHeight: pane.clientHeight,
    entries: [...byId.entries()].map(([id, { top, bottom }]) => ({ id, top, height: Math.max(0, bottom - top) }))
  };
}

export function attachComparisonScrollUi(documentView, { syncEnabled, changedHunks, onSelectChange }) {
  const container = documentView.querySelector(".diff-panes, .source-panes");
  const panes = container ? [...container.querySelectorAll(".diff-pane, .source-pane")] : [];
  if (panes.length !== 2) return null;

  // Measurements are cached until the pane's geometry visibly changes (type
  // size, resize), so a scroll event costs no layout reads on the happy path.
  const cache = new Map();
  const measurementsFor = (pane) => {
    const cached = cache.get(pane);
    if (cached && cached.scrollHeight === pane.scrollHeight && cached.clientHeight === pane.clientHeight) return cached;
    const measured = measurePane(pane);
    cache.set(pane, measured);
    return measured;
  };

  let suppressedUntil = 0;
  let syncing = false;
  const syncFrom = (source) => {
    if (!syncEnabled() || syncing || performance.now() < suppressedUntil) return;
    const target = source === panes[0] ? panes[1] : panes[0];
    const sourceState = { scrollTop: source.scrollTop, ...measurementsFor(source) };
    const targetState = measurementsFor(target);
    const next = anchoredTargetScrollTop(sourceState, targetState) ?? proportionalTargetScrollTop(sourceState, targetState);
    if (next === null) return;
    syncing = true;
    target.scrollTop = next;
    window.requestAnimationFrame(() => {
      syncing = false;
    });
  };

  // The ruler tracks the later (right) pane; a click jumps, a mark selects.
  // Keyboard users already have the [ and ] change navigation, so the ruler
  // stays a pointer affordance and is hidden from the accessibility tree.
  const primary = panes[1];
  const ruler = document.createElement("div");
  ruler.className = "scroll-ruler";
  ruler.setAttribute("aria-hidden", "true");
  const band = document.createElement("div");
  band.className = "ruler-viewport";
  ruler.append(band);
  container.classList.add("has-ruler");
  container.append(ruler);

  let markNodes = [];
  let markedScrollHeight = 0;
  let selectedId = null;
  const applySelection = () => {
    for (const node of markNodes) node.classList.toggle("selected", node.dataset.hunkId === selectedId);
  };
  const rebuildMarks = () => {
    const measured = measurementsFor(primary);
    markedScrollHeight = measured.scrollHeight;
    for (const node of markNodes) node.remove();
    markNodes = rulerMarks(changedHunks, measured.entries, measured.scrollHeight).map((mark) => {
      const node = document.createElement("div");
      node.className = "ruler-mark";
      node.dataset.op = mark.op;
      node.dataset.hunkId = mark.id;
      node.style.top = `${(mark.top * 100).toFixed(3)}%`;
      node.style.height = `${(mark.height * 100).toFixed(3)}%`;
      ruler.append(node);
      return node;
    });
    applySelection();
  };
  const updateBand = () => {
    if (primary.scrollHeight !== markedScrollHeight) rebuildMarks();
    const geometry = viewportBand(primary.scrollTop, primary.clientHeight, primary.scrollHeight);
    band.style.top = `${(geometry.top * 100).toFixed(3)}%`;
    band.style.height = `${(geometry.height * 100).toFixed(3)}%`;
  };

  ruler.addEventListener("click", (event) => {
    const mark = event.target.closest(".ruler-mark");
    if (mark) {
      onSelectChange?.(mark.dataset.hunkId);
      return;
    }
    const rect = ruler.getBoundingClientRect();
    if (rect.height <= 0) return;
    const fraction = clamp((event.clientY - rect.top) / rect.height, 0, 1);
    primary.scrollTop = clamp(fraction * primary.scrollHeight - primary.clientHeight / 2, 0, primary.scrollHeight - primary.clientHeight);
  });

  for (const pane of panes) {
    pane.addEventListener("scroll", () => {
      syncFrom(pane);
      if (pane === primary) updateBand();
    }, { passive: true });
  }

  // Type-size changes and window resizes move every hunk; the observer dies
  // with the container when the next render replaces the document view. The
  // container box ignores font-size changes, so each pane's last hunk is
  // watched too — any reflow of the content resizes it.
  const resizeObserver = new ResizeObserver(() => {
    cache.clear();
    rebuildMarks();
    updateBand();
  });
  resizeObserver.observe(container);
  for (const pane of panes) {
    if (pane.lastElementChild) resizeObserver.observe(pane.lastElementChild);
  }

  rebuildMarks();
  updateBand();

  return {
    suppressSync(duration) {
      suppressedUntil = performance.now() + duration;
    },
    updateSelection(hunkId) {
      selectedId = hunkId ?? null;
      applySelection();
    }
  };
}
