import { z } from "zod";

export const CATEGORIES = [
  "groceries",
  "pharmacy",
  "household",
  "clothing",
  "electronics",
  "restaurants",
  "gifts",
  "travel",
  "entertainment",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  groceries: "Groceries",
  pharmacy: "Pharmacy",
  household: "Household",
  clothing: "Clothing",
  electronics: "Electronics",
  restaurants: "Restaurants",
  gifts: "Gifts",
  travel: "Travel",
  entertainment: "Entertainment",
  other: "Other",
};

/**
 * The machine-readable version of a caregiver's rules. This is what gets
 * signed, and what every purchase is checked against.
 */
export const RuleSetSchema = z.object({
  /** Empty list means any category is fine. */
  allowedCategories: z.array(z.enum(CATEGORIES)),
  /** Rolling 7-day spending cap, in US cents. */
  weeklyBudgetCents: z.number().int().nullable(),
  /** Orders above this need the caregiver's OK. */
  approvalOverCents: z.number().int().nullable(),
  /** Orders above this are refused outright. */
  maxOrderCents: z.number().int().nullable(),
  /** Sending money to a person (not a store). */
  blockPeopleTransfers: z.boolean(),
  blockedMerchants: z.array(z.string()),
  /** One line per instruction, so the caregiver can check the reading. */
  rules: z.array(
    z.object({
      said: z.string(),
      meaning: z.string(),
      kind: z.enum(["budget", "approval", "limit", "allow", "block", "default"]),
    }),
  ),
  /** Anything that couldn't be turned into a rule. */
  unclear: z.array(z.string()),
});

export type RuleSet = z.infer<typeof RuleSetSchema>;

export const KIND_LABELS: Record<RuleSet["rules"][number]["kind"], string> = {
  budget: "Budget",
  approval: "Approval",
  limit: "Limit",
  allow: "Allowed",
  block: "Hard stop",
  default: "Guardian default",
};

/** JSON with sorted keys, so the same rules always produce the same bytes. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
