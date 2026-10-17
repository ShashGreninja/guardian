"use client";

import { useState, useTransition } from "react";
import { cancelHold, payNow } from "./actions";

export function HoldActions({ paymentId }: { paymentId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: typeof payNow) {
    setError(null);
    start(async () => {
      const result = await action(paymentId);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button className="btn btn-primary" disabled={pending} onClick={() => run(payNow)}>
        Pay now
      </button>
      <button className="btn btn-quiet" disabled={pending} onClick={() => run(cancelHold)}>
        Cancel hold
      </button>
      {error && <p className="text-alarm">{error}</p>}
    </div>
  );
}
