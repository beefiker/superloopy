# superloopy.dev

Static Astro site with no client framework. Every locale is its own prerendered page: `/`, `/ko/`, `/de/` and `/es/`.

## Layout

- `src/components/Page.astro`: the whole page (nav, hero, how it works, crew, skills, FAQ, CTA, footer).
- `src/i18n/strings.js`: all copy for EN, KO, DE and ES. Commands, file paths, role names and skill names stay identical in every locale. Korean copy is checked with `skills/humanize-korean/scripts/audit-humanize-output.mjs`.
- `src/scripts/dot-field.js`: the hero's halftone dot field. It is one canvas, capped at 24 fps, and pauses when off screen, when the tab is hidden, when the user has asked for reduced motion, or when the hero's pause button is pressed.
- `src/scripts/site.js`: install tabs, the copy button, the pause control and one-time reveals. The page stays readable without JavaScript.
- `public/loop-night.webp`: original pixel-art scene generated for Superloopy, which the dot field samples.
- `public/og.jpg`: share image, a still frame from the same dot field.
- `public/fonts/`: subset WOFF2 files for Manrope, IBM Plex Mono and Silkscreen, with their SIL OFL licenses alongside.

## The terminal transcript

The "How it works" terminal shows real output from Superloopy 0.22.3, trimmed to each command's first line. To reproduce it, start in an empty git repository with `package.json` (`"test": "node --test"`), a `total.js` that adds a stray `+ 1`, and `total.test.js` expecting `10` for `[{price:3,qty:2},{price:4,qty:1}]`. Then run:

```sh
superloopy loop begin --brief "Fix cart total" --mode light
superloopy loop prove -- npm test                 # fail
# remove the "+ 1"
superloopy loop prove -- npm test                 # pass
superloopy loop prove -- node --test total.test.js
superloopy loop check
superloopy loop finish
```

## Develop

```sh
npm install
npm run dev
npm run build      # writes dist/
```

Deploy `dist/` to the `superloopy` Cloudflare Pages project:

```sh
npx wrangler pages deploy dist --project-name superloopy --branch main
```
