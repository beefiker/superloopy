// Hero dot field: a stationary lattice of monospace halftone glyphs (space, ·, •, ●).
// The night-loop artwork is sampled once per layout into palette-quantized cells; a
// Silkscreen "LOOPY" wordmark drifts through the lattice in alternating lanes and lights
// cells it crosses. Dots never move, only their tone changes. Adapted from the Yesloom
// garden field (same author): one canvas, a 24 fps cap, and no work while hidden.
const GLYPHS = [" ", "·", "•", "●"];
const COVERAGE = [0, 0.3, 0.6, 1];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const PALETTE = [
  "#121628", "#1a2040", "#232b52", "#2f3866", "#3c4579", "#535d93",
  "#7a5e86", "#a3647a", "#c9705f", "#e2804f", "#f0994e", "#f6b464",
  "#f9cd86", "#fbe2b0", "#fff3dc", "#8fe3c0", "#5ec9a0", "#3a8f78",
];
const WORD = "LOOPY ";
const FPS = 24;

// `frame` places the artwork in cell units; the default covers the canvas.
const cover = ({ columns, rows, artWidth, artHeight }) => {
  const scale = Math.max(columns / artWidth, rows / artHeight);
  return { x: (columns - artWidth * scale) / 2, y: (rows - artHeight * scale) / 2, w: artWidth * scale, h: artHeight * scale };
};

export function startDotField(canvas, { art, frame = cover, word = WORD } = {}) {
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) return () => {};
  const styles = getComputedStyle(canvas);
  const ground = styles.getPropertyValue("--field-ground").trim() || "#0b0d18";
  const latticeColor = styles.getPropertyValue("--field-lattice").trim() || "#1b2036";
  const wordColor = styles.getPropertyValue("--field-word").trim() || "#9aa3d6";
  const paletteRgb = PALETTE.map((hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)));
  const motion = matchMedia("(prefers-reduced-motion: reduce)");

  const base = document.createElement("canvas");
  const baseContext = base.getContext("2d", { alpha: false });
  const sampler = document.createElement("canvas");
  const samplerContext = sampler.getContext("2d", { willReadFrequently: true });
  const mask = document.createElement("canvas");
  const maskContext = mask.getContext("2d", { willReadFrequently: true });
  const tiles = new Map();

  let width = 0, height = 0, ratio = 1, step = 7, columns = 0, rows = 0;
  let protection = new Float32Array(0), grain = new Float32Array(0);
  let maskAlpha = new Uint8ClampedArray(0), maskWidth = 0, laneHeight = 0, period = 1;
  let elapsed = 0, lastTick = null, lastDraw = 0, rafId = 0, visible = false, paused = false, layoutKey = "";
  const buckets = [[], [], [], []];

  function tile(tone, color) {
    const key = `${tone}${color}`;
    let cached = tiles.get(key);
    if (!cached) {
      cached = document.createElement("canvas");
      const size = Math.max(1, Math.round(step * ratio));
      cached.width = cached.height = size;
      const ink = cached.getContext("2d");
      ink.font = `${size / 0.6}px "IBM Plex Mono", ui-monospace, Menlo, monospace`;
      ink.textAlign = "center";
      ink.textBaseline = "middle";
      ink.fillStyle = color;
      ink.fillText(GLYPHS[tone], size / 2, size / 2);
      tiles.set(key, cached);
    }
    return cached;
  }

  function nearest(r, g, b) {
    let best = 0, score = Infinity;
    for (let i = 0; i < paletteRgb.length; i++) {
      const [pr, pg, pb] = paletteRgb[i];
      const d = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
      if (d < score) { score = d; best = i; }
    }
    return PALETTE[best];
  }

  function layout() {
    const box = canvas.getBoundingClientRect();
    const nextRatio = Math.min(devicePixelRatio || 1, 2);
    const key = `${Math.round(box.width)}x${Math.round(box.height)}@${nextRatio}`;
    if (key === layoutKey || box.width < 1 || box.height < 1) return;
    layoutKey = key;
    width = Math.round(box.width);
    height = Math.round(box.height);
    ratio = nextRatio;
    step = width < 600 ? 5 : 7;
    columns = Math.ceil(width / step);
    rows = Math.ceil(height / step);
    tiles.clear();
    for (const target of [canvas, base]) { target.width = Math.round(width * ratio); target.height = Math.round(height * ratio); }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    baseContext.setTransform(ratio, 0, 0, ratio, 0, 0);

    // Sample the artwork once: one pixel per cell, cover-fit around a focal point.
    sampler.width = columns;
    sampler.height = rows;
    samplerContext.fillStyle = ground;
    samplerContext.fillRect(0, 0, columns, rows);
    const placed = frame({ columns, rows, width, height, artWidth: art.naturalWidth, artHeight: art.naturalHeight });
    samplerContext.drawImage(art, placed.x, placed.y, placed.w, placed.h);
    const pixels = samplerContext.getImageData(0, 0, columns, rows).data;

    protection = new Float32Array(columns * rows);
    grain = new Float32Array(columns * rows);
    baseContext.fillStyle = ground;
    baseContext.fillRect(0, 0, width, height);
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const cell = row * columns + column;
        const seed = Math.imul(column + 1, 374761393) ^ Math.imul(row + 1, 668265263);
        const noise = ((seed ^ (seed >>> 13)) >>> 0) / 4294967296;
        grain[cell] = (BAYER[(row & 3) * 4 + (column & 3)] / 16 - 0.47) * 0.4 + (noise - 0.5) * 0.4;
        const index = cell * 4;
        const r = pixels[index], g = pixels[index + 1], b = pixels[index + 2];
        const light = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        const peak = Math.max(r, g, b) / 255;
        protection[cell] = Math.min(1, Math.max(0, (light - 0.18) * 2.4));
        const tone = Math.max(0, Math.min(3, Math.round(light * 3.4 + grain[cell])));
        const x = (column + 0.5) * step, y = (row + 0.5) * step;
        if (tone === 0) {
          baseContext.drawImage(tile(1, latticeColor), x - step / 2, y - step / 2, step, step);
          continue;
        }
        // Brighten dim cells toward their hue before quantizing, so a small glyph
        // still reads as amber or mint rather than as dark ground.
        const gain = (0.35 + 0.65 * Math.min(1, (light + 0.06) / COVERAGE[tone])) / Math.max(peak, 0.001);
        const color = nearest(Math.min(255, r * gain), Math.min(255, g * gain), Math.min(255, b * gain));
        baseContext.drawImage(tile(tone, color), x - step / 2, y - step / 2, step, step);
      }
    }

    // Word mask: one lane of repeated pixel lettering, sampled with wrap-around.
    laneHeight = Math.max(60, Math.round(Math.min(height / 3, width * 0.16)));
    const fontSize = Math.round(laneHeight * 0.92);
    maskContext.font = `${fontSize}px Silkscreen, monospace`;
    period = Math.ceil(maskContext.measureText(word).width);
    mask.width = maskWidth = period + 2;
    mask.height = laneHeight + 2;
    maskContext.font = `${fontSize}px Silkscreen, monospace`;
    maskContext.textBaseline = "middle";
    maskContext.fillStyle = "#000";
    maskContext.fillText(word, 0, laneHeight / 2 + 1);
    maskContext.fillText(word, period, laneHeight / 2 + 1);
    maskAlpha = maskContext.getImageData(0, 0, mask.width, mask.height).data;
    draw(elapsed / 1000);
  }

  function sample(x, y) {
    if (y < 0 || y >= laneHeight) return 0;
    const left = Math.floor(x), top = Math.floor(y);
    const dx = x - left, dy = y - top;
    const index = (top * maskWidth + left) * 4 + 3;
    const a = maskAlpha[index], b = maskAlpha[index + 4];
    const c = maskAlpha[index + maskWidth * 4], d = maskAlpha[index + maskWidth * 4 + 4];
    return ((a + (b - a) * dx) * (1 - dy) + (c + (d - c) * dx) * dy) / 255;
  }

  function draw(seconds) {
    context.drawImage(base, 0, 0, width, height);
    for (const bucket of buckets) bucket.length = 0;
    for (let row = 0; row < rows; row++) {
      const y = (row + 0.5) * step;
      const lane = Math.floor(y / laneHeight);
      const direction = lane % 2 ? -1 : 1;
      const shift = seconds * (34 + (lane % 3) * 9) * direction + lane * period * 0.37;
      const localY = y - lane * laneHeight;
      for (let column = 0; column < columns; column++) {
        const cell = row * columns + column;
        const x = (column + 0.5) * step;
        const level = sample(((x - shift) % period + period) % period, localY) * (1 - protection[cell]);
        if (level < 0.08) continue;
        const tone = Math.max(0, Math.min(3, Math.round(level * 2.3 + grain[cell])));
        if (tone) buckets[tone].push(x, y);
      }
    }
    context.globalAlpha = 0.24;
    for (let tone = 1; tone < 4; tone++) {
      const glyph = tile(tone, wordColor), points = buckets[tone];
      for (let i = 0; i < points.length; i += 2) context.drawImage(glyph, points[i] - step / 2, points[i + 1] - step / 2, step, step);
    }
    context.globalAlpha = 1;
  }

  function tick(now) {
    rafId = 0;
    if (!running()) return;
    if (lastTick !== null) elapsed += Math.min(now - lastTick, 100);
    lastTick = now;
    if (now - lastDraw >= 1000 / FPS) { draw(elapsed / 1000); lastDraw = now; }
    rafId = requestAnimationFrame(tick);
  }

  const running = () => visible && !paused && !motion.matches && !document.hidden;
  function sync() {
    canvas.dataset.running = String(running());
    if (running() && !rafId) { lastTick = null; rafId = requestAnimationFrame(tick); }
    if (!running() && rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  }

  layout();
  canvas.dataset.ready = "true";
  const resizeObserver = new ResizeObserver(() => requestAnimationFrame(layout));
  resizeObserver.observe(canvas);
  const viewObserver = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
  viewObserver.observe(canvas);
  document.addEventListener("visibilitychange", sync);
  motion.addEventListener?.("change", sync);

  return (nextPaused) => { paused = nextPaused; sync(); };
}
