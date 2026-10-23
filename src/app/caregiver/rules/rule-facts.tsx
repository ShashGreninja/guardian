import { formatMoney } from "@/lib/money";
import { CATEGORY_LABELS, KIND_LABELS, type RuleSet } from "@/lib/rules";

/** The rule set's numbers at a glance. */
export function RuleFacts({ rules }: { rules: RuleSet }) {
  const facts = [
    {
      label: "Weekly budget",
      value: rules.weeklyBudgetCents === null ? "No cap" : formatMoney(rules.weeklyBudgetCents),
    },
    {
      label: "Ask you over",
      value: rules.approvalOverCents === null ? "Never" : formatMoney(rules.approvalOverCents),
    },
    {
      label: "Refuse over",
      value: rules.maxOrderCents === null ? "No limit" : formatMoney(rules.maxOrderCents),
    },
    {
      label: "Money to people",
      value: rules.blockPeopleTransfers ? "Blocked" : "Allowed",
    },
  ];

  return (
    <div>
      <dl className="grid grid-cols-2 gap-x-8 gap-y-7 2xl:grid-cols-4">
        {facts.map((f) => (
          <div key={f.label} className="border-t border-edge-strong pt-3">
            <dt className="text-fg-soft">{f.label}</dt>
            <dd className="mt-1 font-display text-2xl font-bold">{f.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-6 text-fg-soft">
        {rules.allowedCategories.length === 0
          ? "Any kind of store is allowed."
          : `Allowed: ${rules.allowedCategories.map((c) => CATEGORY_LABELS[c]).join(", ")}.`}
        {rules.blockedMerchants.length > 0 && ` Blocked: ${rules.blockedMerchants.join(", ")}.`}
      </p>
    </div>
  );
}

/** Each instruction next to what Guardian will do about it. */
export function RuleReading({ rules }: { rules: RuleSet }) {
  return (
    <ul className="divide-y divide-edge border-y border-edge">
      {rules.rules.map((r, i) => (
        <li
          key={i}
          className="grid gap-2 py-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:gap-8"
        >
          <p className="text-fg-soft">“{r.said}”</p>
          <p className="font-bold">{r.meaning}</p>
          <span className="self-start justify-self-start rounded-full border border-edge-strong px-3 py-1 text-sm font-bold whitespace-nowrap text-fg-soft sm:justify-self-end">
            {KIND_LABELS[r.kind]}
          </span>
        </li>
      ))}
    </ul>
  );
}
