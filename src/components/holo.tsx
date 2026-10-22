"use client";

import { useRef, type ReactNode } from "react";

/**
 * Holographic foil, like the security hologram on a banknote. The card tilts
 * toward the pointer and an iridescent sheen moves across the guilloché.
 */
export function Holo({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  function move(e: React.PointerEvent) {
    const el = ref.current;
    if (!el || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--hx", x.toFixed(3));
    el.style.setProperty("--hy", y.toFixed(3));
    el.style.setProperty("--tilt-x", `${((0.5 - y) * 10).toFixed(2)}deg`);
    el.style.setProperty("--tilt-y", `${((x - 0.5) * 12).toFixed(2)}deg`);
  }

  function leave() {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--tilt-x", "0deg");
    el.style.setProperty("--tilt-y", "0deg");
  }

  return (
    <div ref={ref} onPointerMove={move} onPointerLeave={leave} className={`holo ${className}`}>
      {children}
    </div>
  );
}
