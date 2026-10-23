import type { Metadata } from "next";
import Link from "next/link";
import { Holo } from "@/components/holo";
import { PaymentTag, Stamp } from "@/components/payment-tag";
import { Shield } from "@/components/shield";
import type { Household, Payment } from "@/lib/db/schema";
import { formatTime, greeting, inLastWeek, serial } from "@/lib/format";
import { getHousehold, recentActivity, recentPayments } from "@/lib/household";
import { activeRules, spentThisWeek, type ActiveRules } from "@/lib/mandates";
import { formatMoney } from "@/lib/money";
import { paypalConfigured } from "@/lib/paypal";
import { openAlerts, PATTERN_LABELS } from "@/lib/scam";
import { Alerts } from "./alerts";
import { Activity } from "./history-parts";
import { HoldActions } from "./hold-actions";
import { HouseholdForm } from "./household-form";
import { Tile } from "./tile";
import { WalletCard } from "./wallet-card";
import { WalletConnect } from "./wallet-connect";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Overview · Guardian" };

export default async function CaregiverPage() {
  if (!paypalConfigured()) return <MissingKeys />;

  const household = await getHousehold();
  if (!household) return <Setup />;

  const [payments, activity, rules, spent, alerts] = await Promise.all([
    recentPayments(household.id),
    recentActivity(household.id),
    activeRules(household.id),
    spentThisWeek(household.id),
    openAlerts(household.id),
  ]);
  const waiting = payments.filter((p) => p.status === "authorized");
  const budget = rules?.rules.weeklyBudgetCents ?? null;
  const connected = Boolean(household.vaultId);

  return (
    <div className="mx-auto grid max-w-[90rem] grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-12">
      <Alerts
        parentName={household.parentName}
        alerts={alerts.map((a) => ({
          id: a.id,
          recipient: a.recipient,
          amountCents: a.amountCents,
          said: a.said,
          pattern: PATTERN_LABELS[a.pattern as keyof typeof PATTERN_LABELS] ?? a.pattern,
          risk: a.risk,
          explanation: a.explanation,
          advice: a.advice,
          when: formatTime(a.createdAt),
        }))}
      />

      <StatusTile
        household={household}
        waiting={waiting}
        spent={spent}
        budget={budget}
        className="lg:col-span-7"
      />

      <div className="grid content-start gap-8 lg:col-span-5">
        <Tile label="Wallet">
          {connected ? (
            <Holo className="rounded-[22px]">
              <WalletCard household={household} />
            </Holo>
          ) : (
            <WalletConnect parentName={household.parentName} />
          )}
        </Tile>
        <WeekTile payments={payments} spent={spent} budget={budget} />
      </div>

      <Tile
        label={waiting.length ? `Waiting for you (${waiting.length})` : "Waiting for you"}
        className="lg:col-span-7"
      >
        {!connected ? (
          <NextSteps parentName={household.parentName} />
        ) : waiting.length === 0 ? (
          <p className="max-w-[52ch] text-lg text-fg-soft">
            Nothing to approve. When a payment needs your OK, it shows up here with the money
            already on hold, and you choose to pay it or cancel it.
          </p>
        ) : (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
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

      <RulesTile rules={rules} className="lg:col-span-5" />

      <Tile
        label="Recent activity"
        action={
          <Link href="/caregiver/history" className="font-bold text-scan hover:underline">
            See all
          </Link>
        }
        className="lg:col-span-12"
      >
        <Activity events={activity} limit={4} />
      </Tile>
    </div>
  );
}

function StatusTile({
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
  const headline = !connected ? "Not set up yet" : waiting.length === 0 ? "All clear" : `${waiting.length} waiting`;
  const detail = !connected
    ? `Connect ${household.parentName}'s PayPal to start.`
    : waiting.length === 0
      ? "Nothing needs you right now."
      : `${formatMoney(heldCents)} is on hold until you decide.`;

  return (
    <section className={`panel relative isolate grid min-h-[30rem] place-items-center overflow-clip ${className}`}>
      <p className="absolute top-7 left-7 text-lg text-fg-soft sm:top-9 sm:left-9">
        {greeting()}, {household.caregiverName}
      </p>

      {/* Shield and status share one grid cell, so the words sit in its centre. */}
      <div className="pointer-events-none col-start-1 row-start-1 size-[min(32rem,90vw)] opacity-90">
        <Shield holds={connected ? waiting.length : 0} budget={budget ? spent / budget : null} />
      </div>
      <div className="col-start-1 row-start-1 grid max-w-[17rem] justify-items-center text-center">
        <p
          className={`flex items-center gap-2 font-bold ${!connected ? "text-fg-mute" : waiting.length ? "text-wait" : "text-go"}`}
        >
          <span className="size-2 rounded-full bg-current" />
          {connected ? "Protection on" : "Protection off"}
        </p>
        <h1 className="display mt-3 text-[clamp(2.75rem,4.5vw,4rem)]">{headline}</h1>
        <p className="mt-3 text-lg text-fg-soft">{detail}</p>
      </div>
    </section>
  );
}

function WeekTile({
  payments,
  spent,
  budget,
}: {
  payments: Payment[];
  spent: number;
  budget: number | null;
}) {
  const week = payments.filter((p) => inLastWeek(p.createdAt));
  const sum = (status: Payment["status"]) =>
    week.filter((p) => p.status === status).reduce((s, p) => s + p.amountCents, 0);
  const share = budget ? Math.min(spent / budget, 1) : 0;
  const over = budget !== null && spent > budget;

  return (
    <Tile label="This week">
      <dl className="grid grid-cols-2 gap-6">
        <div>
          <dt className="text-fg-soft">Paid</dt>
          <dd className="mt-1 font-display text-2xl font-bold">{formatMoney(sum("captured"))}</dd>
        </div>
        <div>
          <dt className="text-fg-soft">On hold</dt>
          <dd className="mt-1 font-display text-2xl font-bold">{formatMoney(sum("authorized"))}</dd>
        </div>
      </dl>
      <div className="mt-7">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-fg-soft">Weekly budget</p>
          <p className="font-bold">
            {budget ? `${formatMoney(spent)} of ${formatMoney(budget)}` : "Not set"}
          </p>
        </div>
        <div className="mt-3 h-2.5 overflow-clip rounded-full bg-white/[0.08]">
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
      <Tile label="Spending rules" className={className}>
        <p className="text-lg text-fg-soft">
          No rules yet. Write them in plain English and Guardian checks every payment against
          them.
        </p>
        <Link href="/caregiver/rules" className="btn btn-primary mt-6">
          Write the rules
        </Link>
      </Tile>
    );
  }
  return (
    <Tile
      label="Spending rules"
      action={<Stamp status={rules.verified ? "signed" : "tampered"} size="sm" onDark />}
      className={className}
    >
      <ul className="grid gap-3">
        {rules.rules.rules.slice(0, 4).map((r) => (
          <li key={r.meaning} className="flex gap-3 text-lg text-fg-soft">
            <span className="mt-3 size-1.5 shrink-0 rounded-full bg-scan" />
            {r.meaning}
          </li>
        ))}
      </ul>
      <Link href="/caregiver/rules" className="mt-6 inline-block font-bold text-scan hover:underline">
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
      <p className="font-bold text-ink-soft">
        {parsed.by === "verifier" ? "The second check asked you to look because:" : "Why it's waiting:"}
      </p>
      <ul className="mt-1 list-disc pl-5 text-ink">
        {parsed.reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </div>
  );
}

function NextSteps({ parentName }: { parentName: string }) {
  const steps = [
    `Connect ${parentName}'s PayPal once. Guardian saves the wallet securely with PayPal.`,
    "Write the spending rules in plain English on the Rules page.",
    `When ${parentName} shops, payments that need you will show up here.`,
  ];
  return (
    <ol className="grid gap-5">
      {steps.map((s, i) => (
        <li key={s} className="flex gap-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/[0.08] font-bold">
            {i + 1}
          </span>
          <p className="pt-1 text-lg text-fg-soft">{s}</p>
        </li>
      ))}
    </ol>
  );
}

function Setup() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 py-10 lg:grid-cols-2">
      <div>
        <p className="font-bold text-scan">First step</p>
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
      <p className="font-bold text-wait">Setup needed</p>
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
