"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Wraps a section and fades it in (opacity 0 → 1, translateY 20px → 0,
 * 0.6s ease) the first time it enters the viewport.
 *
 * - Uses IntersectionObserver (no library).
 * - Respects prefers-reduced-motion → renders fully visible immediately.
 * - Once shown, the observer disconnects so we don't pay for repeat
 *   intersection callbacks while the user scrolls back and forth.
 */
export function ScrollFadeIn({
  children,
  threshold = 0.12,
  rootMargin = "0px 0px -10% 0px",
  delay = 0,
}: {
  children:   React.ReactNode;
  threshold?: number;
  rootMargin?: string;
  delay?:     number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  /* Start visible during SSR and during the brief pre-hydration window so
   * the page renders correctly without JS. The observer flips this back
   * to false on mount (the effect runs after first paint, briefly visible
   * is fine + better than hiding content from anyone on slow JS). */
  const [shown, setShown] = useState(true);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    /* Respect motion preferences. */
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setShown(true); return; }

    setShown(false);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold, rootMargin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return (
    <div
      ref={ref}
      style={{
        opacity:    shown ? 1 : 0,
        transform:  shown ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
        willChange: shown ? "auto" : "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}
