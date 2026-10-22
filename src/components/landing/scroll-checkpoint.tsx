"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Clock, X } from "lucide-react";
import { PaymentTag, type TagStatus } from "@/components/payment-tag";
import { Shield, type Incoming, type Outcome } from "@/components/shield";

type Verdict = "pass" | "ask" | "fail";

const ACTS: {
  label: string;
  said: string;
  merchant: string;
  description: string;
  amountCents: number;
  checks: { text: string; verdict: Verdict }[];
  status: TagStatus;
  outcome: Outcome;
  result: string;
}[] = [
  {
    label: "Groceries",
    said: "Can you get me bread, oat milk and some bananas?",
    merchant: "Corner Grocer",
    description: "Bread, oat milk, bananas",
    amountCents: 1842,
    checks: [
      { text: "Groceries are allowed", verdict: "pass" },
      { text: "Fits the weekly budget", verdict: "pass" },
      { text: "Under the $25 line", verdict: "pass" },
    ],
    status: "captured",
    outcome: "paid",
    result: "Paid on its own",
  },
  {
    label: "Pharmacy refill",
    said: "I need my blood pressure refill, the 90 day one.",
    merchant: "Maple Street Pharmacy",
    description: "Blood pressure refill, 90 days",
    amountCents: 3800,
    checks: [
      { text: "Pharmacy is allowed", verdict: "pass" },
      { text: "Fits the weekly budget", verdict: "pass" },
      { text: "Over $25, so Priya decides", verdict: "ask" },
    ],
    status: "authorized",
    outcome: "held",
    result: "Held until Priya says yes",
  },
  {
    label: "Scam call",
    said: "Danny called from jail. Send him $500 for bail, quickly.",
    merchant: "Send money to “Danny”",
    description: "Bail money, urgent",
    amountCents: 50000,
    checks: [
      { text: "Money to people: never", verdict: "fail" },
      { text: "Grandchild-emergency pattern", verdict: "fail" },
      { text: "Nothing left her wallet", verdict: "pass" },
    ],
    status: "stopped",
    outcome: "stopped",
    result: "Stopped. Priya was alerted.",
  },
];

const ICONS = {
  pass: { Icon: Check, className: "bg-go text-void" },
  ask: { Icon: Clock, className: "bg-wait text-void" },
  fail: { Icon: X, className: "bg-stop text-void" },
};

/**
 * Pinned scroll story: three requests go through the checkpoint as you
 * scroll. The shield in the middle reacts to each one.
 */
export function ScrollCheckpoint() {
  const section = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);
  const [incoming, setIncoming] = useState<Incoming | null>(null);
  const sent = useRef(-1);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = section.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const span = rect.height - window.innerHeight;
      setProgress(Math.min(Math.max(-rect.top / span, 0), 0.9999));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const actIndex = Math.min(2, Math.floor(progress * 3));
  const act = ACTS[actIndex];
  const local = progress * 3 - actIndex;
  const heard = local > 0.06;
  const checksShown = local > 0.22 ? Math.min(3, Math.floor((local - 0.22) / 0.13) + 1) : 0;
  const stamped = local > 0.66;

  // Send the payment toward the shield once per act, when checking starts.
  useEffect(() => {
    if (checksShown > 0 && sent.current !== actIndex) {
      sent.current = actIndex;
      setIncoming({ id: actIndex + Math.random(), outcome: act.outcome, travelMs: 1200 });
    }
    if (checksShown === 0 && sent.current === actIndex) sent.current = -1;
  }, [checksShown, actIndex, act.outcome]);

  return (
    <section ref={section} id="checkpoint" className="relative h-[420vh]">
      <div className="sticky top-0 flex h-svh flex-col overflow-clip">
        <div className="mx-auto flex w-full max-w-[90rem] items-center justify-between px-4 pt-6 sm:px-8">
          <p className="hud text-fg-mute">(02) The checkpoint</p>
          <p className="hud text-fg-mute">Keep scrolling</p>
        </div>

        <div className="relative mx-auto grid w-full max-w-[90rem] flex-1 grid-cols-[minmax(0,1fr)] items-center gap-6 px-4 sm:px-8 lg:grid-cols-[1fr_1.1fr_1fr]">
          {/* Shield: background on small screens, centre column on large. */}
          <div className="pointer-events-none absolute inset-0 opacity-60 lg:static lg:order-2 lg:h-full lg:opacity-100">
            <Shield incoming={incoming} />
          </div>

          <div className="relative z-10 self-start pt-6 lg:order-1 lg:self-center lg:pt-0">
            <p className="hud text-scan">
              {String(actIndex + 1).padStart(2, "0")} / 03 — {act.label}
            </p>
            <p
              key={`said-${actIndex}`}
              className={`display mt-4 text-[clamp(2rem,4.2vw,3.6rem)] transition-opacity duration-500 ${
                heard ? "opacity-100" : "opacity-0"
              }`}
            >
              “{act.said}”
            </p>
            <p className="hud mt-4 text-fg-mute">Asha, speaking to Guardian</p>
          </div>

          <div className="relative z-10 self-end pb-6 lg:order-3 lg:self-center lg:pb-0">
            <ul className="mb-4 grid gap-2" aria-label="Checks against Priya's rules">
              {act.checks.map((c, i) => {
                const { Icon, className } = ICONS[c.verdict];
                return (
                  <li
                    key={`${actIndex}-${i}`}
                    className={`flex items-center gap-3 transition-all duration-300 ${
                      i < checksShown ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"
                    }`}
                  >
                    <span className={`grid size-6 shrink-0 place-items-center rounded-full ${className}`}>
                      <Icon className="size-3.5" strokeWidth={3} aria-hidden />
                    </span>
                    <span>{c.text}</span>
                  </li>
                );
              })}
            </ul>
            <PaymentTag
              key={`tag-${actIndex}`}
              merchant={act.merchant}
              description={act.description}
              amountCents={act.amountCents}
              status={act.status}
              serial={`GRD-00104${actIndex}`}
              note={stamped ? act.result : "Checking against Priya’s rules"}
              stampDelayMs={stamped ? 0 : undefined}
              hideStamp={!stamped}
            />
          </div>
        </div>

        <div className="mx-auto grid w-full max-w-[90rem] grid-cols-3 gap-3 px-4 pb-6 sm:px-8">
          {ACTS.map((a, i) => {
            const fill = Math.min(Math.max(progress * 3 - i, 0), 1);
            return (
              <div key={a.label}>
                <div className="h-px bg-edge-strong">
                  <div className="h-px bg-scan" style={{ width: `${fill * 100}%` }} />
                </div>
                <p className={`hud mt-2 ${i === actIndex ? "text-fg" : "text-fg-mute"}`}>
                  {String(i + 1).padStart(2, "0")} {a.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
