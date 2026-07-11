# Motion Implementation Guide

The anti-slop rule "motion claimed = motion shown" fails most often at *implementation*, not intent: the model wires scroll effects through patterns that jank on mobile, or ships a pin that fires halfway down the viewport. This file bans the failure patterns by name and provides canonical skeletons for the three scroll moves that break most, each with its known failure mode called out. Motion must still be motivated (hierarchy, storytelling, feedback, or state transition — one sentence of justification per animation) and composited (`transform`/`opacity`/`filter` only).

## Banned implementation patterns (name → replacement)

- **`window.addEventListener("scroll", …)`** — runs on every scroll frame with no batching; the #1 mobile-jank source. → Motion's `useScroll()`, GSAP `ScrollTrigger`, `IntersectionObserver`, or CSS scroll-driven animations (`animation-timeline: view()`).
- **Continuous values in React state** — `useState` tracking mouse position, scroll progress, or magnetic-hover offsets re-renders the tree every frame and collapses on mobile. → `useMotionValue` + `useTransform` (values change outside the render cycle).
- **`requestAnimationFrame` loops that touch React state** — same failure, hand-rolled. → motion values.
- **Mixing GSAP or Three.js with Motion in one component tree** — they fight over the same frames. Pick one driver per tree: Motion for UI/reveal/state motion, GSAP + ScrollTrigger only for real pin/scrub scrolltelling, Three.js isolated to its own canvas leaf.
- **Un-isolated motion components** — anything using ScrollTrigger, pointer physics, or motion hooks must be a leaf client component (`"use client"` in RSC projects) with a strict `useEffect` cleanup (`ctx.revert()` for GSAP). Server/static layers render layout only.
- **Half-built motion** — a cut-off ScrollTrigger, a jumpy enter, or a pin that never releases is worse than no motion. If working motion does not fit the scope, lower `MOTION_INTENSITY` and ship clean static.

## Reduced motion (non-negotiable)

Anything beyond hover/focus transitions must honor `prefers-reduced-motion`: gate with `useReducedMotion()` (Motion) or an `@media (prefers-reduced-motion: reduce)` block, and collapse infinite loops, parallax, scroll-hijack, and magnetic physics to static/instant. Every skeleton below carries the fallback; keep it when adapting them.

## Skeleton 1 — sticky scroll-stack (GSAP)

Cards pin at the viewport top and physically stack; the previous card shrinks as the next arrives. **Known failure: pinning with `start: "top center"` (or `"top 80%"`) fires the pin mid-viewport and reads as broken. Pin at `start: "top top"`.**

```tsx
"use client";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "motion/react";

gsap.registerPlugin(ScrollTrigger);

export function StickyStack({ cards }: { cards: React.ReactNode[] }) {
  const root = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce || !root.current) return;
    const ctx = gsap.context(() => {
      const els = gsap.utils.toArray<HTMLElement>(".stack-card");
      els.forEach((card, i) => {
        if (i === els.length - 1) return; // last card never pins
        ScrollTrigger.create({
          trigger: card,
          start: "top top", // pin at viewport top — never "top center"
          endTrigger: els[els.length - 1],
          end: "top top",
          pin: true,
          pinSpacing: false,
        });
        gsap.to(card, {
          scale: 0.92,
          opacity: 0.55,
          ease: "none",
          // the NEXT card's travel drives this card's shrink
          scrollTrigger: { trigger: els[i + 1], start: "top bottom", end: "top top", scrub: true },
        });
      });
    }, root);
    return () => ctx.revert();
  }, [reduce]);

  return (
    <div ref={root} className="relative">
      {cards.map((card, i) => (
        <div key={i} className="stack-card sticky top-0 flex min-h-[100dvh] items-center justify-center">
          {card}
        </div>
      ))}
    </div>
  );
}
```

## Skeleton 2 — horizontal pan (GSAP)

Vertical scroll drives a horizontal track. **Known failure: the tween starts before the section pins, so the user sees a half-slid track. Same fix: `start: "top top"`, pin the wrapper, scrub the inner track, and set the scroll length to the horizontal travel.**

```tsx
"use client";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "motion/react";

gsap.registerPlugin(ScrollTrigger);

export function HorizontalPan({ children }: { children: React.ReactNode }) {
  const wrap = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce || !wrap.current || !track.current) return;
    const ctx = gsap.context(() => {
      const distance = track.current!.scrollWidth - window.innerWidth;
      gsap.to(track.current, {
        x: -distance,
        ease: "none",
        scrollTrigger: {
          trigger: wrap.current,
          start: "top top",          // pin before any horizontal movement
          end: () => `+=${distance}`, // scroll length = horizontal travel
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });
    }, wrap);
    return () => ctx.revert();
  }, [reduce]);

  return (
    <section ref={wrap} className="relative overflow-hidden">
      <div ref={track} className="flex h-[100dvh] items-center">
        {children}
      </div>
    </section>
  );
}
```

## Skeleton 3 — scroll-reveal stagger (Motion, the lighter default)

For plain "items appear as they enter the viewport" (feature lists, testimonial grids, logo walls) there is no pin, so GSAP is overkill — `whileInView` is lighter and needs no ScrollTrigger. Reach for GSAP only when something actually pins or scrubs.

```tsx
"use client";
import { motion, useReducedMotion } from "motion/react";

export function RevealStagger({ items }: { items: string[] }) {
  const reduce = useReducedMotion();
  return (
    <ul className="grid gap-6">
      {items.map((item, i) => (
        <motion.li
          key={item}
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
        >
          {item}
        </motion.li>
      ))}
    </ul>
  );
}
```

Notes that hold across all three: import Motion from `motion/react` (the `framer-motion` name is a legacy alias); full-height sections use `min-h-[100dvh]`, never `h-screen` (iOS address-bar jump); `layout`/`layoutId` are for real shared-element or reorder transitions, not wrapped around static content "for safety"; `staggerChildren` requires parent variants and children in the same client tree. Visual-QA evidence for motion means exercising the scroll in the real browser — a screenshot of the resting state does not prove a pin works.
