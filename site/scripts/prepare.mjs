// Generates the site's inputs from the repo's build output, so palette.toml stays the
// only place a color is written down. Runs before every dev/build.
//
//   ../dist/css/neoplasticism.css                     -> src/generated/palette.css
//   ../dist/vscode/.../neoplasticism-color-theme.json -> tokenizes src/snippets.js
//                                                         -> src/generated/tokens.json
//   ../assets (logo, favicon, preview)                -> public/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHighlighter } from "shiki";
import { snippets } from "../src/snippets.js";

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = path.resolve(SITE, "..");
const GEN = path.join(SITE, "src/generated");
const PUBLIC = path.join(SITE, "public");
fs.mkdirSync(GEN, { recursive: true });
fs.mkdirSync(PUBLIC, { recursive: true });

// Palette: the CSS export, plus a color -> role map for classifying tokens.
const css = fs.readFileSync(path.join(ROOT, "dist/css/neoplasticism.css"), "utf8");
fs.writeFileSync(path.join(GEN, "palette.css"), css);
const cssVar = (name) => {
  const m = css.match(new RegExp(`--neo-${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`prepare: --neo-${name} not found in dist/css/neoplasticism.css`);
  return m[1].toLowerCase();
};
const ROLE_BY_COLOR = {
  [cssVar("literal")]: "literal",
  [cssVar("variable")]: "variable",
  [cssVar("function")]: "function",
};

// Tokenize with the real theme (and Dark+ for the comparison).
const theme = JSON.parse(
  fs.readFileSync(path.join(ROOT, "dist/vscode/extension/themes/neoplasticism-color-theme.json"), "utf8"),
);
theme.name = "neoplasticism";
const langs = [...new Set(Object.values(snippets).map((s) => s.lang))];
const hl = await createHighlighter({ themes: [theme, "dark-plus"], langs });
const ITALIC = 1; // shiki FontStyle.Italic

// key = line text + occurrence, so identical lines keep their identity across frames.
const lineKeys = (lines) => {
  const seen = new Map();
  return lines.map((text) => {
    const n = seen.get(text) ?? 0;
    seen.set(text, n + 1);
    return `${text}#${n}`;
  });
};

const tokens = { meta: { darkBg: hl.getTheme("dark-plus").bg } };
for (const [id, { lang, frames }] of Object.entries(snippets)) {
  tokens[id] = frames.map((code) => {
    const neo = hl.codeToTokensBase(code, { lang, theme: "neoplasticism" });
    const dark = hl.codeToTokensBase(code, { lang, theme: "dark-plus" });
    return lineKeys(code.split("\n")).map((key, i) => ({
      key,
      neo: (neo[i] ?? []).map((t) => ({
        t: t.content,
        r: ROLE_BY_COLOR[t.color?.toLowerCase()] ?? "plain",
        ...(t.fontStyle & ITALIC ? { i: 1 } : {}),
      })),
      dark: (dark[i] ?? []).map((t) => ({ t: t.content, c: t.color, ...(t.fontStyle & ITALIC ? { i: 1 } : {}) })),
    }));
  });
}
fs.writeFileSync(path.join(GEN, "tokens.json"), JSON.stringify(tokens));

for (const [src, dest] of [
  ["assets/logo/png/neoplasticism-transparent-512.png", "logo.png"],
  ["assets/logo/favicon.ico", "favicon.ico"],
  ["assets/logo/png/apple-touch-icon.png", "apple-touch-icon.png"],
  ["assets/preview.png", "preview.png"],
]) {
  fs.copyFileSync(path.join(ROOT, src), path.join(PUBLIC, dest));
}

const count = Object.entries(snippets).reduce((n, [, s]) => n + s.frames.length, 0);
console.log(`prepare: ${count} frames tokenized, palette + assets copied`);
