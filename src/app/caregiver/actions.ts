"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createHousehold, requireHousehold, saveWallet, logEvent } from "@/lib/household";
import { parseAmount } from "@/lib/money";
import { cancelPayment, holdPayment, releasePayment } from "@/lib/payments";
import { createPaymentToken, createSetupToken, userIdToken } from "@/lib/paypal";
import { resolveAlert } from "@/lib/scam";

export type ActionResult = { ok: true } | { ok: false; error: string };

function failure(err: unknown): ActionResult {
  return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" };
}

const householdInput = z.object({
  parentName: z.string().trim().min(1, "Add your parent's name").max(40),
  caregiverName: z.string().trim().min(1, "Add your name").max(40),
});

type FormResult = ActionResult & { values?: Record<string, string> };

export async function setupHousehold(_: FormResult | null, form: FormData): Promise<FormResult> {
  const values = Object.fromEntries(form) as Record<string, string>;
  const parsed = householdInput.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message, values };
  await createHousehold(parsed.data);
  revalidatePath("/caregiver");
  return { ok: true };
}

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function walletSdkConfig(): Promise<
  { ok: true; clientId: string; idToken: string } | { ok: false; error: string }
> {
  try {
    const household = await requireHousehold();
    return {
      ok: true,
      clientId: process.env.PAYPAL_CLIENT_ID!,
      idToken: await userIdToken(household.paypalCustomerId),
    };
  } catch (err) {
    return failure(err) as { ok: false; error: string };
  }
}

export async function startWalletSetup() {
  await requireHousehold();
  const token = await createSetupToken(await origin());
  return token.id;
}

export async function finishWalletSetup(setupTokenId: string): Promise<ActionResult> {
  try {
    const household = await requireHousehold();
    const token = await createPaymentToken(setupTokenId);
    const email = token.payment_source.paypal?.email_address;
    await saveWallet(household.id, {
      vaultId: token.id,
      customerId: token.customer.id,
      email,
    });
    await logEvent(
      household.id,
      "wallet.connected",
      `Connected ${household.parentName}'s PayPal${email ? ` (${email})` : ""}`,
    );
    revalidatePath("/caregiver");
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}

const paymentInput = z.object({
  merchant: z.string().trim().min(1, "Add a store name").max(60),
  description: z.string().trim().min(1, "Say what it's for").max(90),
  amount: z.string(),
});

export async function tryPayment(_: FormResult | null, form: FormData): Promise<FormResult> {
  const values = Object.fromEntries(form) as Record<string, string>;
  const parsed = paymentInput.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message, values };
  const amountCents = parseAmount(parsed.data.amount);
  if (!amountCents) return { ok: false, error: "Enter an amount like 12.50", values };
  if (amountCents > 100_000) {
    return { ok: false, error: "Keep test payments under $1,000", values };
  }

  try {
    const household = await requireHousehold();
    await holdPayment(household, { ...parsed.data, amountCents });
    return { ok: true };
  } catch (err) {
    return { ...failure(err), values };
  } finally {
    revalidatePath("/caregiver");
  }
}

export async function markAlertHandled(alertId: string): Promise<ActionResult> {
  try {
    const household = await requireHousehold();
    await resolveAlert(household.id, alertId);
    return { ok: true };
  } catch (err) {
    return failure(err);
  } finally {
    revalidatePath("/caregiver");
  }
}

export async function payNow(paymentId: string): Promise<ActionResult> {
  try {
    await releasePayment(paymentId);
    return { ok: true };
  } catch (err) {
    return failure(err);
  } finally {
    revalidatePath("/caregiver");
  }
}

export async function cancelHold(paymentId: string): Promise<ActionResult> {
  try {
    await cancelPayment(paymentId);
    return { ok: true };
  } catch (err) {
    return failure(err);
  } finally {
    revalidatePath("/caregiver");
  }
}
