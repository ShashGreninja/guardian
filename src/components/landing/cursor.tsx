"use client";

import { useEffect, useRef } from "react";

/**
 * A ring that trails the pointer and opens up over anything clickable.
 * The real cursor stays visible; this only adds presence.
 */
export function Cursor() {
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ring.current;
    if (!el) return;
    if (
      window.matchMedia("(pointer: coarse)").matches ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    let x = -100;
    let y = -100;
    let cx = x;
    let cy = y;
    let scale = 1;
    let target = 1;
    let frame = 0;

    const move = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      const hit = (e.target as Element | null)?.closest("a, button, [data-cursor]");
      target = hit ? 2.2 : 1;
      el.style.opacity = "1";
    };
    const leave = () => (el.style.opacity = "0");

    const tick = () => {
      cx += (x - cx) * 0.2;
      cy += (y - cy) * 0.2;
      scale += (target - scale) * 0.18;
      el.style.transform = `translate3d(${cx - 16}px, ${cy - 16}px, 0) scale(${scale.toFixed(3)})`;
      frame = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", move);
    document.addEventListener("pointerleave", leave);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <div
      ref={ring}
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-[90] size-8 rounded-full border border-scan opacity-0 mix-blend-difference transition-opacity duration-300"
    />
  );
}
