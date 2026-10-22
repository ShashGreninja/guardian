"use client";

import { useState, useTransition } from "react";
import { CheckList } from "@/components/check-list";
import { Stamp } from "@/components/payment-tag";
import type { Check, Verdict } from "@/lib/policy";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/rules";
import { simulateAction } from "./actions";

const OUTCOME: Record<Verdict, { stamp: "captured" | "authorized" | "stopped"; text: string }> = {
  pass: { stamp: "captured", text: "Guardian would pay this on its own." },
  ask: { stamp: "authorized", text: "Guardian would hold the money and ask you." },
  stop: { stamp: "stopped", text: "Guardian would refuse. No money would move." },
};

export function Simulator({ parentName }: { parentName: string }) {
  const [merchant, setMerchant] = useState("Maple Street Pharmacy");
  const [category, setCategory] = useState<Category>("pharmacy");
  const [amount, setAmount] = useState("38.00");
  const [toPerson, setToPerson] = useState(false);
  const [result, setResult] = useState<{ verdict: Verdict; checks: Check[]; run: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await simulateAction({ merchant, category, amount, toPerson });
      // `run` remounts the result so the stamp lands again on every check.
      if (r.ok) setResult((prev) => ({ verdict: r.verdict, checks: r.checks, run: (prev?.run ?? 0) + 1 }));
      else {
        setResult(null);
        setError(r.error);
      }
    });
  }

  return (
    <section className="panel lg:sticky lg:top-24">
      <h2 className="hud relative text-fg-mute">Simulator</h2>
      <p className="relative mt-3 font-display text-xl font-bold">What if {parentName} asked for…</p>
      <p className="relative mt-1 text-fg-soft">
        Test a purchase against the signed rules. Nothing is held or paid.
      </p>

      <form onSubmit={run} className="relative mt-7 grid gap-5">
        <div
          className="grid grid-cols-2 gap-1 rounded-full border border-edge-strong p-1"
          role="radiogroup"
          aria-label="Who gets the money"
        >
          {[
            { value: false, label: "A store" },
            { value: true, label: "A person" },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              role="radio"
              aria-checked={toPerson === o.value}
              onClick={() => setToPerson(o.value)}
              className={`rounded-full py-2 font-bold transition-colors ${
                toPerson === o.value ? "bg-fg text-void" : "text-fg-soft hover:text-fg"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        <label className="grid gap-2">
          <span className="font-bold">{toPerson ? "Who" : "Store"}</span>
          <input
            className="field"
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
          />
        </label>

        {!toPerson && (
          <label className="grid gap-2">
            <span className="font-bold">Kind of store</span>
            <select
              className="field"
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="grid gap-2">
          <span className="font-bold">Amount in USD</span>
          <input
            className="field"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>

        {error && <p className="text-stop">{error}</p>}
        <button className="btn btn-primary justify-self-start" disabled={pending}>
          {pending ? "Checking…" : "Check it"}
        </button>
      </form>

      {result && (
        <div
          key={result.run}
          className="relative mt-6 animate-rise border-t border-dashed border-edge-strong pt-5"
        >
          <div className="flex flex-wrap items-center gap-4">
            <Stamp status={OUTCOME[result.verdict].stamp} delayMs={0} onDark />
            <p className="font-bold">{OUTCOME[result.verdict].text}</p>
          </div>
          <div className="mt-4">
            <CheckList checks={result.checks} />
          </div>
        </div>
      )}
    </section>
  );
}
