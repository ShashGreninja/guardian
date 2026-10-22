"use client";

import { useEffect, useRef } from "react";

export type Outcome = "paid" | "held" | "stopped";

/** A payment flying toward the shield. Change `id` to send a new one. */
export type Incoming = { id: number; outcome: Outcome; travelMs: number };

type Point = { x: number; y: number };
type Thread = {
  id: number;
  outcome: Outcome;
  angle: number;
  born: number;
  travelMs: number;
  trail: Point[];
  arrived: boolean;
  persistent: boolean;
};
type Spark = Point & { vx: number; vy: number; born: number };
type Ripple = { born: number; color: string };

const COLORS: Record<Outcome, string> = {
  paid: "63,191,143",
  held: "232,163,23",
  stopped: "255,90,60",
};

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * The guardian shield: guilloché rings rendered live, with iridescent ink.
 * Payments arrive as glowing threads. Paid ones pass to the core, held ones
 * orbit the rim, stopped ones shatter against it.
 */
export function Shield({
  incoming,
  holds = 0,
  className = "",
}: {
  incoming?: Incoming | null;
  /** Number of payments currently on hold; they orbit the rim. */
  holds?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const state = useRef({
    threads: [] as Thread[],
    sparks: [] as Spark[],
    ripples: [] as Ripple[],
    bloom: null as { born: number; color: string } | null,
    lastIncoming: -1,
  });

  // New incoming payment: replace any transient threads with it.
  useEffect(() => {
    if (!incoming || incoming.id === state.current.lastIncoming) return;
    const s = state.current;
    s.lastIncoming = incoming.id;
    s.threads = s.threads.filter((t) => t.persistent);
    s.threads.push({
      id: incoming.id,
      outcome: incoming.outcome,
      angle: -Math.PI / 2 + (Math.random() - 0.5) * 1.6,
      born: performance.now(),
      travelMs: incoming.travelMs,
      trail: [],
      arrived: false,
      persistent: false,
    });
  }, [incoming]);

  // Standing holds orbit the rim.
  useEffect(() => {
    const s = state.current;
    const current = s.threads.filter((t) => t.persistent);
    if (current.length === holds) return;
    s.threads = s.threads.filter((t) => !t.persistent);
    for (let i = 0; i < holds; i++) {
      s.threads.push({
        id: -1 - i,
        outcome: "held",
        angle: (i / Math.max(holds, 1)) * Math.PI * 2,
        born: performance.now() - 10_000,
        travelMs: 1,
        trail: [],
        arrived: true,
        persistent: true,
      });
    }
  }, [holds]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let visible = true;
    let frame = 0;
    let last = performance.now();

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduced) draw(4000);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !reduced) loop();
    });
    io.observe(canvas);

    function draw(now: number) {
      const s = state.current;
      const cx = width / 2;
      const cy = height / 2;
      const R = Math.min(width, height) * 0.36;
      const dt = Math.min(now - last, 50);
      last = now;

      ctx!.clearRect(0, 0, width, height);
      ctx!.globalCompositeOperation = "lighter";

      // Core glow, tinted by the most recent outcome.
      const bloomAge = s.bloom ? now - s.bloom.born : Infinity;
      const bloomColor = bloomAge < 1600 ? s.bloom!.color : "70,170,190";
      const bloomBoost = bloomAge < 1600 ? 1 - bloomAge / 1600 : 0;
      const core = ctx!.createRadialGradient(cx, cy, 0, cx, cy, R * 1.1);
      core.addColorStop(0, `rgba(${bloomColor},${0.22 + 0.35 * bloomBoost})`);
      core.addColorStop(1, "rgba(0,0,0,0)");
      ctx!.fillStyle = core;
      ctx!.fillRect(0, 0, width, height);

      // Guilloché rings with drifting phase and iridescent hue.
      const rings = 9;
      const steps = 300;
      for (let i = 0; i < rings; i++) {
        const base = R * (0.24 + (0.76 * i) / (rings - 1));
        const amp = R * (0.035 + 0.02 * (i % 3));
        const petals = 8 + i * 2;
        const dir = i % 2 ? 1 : -1;
        const phase = now * 0.00012 * dir * (1 + i * 0.08);
        const hue = 168 + i * 9 + Math.sin(now * 0.0004 + i) * 18;
        ctx!.beginPath();
        for (let k = 0; k <= steps; k++) {
          const t = (k / steps) * Math.PI * 2;
          const r = base + amp * Math.cos(petals * t + phase) + amp * 0.4 * Math.cos(3 * petals * t - phase);
          const x = cx + r * Math.cos(t);
          const y = cy + r * Math.sin(t);
          if (k) ctx!.lineTo(x, y);
          else ctx!.moveTo(x, y);
        }
        ctx!.strokeStyle = `hsla(${hue}, 75%, 70%, ${0.2 + 0.06 * (i % 2)})`;
        ctx!.lineWidth = 1.1;
        ctx!.stroke();
      }

      // Rim.
      const heldNow = s.threads.some((t) => t.outcome === "held" && t.arrived);
      ctx!.beginPath();
      ctx!.arc(cx, cy, R * 1.04, 0, Math.PI * 2);
      ctx!.strokeStyle = heldNow
        ? `rgba(${COLORS.held},${0.35 + 0.2 * Math.sin(now * 0.004)})`
        : "rgba(160,220,230,0.22)";
      ctx!.lineWidth = heldNow ? 2 : 1.2;
      ctx!.stroke();

      // Ripples from stopped payments.
      s.ripples = s.ripples.filter((r) => now - r.born < 1100);
      for (const r of s.ripples) {
        const p = (now - r.born) / 1100;
        ctx!.beginPath();
        ctx!.arc(cx, cy, R * (1.04 + p * 0.5), 0, Math.PI * 2);
        ctx!.strokeStyle = `rgba(${r.color},${0.7 * (1 - p)})`;
        ctx!.lineWidth = 3 * (1 - p) + 0.5;
        ctx!.stroke();
      }

      // Threads.
      for (const th of s.threads) {
        const color = COLORS[th.outcome];
        let r: number;
        let angle: number;
        if (!th.arrived) {
          const p = easeInOut(Math.min((now - th.born) / th.travelMs, 1));
          const start = R * 1.75;
          const target = th.outcome === "paid" ? 0 : th.outcome === "held" ? R * 1.04 : R * 1.07;
          r = start + (target - start) * p;
          angle = th.angle + p * 1.3;
          if (p >= 1) {
            th.arrived = true;
            th.angle = angle;
            if (th.outcome === "stopped") {
              const hx = cx + r * Math.cos(angle);
              const hy = cy + r * Math.sin(angle);
              for (let k = 0; k < 22; k++) {
                const a = angle + (Math.random() - 0.5) * 2.2;
                const v = 0.08 + Math.random() * 0.22;
                s.sparks.push({ x: hx, y: hy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, born: now });
              }
              s.ripples.push({ born: now, color });
              s.bloom = { born: now, color };
            } else {
              s.bloom = { born: now, color };
            }
          }
        } else if (th.outcome === "held") {
          th.angle += dt * 0.00035;
          r = R * 1.04;
          angle = th.angle;
        } else {
          continue;
        }

        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        th.trail.push({ x, y });
        if (th.trail.length > 26) th.trail.shift();

        for (let k = 1; k < th.trail.length; k++) {
          const a = k / th.trail.length;
          ctx!.beginPath();
          ctx!.moveTo(th.trail[k - 1].x, th.trail[k - 1].y);
          ctx!.lineTo(th.trail[k].x, th.trail[k].y);
          ctx!.strokeStyle = `rgba(${color},${a * 0.8})`;
          ctx!.lineWidth = a * 3.5;
          ctx!.stroke();
        }
        const glow = ctx!.createRadialGradient(x, y, 0, x, y, 22);
        glow.addColorStop(0, `rgba(${color},1)`);
        glow.addColorStop(0.25, `rgba(${color},0.6)`);
        glow.addColorStop(1, `rgba(${color},0)`);
        ctx!.fillStyle = glow;
        ctx!.fillRect(x - 22, y - 22, 44, 44);
      }
      s.threads = s.threads.filter((t) => t.persistent || !t.arrived || t.outcome === "held");

      // Sparks.
      s.sparks = s.sparks.filter((sp) => now - sp.born < 900);
      for (const sp of s.sparks) {
        const age = now - sp.born;
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        ctx!.fillStyle = `rgba(${COLORS.stopped},${1 - age / 900})`;
        ctx!.fillRect(sp.x - 1.5, sp.y - 1.5, 3, 3);
      }

      ctx!.globalCompositeOperation = "source-over";
    }

    function loop() {
      cancelAnimationFrame(frame);
      const tick = (now: number) => {
        if (!visible || document.hidden) return;
        draw(now);
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }

    const onVisibility = () => {
      if (!document.hidden && visible && !reduced) loop();
    };
    document.addEventListener("visibilitychange", onVisibility);

    resize();
    if (!reduced) loop();

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className={`block h-full w-full ${className}`} />;
}
