# neoplasticism.dev

The scroll-through explainer for the theme. React + Vite + Tailwind.

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # -> dist/
```

Nothing here hard-codes a color. `scripts/prepare.mjs` runs before every dev/build and pulls from the repo's build output: the palette from `../dist/css/neoplasticism.css`, token colors by running the real built VS Code theme over `src/snippets.js`, and the logo and preview from `../assets/`. Change `palette.toml`, run `../build.py`, and the site follows.

The code on the page lives in `src/snippets.js`. Each snippet is a list of frames; scrolling steps through them, and lines with the same text keep their identity across frames, so they slide rather than redraw.

## Deploy (Cloudflare Workers Builds)

The site is a Worker named `neoplasticism` that serves `dist/` as static assets (see `wrangler.jsonc`), connected to the GitHub repo with:

| Setting | Value |
|---|---|
| Root directory | `site` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |

Node comes from `.node-version`. Every push to `main` redeploys. `neoplasticism.dev` is attached under the Worker's Settings → Domains & Routes.
