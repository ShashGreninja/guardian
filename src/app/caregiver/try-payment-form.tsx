"use client";

import { useActionState } from "react";
import { tryPayment } from "./actions";

const defaults = {
  merchant: "Corner Grocer",
  description: "Bread, oat milk, bananas",
  amount: "18.42",
};

export function TryPaymentForm() {
  const [state, action, pending] = useActionState(tryPayment, null);
  const values = state?.values ?? defaults;

  return (
    <form action={action} className="grid gap-4">
      <label className="grid gap-2">
        <span className="font-bold">Store</span>
        <input name="merchant" className="field" defaultValue={values.merchant} />
      </label>
      <label className="grid gap-2">
        <span className="font-bold">What it&apos;s for</span>
        <input name="description" className="field" defaultValue={values.description} />
      </label>
      <label className="grid gap-2">
        <span className="font-bold">Amount in USD</span>
        <input name="amount" className="field" inputMode="decimal" defaultValue={values.amount} />
      </label>
      {state && !state.ok && <p className="text-stop">{state.error}</p>}
      <button className="btn btn-primary justify-self-start" disabled={pending}>
        {pending ? "Placing hold…" : "Place a hold"}
      </button>
    </form>
  );
}
