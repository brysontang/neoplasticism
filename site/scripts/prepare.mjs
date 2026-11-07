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
// The compiler's view of the first snippet: every color Dark+ uses, labeled with the
// TextMate scope it came from, so the page can show the parser's categories as data.
{
  const { lang, frames } = snippets.colors;
  const darkTheme = hl.getTheme("dark-plus");
  const lines = hl.codeToTokensBase(frames[0], { lang, theme: "dark-plus", includeExplanation: true });
  const rows = new Map();
  for (const t of lines.flat()) {
    const color = t.color.toLowerCase();
    if (!rows.has(color)) rows.set(color, { color, scopes: new Map(), words: [] });
    const row = rows.get(color);
    for (const w of t.content.trim().split(/\s+/)) if (w && !row.words.includes(w)) row.words.push(w);
    // Weigh each scope by how much text it covers: "variable.other.constant.ts" -> "variable.other.constant"
    for (const part of t.explanation ?? []) {
      const scope = part.scopes.at(-1).scopeName.split(".").filter((s) => s !== lang).slice(0, 3).join(".");
      row.scopes.set(scope, (row.scopes.get(scope) ?? 0) + part.content.trim().length);
    }
  }
  const isDefault = (r) => r.color === darkTheme.fg.toLowerCase();
  tokens.meta.dark = [...rows.values()]
    .filter((r) => r.words.length)
    .sort((a, b) => isDefault(a) - isDefault(b)) // default foreground last, like white in ours
    .map((r) => ({
      color: r.color,
      scope: isDefault(r) ? "default" : [...r.scopes].sort((a, b) => b[1] - a[1])[0][0],
      words: r.words,
    }));
}
fs.writeFileSync(path.join(GEN, "tokens.json"), JSON.stringify(tokens));

// The five colors with OKLCH, so "equally soft" is a number on the page, not a claim.
// sRGB -> OKLab per Björn Ottosson (https://bottosson.github.io/posts/oklab/).
function oklch(hex) {
  const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(hex.slice(i, i + 2), 16) / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { L, C: Math.hypot(A, B), h: ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360 };
}
const ROLE_NAMES = { bg: "background", fg: "everything else", literal: "literals", variable: "names", function: "functions" };
const ext = JSON.parse(fs.readFileSync(path.join(ROOT, "dist/vscode/extension/package.json"), "utf8"));
const palette = {
  version: ext.version,
  roles: Object.fromEntries(Object.keys(ROLE_NAMES).map((r) => [r, cssVar(r)])),
  colors: ["black", "white", "yellow", "blue", "red"].map((name) => {
    const hex = cssVar(name);
    const role = Object.keys(ROLE_NAMES).find((r) => cssVar(r) === hex);
    return { name, hex, role: ROLE_NAMES[role] ?? "", ...oklch(hex) };
  }),
};
fs.writeFileSync(path.join(GEN, "palette.json"), JSON.stringify(palette));

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
