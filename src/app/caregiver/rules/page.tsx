import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createHash } from "node:crypto";
import { Holo } from "@/components/holo";
import { Stamp } from "@/components/payment-tag";
import { getHousehold } from "@/lib/household";
import { activeRules, spentThisWeek, type ActiveRules } from "@/lib/mandates";
import { formatMoney } from "@/lib/money";
import { Shell } from "../shell";
import { RuleFacts, RuleReading } from "./rule-facts";
import { RulesEditor } from "./rules-editor";
import { Simulator } from "./simulator";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Rules · Guardian" };

export default async function RulesPage() {
  const household = await getHousehold();
  if (!household) redirect("/caregiver");

  const [rules, spent] = await Promise.all([
    activeRules(household.id),
    spentThisWeek(household.id),
  ]);

  return (
    <Shell household={household}>
      <section className="relative isolate overflow-clip rounded-[30px] bg-ink px-6 py-8 text-surface sm:px-10 sm:py-10">
        <div
          aria-hidden
          className="rosette pointer-events-none absolute -right-40 -bottom-72 -z-10 size-[36rem] text-surface/[0.06]"
        />
        <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <h1 className="display max-w-[16ch] text-[clamp(2.5rem,5vw,4rem)]">
              {rules ? `${household.parentName}'s rules are on.` : `Set the rules for ${household.parentName}.`}
            </h1>
            <p className="mt-4 max-w-[52ch] text-lg text-surface/80">
              {rules
                ? `Every payment is checked against rule set v${rules.mandate.version} before any money moves. ${formatMoney(spent)} held or paid in the last 7 days.`
                : "Write them in plain English. Claude reads them into a rule set, you check the reading, and Guardian signs it. Every payment is then checked against it."}
            </p>
          </div>
          {rules && (
            <Holo className="holo-light w-full max-w-sm rounded-[22px]">
              <SignatureCard rules={rules} />
            </Holo>
          )}
        </div>
      </section>

      <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-10">
          {rules && (
            <section>
              <h2 className="display text-2xl">Signed rule set</h2>
              <div className="mt-5">
                <RuleFacts rules={rules.rules} />
              </div>
              <div className="mt-4 rounded-[22px] bg-surface px-5">
                <RuleReading rules={rules.rules} />
              </div>
            </section>
          )}
          <RulesEditor
            initialText={rules?.mandate.sourceText ?? null}
            parentName={household.parentName}
          />
        </div>

        <aside className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-8">
          {rules ? (
            <Simulator parentName={household.parentName} />
          ) : (
            <section className="sheet">
              <h2 className="text-xl font-bold">Then test it</h2>
              <p className="mt-2 text-ink-soft">
                Once the rules are signed, you can try purchases here and see exactly which rule
                lets each one through, sends it to you, or stops it.
              </p>
            </section>
          )}
        </aside>
      </div>
    </Shell>
  );
}

function SignatureCard({ rules }: { rules: ActiveRules }) {
  const keyFingerprint = createHash("sha256").update(rules.publicKey).digest("hex").slice(0, 16);
  const digest = rules.mandate.digest.slice(0, 16).match(/.{4}/g)!.join(" ");

  return (
    <div className="w-full max-w-sm rounded-[22px] bg-surface p-6 text-ink">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-ink-soft">Rule set v{rules.mandate.version}</p>
          <p className="mt-1 text-xl font-bold tracking-wide">{digest}</p>
        </div>
        <Stamp status={rules.verified ? "signed" : "tampered"} />
      </div>
      <p className="mt-4 text-sm text-ink-soft">
        Signed by {rules.signedBy} on{" "}
        {rules.mandate.signedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}{" "}
        with Ed25519.{" "}
        {rules.verified
          ? "The signature checks out."
          : "The stored rules don't match their signature. Sign them again."}
      </p>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer font-bold">Show the signature</summary>
        <p className="mt-2 break-all text-ink-soft">
          Key {keyFingerprint}
          <br />
          {rules.mandate.signature}
        </p>
      </details>
    </div>
  );
}
