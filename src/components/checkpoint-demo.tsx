"use client";

import { useEffect, useState } from "react";
import { Check, Clock, X } from "lucide-react";
import { PaymentTag, type TagStatus } from "./payment-tag";
import { Shield, type Outcome } from "./shield";

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
  outcome: Outcome;
  result: string;
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
      { text: "Groceries allowed", verdict: "pass" },
      { text: "Fits the weekly budget", verdict: "pass" },
      { text: "Under $25", verdict: "pass" },
    ],
    status: "captured",
    outcome: "paid",
    result: "Paid automatically",
  },
  {
    id: "pharmacy",
    label: "Pharmacy refill",
    said: "I need my blood pressure refill, the 90 day one.",
    merchant: "Maple Street Pharmacy",
    description: "Blood pressure refill, 90 days",
    amountCents: 3800,
    checks: [
      { text: "Pharmacy allowed", verdict: "pass" },
      { text: "Fits the weekly budget", verdict: "pass" },
      { text: "Over $25: Priya decides", verdict: "ask" },
    ],
    status: "authorized",
    outcome: "held",
    result: "Held for Priya to approve",
  },
  {
    id: "scam",
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

// Timeline of one run, in ms from the start.
const HEARD = 1100;
const CHECK_START = 1900;
const CHECK_GAP = 600;
const STAMP = CHECK_START + CHECK_GAP * 3 + 250;
const NEXT = STAMP + 2800;
const MILESTONES = [HEARD, CHECK_START, CHECK_START + CHECK_GAP, CHECK_START + CHECK_GAP * 2, STAMP];

const ICONS = {
  pass: { Icon: Check, className: "bg-guard text-surface" },
  ask: { Icon: Clock, className: "bg-hold text-ink" },
  fail: { Icon: X, className: "bg-alarm text-surface" },
};

export function CheckpointDemo() {
  // `run` changes on every replay so the timeline restarts even for the same scenario.
  const [{ index, run }, setRun] = useState({ index: 0, run: 0 });
  const [elapsed, setElapsed] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const scenario = SCENARIOS[index];

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = setTimeout(() => setElapsed(NEXT), 0);
      return () => clearTimeout(t);
    }
    const timers = [setTimeout(() => setElapsed(0), 0)];
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
    <div>
      <div className="relative h-[38rem] sm:h-[40rem]">
        <div className="absolute inset-0 -mx-6 sm:mx-0">
          <Shield
            incoming={heard ? { id: run, outcome: scenario.outcome, travelMs: STAMP - HEARD } : null}
          />
        </div>

        <div className="relative z-10 flex h-full flex-col justify-between py-2">
          <div className="flex max-w-md items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-hold font-display text-lg font-extrabold text-ink">
              A
            </span>
            <div className="min-h-[5.5rem] flex-1 rounded-2xl rounded-tl-sm bg-ink/70 px-4 py-3 ring-1 ring-surface/15 backdrop-blur-md">
              {heard ? (
                <p key={`${scenario.id}-${run}`} className="animate-rise text-lg leading-snug">
                  “{scenario.said}”
                </p>
              ) : (
                <Waveform />
              )}
              <p className="mt-1 text-sm text-surface/60">Asha, speaking to Guardian</p>
            </div>
          </div>

          <div className="ml-auto w-full max-w-md">
            <ul className="mb-3 flex flex-wrap justify-end gap-2" aria-label="Checks against Priya's rules">
              {scenario.checks.map((c, i) => {
                const { Icon, className } = ICONS[c.verdict];
                return (
                  <li
                    key={`${scenario.id}-${run}-${i}`}
                    className={`flex items-center gap-2 rounded-full bg-ink/75 py-1 pr-3 pl-1 text-sm ring-1 ring-surface/15 backdrop-blur-md transition-all duration-300 ${
                      i < checksShown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                    }`}
                  >
                    <span className={`grid size-6 place-items-center rounded-full ${className}`}>
                      <Icon className="size-3.5" strokeWidth={3} aria-hidden />
                    </span>
                    {c.text}
                  </li>
                );
              })}
            </ul>
            <div className="text-ink">
              {heard ? (
                <PaymentTag
                  key={`${scenario.id}-${run}`}
                  className="animate-rise"
                  merchant={scenario.merchant}
                  description={scenario.description}
                  amountCents={scenario.amountCents}
                  status={scenario.status}
                  serial={`GRD-${String(1040 + run).padStart(6, "0")}`}
                  note={stamped ? scenario.result : "Checking against Priya’s rules"}
                  stampDelayMs={stamped ? 0 : undefined}
                  hideStamp={!stamped}
                />
              ) : (
                <div className="h-[9.5rem] rounded-2xl border-2 border-dashed border-surface/15" />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2" role="group" aria-label="Try a scenario">
        <span className="mr-1 text-surface/70">Watch Guardian handle</span>
        {SCENARIOS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => play(i)}
            aria-pressed={i === index}
            className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
              i === index
                ? "bg-surface text-ink"
                : "text-surface/85 shadow-[inset_0_0_0_2px_rgb(251_252_249/0.25)] hover:text-surface hover:shadow-[inset_0_0_0_2px_rgb(251_252_249/0.6)]"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
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
