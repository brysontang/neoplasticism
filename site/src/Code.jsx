import { AnimatePresence, motion, useReducedMotion } from "motion/react";

export const ALL_ROLES = ["literal", "variable", "function"];
const EASE = [0.2, 0, 0, 1];

// What a Code block needs to size itself the same way across every frame it will show:
// the widest line (in characters, gutter included) and how many digits the gutter needs.
export function measure(frames) {
  const width = (line) => line.neo.reduce((n, t) => n + t.t.length, 0);
  const longest = Math.max(...frames.flatMap((f) => f.map(width)));
  const digits = String(Math.max(...frames.map((f) => f.length))).length;
  return { cols: longest + digits + 3, digits };
}

// One frame of tokenized code (from src/generated/tokens.json), with a line-number gutter.
//   variant "neo":  colored by role, and only the roles listed in `reveal` (see index.css)
//   variant "dark": Dark+ colors as tokenized
// Font size comes from the enclosing pane's width (an @container) so `fit.cols` characters
// fit, capped by `max` and by `vh` (default 2.4svh) so long snippets fit short screens.
// Lines animate in, out, and to new positions, keyed by content.
export function Code({ lines, fit, variant = "neo", reveal = ALL_ROLES, focus, wrap, max = 17, min = 9, vh }) {
  const reduce = useReducedMotion();
  return (
    <div
      className={["code", wrap && "code-wrap"].filter(Boolean).join(" ")}
      data-reveal={reveal.join(" ")}
      data-focus={focus}
      style={{ "--cols": fit.cols, "--digits": fit.digits, "--max": `${max}px`, "--min": `${min}px`, "--vh": vh }}
    >
      <AnimatePresence initial={false}>
        {lines.map((line, n) => (
          <motion.div
            key={line.key}
            className="line"
            layout={reduce ? false : "position"}
            initial={reduce ? false : { opacity: 0, height: 0 }}
            animate={{
              opacity: 1,
              height: "auto",
              transition: { height: { duration: 0.5, ease: EASE }, opacity: { duration: 0.35, delay: 0.25 } },
            }}
            exit={
              reduce
                ? { opacity: 0, transition: { duration: 0 } }
                : { opacity: 0, height: 0, transition: { opacity: { duration: 0.15 }, height: { duration: 0.45, ease: EASE } } }
            }
            transition={{ layout: { duration: 0.5, ease: EASE } }}
          >
            <span className="ln" aria-hidden="true">
              {n + 1}
            </span>
            <span className="src">
              {line[variant].length ? line[variant].map((t, i) => <Token key={i} t={t} variant={variant} />) : "​"}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function Token({ t, variant }) {
  if (variant === "dark") {
    return <span style={{ color: t.c, fontStyle: t.i ? "italic" : undefined }}>{t.t}</span>;
  }
  return <span className={`tok ${t.r}${t.i ? " i" : ""}`}>{t.t}</span>;
}
