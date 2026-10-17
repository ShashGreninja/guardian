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

export type Household = typeof households.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type ActivityEvent = typeof events.$inferSelect;
