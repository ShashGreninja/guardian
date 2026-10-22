import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { PaymentTag, Stamp } from "@/components/payment-tag";
import { getHousehold, recentActivity, recentPayments } from "@/lib/household";
import { formatMoney } from "@/lib/money";
import { paypalConfigured } from "@/lib/paypal";
import type { ActivityEvent, Household, Payment } from "@/lib/db/schema";
import { HoldActions } from "./hold-actions";
import { HouseholdForm } from "./household-form";
import { TryPaymentForm } from "./try-payment-form";
import { WalletCard } from "./wallet-card";
import { WalletConnect } from "./wallet-connect";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard · Guardian" };

export default async function CaregiverPage() {
  if (!paypalConfigured()) return <MissingKeys />;

  const household = await getHousehold();
  if (!household) {
    return (
      <Shell>
        <section className="mx-auto grid max-w-5xl items-center gap-12 py-10 lg:grid-cols-2">
          <div>
            <h1 className="display text-[clamp(2.75rem,6vw,4.5rem)]">
              Set up Guardian for your family
            </h1>
            <p className="mt-5 max-w-[40ch] text-lg text-ink-soft">
              Start with two names. Next you&apos;ll connect your parent&apos;s PayPal wallet so
              Guardian can hold payments on it.
            </p>
          </div>
          <div className="sheet">
            <HouseholdForm />
          </div>
        </section>
      </Shell>
    );
  }

  const [payments, activity] = await Promise.all([
    recentPayments(household.id),
    recentActivity(household.id),
  ]);
  const waiting = payments.filter((p) => p.status === "authorized");
  const history = payments.filter((p) => p.status !== "authorized");

  return (
    <Shell household={household}>
      <Overview household={household} waiting={waiting} />

      <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-12">
          {household.vaultId ? (
            <>
              <Waiting payments={waiting} parentName={household.parentName} />
              <Ledger payments={history} />
            </>
          ) : (
            <NextSteps parentName={household.parentName} />
          )}
        </div>

        <aside className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-8">
          {household.vaultId && (
            <section className="sheet">
              <h2 className="text-xl font-bold">Try a payment</h2>
              <p className="mt-2 mb-5 text-ink-soft">
                Holds money on {household.parentName}&apos;s wallet. Nothing is paid until you
                say so.
              </p>
              <TryPaymentForm />
            </section>
          )}
          <Activity events={activity} />
        </aside>
      </div>
    </Shell>
  );
}

function Shell({ household, children }: { household?: Household; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 pb-20 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4 py-5">
        <Logo />
        {household && (
          <p className="text-ink-soft">
            Looking after <span className="font-bold text-ink">{household.parentName}</span>
          </p>
        )}
      </header>
      <main className="pt-2">{children}</main>
    </div>
  );
}

function Overview({ household, waiting }: { household: Household; waiting: Payment[] }) {
  const heldCents = waiting.reduce((sum, p) => sum + p.amountCents, 0);
  const headline = !household.vaultId
    ? `Connect ${household.parentName}'s PayPal to get started.`
    : waiting.length === 0
      ? "Nothing needs you right now."
      : waiting.length === 1
        ? `One payment is waiting for you.`
        : `${waiting.length} payments are waiting for you.`;

  return (
    <section className="relative isolate overflow-clip rounded-[30px] bg-ink px-6 py-8 text-surface sm:px-10 sm:py-10">
      <div
        aria-hidden
        className="rosette pointer-events-none absolute -bottom-64 -left-40 -z-10 size-[36rem] text-surface/[0.06]"
      />
      <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <p className="text-surface/70">{greeting()}, {household.caregiverName}</p>
          <h1 className="display mt-2 max-w-[18ch] text-[clamp(2.5rem,5vw,4rem)]">{headline}</h1>
          {waiting.length > 0 && (
            <p className="mt-4 text-lg text-surface/80">
              {formatMoney(heldCents)} is on hold on {household.parentName}&apos;s wallet until you
              decide.
            </p>
          )}
        </div>
        {household.vaultId ? (
          <WalletCard household={household} />
        ) : (
          <div className="w-full max-w-sm rounded-[22px] bg-surface p-6 text-ink">
            <h2 className="text-xl font-bold">One-time setup</h2>
            <div className="mt-2">
              <WalletConnect parentName={household.parentName} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Waiting({ payments, parentName }: { payments: Payment[]; parentName: string }) {
  return (
    <section>
      <h2 className="display text-2xl">Waiting for you</h2>
      {payments.length === 0 ? (
        <p className="mt-3 max-w-[52ch] text-ink-soft">
          When a payment needs your OK, it shows up here with the money already on hold. You
          pay it or cancel it, and {parentName} hears back either way.
        </p>
      ) : (
        <div className="mt-5 grid max-w-2xl grid-cols-[minmax(0,1fr)] gap-4">
          {payments.map((p) => (
            <PaymentTag
              key={p.id}
              merchant={p.merchant}
              description={p.description}
              amountCents={p.amountCents}
              status={p.status}
              serial={serial(p.id)}
              note={`Held ${formatTime(p.updatedAt)}`}
              footer={<HoldActions paymentId={p.id} />}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function NextSteps({ parentName }: { parentName: string }) {
  const steps = [
    `Sign in with ${parentName}'s PayPal once. Guardian saves the wallet with PayPal Vault.`,
    "Place a test hold. The money is reserved on the wallet, not taken.",
    "Pay it or cancel it from here. That's the same choice you'll make for real purchases.",
  ];
  return (
    <section>
      <h2 className="display text-2xl">What happens next</h2>
      <ol className="mt-5 grid gap-4">
        {steps.map((s, i) => (
          <li key={s} className="flex gap-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ink font-display font-extrabold text-surface">
              {i + 1}
            </span>
            <p className="max-w-[52ch] pt-1">{s}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Ledger({ payments }: { payments: Payment[] }) {
  return (
    <section>
      <h2 className="display text-2xl">History</h2>
      {payments.length === 0 ? (
        <p className="mt-3 text-ink-soft">Paid and cancelled payments are listed here.</p>
      ) : (
        <ul className="mt-4 divide-y divide-dashed divide-line rounded-[22px] bg-surface px-5">
          {payments.map((p) => (
            <li
              key={p.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-4 sm:grid-cols-[7rem_minmax(0,1fr)_auto_8rem]"
            >
              <span className="text-sm text-ink-soft sm:order-none">{formatDay(p.createdAt)}</span>
              <span className="col-span-2 min-w-0 sm:col-span-1">
                <span className="block truncate font-bold">{p.merchant}</span>
                <span className="block truncate text-sm text-ink-soft">
                  {p.status === "failed" ? p.failureReason : p.description}
                </span>
              </span>
              <span className="font-display text-lg font-bold">{formatMoney(p.amountCents)}</span>
              <span className="justify-self-end">
                <Stamp status={p.status} size="sm" />
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Activity({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) return null;
  return (
    <section>
      <h2 className="text-xl font-bold">Activity</h2>
      <ol className="mt-4 border-l-2 border-dashed border-engrave">
        {events.map((e) => (
          <li key={e.id} className="relative py-2 pl-6">
            <span
              className={`absolute top-[1.05rem] -left-[7px] size-3 rounded-full ring-4 ring-paper ${dotColor(e.type)}`}
            />
            <p>{e.message}</p>
            <p className="text-sm text-ink-soft">{formatTime(e.createdAt)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function serial(id: string) {
  return `GRD-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
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
        <h1 className="display text-[clamp(2.5rem,5vw,3.75rem)]">Add your PayPal sandbox keys</h1>
        <p className="mt-4 text-lg text-ink-soft">
          Guardian talks to the PayPal sandbox, so it needs a REST app to run.
        </p>
        <ol className="sheet mt-8 grid list-decimal gap-3 pl-12">
          <li>
            On developer.paypal.com, create a sandbox app tied to a US business sandbox account.
          </li>
          <li>In the app&apos;s features, turn on Save payment methods and save.</li>
          <li>
            Copy <code className="font-bold">.env.example</code> to{" "}
            <code className="font-bold">.env.local</code> and paste the client ID and secret.
          </li>
          <li>Restart the dev server and reload this page.</li>
        </ol>
        <p className="mt-6">
          <Link href="/" className="font-bold underline">
            Back to the home page
          </Link>
        </p>
      </section>
    </Shell>
  );
}
