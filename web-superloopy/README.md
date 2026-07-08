# Superloopy landing (Astro)

Landing page rebuilt from scratch on the reference agency-site structure:
same section order, animations, transitions, and WebGL — with Superloopy copy and the
existing Superloopy hero orbit kept in place of the source hero.

## Stack

- **Astro 7** (static output, zero framework runtime — chosen over Next.js for performance:
  the source's React layer only hosted GSAP/three.js work, which runs framework-free here)
- **GSAP 3.15** — ScrollTrigger, SplitText, CustomEase (`cubic-bezier(.77,0,.18,1)` signature ease)
- **Lenis** — smooth scroll (source used Lenis 1.1.18)
- **three.js** — single fixed orthographic canvas behind the page, DOM-proxy pixel alignment,
  dot-grid mouse-trail shader (source GLSL, verbatim), `circles/saw_small/star` GLTF scenes
- Hero orbit — vendored legacy runtime embedded as iframe (`/orbit.html?scene=landing-orb`),
  vendored in `public/` (orbit.html, _payload.json, _nuxt/, webgl/, basis/, draco/)

## Develop / build

```sh
npm install
npm run dev
npm run build
npm run preview   # serve dist/
```
