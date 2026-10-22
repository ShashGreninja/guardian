"use client";

import { useTransition } from "react";
import { ShieldAlert } from "lucide-react";
import { Stamp } from "@/components/payment-tag";
import { formatMoney } from "@/lib/money";
import { markAlertHandled } from "./actions";

export type AlertItem = {
  id: string;
  recipient: string;
  amountCents: number | null;
  said: string;
  pattern: string;
  risk: "high" | "medium" | "low";
  explanation: string;
  advice: string;
  when: string;
};

/** Blocked requests to send money to a person. Shown first, in red. */
export function Alerts({ alerts, parentName }: { alerts: AlertItem[]; parentName: string }) {
  const [pending, start] = useTransition();
  if (alerts.length === 0) return null;

  return (
    <section className="relative overflow-clip rounded-[26px] border border-stop/40 bg-[linear-gradient(135deg,rgb(255_90_60/0.14),rgb(255_90_60/0.03))] p-7 sm:p-9 lg:col-span-12">
      <div className="flex flex-wrap items-center gap-3">
        <ShieldAlert className="size-6 text-stop" aria-hidden />
        <h2 className="hud text-stop">Scam shield · {alerts.length} blocked</h2>
      </div>
      <ul className="mt-6 grid gap-6">
        {alerts.map((a) => (
          <li key={a.id} className="grid gap-5 border-t border-stop/20 pt-6 first:border-0 first:pt-0 lg:grid-cols-[1fr_auto] lg:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-4">
                <Stamp status="stopped" size="sm" onDark />
                <p className="font-display text-2xl font-bold">
                  {a.amountCents ? formatMoney(a.amountCents) : "Money"} to {a.recipient}
                </p>
                <span className="hud rounded-full border border-stop/40 px-2.5 py-1 text-stop">
                  {a.pattern} · {a.risk} risk
                </span>
              </div>
              <p className="mt-4 max-w-[60ch] text-lg">
                {parentName} said: <span className="text-fg-soft">“{a.said}”</span>
              </p>
              <p className="mt-3 max-w-[60ch] text-fg-soft">{a.explanation}</p>
              <p className="mt-3 max-w-[60ch] font-bold">{a.advice}</p>
              <p className="hud mt-4 text-fg-mute">{a.when} · No money moved</p>
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={() => start(async () => void (await markAlertHandled(a.id)))}
              className="btn btn-quiet justify-self-start"
            >
              Mark as handled
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
