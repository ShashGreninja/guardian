import "server-only";

import { and, eq } from "drizzle-orm";
import { db, schema } from "./db";
import type { Household } from "./db/schema";
import { logEvent } from "./household";
import { activeRules, spentThisWeek } from "./mandates";
import { formatMoney } from "./money";
import { cancelPayment, holdPayment, releasePayment, saveReview } from "./payments";
import { reviewBasket } from "./verifier";
import { evaluate, type Check, type Verdict } from "./policy";
import type { Category } from "./rules";
import type { CartLine } from "./shopper";

export type OrderResult = {
  outcome: "paid" | "held" | "refused" | "failed";
  verdict: Verdict | null;
  checks: Check[];
  reasons?: string[];
  message: string;
};

/**
 * The parent said yes. Check the cart against the signed rules, hold the
 * money on the wallet, let the verifier review it, then capture, void, or
 * leave it for the caregiver.
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

  // 1. PayPal holds the money. The order carries the signed rule set's reference.
  let paymentId: string;
  try {
    paymentId = await holdPayment(household, {
      merchant: cart.store,
      description,
      amountCents: cart.totalCents,
      customId: rules
        ? `rules-v${rules.mandate.version}-${rules.mandate.digest.slice(0, 16)}`
        : undefined,
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

  // 2. A second agent, which never saw the conversation, reviews the basket.
  const review = await reviewBasket({
    rules: rules?.rules ?? null,
    rulesSource: rules?.mandate.sourceText ?? null,
    store: cart.store,
    category: cart.category,
    lines,
    totalCents: cart.totalCents,
    policy: { verdict, checks },
  });
  await saveReview(paymentId, { ...review, policyVerdict: verdict, checks });
  const reasons = review.reasons;

  // 3. Most cautious answer wins.
  try {
    if (review.decision === "reject") {
      await cancelPayment(paymentId, "verifier");
      await logEvent(household.id, "order.refused", `Verifier stopped ${cart.store}: ${reasons[0] ?? "rule conflict"}`, paymentId);
      return {
        outcome: "refused",
        verdict,
        checks,
        reasons,
        message: `I didn't buy that. A second check found a problem, so the hold was released and no money moved. ${household.caregiverName} can see why.`,
      };
    }
    if (review.decision === "approve" && verdict === "pass") {
      await releasePayment(paymentId, "verifier");
      return {
        outcome: "paid",
        verdict,
        checks,
        reasons,
        message: `Done. It's paid, ${formatMoney(cart.totalCents)} at ${cart.store}.`,
      };
    }
  } catch (err) {
    console.error("verifier decision failed", err);
  }

  await logEvent(household.id, "order.waiting", `${cart.store} order is waiting for ${household.caregiverName}`, paymentId);
  return {
    outcome: "held",
    verdict,
    checks,
    reasons,
    message: `I've reserved ${formatMoney(cart.totalCents)} on your PayPal. ${household.caregiverName} will take a look before it's paid.`,
  };
}

export async function declineCart(household: Household, cartId: string) {
  await db
    .update(schema.carts)
    .set({ status: "declined" })
    .where(and(eq(schema.carts.id, cartId), eq(schema.carts.householdId, household.id)));
}
