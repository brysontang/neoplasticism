import { AnimatePresence, motion } from "motion/react";
import tokens from "./generated/tokens.json";
import { ALL_ROLES, Code } from "./Code.jsx";
import { Scrolly } from "./Scrolly.jsx";

const REPO = "https://github.com/brysontang/neoplasticism";

// Captions: [r:...] red, [y:...] yellow, [b:...] blue, [g:...] gray.
// Act 1: one snippet, the colors switch on one role at a time.
const COLOR_STEPS = [
  { reveal: [], text: "Code, uncolored." },
  { reveal: ["literal"], text: "[r:Red] is what's written in." },
  { reveal: ["literal", "variable"], text: "[y:Yellow] is what holds it." },
  { reveal: ALL_ROLES, text: "[b:Blue] is where it flows." },
  { reveal: ALL_ROLES, focus: "plain", text: "Everything else stays white." },
  { reveal: ALL_ROLES, parser: true, text: "The same code, colored for a compiler." },
  { reveal: ALL_ROLES, text: "And colored for you." },
];

// Act 2: one function grows, gets mixed up, and gets pulled apart.
const LEVEL_STEPS = [
  { frame: 0, text: "A function that reads like steps: [y:yellow] and [b:blue], no [r:red]." },
  { frame: 1, text: "Then the details creep in. [r:Red] piles up." },
  { frame: 2, text: "Pull them out. Each function is one level again." },
];

// One column, one left edge, for the whole page.
function Column({ className = "", children }) {
  return <div className={`mx-auto w-full max-w-2xl px-5 ${className}`}>{children}</div>;
}

export default function App() {
  return (
    <main>
      <Hero />
      <Scrolly steps={COLOR_STEPS.length}>
        {(step) => {
          const s = COLOR_STEPS[step];
          return (
            <Stage caption={s.text} step={step} steps={COLOR_STEPS.length} boxed={s.parser}>
              <div className="grid">
                <div className="[grid-area:1/1] transition-opacity duration-700" style={{ opacity: s.parser ? 0 : 1 }}>
                  <Code lines={tokens.colors[0]} reveal={s.reveal} focus={s.focus} />
                </div>
                <div
                  className="[grid-area:1/1] transition-opacity duration-700"
                  style={{ opacity: s.parser ? 1 : 0 }}
                  aria-hidden={!s.parser}
                >
                  <Code lines={tokens.colors[0]} variant="dark" />
                </div>
              </div>
            </Stage>
          );
        }}
      </Scrolly>
      <Scrolly steps={LEVEL_STEPS.length} per={110}>
        {(step) => (
          <Stage caption={LEVEL_STEPS[step].text} step={step} steps={LEVEL_STEPS.length}>
            <Code lines={tokens.levels[LEVEL_STEPS[step].frame]} />
          </Stage>
        )}
      </Scrolly>
      <Install />
      <Footer />
    </main>
  );
}

function Hero() {
  return (
    <header className="flex min-h-svh flex-col justify-center">
      <Column>
        <div className="flex items-center gap-4 sm:gap-5">
          <img src="/logo.png" alt="" aria-hidden="true" width="56" height="56" className="h-11 w-11 sm:h-14 sm:w-14" />
          <h1 className="text-4xl tracking-tight sm:text-5xl">neoplasticism</h1>
        </div>
        <p className="mt-5 text-lg leading-relaxed text-(--neo-silver) sm:text-xl">
          A theme made for humans to parse instead of compilers.
        </p>
        <p className="mt-20 text-sm text-(--neo-gray4)">scroll ↓</p>
      </Column>
    </header>
  );
}

const CAPTION_COLOR = { r: "--neo-literal", y: "--neo-variable", b: "--neo-function", g: "--neo-gray4" };

function Caption({ text }) {
  const parts = text.split(/(\[[rybg]:[^\]]+\])/).filter(Boolean);
  return parts.map((p, i) => {
    const m = p.match(/^\[([rybg]):([^\]]+)\]$/);
    return m ? (
      <span key={i} style={{ color: `var(${CAPTION_COLOR[m[1]]})` }}>
        {m[2]}
      </span>
    ) : (
      <span key={i}>{p}</span>
    );
  });
}

// The pinned view inside a Scrolly. Every stage anchors at the same height, so the
// caption never jumps between acts and code grows downward as lines arrive.
function Stage({ caption, step, steps, boxed = false, children }) {
  return (
    <div className="h-full pt-[16svh]">
      <Column>
        <div className="min-h-[3.75rem] sm:min-h-[2.25rem]" aria-live="polite">
          <AnimatePresence mode="wait">
            <motion.p
              key={caption}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
              className="text-base leading-relaxed sm:text-xl"
            >
              <Caption text={caption} />
            </motion.p>
          </AnimatePresence>
        </div>
        {/* Bleeds into the column padding, so the text stays on the column edge and only
            the background (the Dark+ step) extends past it. */}
        <div
          className="-mx-5 mt-8 px-5 py-4 transition-colors duration-700"
          style={{ background: boxed ? tokens.meta.darkBg : "transparent" }}
        >
          {children}
        </div>
        <div className="mt-6 flex gap-2" aria-hidden="true">
          {Array.from({ length: steps }, (_, i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 transition-colors duration-300"
              style={{ background: i === step ? "var(--neo-fg)" : "var(--neo-gray2)" }}
            />
          ))}
        </div>
      </Column>
    </div>
  );
}

function Install() {
  return (
    <section className="py-32">
      <Column>
        <h2 className="text-2xl tracking-tight sm:text-3xl">Try it</h2>
        <div className="mt-12 space-y-12">
          <Code lines={tokens.lazy[0]} wrap />
          <Code lines={tokens.everything[0]} wrap />
        </div>
        <p className="mt-12 text-sm leading-relaxed text-(--neo-silver)">
          VS Code and its forks: <a href="https://open-vsx.org/extension/brysontang/neoplasticism">Open VSX</a> or the{" "}
          <a href={`${REPO}/releases/latest`}>.vsix</a>. Ghostty, tmux, git, Blink, and base16 one at a time:{" "}
          <a href={`${REPO}#install`}>the README</a>.
        </p>
      </Column>
    </section>
  );
}

function Footer() {
  return (
    <footer className="pb-16">
      <Column>
        <div className="border-t border-(--neo-gray2) pt-12 text-sm leading-relaxed text-(--neo-gray4)">
          <p>
            Inspired by Logan Smith's{" "}
            <a href="https://www.youtube.com/watch?v=2OMRWPOSw9s">How to write the perfect function</a>, which points to
            Tony Van Eerd's <a href="https://www.youtube.com/watch?v=b4p_tcLYDV0">Value Oriented Programming</a>, which
            points to Sean Parent's{" "}
            <a href="https://www.youtube.com/watch?v=4moyKUHApq4">A Possible Future of Software Development</a>.
            Consider this the next link in the chain.
          </p>
          <p className="mt-6">
            <a href={REPO}>GitHub</a> · MIT
          </p>
        </div>
      </Column>
    </footer>
  );
}
