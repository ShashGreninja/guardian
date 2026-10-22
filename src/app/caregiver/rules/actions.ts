"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireHousehold } from "@/lib/household";
import { activeRules, signMandate, spentThisWeek } from "@/lib/mandates";
import { parseAmount } from "@/lib/money";
import { evaluate, type Check, type Verdict } from "@/lib/policy";
import { CATEGORIES, RuleSetSchema, type RuleSet } from "@/lib/rules";
import { readRules, RulesReaderError } from "@/lib/rules-reader";

type Failure = { ok: false; error: string };

function failure(err: unknown): Failure {
  if (err instanceof RulesReaderError || err instanceof z.ZodError) {
    return { ok: false, error: err instanceof z.ZodError ? "Those rules aren't valid." : err.message };
  }
  console.error(err);
  return { ok: false, error: "Something went wrong. Try again." };
}

export async function readRulesAction(
  text: string,
): Promise<{ ok: true; rules: RuleSet } | Failure> {
  const trimmed = text.trim();
  if (trimmed.length < 10) return { ok: false, error: "Write at least one rule first." };
  if (trimmed.length > 2000) return { ok: false, error: "Keep the rules under 2,000 characters." };
  try {
    await requireHousehold();
    return { ok: true, rules: await readRules(trimmed) };
  } catch (err) {
    return failure(err);
  }
}

export async function signRulesAction(
  text: string,
  rules: RuleSet,
): Promise<{ ok: true; version: number } | Failure> {
  try {
    const household = await requireHousehold();
    const version = await signMandate({
      householdId: household.id,
      signedBy: household.caregiverName,
      sourceText: text.trim(),
      rules: RuleSetSchema.parse(rules),
    });
    revalidatePath("/caregiver");
    revalidatePath("/caregiver/rules");
    return { ok: true, version };
  } catch (err) {
    return failure(err);
  }
}

const simulateInput = z.object({
  merchant: z.string().trim().min(1, "Add a store or person"),
  category: z.enum(CATEGORIES),
  amount: z.string(),
  toPerson: z.boolean(),
});

export async function simulateAction(
  input: z.input<typeof simulateInput>,
): Promise<{ ok: true; verdict: Verdict; checks: Check[] } | Failure> {
  const parsed = simulateInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const amountCents = parseAmount(parsed.data.amount);
  if (!amountCents) return { ok: false, error: "Enter an amount like 24.99" };

  const household = await requireHousehold();
  const [rules, spent] = await Promise.all([
    activeRules(household.id),
    spentThisWeek(household.id),
  ]);
  if (!rules) return { ok: false, error: "Sign a rule set first." };
  if (!rules.verified) {
    return { ok: false, error: "The rules' signature is broken, so Guardian won't use them. Sign them again." };
  }

  return {
    ok: true,
    ...evaluate(rules.rules, { ...parsed.data, amountCents }, spent),
  };
}
