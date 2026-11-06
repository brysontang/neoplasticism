import { AnimatePresence, motion, useReducedMotion } from "motion/react";

export const ALL_ROLES = ["literal", "variable", "function"];
const EASE = [0.2, 0, 0, 1];

// One frame of tokenized code (from src/generated/tokens.json).
//   variant "neo":  colored by role, and only the roles listed in `reveal` (see index.css)
//   variant "dark": Dark+ colors as tokenized
// Lines animate in, out, and to new positions, keyed by content.
export function Code({ lines, variant = "neo", reveal = ALL_ROLES, focus, wrap }) {
  const reduce = useReducedMotion();
  return (
    <div
      className={["code", wrap && "code-wrap"].filter(Boolean).join(" ")}
      data-reveal={reveal.join(" ")}
      data-focus={focus}
    >
      <AnimatePresence initial={false}>
        {lines.map((line) => (
          <motion.div
            key={line.key}
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
            {line[variant].length ? line[variant].map((t, i) => <Token key={i} t={t} variant={variant} />) : "​"}
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
