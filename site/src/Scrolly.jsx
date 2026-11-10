import { useEffect, useRef, useState } from "react";

// A tall section whose window stays pinned while the reader scrolls past `steps`
// invisible bands, each `per` svh tall. The band under the middle of the viewport is the
// active step, so scrolling back up rewinds.
//
// The step is derived from where the track sits, not from crossing events, so it is right
// however the reader got here: a reload mid-page, a jump from the status line, or arriving
// from below (which lands on the last step, not the one they left).
export function Scrolly({ id, title, steps, per = 85, onStep, children }) {
  const [active, setActive] = useState(0);
  const track = useRef(null);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const r = track.current.getBoundingClientRect();
      if (!r.height) return;
      const band = Math.floor(((window.innerHeight / 2 - r.top) / r.height) * steps);
      setActive(Math.min(steps - 1, Math.max(0, band)));
    };
    const queue = () => {
      frame ||= requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
    };
  }, [steps]);

  useEffect(() => onStep?.(active), [active, onStep]);

  return (
    <section
      id={id}
      data-window={id}
      aria-labelledby={`${id}-title`}
      className="relative"
      style={{ height: `calc(${steps * per}svh + 100svh)` }}
    >
      <h2 id={`${id}-title`} className="sr-only">
        {title}
      </h2>
      <div
        ref={track}
        className="pointer-events-none absolute inset-x-0"
        style={{ top: "50svh", height: `${steps * per}svh` }}
        aria-hidden="true"
      />
      <div className="window sticky top-0">{children(active)}</div>
    </section>
  );
}
