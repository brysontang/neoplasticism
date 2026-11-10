import { useCallback, useEffect, useId, useState } from "react";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import tokens from "./generated/tokens.json";
import palette from "./generated/palette.json";
import { ALL_ROLES, Code, measure } from "./Code.jsx";
import { Scrolly } from "./Scrolly.jsx";

const REPO = "https://github.com/brysontang/neoplasticism";
const OPEN_VSX = "https://open-vsx.org/extension/brysontang/neoplasticism";

// Captions: [r:...] red, [y:...] yellow, [b:...] blue.
// Window 2: one snippet, the colors switch on one role at a time.
const COLOR_STEPS = [
  { reveal: [], text: "Code, uncolored." },
  { reveal: ["literal"], text: "[r:Red] is what's written in." },
  { reveal: ["literal", "variable"], text: "[y:Yellow] is what holds it." },
  { reveal: ALL_ROLES, text: "[b:Blue] is where it flows." },
  { reveal: ALL_ROLES, focus: "plain", text: "Everything else stays white." },
  { reveal: ALL_ROLES, parser: true, text: "The same code, colored for a compiler." },
  { reveal: ALL_ROLES, text: "And colored for you." },
];

// Window 3: one function grows, gets mixed up, and gets pulled apart.
const LEVEL_STEPS = [
  { frame: 0, text: "A function that reads like steps: [y:yellow] and [b:blue], no [r:red]." },
  { frame: 1, text: "Then the details creep in. [r:Red] piles up." },
  { frame: 2, text: "Pull them out. Each function is one level again." },
];

// The status line lists these like tmux windows (index:name), in page order.
const WINDOWS = ["intro", "colors", "levels", "install"];

const FIT = {
  colors: measure(tokens.colors),
  levels: measure(tokens.levels),
  install: measure([...tokens.everything, ...tokens.lazy]),
};

export default function App() {
  const [current, setCurrent] = useState("intro");
  const [steps, setSteps] = useState({ colors: 0, levels: 0 });
  const onColors = useCallback((s) => setSteps((p) => ({ ...p, colors: s })), []);
  const onLevels = useCallback((s) => setSteps((p) => ({ ...p, levels: s })), []);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setCurrent(e.target.dataset.window);
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    document.querySelectorAll("[data-window]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // A link to #levels arrives before there is a #levels: the page is empty until React
  // mounts, so the browser's own jump finds nothing. Do it once, now that the target
  // exists. Not on reload or back/forward, where the browser restores the scroll itself.
  useEffect(() => {
    const type = performance.getEntriesByType("navigation")[0]?.type;
    if (location.hash.length < 2 || type === "reload" || type === "back_forward") return;
    document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
  }, []);

  const progress =
    current === "colors"
      ? `${steps.colors + 1}/${COLOR_STEPS.length}`
      : current === "levels"
        ? `${steps.levels + 1}/${LEVEL_STEPS.length}`
        : "";

  return (
    // reducedMotion="user": with "reduce motion" on, Motion drops movement and layout
    // animation and keeps the fades. index.css does the same for the CSS transitions.
    <MotionConfig reducedMotion="user">
      <main>
        <Intro />
        <Scrolly id="colors" title="Three colors" steps={COLOR_STEPS.length} onStep={onColors}>
          {(step) => <ColorsWindow step={step} />}
        </Scrolly>
        <Scrolly id="levels" title="One level per function" steps={LEVEL_STEPS.length} per={110} onStep={onLevels}>
          {(step) => <LevelsWindow step={step} />}
        </Scrolly>
        <Install />
      </main>
      <StatusLine current={current} progress={progress} />
    </MotionConfig>
  );
}

// A pane: one cell of a window. Panes sit in a grid with a 1px gap over a gray
// background, so the gaps are the lines between them and every line reaches the edge.
// A labeled pane is a group named by its label, so "prices.ts, Dark+" is announced
// before the code it holds.
function Pane({ label, aside, className = "", style, children }) {
  const id = useId();
  return (
    <div className={`pane ${className}`} style={style} role={label ? "group" : undefined} aria-labelledby={label ? id : undefined}>
      {label && (
        <div id={id} className="pane-label">
          <span>{label}</span>
          {aside && <span>{aside}</span>}
        </div>
      )}
      {children}
    </div>
  );
}

function Intro() {
  return (
    <section
      id="intro"
      data-window="intro"
      className="panes min-h-[calc(100svh-var(--status))] grid-rows-[auto_1fr_auto] lg:grid-cols-[38fr_62fr] lg:grid-rows-[1fr_auto]"
    >
      <Pane>
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="" aria-hidden="true" width="48" height="48" className="h-10 w-10 lg:h-12 lg:w-12" />
          <h1 className="text-[clamp(1.5rem,8.2vw,2.25rem)] leading-[1.111] tracking-tight lg:text-5xl lg:leading-none">neoplasticism</h1>
        </div>
        <p className="mt-6 max-w-[30ch] text-lg leading-relaxed text-(--neo-silver) lg:text-2xl lg:leading-relaxed">
          A theme made for humans to parse instead of compilers.
        </p>
      </Pane>
      <Pane label="invoices.ts" className="lg:row-span-2">
        <Code lines={tokens.levels[2]} fit={FIT.levels} />
      </Pane>
      <Pane className="space-y-2 text-sm leading-relaxed text-(--neo-gray4)">
        <ul className="flex flex-wrap gap-x-[2ch]">
          {["VS Code", "Cursor", "Neovim", "Ghostty", "tmux", "git", "Blink"].map((app) => (
            <li key={app}>{app}</li>
          ))}
        </ul>
        <p className="flex flex-wrap gap-x-[2ch]">
          <a href={REPO}>GitHub</a>
          <a href={OPEN_VSX}>Open VSX</a>
          <span>v{palette.version}</span>
          <span>MIT</span>
        </p>
      </Pane>
    </section>
  );
}

// The pane label on the Dark+ background, where the usual gray is under 4.5:1.
const DARK_LABEL = "color-mix(in srgb, var(--neo-gray4), var(--neo-fg) 25%)";

function ColorsWindow({ step }) {
  const s = COLOR_STEPS[step];
  const rows = s.parser ? darkRows() : neoRows(tokens.colors[0], s.reveal);
  return (
    // Rows. Stacked: captions and code take what they need, the legend gets the rest.
    // In columns: the legend keeps a fixed 26rem (so the split does not move as rows are
    // added) until the screen is too short for that, then the code keeps its height and
    // the legend gets what is left.
    <div className="panes h-full grid-rows-[auto_auto_minmax(0,1fr)] cols:grid-cols-[38fr_62fr] cols:grid-rows-[1fr_minmax(auto,26rem)]">
      <Pane label="colors" className="pane-scroll cols:row-span-2">
        <Log steps={COLOR_STEPS} step={step} />
      </Pane>
      <Pane
        label="prices.ts"
        aside={s.parser ? "Dark+" : "neoplasticism"}
        style={s.parser ? { background: tokens.meta.darkBg, "--pane-label": DARK_LABEL } : undefined}
      >
        {/* Both renderings stay mounted so the crossfade has two ends; the one that is
            faded out is inert, so it is neither read twice nor selectable. */}
        <div className="grid">
          <div className="xfade" style={{ opacity: s.parser ? 0 : 1 }} inert={!!s.parser}>
            <Code lines={tokens.colors[0]} fit={FIT.colors} reveal={s.reveal} focus={s.focus} max={28} vh="3.2svh" />
          </div>
          <div className="xfade" style={{ opacity: s.parser ? 1 : 0 }} inert={!s.parser}>
            <Code lines={tokens.colors[0]} fit={FIT.colors} variant="dark" max={28} vh="3.2svh" />
          </div>
        </div>
      </Pane>
      <Pane label={`${rows.length} ${rows.length === 1 ? "color" : "colors"}`} className="pane-scroll">
        <Legend rows={rows} parser={!!s.parser} focus={s.focus} />
      </Pane>
    </div>
  );
}

function LevelsWindow({ step }) {
  return (
    <div className="panes h-full grid-rows-[auto_minmax(0,1fr)] cols:grid-cols-[38fr_62fr] cols:grid-rows-1">
      <Pane label="levels" className="pane-scroll">
        <Log steps={LEVEL_STEPS} step={step} />
      </Pane>
      <Pane label="invoices.ts" className="pane-fill">
        <Code lines={tokens.levels[LEVEL_STEPS[step].frame]} fit={FIT.levels} />
      </Pane>
    </div>
  );
}

// The captions so far, newest in white. It grows as you scroll, like a log; on narrow
// screens only the newest shows. Every caption is in the document from the start (the
// ones not reached yet are sr-only), so the text does not depend on how far you scrolled.
// A fade of `duration` seconds, or a cut for readers who asked for reduced motion (Motion's
// own reducedMotion setting only drops movement; index.css cuts the CSS fades the same way).
function useFade(duration) {
  return { duration: useReducedMotion() ? 0 : duration };
}

function Log({ steps, step }) {
  const fade = useFade(0.3);
  return (
    <ol className="log">
      {steps.map((s, i) => (
        <motion.li
          key={i}
          initial={false}
          animate={{ opacity: i === step ? 1 : i < step ? 0.55 : 0, y: i > step ? 6 : 0 }}
          transition={fade}
          className={i > step ? "sr-only" : i < step ? "max-lg:sr-only" : undefined}
          aria-current={i === step ? "step" : undefined}
        >
          <Caption text={s.text} />
        </motion.li>
      ))}
    </ol>
  );
}

const CAPTION_COLOR = { r: "--neo-literal", y: "--neo-variable", b: "--neo-function" };

function Caption({ text }) {
  const parts = text.split(/(\[[ryb]:[^\]]+\])/).filter(Boolean);
  return parts.map((p, i) => {
    const m = p.match(/^\[([ryb]):([^\]]+)\]$/);
    return m ? (
      <span key={i} style={{ color: `var(${CAPTION_COLOR[m[1]]})` }}>
        {m[2]}
      </span>
    ) : (
      <span key={i}>{p}</span>
    );
  });
}

// Every color on screen and the words wearing it. Ours: the revealed roles, then white
// for everything else. Dark+: one row per color, labeled with the theme rule that set it
// (the one covering the most text; `more` counts the other rules landing on that color).
function neoRows(lines, reveal) {
  const order = [...ALL_ROLES.filter((r) => reveal.includes(r)), "plain"];
  const words = Object.fromEntries(order.map((r) => [r, []]));
  for (const line of lines)
    for (const t of line.neo) {
      const role = reveal.includes(t.r) ? t.r : "plain";
      for (const w of t.t.trim().split(/\s+/)) if (w && !words[role].includes(w)) words[role].push(w);
    }
  return order.map((r) => ({
    key: r,
    color: r === "plain" ? palette.roles.fg : palette.roles[r],
    label: r === "plain" ? "everything else" : r,
    words: words[r],
    plain: r === "plain",
  }));
}

function darkRows() {
  return tokens.meta.dark.map((r) => ({
    key: r.color,
    color: r.color,
    label: r.scopes[0],
    more: r.scopes.slice(1),
    words: r.words,
    plain: r.scopes[0] === "default",
  }));
}

function Legend({ rows, parser, focus }) {
  const swap = useFade(0.25);
  const fade = useFade(0.4);
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={parser ? "dark" : "neo"}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={swap}
        className="legend"
        style={{ "--label": Math.max(...rows.map((r) => r.label.length + (r.more?.length ? 3 : 0))) }}
      >
        <AnimatePresence initial={false}>
          {rows.map((r) => (
            <motion.div
              key={r.key}
              layout="position"
              initial={{ opacity: 0 }}
              animate={{ opacity: focus === "plain" && !r.plain ? 0.22 : 1 }}
              exit={{ opacity: 0 }}
              transition={fade}
              className="legend-row"
            >
              <span className="swatch" style={{ background: r.color }} />
              <span className="label text-(--neo-silver)" title={r.more?.length ? [r.label, ...r.more].join(", ") : undefined}>
                {r.label}
                {r.more?.length > 0 && <span className="text-(--neo-gray4)"> +{r.more.length}</span>}
              </span>
              <span className="hex text-(--neo-gray4)">{r.color}</span>
              <span className="words" style={{ color: r.color }}>
                {r.words.join("  ")}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}

function Install() {
  return (
    <section id="install" data-window="install" className="panes pt-px lg:grid-cols-[38fr_62fr]">
      <Pane label="install">
        <h2 className="text-2xl tracking-tight lg:text-3xl">Try it</h2>
        <dl className="mt-8 grid grid-cols-[auto_1fr] gap-x-[3ch] gap-y-3 text-sm leading-relaxed">
          <dt>VS Code</dt>
          <dd className="text-(--neo-silver)">
            the <a href={`${REPO}/releases/latest`}>.vsix</a>, or install.sh
          </dd>
          <dt>Cursor, VSCodium</dt>
          <dd className="text-(--neo-silver)">
            <a href={OPEN_VSX}>Open VSX</a>
          </dd>
          <dt>Neovim</dt>
          <dd className="text-(--neo-silver)">lazy.nvim</dd>
          <dt>Ghostty, tmux, git</dt>
          <dd className="text-(--neo-silver)">install.sh</dd>
          <dt>Blink, base16, CSS</dt>
          <dd className="text-(--neo-silver)">
            <a href={`${REPO}#one-app-at-a-time`}>the README</a>
          </dd>
        </dl>
      </Pane>
      <div className="panes">
        <Pane label="install.sh">
          <Code lines={tokens.everything[0]} fit={FIT.install} wrap max={15} min={11} />
        </Pane>
        <Pane label="lazy.nvim">
          <Code lines={tokens.lazy[0]} fit={FIT.install} wrap max={15} min={11} />
        </Pane>
      </div>
      <Palette />
      <Footer />
    </section>
  );
}

// The five colors as blocks, with the numbers behind "equally soft".
function Palette() {
  return (
    <>
      <Pane label="palette.toml" className="lg:col-span-2">
        <p className="max-w-[44ch] text-base leading-relaxed lg:text-xl lg:leading-relaxed">
          All equally soft: the same OKLCH chroma, with yellow a touch lighter.
        </p>
      </Pane>
      <div className="panes sm:grid-cols-5 lg:col-span-2">
        {palette.colors.map((c) => {
          const hue = c.C > 0.001;
          return (
            <div key={c.name} className="flex bg-(--neo-bg) sm:flex-col">
              <div className="w-20 shrink-0 sm:h-28 sm:w-auto lg:h-40" style={{ background: c.hex }} />
              <div className="flex-1 border-l border-(--neo-gray2) p-5 text-xs leading-6 sm:border-t sm:border-l-0 lg:px-[clamp(1.5rem,2.5vw,2.5rem)] lg:py-8">
                <div className="text-sm">{c.name}</div>
                <div className="text-(--neo-gray4)">{c.hex}</div>
                <div className="mt-2 grid grid-cols-[2ch_1fr] tabular-nums text-(--neo-gray4)">
                  <span>L</span>
                  <span>{c.L.toFixed(3)}</span>
                  <span>C</span>
                  <span className={hue ? "text-(--neo-fg)" : undefined}>{c.C.toFixed(3)}</span>
                  <span>h</span>
                  <span>{hue ? `${Math.round(c.h)}°` : "—"}</span>
                </div>
                <div className="mt-2 text-(--neo-silver)">{c.role}</div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function Footer() {
  return (
    <Pane className="text-sm leading-relaxed text-(--neo-gray4) lg:col-span-2">
      <div className="flex flex-col gap-6 lg:flex-row lg:justify-between lg:gap-16">
        <p className="max-w-[90ch]">
          Inspired by Logan Smith's{" "}
          <a href="https://www.youtube.com/watch?v=2OMRWPOSw9s">How to write the perfect function</a>, which points to
          Tony Van Eerd's <a href="https://www.youtube.com/watch?v=b4p_tcLYDV0">Value Oriented Programming</a>, which
          points to Sean Parent's{" "}
          <a href="https://www.youtube.com/watch?v=4moyKUHApq4">A Possible Future of Software Development</a>.
          Consider this the next link in the chain.
        </p>
        <p className="shrink-0">
          <a href={REPO}>GitHub</a> · MIT
        </p>
      </div>
    </Pane>
  );
}

// tmux's status line, styled the way the theme styles it: a white bar, black text, the
// current window inverted. Windows are links, so it doubles as the page's navigation.
function StatusLine({ current, progress }) {
  return (
    <nav aria-label="Sections" className="status">
      <span className="hidden px-[1ch] sm:flex">neoplasticism</span>
      {WINDOWS.map((w, i) => {
        const on = w === current;
        return (
          <a key={w} href={`#${w}`} aria-current={on ? "location" : undefined} data-on={on || undefined}>
            {i + 1}
            <span className={on ? undefined : "sr-only sm:not-sr-only"}>:{w}</span>
          </a>
        );
      })}
      <span className="ml-auto px-[1ch] tabular-nums">{progress}</span>
      <span className="hidden px-[1ch] sm:flex">v{palette.version}</span>
    </nav>
  );
}
