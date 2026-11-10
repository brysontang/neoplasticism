# neoplasticism.dev

The scroll-through explainer for the theme. React + Vite + Tailwind.

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # -> dist/
```

Nothing here hard-codes a color. `scripts/prepare.mjs` runs before every dev/build and pulls from the repo's build output: the palette from `../dist/css/neoplasticism.css` (plus its OKLCH values, computed, for the palette blocks), token colors by running the real built VS Code theme over `src/snippets.js`, the Dark+ color-and-rule table for the "colored for a compiler" step, the version from the built extension's `package.json`, and the logo and preview from `../assets/`. Even `theme-color` in `index.html` is a placeholder that `vite.config.js` fills with the background. Change `palette.toml`, run `../build.py`, and the site follows.

`prepare.mjs` also fails the build if the page's premise stops holding: the three roles and the foreground must be four different colors, and the theme must color the snippets with nothing but those four. If you give comments their own gray, say, the build tells you the site needs a rule for it instead of quietly drawing them white.

The code on the page lives in `src/snippets.js`. Each snippet is a list of frames; scrolling steps through them, and lines with the same text keep their identity across frames, so they slide rather than redraw.

The layout is tmux: each screen is a window of panes split by 1px lines (grid gaps over gray), and the status bar at the bottom is the theme's own tmux status line, doubling as navigation.

## Deploy (Cloudflare Workers Builds)

The site is a Worker named `neoplasticism` that serves `dist/` as static assets (see `wrangler.jsonc`), connected to the GitHub repo with:

| Setting | Value |
|---|---|
| Root directory | `site` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |

Node comes from `.node-version`. Every push to `main` redeploys. `neoplasticism.dev` is attached under the Worker's Settings → Domains & Routes.
