// Page behavior: install tabs, copy buttons, the hero dot field with its pause control,
// and one-time reveals. Everything works without JS except the canvas and copying.
import { startDotField } from "./dot-field.js";

const motionAllowed = () => !matchMedia("(prefers-reduced-motion: reduce)").matches;

// Install tabs (WAI-ARIA tabs pattern with arrow-key roving focus).
for (const block of document.querySelectorAll("[data-install]")) {
  const tabs = [...block.querySelectorAll('[role="tab"]')];
  const select = (tab) => {
    for (const other of tabs) {
      const active = other === tab;
      other.setAttribute("aria-selected", String(active));
      other.tabIndex = active ? 0 : -1;
      block.querySelector(`#${other.getAttribute("aria-controls")}`).hidden = !active;
    }
  };
  for (const tab of tabs) {
    tab.addEventListener("click", () => select(tab));
    tab.addEventListener("keydown", (event) => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
      if (!step) return;
      const next = tabs[(tabs.indexOf(tab) + step + tabs.length) % tabs.length];
      select(next);
      next.focus();
    });
  }
}

// The install copy button copies whichever tab panel is visible.
for (const button of document.querySelectorAll("[data-copy-active]")) {
  let timer = 0;
  button.addEventListener("click", async () => {
    const panel = button.closest("[data-install]").querySelector('[role="tabpanel"]:not([hidden])');
    try {
      await navigator.clipboard.writeText(panel.dataset.lines);
      button.textContent = button.dataset.done;
      button.classList.add("is-done");
      clearTimeout(timer);
      timer = setTimeout(() => {
        button.textContent = button.dataset.label;
        button.classList.remove("is-done");
      }, 1600);
    } catch {}
  });
}

for (const link of document.querySelectorAll("[data-to-install]")) {
  link.addEventListener("click", (event) => {
    const target = document.querySelector("[data-install] [role='tab'][aria-selected='true']");
    if (!target) return;
    event.preventDefault();
    target.closest("[data-install]").scrollIntoView({ behavior: motionAllowed() ? "smooth" : "auto", block: "center" });
    target.focus({ preventScroll: true });
  });
}

// One-time reveals; content is visible by default and only hidden once JS opts in.
const reveals = document.querySelectorAll("[data-reveal]");
if (document.documentElement.classList.contains("motion") && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-in");
      observer.unobserve(entry.target);
    }
  }, { rootMargin: "0px 0px -8% 0px" });
  let order = 0;
  for (const element of reveals) {
    element.style.setProperty("--order", String(order++ % 6));
    observer.observe(element);
  }
} else {
  for (const element of reveals) element.classList.add("is-in");
}

// Hero field: start after the artwork and glyph fonts are ready so the first frame is complete.
const canvas = document.querySelector("[data-field]");
const pause = document.querySelector("[data-pause]");
if (canvas) {
  const art = new Image();
  art.decoding = "async";
  art.src = "/loop-night.webp";
  Promise.all([
    art.decode(),
    document.fonts.load('16px "Silkscreen"'),
    document.fonts.load('16px "IBM Plex Mono"'),
  ]).then(() => {
    // The loop spans x 0.39-0.98 and y 0.16-0.62 of the artwork. Wide screens keep it
    // right of the 620px text column; phones show it above the text, near full width.
    const frame = ({ columns, rows, width, artWidth, artHeight }) => {
      if (width < 640) {
        const w = columns * 1.55, h = (w * artHeight) / artWidth;
        return { x: columns / 2 - w * 0.685, y: 2, w, h };
      }
      const h = rows * 0.82, w = (h * artWidth) / artHeight;
      const x = Math.min(columns * 0.5 - w * 0.39, columns * 0.995 - w * 0.98);
      return { x, y: rows * 0.04, w, h };
    };
    const setPaused = startDotField(canvas, { art, frame });
    canvas.classList.add("is-ready");
    if (!pause) return;
    if (!motionAllowed()) { pause.hidden = true; return; }
    pause.addEventListener("click", () => {
      const paused = pause.getAttribute("aria-pressed") !== "true";
      pause.setAttribute("aria-pressed", String(paused));
      pause.textContent = paused ? pause.dataset.playLabel : pause.dataset.pauseLabel;
      setPaused(paused);
    });
  }).catch(() => {});
}
