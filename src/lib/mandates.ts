import "server-only";

import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  randomUUID,
  sign,
  verify,
} from "node:crypto";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { db, ready, schema } from "./db";
import type { Mandate } from "./db/schema";
import { logEvent } from "./household";
import { canonicalJson, RuleSetSchema, type RuleSet } from "./rules";

type SignedPayload = {
  householdId: string;
  version: number;
  rules: RuleSet;
  signedAt: string;
  signedBy: string;
};

async function signingKey() {
  await ready();
  const [existing] = await db.select().from(schema.signingKeys).limit(1);
  if (existing) return existing;

  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const row = {
    id: `key_${randomUUID().slice(0, 8)}`,
    publicKey: publicKey.export({ type: "spki", format: "pem" }).toString(),
    privateKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
  };
  await db.insert(schema.signingKeys).values(row);
  return (await db.select().from(schema.signingKeys).where(eq(schema.signingKeys.id, row.id)))[0];
}

/** Signs the rules and makes them the household's active rule set. */
export async function signMandate(input: {
  householdId: string;
  signedBy: string;
  sourceText: string;
  rules: RuleSet;
}) {
  const rules = RuleSetSchema.parse(input.rules);
  const key = await signingKey();

  const [latest] = await db
    .select({ version: schema.mandates.version })
    .from(schema.mandates)
    .where(eq(schema.mandates.householdId, input.householdId))
    .orderBy(desc(schema.mandates.version))
    .limit(1);
  const version = (latest?.version ?? 0) + 1;
  const signedAt = new Date();

  const payload = canonicalJson({
    householdId: input.householdId,
    version,
    rules,
    signedAt: signedAt.toISOString(),
    signedBy: input.signedBy,
  } satisfies SignedPayload);
  const digest = createHash("sha256").update(payload).digest("hex");
  const signature = sign(null, Buffer.from(payload), createPrivateKey(key.privateKey)).toString(
    "base64url",
  );

  await db
    .update(schema.mandates)
    .set({ active: false })
    .where(eq(schema.mandates.householdId, input.householdId));
  await db.insert(schema.mandates).values({
    id: randomUUID(),
    householdId: input.householdId,
    version,
    sourceText: input.sourceText,
    payload,
    digest,
    signature,
    keyId: key.id,
    active: true,
    signedAt,
  });
  await logEvent(
    input.householdId,
    "rules.signed",
    `${input.signedBy} signed rule set v${version} (${digest.slice(0, 8)})`,
  );
  return version;
}

export type ActiveRules = {
  mandate: Mandate;
  rules: RuleSet;
  signedBy: string;
  /** False if the stored payload no longer matches its signature. */
  verified: boolean;
  publicKey: string;
};

export async function activeRules(householdId: string): Promise<ActiveRules | null> {
  await ready();
  const [mandate] = await db
    .select()
    .from(schema.mandates)
    .where(and(eq(schema.mandates.householdId, householdId), eq(schema.mandates.active, true)))
    .limit(1);
  if (!mandate) return null;

  const [key] = await db
    .select()
    .from(schema.signingKeys)
    .where(eq(schema.signingKeys.id, mandate.keyId));

  const digestOk =
    createHash("sha256").update(mandate.payload).digest("hex") === mandate.digest;
  const signatureOk =
    !!key &&
    verify(
      null,
      Buffer.from(mandate.payload),
      createPublicKey(key.publicKey),
      Buffer.from(mandate.signature, "base64url"),
    );

  const parsed = JSON.parse(mandate.payload) as SignedPayload;
  return {
    mandate,
    rules: RuleSetSchema.parse(parsed.rules),
    signedBy: parsed.signedBy,
    verified: digestOk && signatureOk,
    publicKey: key?.publicKey ?? "",
  };
}

/** Money held or paid in the last 7 days. */
export async function spentThisWeek(householdId: string) {
  await ready();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ amount: schema.payments.amountCents })
    .from(schema.payments)
    .where(
      and(
        eq(schema.payments.householdId, householdId),
        inArray(schema.payments.status, ["authorized", "captured"]),
        gte(schema.payments.createdAt, since),
      ),
    );
  return rows.reduce((sum, r) => sum + r.amount, 0);
}
