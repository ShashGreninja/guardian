import { formatMoney } from "./money";
import { CATEGORY_LABELS, type Category, type RuleSet } from "./rules";

export type Verdict = "pass" | "ask" | "stop";
export type Check = { text: string; result: "pass" | "ask" | "fail" };

export type Purchase = {
  merchant: string;
  category: Category;
  amountCents: number;
  /** True when the money goes to a person rather than a store. */
  toPerson: boolean;
};

/**
 * Deterministic check of one purchase against a signed rule set. No model is
 * involved here: the same purchase and rules always give the same answer.
 */
export function evaluate(
  rules: RuleSet,
  purchase: Purchase,
  spentThisWeekCents: number,
): { verdict: Verdict; checks: Check[] } {
  const checks: Check[] = [];
  const amount = formatMoney(purchase.amountCents);

  if (purchase.toPerson) {
    checks.push(
      rules.blockPeopleTransfers
        ? { text: "Sending money to people is never allowed", result: "fail" }
        : { text: "Sending money to people is allowed", result: "pass" },
    );
  }

  const merchant = purchase.merchant.trim().toLowerCase();
  const blocked = rules.blockedMerchants.find(
    (m) => m.trim() && merchant.includes(m.trim().toLowerCase()),
  );
  if (blocked) checks.push({ text: `${blocked} is on the blocked list`, result: "fail" });

  if (!purchase.toPerson) {
    const label = CATEGORY_LABELS[purchase.category];
    if (rules.allowedCategories.length === 0) {
      checks.push({ text: "Any kind of store is allowed", result: "pass" });
    } else if (rules.allowedCategories.includes(purchase.category)) {
      checks.push({ text: `${label} is on the allowed list`, result: "pass" });
    } else {
      checks.push({ text: `${label} isn't on the allowed list`, result: "fail" });
    }
  }

  if (rules.maxOrderCents !== null && purchase.amountCents > rules.maxOrderCents) {
    checks.push({
      text: `${amount} is over the ${formatMoney(rules.maxOrderCents)} order limit`,
      result: "fail",
    });
  }

  if (rules.weeklyBudgetCents !== null) {
    const after = spentThisWeekCents + purchase.amountCents;
    const left = rules.weeklyBudgetCents - spentThisWeekCents;
    checks.push(
      after <= rules.weeklyBudgetCents
        ? {
            text: `Fits the weekly budget: ${formatMoney(Math.max(left, 0))} left this week`,
            result: "pass",
          }
        : {
            text: `Over the weekly budget: ${formatMoney(Math.max(left, 0))} left of ${formatMoney(rules.weeklyBudgetCents)}`,
            result: "ask",
          },
    );
  }

  if (rules.approvalOverCents !== null) {
    checks.push(
      purchase.amountCents > rules.approvalOverCents
        ? { text: `Over ${formatMoney(rules.approvalOverCents)}, so you decide`, result: "ask" }
        : {
            text: `Under the ${formatMoney(rules.approvalOverCents)} auto-approve line`,
            result: "pass",
          },
    );
  }

  const verdict: Verdict = checks.some((c) => c.result === "fail")
    ? "stop"
    : checks.some((c) => c.result === "ask")
      ? "ask"
      : "pass";

  return { verdict, checks };
}
