// i18n engine — EN markup is the source of truth. Static text nodes,
// letter-roll labels, button chars, the hero title, and SplitText headlines
// all re-render from the dictionary; the choice persists in localStorage.
// Split from app.js to keep files reviewable.

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { LOCALE_TEXTS, HERO_TITLE } from "./locales.js";

// split headline registry — app.js pushes entries at SplitText creation
export const splitStore = [];

const LOCALE_KEY = "superloopy-locale";
const normalize = (s) => s.replace(/\s+/g, " ").trim();
let currentLocale = localStorage.getItem(LOCALE_KEY) || "en";
if (!["en", "de", "ko", "es"].includes(currentLocale)) currentLocale = "en";

export const translate = (key) =>
  currentLocale === "en" ? key : (LOCALE_TEXTS[key]?.[currentLocale] ?? key);

// static text nodes with a dictionary entry (EN originals captured once)
const i18nNodes = [];
{
  const SKIP =
    "script,style,code,.command,[data-split],.btn__chars,.preloader,.lang-switch,.github-pill,.roll,.carousel__counter";
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const text = node.textContent;
    const key = normalize(text);
    if (!key || !LOCALE_TEXTS[key]) continue;
    const parent = node.parentElement;
    if (!parent || parent.closest(SKIP)) continue;
    i18nNodes.push({
      node,
      key,
      pre: /^\s*/.exec(text)[0],
      post: /\s*$/.exec(text)[0],
    });
  }
}

// letter-roll labels (data-text hover clones follow the visible label)
const rollEls = [...document.querySelectorAll(".custom-link__text .roll")];
rollEls.forEach((el) => {
  el.dataset.enKey = normalize(el.textContent);
});
export function refreshRoll(el) {
  const t = translate(el.dataset.enKey);
  el.textContent = t;
  el.dataset.text = t;
}

// split headlines keep their EN key; live switches revert + re-split
document.querySelectorAll("[data-split]").forEach((el) => {
  el.dataset.enKey = normalize(el.textContent);
});

function applyHeroTitle() {
  const title = document.querySelector(".hero__title");
  if (!title) return;
  const parts = HERO_TITLE[currentLocale] ?? HERO_TITLE.en;
  const textNodes = [...title.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim());
  if (textNodes.length >= 2) {
    textNodes[0].textContent = `${parts[0]} `;
    textNodes[textNodes.length - 1].textContent = ` ${parts[1]}`;
  }
}

export function buildChars(holder) {
  const en = holder.dataset.label ?? normalize(holder.textContent);
  holder.dataset.label = en;
  const label = translate(en);
  holder.textContent = "";
  [...label].forEach((ch, i) => {
    const span = document.createElement("span");
    span.className = "char";
    span.dataset.char = ch;
    span.textContent = ch;
    span.style.setProperty("--d", `${i * 0.018}s`);
    holder.appendChild(span);
  });
}

export function applyLocale(locale, { initial = false } = {}) {
  currentLocale = locale;
  localStorage.setItem(LOCALE_KEY, locale);
  document.documentElement.lang = locale;
  for (const { node, key, pre, post } of i18nNodes) {
    node.textContent = pre + translate(key) + post;
  }
  rollEls.forEach(refreshRoll);
  applyHeroTitle();
  document.querySelectorAll("[data-btn-chars] .btn__chars").forEach(buildChars);
  document.querySelectorAll("[data-split]").forEach((el) => {
    if (el.querySelector("svg")) return; // hero title handled above
    const entry = splitStore.find((s) => s.el === el);
    entry?.split?.revert();
    el.textContent = translate(el.dataset.enKey);
    if (entry && !initial) entry.resplit();
  });
  document.querySelectorAll("[data-lang-switch] button").forEach((b) => {
    const mapped = b.dataset.lang === "kr" ? "ko" : b.dataset.lang;
    b.classList.toggle("is-active", mapped === locale);
  });
  if (!initial) ScrollTrigger.refresh();
}

document.querySelectorAll("[data-lang-switch] button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const locale = btn.dataset.lang === "kr" ? "ko" : btn.dataset.lang;
    if (locale !== currentLocale) applyLocale(locale);
  });
});

if (currentLocale !== "en") applyLocale(currentLocale, { initial: true });
