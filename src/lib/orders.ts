import "server-only";

import { and, eq } from "drizzle-orm";
import { db, schema } from "./db";
import type { Household } from "./db/schema";
import { logEvent } from "./household";
import { activeRules, spentThisWeek } from "./mandates";
import { formatMoney } from "./money";
import { holdPayment } from "./payments";
import { evaluate, type Check, type Verdict } from "./policy";
import type { Category } from "./rules";
import type { CartLine } from "./shopper";

export type OrderResult = {
  outcome: "held" | "refused" | "failed";
  verdict: Verdict | null;
  checks: Check[];
  message: string;
};

/**
 * The parent said yes. Check the cart against the signed rules, then put a
 * hold on the wallet. Nothing is captured here; that's the caregiver's call
 * (or, later, the verifier's).
 */
export async function confirmCart(household: Household, cartId: string): Promise<OrderResult> {
  const [cart] = await db.select().from(schema.carts).where(eq(schema.carts.id, cartId));
  if (!cart || cart.householdId !== household.id) {
    return { outcome: "failed", verdict: null, checks: [], message: "I couldn't find that cart." };
  }
  if (cart.status !== "proposed") {
    return { outcome: "failed", verdict: null, checks: [], message: "That cart was already handled." };
  }
  if (!household.vaultId) {
    return {
      outcome: "failed",
      verdict: null,
      checks: [],
      message: `Your PayPal isn't connected yet. ${household.caregiverName} needs to finish setup.`,
    };
  }

  const lines = JSON.parse(cart.lines) as CartLine[];
  const description = lines
    .map((l) => (l.quantity > 1 ? `${l.quantity} × ${l.name}` : l.name))
    .join(", ");

  const [rules, spent] = await Promise.all([
    activeRules(household.id),
    spentThisWeek(household.id),
  ]);

  let verdict: Verdict | null = null;
  let checks: Check[] = [];
  if (rules) {
    if (!rules.verified) {
      return {
        outcome: "refused",
        verdict: "stop",
        checks: [{ text: "The rules' signature is broken", result: "fail" }],
        message: `I can't buy anything until ${household.caregiverName} signs the rules again.`,
      };
    }
    ({ verdict, checks } = evaluate(
      rules.rules,
      {
        merchant: cart.store,
        category: cart.category as Category,
        amountCents: cart.totalCents,
        toPerson: false,
      },
      spent,
    ));
  }

  if (verdict === "stop") {
    await db.update(schema.carts).set({ status: "refused" }).where(eq(schema.carts.id, cart.id));
    await logEvent(
      household.id,
      "order.refused",
      `Refused ${formatMoney(cart.totalCents)} at ${cart.store}: ${checks.find((c) => c.result === "fail")?.text}`,
    );
    return {
      outcome: "refused",
      verdict,
      checks,
      message: `I can't buy that. ${household.caregiverName}'s rules don't allow it, so no money moved.`,
    };
  }

  try {
    const paymentId = await holdPayment(household, {
      merchant: cart.store,
      description,
      amountCents: cart.totalCents,
    });
    await db
      .update(schema.carts)
      .set({ status: "held", paymentId })
      .where(eq(schema.carts.id, cart.id));
    await logEvent(
      household.id,
      "order.placed",
      `${household.parentName} ordered from ${cart.store} by voice (${formatMoney(cart.totalCents)})`,
      paymentId,
    );
  } catch (err) {
    return {
      outcome: "failed",
      verdict,
      checks,
      message: `PayPal didn't accept the hold: ${err instanceof Error ? err.message : "unknown error"}`,
    };
  }

  return {
    outcome: "held",
    verdict,
    checks,
    message: `Done. I've reserved ${formatMoney(cart.totalCents)} on your PayPal. ${household.caregiverName} will confirm it.`,
  };
}

export async function declineCart(household: Household, cartId: string) {
  await db
    .update(schema.carts)
    .set({ status: "declined" })
    .where(and(eq(schema.carts.id, cartId), eq(schema.carts.householdId, household.id)));
}
