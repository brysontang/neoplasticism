import fs from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// index.html cannot read a CSS variable for <meta name="theme-color">, so the background
// is filled in from the generated palette: %NEO_BG% -> the palette's bg.
const paletteInHtml = () => ({
  name: "neoplasticism-palette-in-html",
  transformIndexHtml(html) {
    const palette = JSON.parse(fs.readFileSync(new URL("./src/generated/palette.json", import.meta.url), "utf8"));
    return html.replaceAll("%NEO_BG%", palette.roles.bg);
  },
});

export default defineConfig({
  plugins: [react(), tailwindcss(), paletteInHtml()],
});
