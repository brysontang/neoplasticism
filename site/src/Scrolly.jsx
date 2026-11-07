import { useEffect, useRef, useState } from "react";

// A tall section whose window stays pinned while the reader scrolls past `steps`
// invisible markers, each `per` svh tall. The marker crossing the middle of the
// viewport is the active step, so scrolling back up rewinds.
export function Scrolly({ id, steps, per = 85, onStep, children }) {
  const [active, setActive] = useState(0);
  const markers = useRef([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number(e.target.dataset.step));
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    markers.current.forEach((m) => m && io.observe(m));
    return () => io.disconnect();
  }, [steps]);

  useEffect(() => onStep?.(active), [active, onStep]);

  return (
    <section id={id} data-window={id} className="relative" style={{ height: `calc(${steps * per}svh + 100svh)` }}>
      <div className="absolute inset-x-0" style={{ top: "50svh" }} aria-hidden="true">
        {Array.from({ length: steps }, (_, i) => (
          <div key={i} ref={(el) => (markers.current[i] = el)} data-step={i} style={{ height: `${per}svh` }} />
        ))}
      </div>
      <div className="window sticky top-0">{children(active)}</div>
    </section>
  );
}
