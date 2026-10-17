"use client";

import { useActionState } from "react";
import { setupHousehold } from "./actions";

export function HouseholdForm() {
  const [state, action, pending] = useActionState(setupHousehold, null);

  return (
    <form action={action} className="mt-8 grid gap-5">
      <label className="grid gap-2">
        <span className="font-bold">Who will be shopping?</span>
        <input
          name="parentName"
          className="field"
          placeholder="Asha"
          autoComplete="off"
          defaultValue={state?.values?.parentName}
        />
      </label>
      <label className="grid gap-2">
        <span className="font-bold">Your name</span>
        <input
          name="caregiverName"
          className="field"
          placeholder="Priya"
          autoComplete="name"
          defaultValue={state?.values?.caregiverName}
        />
      </label>
      {state && !state.ok && <p className="text-alarm">{state.error}</p>}
      <button className="btn btn-primary justify-self-start" disabled={pending}>
        {pending ? "Setting up…" : "Create household"}
      </button>
    </form>
  );
}
