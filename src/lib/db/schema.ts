import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const now = () => new Date();

export const households = sqliteTable("households", {
  id: text("id").primaryKey(),
  parentName: text("parent_name").notNull(),
  caregiverName: text("caregiver_name").notNull(),
  // Saved PayPal wallet (vault payment token) for the parent.
  vaultId: text("vault_id"),
  paypalCustomerId: text("paypal_customer_id"),
  payerEmail: text("payer_email"),
  walletConnectedAt: integer("wallet_connected_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(now),
});

export type PaymentStatus =
  | "authorized" // money is on hold on the parent's wallet
  | "captured" // money moved to the merchant
  | "voided" // hold released, nothing charged
  | "failed";

export const payments = sqliteTable("payments", {
  id: text("id").primaryKey(),
  householdId: text("household_id")
    .notNull()
    .references(() => households.id),
  merchant: text("merchant").notNull(),
  description: text("description").notNull(),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("USD"),
  status: text("status").$type<PaymentStatus>().notNull(),
  paypalOrderId: text("paypal_order_id"),
  authorizationId: text("authorization_id"),
  captureId: text("capture_id"),
  failureReason: text("failure_reason"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(now),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(now),
});

export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  householdId: text("household_id")
    .notNull()
    .references(() => households.id),
  paymentId: text("payment_id").references(() => payments.id),
  type: text("type").notNull(),
  message: text("message").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(now),
});

/** A caregiver's rules, as written and as signed. Only one is active at a time. */
export const mandates = sqliteTable("mandates", {
  id: text("id").primaryKey(),
  householdId: text("household_id")
    .notNull()
    .references(() => households.id),
  version: integer("version").notNull(),
  sourceText: text("source_text").notNull(),
  // Canonical JSON of the signed payload (rules + household + version + time).
  payload: text("payload").notNull(),
  digest: text("digest").notNull(),
  signature: text("signature").notNull(),
  keyId: text("key_id").notNull(),
  active: integer("active", { mode: "boolean" }).notNull(),
  signedAt: integer("signed_at", { mode: "timestamp" }).notNull(),
});

/** Ed25519 key Guardian signs rule sets with. Created on first use. */
export const signingKeys = sqliteTable("signing_keys", {
  id: text("id").primaryKey(),
  publicKey: text("public_key").notNull(),
  privateKey: text("private_key").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(now),
});

export type Household = typeof households.$inferSelect;
export type Mandate = typeof mandates.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type ActivityEvent = typeof events.$inferSelect;
