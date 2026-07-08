// Superloopy — landing source-port interactions.
// Lenis smooth scroll + GSAP (ScrollTrigger, SplitText, CustomEase), mirroring
// the source site's motion: masked line reveals, per-letter button rolls,
// header hide/theme, sticky card stacking, parallax tilt, stacked carousel,
// steps progress rail, FAQ accordion, install tabs, preloader.

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { CustomEase } from "gsap/CustomEase";
import Lenis from "lenis";
import { translate, refreshRoll, buildChars, splitStore } from "./i18n.js";
import "./orbit-embed.js";

gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase);

// Signature easing used across the source site.
const EASE = CustomEase.create("superloopy", "0.77,0,0.18,1");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------------------------------------------------------------- Lenis */

let lenis = null;
if (!reducedMotion) {
  lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}
window.__lenis = lenis;

function scrollTo(target) {
  // force: the menu overlay stops Lenis while open; without it, clicking a
  // menu link would fire scrollTo into a stopped instance and be swallowed.
  if (lenis) {
    lenis.start();
    lenis.scrollTo(target, {
      duration: 1.4,
      easing: (t) => 1 - Math.pow(1 - t, 4),
      force: true,
    });
  } else {
    document.querySelector(target)?.scrollIntoView({ behavior: "smooth" });
  }
}

document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const href = a.getAttribute("href");
    if (href.length > 1 && document.querySelector(href)) {
      e.preventDefault();
      scrollTo(href);
    }
  });
});

/* ------------------------------------------------------------ Preloader */

const preloader = document.querySelector("[data-preloader]");
const preloaderCount = document.querySelector("[data-preloader-count]");
const revealQueue = [];
let preloaderDone = !preloader;

function flushReveals() {
  revealQueue.forEach((fn) => fn());
  revealQueue.length = 0;
}

function finishPreloader() {
  gsap
    .timeline()
    .to(preloader, {
      clipPath: "inset(0 0 100% 0)",
      duration: 0.9,
      ease: EASE,
      onComplete: () => {
        preloader.classList.add("is-done");
        preloader.style.display = "none";
      },
    })
    .add(() => {
      preloaderDone = true;
      flushReveals();
    }, "-=0.35");
}

if (preloader && !reducedMotion) {
  // Count to 90 over ~2.4s, hold until fonts are actually ready, then land on
  // 100 and wipe — the pause near the end makes the load feel deliberate.
  const counter = { value: 0 };
  const fontsReady = document.fonts.ready.catch(() => {});
  gsap.to(counter, {
    value: 90,
    duration: 2.4,
    ease: "power2.inOut",
    onUpdate: () => {
      preloaderCount.textContent = String(Math.round(counter.value));
    },
    onComplete: async () => {
      await fontsReady;
      gsap.to(counter, {
        value: 100,
        duration: 0.5,
        ease: "power1.out",
        onUpdate: () => {
          preloaderCount.textContent = String(Math.round(counter.value));
        },
        onComplete: finishPreloader,
      });
    },
  });
} else if (preloader) {
  preloader.style.display = "none";
  preloaderDone = true;
  requestAnimationFrame(flushReveals);
}

/* --------------------------------------------------- Header hide + theme */

const header = document.querySelector("[data-header]");
let lastScroll = 0;

if (header && lenis) {
  lenis.on("scroll", ({ scroll }) => {
    if (scroll > 120 && scroll > lastScroll) header.classList.add("hide-header");
    else header.classList.remove("hide-header");
    lastScroll = scroll;
  });
}

document.querySelectorAll("[data-header-theme]").forEach((section) => {
  ScrollTrigger.create({
    trigger: section,
    start: "top 60px",
    end: "bottom 60px",
    onToggle: (self) => {
      if (self.isActive) header.dataset.theme = section.dataset.headerTheme;
    },
  });
});

/* ----------------------------------------------------------------- Menu */

const menu = document.querySelector("[data-menu]");
const menuToggle = document.querySelector("[data-menu-toggle]");

function setMenu(open) {
  menu.classList.toggle("is-open", open);
  header.classList.toggle("menu--active", open);
  menu.setAttribute("aria-hidden", String(!open));
  menuToggle.setAttribute("aria-expanded", String(open));
  menu.querySelectorAll(".stagger-item").forEach((item, i) => {
    item.style.transitionDelay = open ? `${0.15 + i * 0.08}s` : "0s";
  });
  if (lenis) open ? lenis.stop() : lenis.start();
}

menuToggle?.addEventListener("click", () => setMenu(!menu.classList.contains("is-open")));
menu?.querySelectorAll("[data-menu-link]").forEach((link) => {
  link.addEventListener("click", () => setMenu(false));
});


/* ------------------------------------------------------ Split text reveal */

document.fonts.ready.then(() => {
  document.querySelectorAll("[data-split]").forEach((el) => {
    if (reducedMotion) {
      el.classList.add("is-revealed");
      return;
    }
    // Elements with inline SVG glyphs (title--has-whirl) can't be split safely.
    if (el.querySelector("svg")) {
      gsap.set(el, { yPercent: 20, autoAlpha: 0 });
      const play = () =>
        gsap.to(el, {
          yPercent: 0,
          autoAlpha: 1,
          duration: 1.1,
          ease: EASE,
          scrollTrigger: { trigger: el, start: "top 88%" },
        });
      revealQueue.push(play);
      return;
    }
    const entry = {
      el,
      split: null,
      resplit() {
        // locale switched after reveal: re-split the new text, shown at rest
        this.split = new SplitText(el, { type: "lines", linesClass: "line", mask: "lines" });
        gsap.set(this.split.lines, { yPercent: 0, y: 0 });
      },
    };
    entry.split = new SplitText(el, {
      type: "lines",
      linesClass: "line",
      mask: "lines",
    });
    splitStore.push(entry);
    gsap.set(entry.split.lines, { yPercent: 115, y: 0 });
    const play = () =>
      gsap.to(entry.split.lines, {
        yPercent: 0,
        y: 0,
        duration: 1.1,
        stagger: 0.15,
        ease: EASE,
        scrollTrigger: { trigger: el, start: "top 88%" },
      });
    revealQueue.push(play);
  });

  /* generic fade-up reveals */
  document.querySelectorAll("[data-reveal]").forEach((el) => {
    if (reducedMotion) return;
    gsap.set(el, { y: 32, autoAlpha: 0 });
    revealQueue.push(() =>
      gsap.to(el, {
        y: 0,
        autoAlpha: 1,
        duration: 0.9,
        ease: EASE,
        scrollTrigger: { trigger: el, start: "top 90%" },
      })
    );
  });

  // If the preloader already finished (fast path), flush immediately.
  if (preloaderDone) flushReveals();
});

/* ------------------------------------------------- Button per-letter roll */

document.querySelectorAll("[data-btn-chars] .btn__chars").forEach(buildChars);

/* --------------------------------------------------- Global cursor vars */

const root = document.documentElement;
const cursor = { x: 0, y: 0, tx: 0, ty: 0 };

window.addEventListener("pointermove", (e) => {
  cursor.tx = e.clientX / window.innerWidth - 0.5;
  cursor.ty = e.clientY / window.innerHeight - 0.5;
});

gsap.ticker.add(() => {
  cursor.x += (cursor.tx - cursor.x) * 0.08;
  cursor.y += (cursor.ty - cursor.y) * 0.08;
  root.style.setProperty("--cursor-x", cursor.x.toFixed(4));
  root.style.setProperty("--cursor-y", cursor.y.toFixed(4));
});

/* -------------------------------------------------------- Logo rotation */

// The loop mark turns with scroll momentum only — static at rest so it
// doesn't read as a loading spinner.
document.querySelectorAll("[data-logo-rotate]").forEach((g) => {
  let rotation = 0;
  gsap.ticker.add(() => {
    const velocity = lenis ? lenis.velocity : 0;
    if (Math.abs(velocity) < 0.01) return;
    rotation += velocity * 0.12;
    g.style.transform = `rotate(${rotation}deg)`;
    g.style.transformOrigin = "center";
  });
});

/* -------------------------------------------------- Sticky card stacking */

const stackHolders = [...document.querySelectorAll("[data-stack-holder]")];
stackHolders.forEach((holder, i) => {
  holder.style.setProperty("--top", `${10 + i * 3}rem`);
  const block = holder.querySelector("[data-stack-block]");
  block.style.setProperty("--offset", `${i * 1.5}rem`);
  if (reducedMotion) return;
  // Depth: previously pinned cards scale back slightly as the next arrives.
  const next = stackHolders[i + 1];
  if (next) {
    gsap.to(holder.querySelector(".stacked-card"), {
      scale: 0.94,
      transformOrigin: "center top",
      ease: "none",
      scrollTrigger: {
        trigger: next,
        start: "top bottom",
        end: "top top",
        scrub: true,
      },
    });
  }
});

/* ---------------------------------------------------- Crew glass panes */

const glassMount = document.querySelector("[data-glass-scene]");
if (glassMount) {
  const loadGlass = async () => {
    if (glassMount.dataset.loaded === "true") return;
    glassMount.dataset.loaded = "true";
    try {
      const { mountGlassPanes } = await import("./glass-panes.js");
      // Reduced motion keeps the scene but renders it as a still frame.
      const scene = await mountGlassPanes(glassMount, { animate: !reducedMotion });
      if (scene) glassMount.classList.add("is-loaded");
    } catch {
      // WebGL or texture failure: the static pane grid stays visible.
    }
  };
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadGlass();
          io.disconnect();
        }
      },
      { rootMargin: "300px" }
    );
    io.observe(glassMount);
  } else {
    loadGlass();
  }
}

/* ------------------------------------------------- Loops callouts (pin) */

const loopsTrack = document.querySelector("[data-loops-track]");
if (loopsTrack) {
  const blocks = [...loopsTrack.querySelectorAll("[data-loops-block]")];
  blocks[0]?.classList.add("is-active");
  ScrollTrigger.create({
    trigger: loopsTrack,
    start: "top top",
    end: "bottom bottom",
    onUpdate: (self) => {
      const idx = Math.min(blocks.length - 1, Math.floor(self.progress * blocks.length));
      blocks.forEach((b, i) => b.classList.toggle("is-active", i === idx));
    },
  });
}

/* ------------------------------------------------------- Proof carousel */

const carousel = document.querySelector("[data-carousel]");
if (carousel) {
  const cards = [...carousel.querySelectorAll("[data-case-card]")];
  const counter = carousel.querySelector("[data-carousel-counter]");
  let current = 0;
  let animating = false;

  cards.forEach((card, i) => {
    card.classList.add("is-visible");
    card.style.zIndex = String(cards.length - i);
    card.style.setProperty("--card-opacity", "0");
  });

  const pad = (n) => String(n + 1).padStart(2, "0");
  const updateCounter = () => {
    counter.textContent = `${pad(current)} / ${pad(cards.length - 1)}`;
  };

  function next() {
    if (animating || current >= cards.length - 1) return;
    animating = true;
    const card = cards[current];
    gsap.to(card, {
      "--card-opacity": 1,
      duration: 0.7,
      ease: EASE,
      onComplete: () => {
        card.classList.remove("is-visible");
        current += 1;
        updateCounter();
        animating = false;
      },
    });
  }

  function prev() {
    if (animating || current <= 0) return;
    animating = true;
    current -= 1;
    const card = cards[current];
    card.classList.add("is-visible");
    updateCounter();
    gsap.to(card, {
      "--card-opacity": 0,
      duration: 0.7,
      ease: EASE,
      onComplete: () => {
        animating = false;
      },
    });
  }

  carousel.querySelector("[data-carousel-next]")?.addEventListener("click", next);
  carousel.querySelector("[data-carousel-prev]")?.addEventListener("click", prev);
  updateCounter();
}

/* --------------------------------------------------- Steps progress rail */

const stepsRail = document.querySelector("[data-steps]");
if (stepsRail) {
  const filler = stepsRail.querySelector("[data-steps-filler]");
  const blocks = [...stepsRail.querySelectorAll("[data-steps-block]")];
  ScrollTrigger.create({
    trigger: stepsRail,
    start: "top 70%",
    end: "bottom 55%",
    onUpdate: (self) => {
      filler.style.setProperty("--p", self.progress.toFixed(4));
      const idx = Math.min(blocks.length - 1, Math.floor(self.progress * blocks.length));
      blocks.forEach((b, i) => {
        if (i <= idx && self.progress > 0.01) b.dataset.block = "active";
        else delete b.dataset.block;
      });
    },
  });
}

/* ---------------------------------------------------------- Install tabs */

const tabs = [...document.querySelectorAll("[data-install-tab]")];
const panes = [...document.querySelectorAll("[data-install-pane]")];
tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => {
      const active = t === tab;
      t.classList.toggle("is-active", active);
      t.setAttribute("aria-selected", String(active));
    });
    panes.forEach((p) =>
      p.classList.toggle("is-active", p.dataset.installPane === tab.dataset.installTab)
    );
  });
});

/* ---------------------------------------------------------- Copy buttons */

document.querySelectorAll("[data-copy]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(btn.dataset.copy);
      const prev = btn.textContent;
      btn.textContent = translate("Copied");
      setTimeout(() => (btn.textContent = prev), 1400);
    } catch {
      /* clipboard unavailable */
    }
  });
});

/* ------------------------------------------------ Proof accordions
   Source pattern: "Read proof" expands detail inside the card/callout. */

document.querySelectorAll("[data-proof-toggle]").forEach((btn) => {
  const detail = btn.previousElementSibling?.matches("[data-proof-detail]")
    ? btn.previousElementSibling
    : btn.parentElement.querySelector("[data-proof-detail]");
  if (!detail) return;
  btn.addEventListener("click", () => {
    const open = btn.classList.toggle("is-open");
    const roll = btn.querySelector(".roll");
    if (roll) {
      roll.dataset.enKey = open ? "Close proof ⊖" : "Read proof ⊕";
      refreshRoll(roll);
    }
    gsap.to(detail, {
      height: open ? "auto" : 0,
      duration: 0.6,
      ease: EASE,
      onComplete: () => ScrollTrigger.refresh(),
    });
  });
});

/* ----------------------------------------------------- GitHub star count */

const starCounts = document.querySelectorAll("[data-star-count]");
if (starCounts.length) {
  const paintStars = (stars) => {
    if (!Number.isFinite(stars)) return;
    const label =
      stars >= 1000 ? `${(stars / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(stars);
    starCounts.forEach((el) => {
      el.textContent = label;
      el.hidden = false;
    });
  };
  // instant paint from the last known value, then always refetch fresh
  paintStars(Number(sessionStorage.getItem("superloopy-stars")));
  const refreshStars = async () => {
    if (document.hidden) return;
    try {
      const res = await fetch("https://api.github.com/repos/beefiker/superloopy", {
        headers: { Accept: "application/vnd.github+json" },
      });
      if (!res.ok) return;
      const stars = (await res.json()).stargazers_count;
      sessionStorage.setItem("superloopy-stars", String(stars));
      paintStars(stars);
    } catch {
      /* rate-limited or offline — the pill works without a count */
    }
  };
  refreshStars();
  setInterval(refreshStars, 5 * 60 * 1000);
}

/* -------------------------------------------------------- FAQ accordion */

document.querySelectorAll("[data-faq-row]").forEach((row) => {
  const answer = row.querySelector("[data-faq-answer]");
  row.addEventListener("click", () => {
    const open = row.classList.toggle("is-open");
    gsap.to(answer, {
      height: open ? "auto" : 0,
      duration: 0.6,
      ease: EASE,
      onComplete: () => ScrollTrigger.refresh(),
    });
  });
});
