import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { PaymentTag } from "@/components/payment-tag";
import { getHousehold, recentActivity, recentPayments } from "@/lib/household";
import { paypalConfigured } from "@/lib/paypal";
import type { ActivityEvent, Household, Payment } from "@/lib/db/schema";
import { HoldActions } from "./hold-actions";
import { HouseholdForm } from "./household-form";
import { TryPaymentForm } from "./try-payment-form";
import { WalletConnect } from "./wallet-connect";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard · Guardian" };

export default async function CaregiverPage() {
  if (!paypalConfigured()) return <MissingKeys />;

  const household = await getHousehold();
  if (!household) {
    return (
      <Shell>
        <section className="mx-auto max-w-lg py-10">
          <h1 className="text-2xl font-extrabold">Set up Guardian for your family</h1>
          <p className="mt-3 text-ink-soft">
            Start with names. You&apos;ll connect a PayPal wallet next.
          </p>
          <HouseholdForm />
        </section>
      </Shell>
    );
  }

  const [payments, activity] = await Promise.all([
    recentPayments(household.id),
    recentActivity(household.id),
  ]);

  return (
    <Shell title={`${household.parentName}'s household`}>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <div className="grid content-start gap-6">
          <WalletPanel household={household} />
          {household.vaultId && (
            <section className="panel">
              <h2 className="text-xl font-bold">Try a payment</h2>
              <p className="mt-2 mb-5 text-ink-soft">
                Puts a hold on {household.parentName}&apos;s wallet. Nothing is paid until you
                release it.
              </p>
              <TryPaymentForm />
            </section>
          )}
        </div>

        <div className="grid content-start gap-10">
          <Payments payments={payments} parentName={household.parentName} />
          <Activity events={activity} />
        </div>
      </div>
    </Shell>
  );
}

function Shell({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4 py-5">
        <Logo />
        {title && <p className="font-display text-lg font-bold">{title}</p>}
      </header>
      <main className="pt-4">{children}</main>
    </div>
  );
}

function WalletPanel({ household }: { household: Household }) {
  if (!household.vaultId) {
    return (
      <section className="panel">
        <h2 className="text-xl font-bold">Connect {household.parentName}&apos;s PayPal</h2>
        <div className="mt-2">
          <WalletConnect parentName={household.parentName} />
        </div>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">PayPal wallet</h2>
        <span className="rounded-full bg-guard-soft px-3 py-0.5 text-base font-bold text-guard">
          Connected
        </span>
      </div>
      <p className="mt-2 text-ink-soft">
        {household.payerEmail ?? "Saved PayPal account"}
        {household.walletConnectedAt && <> since {formatDay(household.walletConnectedAt)}</>}
      </p>
    </section>
  );
}

function Payments({ payments, parentName }: { payments: Payment[]; parentName: string }) {
  return (
    <section>
      <h2 className="text-xl font-bold">Payments</h2>
      {payments.length === 0 ? (
        <p className="mt-3 max-w-[50ch] text-ink-soft">
          Nothing yet. Holds on {parentName}&apos;s wallet show up here, and you decide whether
          each one gets paid.
        </p>
      ) : (
        <div className="mt-5 grid gap-4">
          {payments.map((p) => (
            <PaymentTag
              key={p.id}
              merchant={p.merchant}
              description={p.description}
              amountCents={p.amountCents}
              status={p.status}
              note={p.status === "failed" ? p.failureReason : formatTime(p.updatedAt)}
              footer={p.status === "authorized" ? <HoldActions paymentId={p.id} /> : undefined}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function Activity({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) return null;
  return (
    <section>
      <h2 className="text-xl font-bold">Activity</h2>
      <ol className="mt-4 border-l-2 border-line">
        {events.map((e) => (
          <li key={e.id} className="relative py-2 pl-6">
            <span
              className={`absolute -left-[7px] top-[1.05rem] size-3 rounded-full ${dotColor(e.type)}`}
            />
            <p>{e.message}</p>
            <p className="text-base text-ink-soft">{formatTime(e.createdAt)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function dotColor(type: string) {
  if (type.endsWith("captured") || type.startsWith("wallet")) return "bg-guard";
  if (type.endsWith("held")) return "bg-hold";
  if (type.endsWith("failed")) return "bg-alarm";
  return "bg-ink-soft";
}

function formatDay(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatTime(d: Date) {
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function MissingKeys() {
  return (
    <Shell>
      <section className="mx-auto max-w-2xl py-10">
        <h1 className="text-2xl font-extrabold">Add your PayPal sandbox keys</h1>
        <p className="mt-3 text-ink-soft">
          Guardian talks to the PayPal sandbox, so it needs a REST app to run.
        </p>
        <ol className="mt-6 grid list-decimal gap-3 pl-6">
          <li>
            Open developer.paypal.com, go to Apps &amp; Credentials, and create a sandbox app.
          </li>
          <li>
            In the app&apos;s settings, keep Accept payments on and turn on Vault under Advanced
            options.
          </li>
          <li>
            Copy <code className="font-bold">.env.example</code> to{" "}
            <code className="font-bold">.env.local</code> and paste the client ID and secret.
          </li>
          <li>Restart the dev server and reload this page.</li>
        </ol>
      </section>
    </Shell>
  );
}
