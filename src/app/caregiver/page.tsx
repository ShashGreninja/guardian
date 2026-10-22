import type { Metadata } from "next";
import Link from "next/link";
import { Holo } from "@/components/holo";
import { PaymentTag, Stamp } from "@/components/payment-tag";
import { Shield } from "@/components/shield";
import type { ActivityEvent, Household, Payment } from "@/lib/db/schema";
import { formatDay, formatTime, greeting, inLastWeek, serial } from "@/lib/format";
import { getHousehold, recentActivity, recentPayments } from "@/lib/household";
import { activeRules, spentThisWeek, type ActiveRules } from "@/lib/mandates";
import { formatMoney } from "@/lib/money";
import { paypalConfigured } from "@/lib/paypal";
import { HoldActions } from "./hold-actions";
import { HouseholdForm } from "./household-form";
import { Tile } from "./tile";
import { TryPaymentForm } from "./try-payment-form";
import { WalletCard } from "./wallet-card";
import { WalletConnect } from "./wallet-connect";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Overview · Guardian" };

export default async function CaregiverPage() {
  if (!paypalConfigured()) return <MissingKeys />;

  const household = await getHousehold();
  if (!household) return <Setup />;

  const [payments, activity, rules, spent] = await Promise.all([
    recentPayments(household.id),
    recentActivity(household.id),
    activeRules(household.id),
    spentThisWeek(household.id),
  ]);
  const waiting = payments.filter((p) => p.status === "authorized");
  const history = payments.filter((p) => p.status !== "authorized");
  const budget = rules?.rules.weeklyBudgetCents ?? null;
  const connected = Boolean(household.vaultId);

  return (
    <div className="mx-auto grid max-w-[90rem] grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-12 lg:gap-7">
      <ShieldTile
        household={household}
        waiting={waiting}
        spent={spent}
        budget={budget}
        className="lg:col-span-8 lg:row-span-2"
      />

      <Tile label="Wallet" className="lg:col-span-4">
        {connected ? (
          <Holo className="rounded-[22px]">
            <WalletCard household={household} />
          </Holo>
        ) : (
          <WalletConnect parentName={household.parentName} />
        )}
      </Tile>

      <WeekTile payments={payments} spent={spent} budget={budget} className="lg:col-span-4" />

      {connected ? (
        <>
          <Tile
            label={`Waiting for you${waiting.length ? ` (${waiting.length})` : ""}`}
            className="lg:col-span-8"
          >
            {waiting.length === 0 ? (
              <p className="max-w-[52ch] text-fg-soft">
                When a payment needs your OK it lands here, with the money already on hold. You
                pay it or cancel it, and {household.parentName} hears back either way.
              </p>
            ) : (
              <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-2">
                {waiting.map((p) => (
                  <PaymentTag
                    key={p.id}
                    merchant={p.merchant}
                    description={p.description}
                    amountCents={p.amountCents}
                    status={p.status}
                    serial={serial(p.id)}
                    note={`Held ${formatTime(p.updatedAt)}`}
                    footer={
                      <>
                        <ReviewNotes review={p.review} />
                        <HoldActions paymentId={p.id} />
                      </>
                    }
                  />
                ))}
              </div>
            )}
          </Tile>

          <Tile label="Try a payment" className="lg:col-span-4 lg:row-span-2">
            <p className="-mt-2 mb-7 text-fg-soft">
              Holds money on {household.parentName}&apos;s wallet. Nothing is paid until you say so.
            </p>
            <TryPaymentForm />
          </Tile>

          <Tile label="Ledger" className="lg:col-span-8">
            <Ledger payments={history} />
          </Tile>
        </>
      ) : (
        <Tile label="What happens next" className="lg:col-span-8">
          <NextSteps parentName={household.parentName} />
        </Tile>
      )}

      <RulesTile rules={rules} className="lg:col-span-4" />

      <Tile label="Activity" className={connected ? "lg:col-span-8" : "lg:col-span-12"}>
        <Activity events={activity} />
      </Tile>
    </div>
  );
}

function ShieldTile({
  household,
  waiting,
  spent,
  budget,
  className,
}: {
  household: Household;
  waiting: Payment[];
  spent: number;
  budget: number | null;
  className: string;
}) {
  const connected = Boolean(household.vaultId);
  const heldCents = waiting.reduce((sum, p) => sum + p.amountCents, 0);
  const headline = !connected
    ? "Shield offline"
    : waiting.length === 0
      ? "All clear"
      : `${waiting.length} waiting`;
  const detail = !connected
    ? `Connect ${household.parentName}'s PayPal to arm it.`
    : waiting.length === 0
      ? "Nothing needs you right now."
      : `${formatMoney(heldCents)} on hold until you decide.`;

  return (
    <section
      className={`relative isolate grid min-h-[36rem] place-items-center overflow-clip rounded-[26px] border border-edge bg-[radial-gradient(60%_60%_at_50%_50%,#0d1a33,var(--color-void))] ${className}`}
    >
      {/* Shield and status share one grid cell, so the status reads like a gauge face. */}
      <div className="pointer-events-none col-start-1 row-start-1 size-[min(36rem,96vw)]">
        <Shield holds={connected ? waiting.length : 0} budget={budget ? spent / budget : null} />
      </div>

      <div className="col-start-1 row-start-1 grid max-w-[18rem] justify-items-center text-center">
        <p className="hud flex items-center gap-2 text-fg-soft">
          <span
            className={`size-1.5 rounded-full ${!connected ? "bg-fg-mute" : waiting.length ? "bg-wait" : "bg-go"}`}
          />
          Shield {connected ? "armed" : "offline"}
        </p>
        <h1 className="display mt-4 text-[clamp(2.75rem,4.5vw,4.25rem)]">{headline}</h1>
        <p className="mt-3 text-fg-soft">{detail}</p>
        {budget !== null && connected && (
          <p className="hud mt-4 text-fg-mute">
            Week {formatMoney(spent)} / {formatMoney(budget)}
          </p>
        )}
      </div>

      <p className="hud absolute top-7 left-7 text-fg-mute sm:top-8 sm:left-9">
        {greeting()}, {household.caregiverName}
      </p>
      <p className="hud absolute right-7 bottom-7 hidden text-right text-fg-mute sm:right-9 sm:bottom-8 sm:block">
        {waiting.length ? "Held payments orbit the rim" : budget ? "Ring: weekly budget" : "Live"}
      </p>
    </section>
  );
}

function WeekTile({
  payments,
  spent,
  budget,
  className,
}: {
  payments: Payment[];
  spent: number;
  budget: number | null;
  className: string;
}) {
  const week = payments.filter((p) => inLastWeek(p.createdAt));
  const sum = (status: Payment["status"]) =>
    week.filter((p) => p.status === status).reduce((s, p) => s + p.amountCents, 0);
  const share = budget ? Math.min(spent / budget, 1) : 0;
  const over = budget !== null && spent > budget;

  return (
    <Tile label="Last 7 days" className={className}>
      <dl className="grid grid-cols-3 gap-6">
        {[
          { label: "Paid", value: formatMoney(sum("captured")), tone: "text-go" },
          { label: "On hold", value: formatMoney(sum("authorized")), tone: "text-wait" },
          { label: "Cancelled", value: String(week.filter((p) => p.status === "voided").length), tone: "text-fg" },
        ].map((s) => (
          <div key={s.label}>
            <dt className="hud text-fg-mute">{s.label}</dt>
            <dd className={`mt-1 font-display text-xl font-bold ${s.tone}`}>{s.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-8">
        <div className="flex items-baseline justify-between gap-3">
          <p className="hud text-fg-mute">Weekly budget</p>
          <p className="text-sm text-fg-soft">
            {budget ? `${formatMoney(spent)} of ${formatMoney(budget)}` : "No budget set"}
          </p>
        </div>
        <div className="mt-2 h-2 overflow-clip rounded-full bg-white/[0.06]">
          <div
            className={`h-full rounded-full ${over ? "bg-stop" : share > 0.8 ? "bg-wait" : "bg-go"}`}
            style={{ width: `${Math.max(share * 100, budget ? 2 : 0)}%` }}
          />
        </div>
      </div>
    </Tile>
  );
}

function RulesTile({ rules, className }: { rules: ActiveRules | null; className: string }) {
  if (!rules) {
    return (
      <Tile label="Rules" className={className}>
        <p className="text-fg-soft">
          No rules yet. Write them in plain English and Guardian checks every payment against
          them.
        </p>
        <Link href="/caregiver/rules" className="btn btn-primary mt-5">
          Write the rules
        </Link>
      </Tile>
    );
  }
  return (
    <Tile
      label={`Rules v${rules.mandate.version}`}
      action={<Stamp status={rules.verified ? "signed" : "tampered"} size="sm" onDark />}
      className={className}
    >
      <ul className="grid gap-3">
        {rules.rules.rules.slice(0, 4).map((r) => (
          <li key={r.meaning} className="flex gap-3 text-fg-soft">
            <span className="mt-2.5 size-1 shrink-0 rounded-full bg-scan" />
            {r.meaning}
          </li>
        ))}
      </ul>
      <Link href="/caregiver/rules" className="mt-7 inline-block font-bold text-scan hover:underline">
        Change the rules
      </Link>
    </Tile>
  );
}

/** Why the verifier sent this payment to you, shown on the held tag. */
function ReviewNotes({ review }: { review: string | null }) {
  if (!review) return null;
  let parsed: { reasons?: string[]; by?: string } = {};
  try {
    parsed = JSON.parse(review);
  } catch {
    return null;
  }
  if (!parsed.reasons?.length) return null;
  return (
    <div className="mb-4">
      <p className="text-sm font-bold text-ink-soft">
        {parsed.by === "verifier" ? "The verifier asked you to look because:" : "Why it's waiting:"}
      </p>
      <ul className="mt-1 list-disc pl-5 text-sm text-ink">
        {parsed.reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </div>
  );
}

function NextSteps({ parentName }: { parentName: string }) {
  const steps = [
    `Sign in with ${parentName}'s PayPal once. Guardian saves the wallet with PayPal Vault.`,
    "Place a test hold. The money is reserved on the wallet, not taken.",
    "Pay it or cancel it from here. That's the same choice you'll make for real purchases.",
  ];
  return (
    <ol className="grid gap-8 sm:grid-cols-3">
      {steps.map((s, i) => (
        <li key={s} className="border-t border-edge-strong pt-3">
          <span className="hud text-scan">({String(i + 1).padStart(2, "0")})</span>
          <p className="mt-3 text-fg-soft">{s}</p>
        </li>
      ))}
    </ol>
  );
}

function Ledger({ payments }: { payments: Payment[] }) {
  if (payments.length === 0) {
    return <p className="text-fg-soft">Paid and cancelled payments are listed here.</p>;
  }
  return (
    <ul className="divide-y divide-edge">
      {payments.map((p) => (
        <li
          key={p.id}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-1 py-5 first:pt-0 last:pb-0 sm:grid-cols-[6rem_minmax(0,1fr)_auto_8.5rem]"
        >
          <span className="hud text-fg-mute">{formatDay(p.createdAt)}</span>
          <span className="col-span-2 min-w-0 sm:col-span-1">
            <span className="block truncate font-bold">{p.merchant}</span>
            <span className="block truncate text-sm text-fg-soft">
              {p.status === "failed" ? p.failureReason : p.description}
            </span>
          </span>
          <span className="font-display text-lg font-bold">{formatMoney(p.amountCents)}</span>
          <span className="grid justify-items-end gap-1 justify-self-end">
            <Stamp status={p.status} size="sm" onDark />
            {p.decidedBy && (
              <span className="hud text-fg-mute">
                by {p.decidedBy === "caregiver" ? "you" : p.decidedBy}
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Activity({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) return <p className="text-fg-soft">Nothing has happened yet.</p>;
  return (
    <ol className="grid gap-5">
      {events.slice(0, 8).map((e) => (
        <li key={e.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
          <span className={`mt-2 size-2 rounded-full ${dotColor(e.type)}`} />
          <p>{e.message}</p>
          <p className="hud col-start-2 text-fg-mute sm:col-start-3 sm:pt-1">{formatTime(e.createdAt)}</p>
        </li>
      ))}
    </ol>
  );
}

function dotColor(type: string) {
  if (type.endsWith("captured") || type.startsWith("wallet") || type.startsWith("rules")) {
    return "bg-go";
  }
  if (type.endsWith("refused")) return "bg-stop";
  if (type.endsWith("held") || type.startsWith("order")) return "bg-wait";
  if (type.endsWith("failed")) return "bg-stop";
  return "bg-fg-mute";
}

function Setup() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 py-10 lg:grid-cols-2">
      <div>
        <p className="hud text-scan">First run</p>
        <h1 className="display mt-4 text-[clamp(2.75rem,6vw,5rem)]">Set up Guardian for your family</h1>
        <p className="mt-5 max-w-[40ch] text-lg text-fg-soft">
          Start with two names. Next you&apos;ll connect your parent&apos;s PayPal wallet so
          Guardian can hold payments on it.
        </p>
      </div>
      <div className="panel">
        <div className="relative">
          <HouseholdForm />
        </div>
      </div>
    </section>
  );
}

function MissingKeys() {
  return (
    <section className="mx-auto max-w-2xl py-10">
      <p className="hud text-wait">Setup needed</p>
      <h1 className="display mt-4 text-[clamp(2.5rem,5vw,4rem)]">Add your PayPal sandbox keys</h1>
      <p className="mt-4 text-lg text-fg-soft">
        Guardian talks to the PayPal sandbox, so it needs a REST app to run.
      </p>
      <ol className="panel mt-8 grid list-decimal gap-3 pl-12">
        <li>On developer.paypal.com, create a sandbox app tied to a US business sandbox account.</li>
        <li>In the app&apos;s features, turn on Save payment methods and save.</li>
        <li>
          Copy <code className="font-bold">.env.example</code> to{" "}
          <code className="font-bold">.env.local</code> and paste the client ID and secret.
        </li>
        <li>Restart the dev server and reload this page.</li>
      </ol>
    </section>
  );
}
