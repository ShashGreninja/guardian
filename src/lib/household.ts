import "server-only";

import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { db, ready, schema } from "./db";

// One household per deployment keeps the demo simple. Multi-household
// support only needs auth and a householdId on each request.
export async function getHousehold() {
  await ready();
  const [row] = await db.select().from(schema.households).limit(1);
  return row ?? null;
}

export async function requireHousehold() {
  const household = await getHousehold();
  if (!household) throw new Error("Set up the household first");
  return household;
}

export async function createHousehold(input: { parentName: string; caregiverName: string }) {
  await ready();
  const id = randomUUID();
  await db.insert(schema.households).values({ id, ...input });
  await logEvent(id, "household.created", `${input.caregiverName} set up Guardian for ${input.parentName}`);
  return id;
}

export async function saveWallet(
  householdId: string,
  wallet: { vaultId: string; customerId: string; email?: string },
) {
  await db
    .update(schema.households)
    .set({
      vaultId: wallet.vaultId,
      paypalCustomerId: wallet.customerId,
      payerEmail: wallet.email ?? null,
      walletConnectedAt: new Date(),
    })
    .where(eq(schema.households.id, householdId));
}

export async function logEvent(
  householdId: string,
  type: string,
  message: string,
  paymentId?: string,
) {
  await db.insert(schema.events).values({ householdId, type, message, paymentId });
}

export async function recentActivity(householdId: string, limit = 30) {
  await ready();
  return db
    .select()
    .from(schema.events)
    .where(eq(schema.events.householdId, householdId))
    .orderBy(desc(schema.events.id))
    .limit(limit);
}

export async function recentPayments(householdId: string, limit = 20) {
  await ready();
  return db
    .select()
    .from(schema.payments)
    .where(eq(schema.payments.householdId, householdId))
    .orderBy(desc(schema.payments.createdAt))
    .limit(limit);
}
