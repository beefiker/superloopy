// Renders the benchmark page from the generated data module. Every chart is inline SVG with a table twin.
import { BENCHMARK } from "./data/benchmark.mjs";

const SIZES = BENCHMARK.sizes;
const COND = Object.fromEntries(BENCHMARK.conditions.map((c) => [c.id, c]));
const cell = (lang, size, cond) => BENCHMARK.cells.find((c) => c.lang === lang && c.size === size && c.cond === cond);
const LANG_LABEL = { en: "English", ko: "Korean" };
const fmtS = (v) => (v === null || v === undefined ? "–" : `${v.toFixed(1)} s`);
const fmtUSD = (v) => (v === null || v === undefined ? "–" : `$${v.toFixed(3)}`);
const fmtX = (a, b) => (a && b ? `${(a / b).toFixed(2)}×` : "–");
const fmtInt = (v) => (v === null || v === undefined ? "–" : Math.round(v).toLocaleString("en-US"));
const el = (tag, attrs = {}, children = []) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) { if (k === "text") node.textContent = v; else if (k === "html") node.innerHTML = v; else node.setAttribute(k, v); }
  for (const child of children) node.append(child);
  return node;
};
const SVG_NS = "http://www.w3.org/2000/svg";
const svgEl = (tag, attrs = {}, children = []) => {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) { if (k === "text") node.textContent = v; else node.setAttribute(k, String(v)); }
  for (const child of children) node.append(child);
  return node;
};
const fixtureLabel = (f) => `${LANG_LABEL[f.lang]} ${f.size} · ${f.lang === "ko" ? `${f.chars.toLocaleString("en-US")} chars` : `${f.words.toLocaleString("en-US")} words`}`;
const viewerLink = (sample, version) => `./?sample=${sample}&left=original&right=${version}&mode=rendered`;

// A horizontal bar path with a 4px rounded data end and a square baseline end.
function barPath(x, y, width, height, radius = 4) {
  const w = Math.max(width, 0.5);
  const r = Math.min(radius, w, height / 2);
  return `M${x},${y} h${w - r} a${r},${r} 0 0 1 ${r},${r} v${height - 2 * r} a${r},${r} 0 0 1 -${r},${r} h-${w - r} z`;
}

// rows: [{ label, bars: [{ value, min, max, cls, valueText, title, hollow }] }]. One shared linear scale per chart.
function barChart({ rows, unit, maxValue, labelWidth = 150, plotW = 420 }) {
  const barH = 12, gap = 2, rowPad = 8, top = 6;
  // Gutter for value labels sized from the longest label (11px sans, about 6.4px per glyph) so nothing clips.
  const valueSpace = Math.max(48, ...rows.flatMap((r) => r.bars.map((b) => String(b.valueText).length * 6.4 + 12)));
  const rowH = (row) => row.bars.length * barH + (row.bars.length - 1) * gap + rowPad;
  const height = top + rows.reduce((t, r) => t + rowH(r), 0) + 16;
  const width = labelWidth + plotW + valueSpace;
  const scale = (v) => (maxValue > 0 ? (v / maxValue) * plotW : 0);
  const svg = svgEl("svg", { class: "chart", viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": `Bar chart; values are repeated in the table below.` });
  const ticks = niceTicks(maxValue, 4);
  for (const t of ticks) {
    const x = labelWidth + scale(t);
    svg.append(svgEl("line", { class: "grid-line", x1: x, x2: x, y1: top, y2: height - 14 }));
    svg.append(svgEl("text", { class: "axis-label", x, y: height - 2, "text-anchor": "middle", text: `${t}${unit}` }));
  }
  svg.append(svgEl("line", { class: "baseline-rule", x1: labelWidth, x2: labelWidth, y1: top, y2: height - 14 }));
  let y = top;
  for (const row of rows) {
    const rh = rowH(row);
    svg.append(svgEl("text", { class: "row-label", x: labelWidth - 8, y: y + rh / 2 - rowPad / 2 + 4, "text-anchor": "end", text: row.label }));
    let by = y;
    for (const bar of row.bars) {
      const g = svgEl("g");
      g.append(svgEl("title", { text: bar.title }));
      if (bar.hollow) {
        g.append(svgEl("rect", { class: "bar-hollow", x: labelWidth + 0.75, y: by + 0.75, width: 60, height: barH - 1.5, rx: 3 }));
      } else {
        g.append(svgEl("path", { class: bar.cls, d: barPath(labelWidth, by, scale(bar.value), barH) }));
        if (bar.min !== undefined && bar.max !== undefined && bar.max > bar.min) {
          const cy = by + barH / 2;
          g.append(svgEl("line", { class: "whisker", x1: labelWidth + scale(bar.min), x2: labelWidth + scale(bar.max), y1: cy, y2: cy }));
          g.append(svgEl("line", { class: "whisker", x1: labelWidth + scale(bar.min), x2: labelWidth + scale(bar.min), y1: cy - 3, y2: cy + 3 }));
          g.append(svgEl("line", { class: "whisker", x1: labelWidth + scale(bar.max), x2: labelWidth + scale(bar.max), y1: cy - 3, y2: cy + 3 }));
        }
      }
      const labelX = labelWidth + (bar.hollow ? 66 : Math.max(scale(bar.value), bar.max !== undefined ? scale(bar.max) : 0)) + 6;
      g.append(svgEl("text", { class: "value-label", x: labelX, y: by + barH - 2, text: bar.valueText }));
      svg.append(g);
      by += barH + gap;
    }
    y += rh;
  }
  return svg;
}

function niceTicks(max, count) {
  if (!(max > 0)) return [0];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? mag;
  const ticks = [];
  for (let t = 0; t <= max + 1e-9; t += step) ticks.push(Number(t.toFixed(3)));
  return ticks;
}

function legend(items) {
  return el("ul", { class: "legend" }, items.map(([cls, label]) => el("li", {}, [el("span", { class: `swatch ${cls}` }), el("span", { text: label })])));
}

function table(headers, rows) {
  const thead = el("thead", {}, [el("tr", {}, headers.map((h) => el("th", { class: h.num ? "num" : "", text: h.label })))]);
  const tbody = el("tbody", {}, rows.map((r) => el("tr", { class: r.cls ?? "" }, r.cells.map((c) => {
    const td = el("td", { class: `${c.num ? "num " : ""}${c.muted ? "muted" : ""}` });
    if (c.link) td.append(el("a", { href: c.link, text: c.text })); else td.textContent = c.text;
    return td;
  }))));
  return el("div", { class: "data-table-wrap" }, [el("table", { class: "data-table" }, [thead, tbody])]);
}

// --- Summary: say-it-straight (SKILL only) against no skill ---------------------------------
function renderSummary() {
  const pairs = [];
  for (const lang of ["en", "ko"]) for (const size of SIZES) {
    const b = cell(lang, size, "baseline"), s = cell(lang, size, "sis-skill");
    if (b?.api_med && s?.api_med) pairs.push({ lang, size, b, s, addS: s.api_med - b.api_med, addUSD: s.cost_med - b.cost_med, xS: s.api_med / b.api_med, xUSD: s.cost_med / b.cost_med });
  }
  const range = (xs, f) => `${f(Math.min(...xs))} to ${f(Math.max(...xs))}`;
  const short = pairs.filter((p) => p.size === "short"), large = pairs.filter((p) => p.size === "big" || p.size === "huge");
  document.querySelector("#hero-tiles").replaceChildren(
    tile("Added seconds per call", range(pairs.map((p) => p.addS), (v) => v.toFixed(1)), "median of three cached runs, eight texts"),
    tile("Added cost per call", range(pairs.map((p) => p.addUSD), (v) => `$${v.toFixed(3)}`), `list price, ${BENCHMARK.model}`),
    tile("Relative cost, short texts", range(short.map((p) => p.xUSD), (v) => `${v.toFixed(2)}×`), "where a fixed surcharge weighs most"),
    tile("Relative cost, big and huge", range(large.map((p) => p.xUSD), (v) => `${v.toFixed(2)}×`), "where the rewrite itself dominates")
  );
  document.querySelector("#lede").textContent = `Measured ${BENCHMARK.generated} on headless Claude Code, ${BENCHMARK.model}, effort ${BENCHMARK.effort}, 208 runs across four sizes of Korean and English drafts. say-it-straight adds a near-constant surcharge of extra reasoning per call; every number below is a real API measurement with its spread.`;
  document.querySelector("#summary-note").textContent = "The surcharge is thinking tokens (300 to 2,100 per reply against 0 to 640 with no skill) plus a 1,571-token skill prefix. Loading the three reference files (file-backed) thinks less on short texts and more on long ones; its rows are in the per-example cards below.";
  renderPairChart("#latency-chart", "Latency by size", "Median API seconds; whiskers are min and max of three runs", pairs, (c) => c.api_med, (c) => [c.api_min, c.api_max], " s", fmtS);
  renderPairChart("#cost-chart", "Cost by size", "Median USD per call over cached runs", pairs, (c) => c.cost_med, () => [], "", fmtUSD);
}

function tile(label, value, detail) {
  return el("div", { class: "tile" }, [el("p", { class: "tile-label", text: label }), el("p", { class: "tile-value", text: value }), el("p", { class: "tile-detail", text: detail })]);
}

function renderPairChart(selector, title, sub, pairs, value, range, unit, fmt) {
  const fig = document.querySelector(selector);
  const maxValue = Math.max(...pairs.flatMap((p) => [value(p.b), value(p.s), ...(range(p.b)[1] ? [range(p.b)[1], range(p.s)[1]] : [])]));
  const rows = pairs.map((p) => ({
    label: `${LANG_LABEL[p.lang]} ${p.size}`,
    bars: [
      { value: value(p.b), min: range(p.b)[0], max: range(p.b)[1], cls: "bar-baseline", valueText: fmt(value(p.b)), title: `No skill, ${p.lang} ${p.size}: ${fmt(value(p.b))}` },
      { value: value(p.s), min: range(p.s)[0], max: range(p.s)[1], cls: "bar-subject", valueText: `${fmt(value(p.s))} · ${(value(p.s) / value(p.b)).toFixed(2)}×`, title: `say-it-straight, ${p.lang} ${p.size}: ${fmt(value(p.s))}` }
    ]
  }));
  fig.replaceChildren(
    el("figcaption", { text: title }), el("p", { class: "chart-sub", text: sub }),
    legend([["swatch-baseline", "No skill"], ["swatch-subject", "say-it-straight (SKILL only)"]]),
    barChart({ rows, unit, maxValue: maxValue * 1.02, labelWidth: 110, plotW: 360 }),
    el("details", {}, [el("summary", { text: "Table view" }), table(
      [{ label: "Text" }, { label: "No skill", num: true }, { label: "say-it-straight", num: true }, { label: "Ratio", num: true }],
      pairs.map((p) => ({ cells: [{ text: `${LANG_LABEL[p.lang]} ${p.size}` }, { text: fmt(value(p.b)), num: true }, { text: fmt(value(p.s)), num: true }, { text: fmtX(value(p.s), value(p.b)), num: true }] }))
    )])
  );
}

// --- Per-example cards -------------------------------------------------------------------
function renderExamples() {
  const grid = document.querySelector("#example-cards");
  const order = ["ko", "en"].flatMap((lang) => SIZES.map((size) => `${lang}-${size}`));
  for (const id of order) {
    const f = BENCHMARK.fixtures[id];
    if (!f) continue;
    const cells = BENCHMARK.conditions.map((c) => cell(f.lang, f.size, c.id)).filter(Boolean);
    const maxValue = Math.max(...cells.flatMap((c) => [c.api_max ?? 0, c.api_med ?? 0]));
    const rows = cells.map((c) => {
      const cond = COND[c.cond];
      const cls = cond.group === "subject" ? "bar-subject" : cond.group === "baseline" ? "bar-baseline" : "bar-other";
      const hollow = !c.delivered;
      return { label: cond.short ?? cond.label, bars: [{ value: c.api_med ?? 0, min: c.api_min, max: c.api_max, cls, hollow, valueText: hollow ? `no rewrite delivered (${c.undelivered} of ${c.undelivered + c.delivered})` : `${fmtS(c.api_med)}${c.undelivered ? ` · ${c.undelivered} undelivered` : ""}`, title: hollow ? `${cond.label}: returned a status block, no rewrite` : `${cond.label}: ${fmtS(c.api_med)} (${fmtS(c.api_min)}–${fmtS(c.api_max)}), ${fmtUSD(c.cost_med)}` }] };
    });
    const tells = f.tells ? `${f.tells.ids} rule ids, ${f.tells.hits} hits (${(f.tells.hits / f.chars * 1000).toFixed(1)} per 1,000 chars)` : "English: no Korean tell audit";
    const frames = f.frames ? `chatbot frame: ${f.frames.opener ? "opener" : "no opener"}${f.frames.closer ? ", closer" : ""}` : "";
    const card = el("article", { class: "example-card" }, [
      el("h3", { text: fixtureLabel(f) }),
      el("p", { class: "example-meta", text: [tells, frames].filter(Boolean).join(" · ") }),
      legend([["swatch-baseline", "No skill"], ["swatch-subject", "say-it-straight"], ["", "other skills"], ["swatch-hollow", "no rewrite delivered"]]),
      barChart({ rows, unit: " s", maxValue: maxValue * 1.02, labelWidth: 150, plotW: 300 }),
      el("details", {}, [el("summary", { text: "Table view and viewer links" }), table(
        [{ label: "Condition" }, { label: "API s (min–max)", num: true }, { label: "USD", num: true }, { label: "Thinking tok", num: true }, { label: "Delivered", num: true }, { label: "Facts kept" }, { label: "Residual ids" }, { label: "Frame kept" }, { label: "Compare" }],
        cells.map((c) => {
          const cond = COND[c.cond];
          const delivered = c.runs.filter((r) => r.delivered);
          const facts = delivered.length ? `${Math.min(...delivered.map((r) => r.factsKept))}–${Math.max(...delivered.map((r) => r.factsKept))} of ${delivered[0].factsTotal}` : "–";
          const residual = f.lang === "ko" ? summarizeResidual(delivered) : "n/a";
          const frameKept = f.lang === "ko" && delivered.length ? `${delivered.filter((r) => r.openerKept).length}/${delivered.filter((r) => r.closerKept).length} of ${delivered.length}` : "n/a";
          const link = c.viewerVersion && c.delivered ? viewerLink(f.sample, c.viewerVersion) : null;
          return { cls: cond.group === "subject" ? "is-subject" : cond.group === "baseline" ? "is-baseline" : "", cells: [
            { text: cond.label },
            { text: c.delivered ? `${fmtS(c.api_med)} (${(c.api_min ?? 0).toFixed(0)}–${(c.api_max ?? 0).toFixed(0)})` : "–", num: true },
            { text: c.delivered ? fmtUSD(c.cost_med) : "–", num: true },
            { text: c.delivered ? `${fmtInt(c.think)} (${fmtInt(c.think_min)}–${fmtInt(c.think_max)})` : "–", num: true },
            { text: `${c.delivered} of ${c.delivered + c.undelivered}`, num: true },
            { text: facts }, { text: residual, muted: residual === "none" }, { text: frameKept },
            link ? { text: `original → ${c.viewerVersion.toUpperCase()} (run ${c.viewerRun})`, link } : { text: c.viewerVersion ? "no delivered run" : "not in viewer", muted: true }
          ] };
        })
      )])
    ]);
    grid.append(card);
  }
}

function summarizeResidual(runs) {
  const counts = {};
  for (const r of runs) if (r.residual && r.residual !== "none") for (const t of r.residual.split(" ")) { const id = t.split(":")[0]; counts[id] = (counts[id] ?? 0) + 1; }
  const parts = Object.entries(counts).map(([id, n]) => `${id}×${n}`);
  return parts.length ? parts.join(" ") : (runs.length ? "none" : "–");
}

// --- Context tokens ----------------------------------------------------------------------
const BUNDLES = [
  { label: "say-it-straight (SKILL only)", cls: "bar-subject", keys: ["ours-sis-skill"] },
  { label: "say-it-straight (file-backed)", cls: "bar-subject", keys: ["ours-sis-skill", "ours-sis-quick-rules", "ours-sis-preservation", "ours-sis-rubric"] },
  { label: "i-have-adhd (ours)", cls: "bar-other", keys: ["ours-adhd-skill"] },
  { label: "i-have-adhd (ayghri)", cls: "bar-other", keys: ["up-adhd-skill"] },
  { label: "humanize-korean (ours)", cls: "bar-other", keys: ["ours-hk-skill", "ours-hk-quick-rules", "ours-hk-rubric"] },
  { label: "im-not-ai (Codex single call)", cls: "bar-other", keys: ["up-imnotai-codex-skill", "up-imnotai-quick-rules"] },
  { label: "im-not-ai (Claude light, 2 contexts)", cls: "bar-other", keys: ["up-imnotai-skill", "up-imnotai-agent-monolith", "up-imnotai-quick-rules"] },
  { label: "im-not-ai (Claude heavy, 3+ contexts)", cls: "bar-other", keys: ["up-imnotai-skill", "up-imnotai-agent-monolith", "up-imnotai-quick-rules", "up-imnotai-agent-diagnostician", "up-imnotai-diagnosis-rules", "up-imnotai-agent-finalizer"] }
];
function renderContext() {
  const tokens = Object.fromEntries(BENCHMARK.contextTokens.map((t) => [t.key, t.tokens]));
  const rows = BUNDLES.map((b) => ({ label: b.label, tokens: b.keys.reduce((t, k) => t + (tokens[k] ?? 0), 0), cls: b.cls }));
  const max = Math.max(...rows.map((r) => r.tokens));
  const fig = document.querySelector("#context-chart");
  fig.replaceChildren(
    el("figcaption", { text: "Tokens loaded per invocation" }),
    el("p", { class: "chart-sub", text: "Claude tokenizer; a fresh load bills at $10 per million (one-hour cache write), a cached load at $0.50 per million." }),
    legend([["swatch-subject", "say-it-straight"], ["", "other skills"]]),
    barChart({ rows: rows.map((r) => ({ label: r.label, bars: [{ value: r.tokens, cls: r.cls, valueText: `${fmtInt(r.tokens)} tok · $${(r.tokens * 10 / 1e6).toFixed(3)} first load`, title: `${r.label}: ${fmtInt(r.tokens)} tokens` }] })), unit: "", maxValue: max * 1.02, labelWidth: 230 }),
    el("details", {}, [el("summary", { text: "Table view" }), table(
      [{ label: "Skill as loaded" }, { label: "Tokens", num: true }, { label: "First load", num: true }, { label: "Cached load", num: true }],
      rows.map((r) => ({ cls: r.cls === "bar-subject" ? "is-subject" : "", cells: [{ text: r.label }, { text: fmtInt(r.tokens), num: true }, { text: `$${(r.tokens * 10 / 1e6).toFixed(3)}`, num: true }, { text: `$${(r.tokens * 0.5 / 1e6).toFixed(4)}`, num: true }] }))
    )])
  );
}

// --- Effort probe ------------------------------------------------------------------------
function renderEffort() {
  const probe = BENCHMARK.effortProbe?.results ?? {};
  const levels = ["low", "high", "xhigh"].filter((l) => probe[l]);
  const max = Math.max(...levels.map((l) => probe[l].api_s));
  const fig = document.querySelector("#effort-chart");
  fig.replaceChildren(
    el("figcaption", { text: "API seconds by effort, no skill, Korean mid draft" }),
    el("p", { class: "chart-sub", text: "One run per level. Thinking tokens in the label." }),
    barChart({ rows: levels.map((l) => ({ label: `--effort ${l}`, bars: [{ value: probe[l].api_s, cls: l === "high" ? "bar-baseline" : "bar-other", valueText: `${probe[l].api_s.toFixed(0)} s · ${fmtInt(probe[l].thinking)} thinking tok`, title: `${l}: ${probe[l].api_s.toFixed(1)} s, ${probe[l].thinking} thinking tokens` }] })), unit: " s", maxValue: max * 1.02, labelWidth: 110 }),
    el("details", {}, [el("summary", { text: "Table view" }), table(
      [{ label: "Effort" }, { label: "Thinking tok", num: true }, { label: "Output tok", num: true }, { label: "API s", num: true }],
      levels.map((l) => ({ cells: [{ text: l }, { text: fmtInt(probe[l].thinking), num: true }, { text: fmtInt(probe[l].output), num: true }, { text: probe[l].api_s.toFixed(1), num: true }] }))
    )])
  );
}

function renderMethod() {
  const items = [
    `Harness: headless Claude Code 2.1.268, ${BENCHMARK.model}, --effort high pinned, tools, MCP servers, hooks, and settings disabled; the skill body is the system prompt and the draft is the user prompt.`,
    "Runs: one warm-up per cell writes the prompt cache, then three measured runs. Latency medians use all delivered runs; cost medians use cached runs only.",
    "Delivered: a reply counts as a rewrite when it keeps at least half of the fixture's fact tokens and contains no tool-call markup. im-not-ai's orchestrator expects a Python shim and subagents and returned a status block in 10 of 24 Korean runs; those cells show hollow bars.",
    "Fixtures: written by the same model from one fact list per language, asked to answer the way ChatGPT would at four target lengths; sizes are reported as measured.",
    "Quality: fact retention, the humanize-korean audit for residual rule ids, the say-it-straight audit for numbers and structure, and a first-line and last-line frame check. Viewer versions A, B, and C are the median-latency delivered run of humanize-korean, i-have-adhd, and say-it-straight, shown unedited.",
    "Limits: n=3 per cell, one model, one day, list pricing; im-not-ai's Claude path is a single-context emulation and its numbers are lower bounds; the third pass of 46 cells ran on a second account after a spend limit, with a cold cache."
  ];
  document.querySelector("#method-list").replaceChildren(...items.map((t) => el("li", { text: t })));
}

renderSummary();
renderExamples();
renderContext();
renderEffort();
renderMethod();
