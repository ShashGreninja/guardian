import { and, eq } from "drizzle-orm";
import { db, ready, schema } from "@/lib/db";
import { logEvent } from "@/lib/household";
import { formatMoney } from "@/lib/money";
import { verifyWebhook } from "@/lib/paypal";

type WebhookEvent = {
  id: string;
  event_type: string;
  resource: {
    id: string;
    supplementary_data?: { related_ids?: { authorization_id?: string } };
  };
};

/**
 * Keeps payments in sync when something changes on PayPal's side (a hold
 * expires or is voided, a capture completes or is denied). Needs a public URL
 * and PAYPAL_WEBHOOK_ID, so it only receives events once deployed.
 */
export async function POST(request: Request) {
  const event = (await request.json().catch(() => null)) as WebhookEvent | null;
  if (!event?.event_type) return new Response("Bad request", { status: 400 });

  if (!(await verifyWebhook(request.headers, event).catch(() => false))) {
    return new Response("Signature check failed", { status: 401 });
  }

  await ready();
  const authId =
    event.event_type === "PAYMENT.AUTHORIZATION.VOIDED"
      ? event.resource.id
      : event.resource.supplementary_data?.related_ids?.authorization_id;
  if (!authId) return Response.json({ ignored: event.event_type });

  const [payment] = await db
    .select()
    .from(schema.payments)
    .where(eq(schema.payments.authorizationId, authId));
  if (!payment) return Response.json({ ignored: "unknown authorization" });

  const amount = formatMoney(payment.amountCents);
  const update = async (status: "captured" | "voided" | "failed", message: string) => {
    await db
      .update(schema.payments)
      .set({ status, decidedBy: "paypal", updatedAt: new Date() })
      .where(and(eq(schema.payments.id, payment.id), eq(schema.payments.status, "authorized")));
    await logEvent(payment.householdId, `paypal.${event.event_type.toLowerCase()}`, message, payment.id);
  };

  switch (event.event_type) {
    case "PAYMENT.AUTHORIZATION.VOIDED":
      if (payment.status === "authorized") {
        await update("voided", `PayPal released the hold of ${amount} for ${payment.merchant}`);
      }
      break;
    case "PAYMENT.CAPTURE.COMPLETED":
      if (payment.status === "authorized") {
        await update("captured", `PayPal confirmed ${amount} paid to ${payment.merchant}`);
      }
      break;
    case "PAYMENT.CAPTURE.DENIED":
      await update("failed", `PayPal denied the payment of ${amount} to ${payment.merchant}`);
      break;
  }

  return Response.json({ received: event.event_type });
}
