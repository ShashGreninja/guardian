import "server-only";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "./db";
import { logEvent } from "./household";
import { formatMoney } from "./money";
import {
  authorizeWithVault,
  captureAuthorization,
  PayPalError,
  voidAuthorization,
} from "./paypal";
import type { Household } from "./db/schema";

export type Decider = "verifier" | "caregiver" | "paypal";

const BY: Record<Decider, string> = {
  verifier: "The verifier",
  caregiver: "You",
  paypal: "PayPal",
};

export async function holdPayment(
  household: Household,
  input: {
    merchant: string;
    description: string;
    amountCents: number;
    /** Ties the PayPal order to the signed rule set it was checked against. */
    customId?: string;
  },
) {
  if (!household.vaultId) throw new PayPalError("Connect a PayPal wallet first", 409);

  const id = randomUUID();
  const amount = formatMoney(input.amountCents);
  await db.insert(schema.payments).values({
    id,
    householdId: household.id,
    merchant: input.merchant,
    description: input.description,
    amountCents: input.amountCents,
    status: "failed",
  });

  try {
    const auth = await authorizeWithVault({
      vaultId: household.vaultId,
      amountCents: input.amountCents,
      currency: "USD",
      description: `${input.merchant}: ${input.description}`,
      referenceId: id,
      customId: input.customId,
    });
    await db
      .update(schema.payments)
      .set({
        status: "authorized",
        paypalOrderId: auth.orderId,
        authorizationId: auth.authorizationId,
        updatedAt: new Date(),
      })
      .where(eq(schema.payments.id, id));
    await logEvent(household.id, "payment.held", `Held ${amount} for ${input.merchant}`, id);
  } catch (err) {
    const reason = err instanceof Error ? err.message : "Unknown error";
    await db
      .update(schema.payments)
      .set({ failureReason: reason, updatedAt: new Date() })
      .where(eq(schema.payments.id, id));
    await logEvent(household.id, "payment.failed", `Could not hold ${amount}: ${reason}`, id);
    throw err;
  }
  return id;
}

export async function saveReview(paymentId: string, review: unknown) {
  await db
    .update(schema.payments)
    .set({ review: JSON.stringify(review) })
    .where(eq(schema.payments.id, paymentId));
}

async function loadAuthorized(paymentId: string) {
  const [payment] = await db
    .select()
    .from(schema.payments)
    .where(eq(schema.payments.id, paymentId));
  if (!payment) throw new PayPalError("Payment not found", 404);
  if (payment.status !== "authorized") {
    throw new PayPalError(`This payment is already ${payment.status}`, 409);
  }
  if (!payment.authorizationId) {
    throw new PayPalError("This payment has no PayPal authorization to act on", 409);
  }
  return payment as typeof payment & { authorizationId: string };
}

export async function releasePayment(paymentId: string, by: Decider = "caregiver") {
  const payment = await loadAuthorized(paymentId);
  const capture = await captureAuthorization(payment.authorizationId);
  await db
    .update(schema.payments)
    .set({ status: "captured", captureId: capture.id, decidedBy: by, updatedAt: new Date() })
    .where(eq(schema.payments.id, paymentId));
  await logEvent(
    payment.householdId,
    "payment.captured",
    `${BY[by]} paid ${formatMoney(payment.amountCents)} to ${payment.merchant}`,
    paymentId,
  );
}

export async function cancelPayment(paymentId: string, by: Decider = "caregiver") {
  const payment = await loadAuthorized(paymentId);
  await voidAuthorization(payment.authorizationId);
  await db
    .update(schema.payments)
    .set({ status: "voided", decidedBy: by, updatedAt: new Date() })
    .where(eq(schema.payments.id, paymentId));
  await logEvent(
    payment.householdId,
    "payment.voided",
    `${BY[by]} released the hold of ${formatMoney(payment.amountCents)} for ${payment.merchant}`,
    paymentId,
  );
}
