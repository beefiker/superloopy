# Superloopy landing page

Static, self-contained landing page for [Superloopy](https://github.com/beefiker/superloopy).
No build step — Cloudflare Pages serves the generated WebGL/orbit export from this folder.

## Deploy to Cloudflare Pages

### Option A — Wrangler (direct upload)

```
npm i -g wrangler          # if not installed
wrangler pages deploy web --project-name superloopy
```

(Run from the repo root. The first run creates the Pages project.)

### Option B — Connect the Git repo (auto-deploy on push)

In the Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**:

- **Build command:** *(leave empty)*
- **Build output directory:** `web`

Every push to `main` redeploys.

## Local preview

```
npx serve web      # or: python3 -m http.server -d web 8080
```
