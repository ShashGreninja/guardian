"use client";

import { useEffect, useState } from "react";
import { Check, Clock, X } from "lucide-react";
import { PaymentTag, type TagStatus } from "./payment-tag";

type Verdict = "pass" | "ask" | "fail";

type Scenario = {
  id: string;
  label: string;
  said: string;
  merchant: string;
  description: string;
  amountCents: number;
  checks: { text: string; verdict: Verdict }[];
  status: TagStatus;
  outcome: string;
};

const SCENARIOS: Scenario[] = [
  {
    id: "groceries",
    label: "Groceries",
    said: "Can you get me bread, oat milk and some bananas?",
    merchant: "Corner Grocer",
    description: "Bread, oat milk, bananas",
    amountCents: 1842,
    checks: [
      { text: "Groceries are on the allowed list", verdict: "pass" },
      { text: "$18.42 of $60 left this week", verdict: "pass" },
      { text: "Under the $25 auto-approve line", verdict: "pass" },
    ],
    status: "captured",
    outcome: "Paid automatically",
  },
  {
    id: "pharmacy",
    label: "Pharmacy refill",
    said: "I need my blood pressure refill, the 90 day one.",
    merchant: "Maple Street Pharmacy",
    description: "Blood pressure refill, 90 days",
    amountCents: 3800,
    checks: [
      { text: "Pharmacy is on the allowed list", verdict: "pass" },
      { text: "Inside the weekly budget", verdict: "pass" },
      { text: "Over $25, so Priya decides", verdict: "ask" },
    ],
    status: "authorized",
    outcome: "Held. Priya got a request to approve.",
  },
  {
    id: "scam",
    label: "Scam call",
    said: "Danny called from jail. Send him $500 for bail, quickly.",
    merchant: "Send money to “Danny”",
    description: "Bail money, urgent",
    amountCents: 50000,
    checks: [
      { text: "Sending money to people is never allowed", verdict: "fail" },
      { text: "Urgency and secrecy: grandchild emergency pattern", verdict: "fail" },
      { text: "No money left her wallet", verdict: "pass" },
    ],
    status: "stopped",
    outcome: "Stopped. Priya was alerted.",
  },
];

// Timeline of one run, in ms from the start.
const LISTEN = 0;
const HEARD = 1100;
const CHECK_START = 2000;
const CHECK_GAP = 650;
const STAMP = CHECK_START + CHECK_GAP * 3 + 200;
const NEXT = STAMP + 2600;

const ICONS = {
  pass: { Icon: Check, className: "bg-guard text-surface" },
  ask: { Icon: Clock, className: "bg-hold text-ink" },
  fail: { Icon: X, className: "bg-alarm text-surface" },
};

const MILESTONES = [HEARD, CHECK_START, CHECK_START + CHECK_GAP, CHECK_START + CHECK_GAP * 2, STAMP];

export function CheckpointDemo() {
  // `run` changes on every replay so the timeline restarts even for the same scenario.
  const [{ index, run }, setRun] = useState({ index: 0, run: 0 });
  const [elapsed, setElapsed] = useState(LISTEN);
  const [autoplay, setAutoplay] = useState(true);
  const scenario = SCENARIOS[index];

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = setTimeout(() => setElapsed(NEXT), 0);
      return () => clearTimeout(t);
    }
    const timers = [setTimeout(() => setElapsed(LISTEN), 0)];
    for (const at of MILESTONES) timers.push(setTimeout(() => setElapsed(at), at));
    if (autoplay && index < SCENARIOS.length - 1) {
      timers.push(setTimeout(() => setRun((r) => ({ index: r.index + 1, run: r.run + 1 })), NEXT));
    }
    return () => timers.forEach(clearTimeout);
  }, [index, run, autoplay]);

  function play(i: number) {
    setAutoplay(false);
    setRun((r) => ({ index: i, run: r.run + 1 }));
  }

  const heard = elapsed >= HEARD;
  const checksShown = Math.max(0, Math.min(3, Math.floor((elapsed - CHECK_START) / CHECK_GAP) + 1));
  const stamped = elapsed >= STAMP;

  return (
    <DemoFrame>
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-hold font-display text-lg font-extrabold text-ink">
          A
        </span>
        <div className="min-h-[5.5rem] flex-1 rounded-2xl rounded-tl-sm bg-surface/10 px-4 py-3">
          {heard ? (
            <p key={`${scenario.id}-${run}`} className="animate-rise text-lg leading-snug text-surface">
              “{scenario.said}”
            </p>
          ) : (
            <Waveform />
          )}
          <p className="mt-1 text-sm text-surface/60">Asha, speaking to Guardian</p>
        </div>
      </div>

      <ol className="mt-6 grid gap-2.5" aria-label="Checks against Priya's rules">
        {scenario.checks.map((c, i) => {
          const { Icon, className } = ICONS[c.verdict];
          const shown = i < checksShown;
          return (
            <li
              key={`${scenario.id}-${run}-${i}`}
              className={`flex items-center gap-3 transition-opacity duration-300 ${shown ? "opacity-100" : "opacity-0"}`}
            >
              <span className={`grid size-6 shrink-0 place-items-center rounded-full ${className}`}>
                <Icon className="size-4" strokeWidth={3} aria-hidden />
              </span>
              <span className="text-surface/90">{c.text}</span>
            </li>
          );
        })}
      </ol>

      <div className="mt-6 text-ink">
        {heard ? (
          <PaymentTag
            key={`${scenario.id}-${run}`}
            className="animate-rise"
            merchant={scenario.merchant}
            description={scenario.description}
            amountCents={scenario.amountCents}
            status={scenario.status}
            serial={`GRD-${String(1040 + index).padStart(6, "0")}`}
            note={stamped ? scenario.outcome : "Checking against Priya’s rules"}
            stampDelayMs={stamped ? 0 : undefined}
            hideStamp={!stamped}
          />
        ) : (
          <div className="h-[9.25rem] rounded-2xl border-2 border-dashed border-surface/15" />
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Try a scenario">
        {SCENARIOS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => play(i)}
            aria-pressed={i === index}
            className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
              i === index
                ? "bg-surface text-ink"
                : "text-surface/80 shadow-[inset_0_0_0_2px_rgb(251_252_249/0.25)] hover:text-surface"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </DemoFrame>
  );
}

function DemoFrame({ children }: { children?: React.ReactNode }) {
  return (
    <div className="relative isolate overflow-clip rounded-[28px] bg-ink p-5 text-surface shadow-[0_40px_80px_-40px_rgb(16_36_63/0.9)] sm:p-7">
      <div
        aria-hidden
        className="rosette pointer-events-none absolute -right-40 -bottom-48 -z-10 size-[30rem] text-surface/[0.07]"
      />
      {children}
    </div>
  );
}

function Waveform() {
  return (
    <div className="flex h-8 items-center gap-1" aria-label="Listening">
      {Array.from({ length: 22 }, (_, i) => (
        <span
          key={i}
          className="h-full w-1 origin-center rounded-full bg-hold"
          style={{
            animation: `wave ${700 + ((i * 137) % 500)}ms ease-in-out ${(i * 53) % 400}ms infinite`,
          }}
        />
      ))}
    </div>
  );
}
