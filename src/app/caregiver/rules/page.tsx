import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createHash } from "node:crypto";
import { Holo } from "@/components/holo";
import { Stamp } from "@/components/payment-tag";
import { getHousehold } from "@/lib/household";
import { activeRules, spentThisWeek, type ActiveRules } from "@/lib/mandates";
import { formatMoney } from "@/lib/money";
import { Tile } from "../tile";
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
    <div className="mx-auto grid max-w-[90rem] grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-12">
      <section className="panel relative isolate overflow-clip lg:col-span-12">
        <div
          aria-hidden
          className="rosette pointer-events-none absolute top-1/2 -right-40 -z-10 size-[40rem] -translate-y-1/2 text-scan/[0.07]"
        />
        <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <p className="hud flex items-center gap-2 text-fg-soft">
              <span className={`size-1.5 rounded-full ${rules ? (rules.verified ? "bg-go" : "bg-stop") : "bg-fg-mute"}`} />
              {rules ? `Rule set v${rules.mandate.version} active` : "No rules signed"}
            </p>
            <h1 className="display mt-4 max-w-[16ch] text-[clamp(2.6rem,5vw,4.5rem)]">
              {rules ? `${household.parentName}'s rules are on.` : `Set the rules for ${household.parentName}.`}
            </h1>
            <p className="mt-4 max-w-[54ch] text-lg text-fg-soft">
              {rules
                ? `Every payment is checked against these rules before any money moves. ${formatMoney(spent)} held or paid in the last 7 days.`
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

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-8 lg:col-span-8">
        {rules && (
          <Tile label="Signed rule set">
            <RuleFacts rules={rules.rules} />
            <div className="mt-8">
              <RuleReading rules={rules.rules} />
            </div>
          </Tile>
        )}
        <RulesEditor initialText={rules?.mandate.sourceText ?? null} parentName={household.parentName} />
      </div>

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-8 lg:col-span-4">
        {rules ? (
          <Simulator parentName={household.parentName} />
        ) : (
          <Tile label="Then test it">
            <p className="text-fg-soft">
              Once the rules are signed, you can try purchases here and see exactly which rule
              lets each one through, sends it to you, or stops it.
            </p>
          </Tile>
        )}
      </div>
    </div>
  );
}

function SignatureCard({ rules }: { rules: ActiveRules }) {
  const keyFingerprint = createHash("sha256").update(rules.publicKey).digest("hex").slice(0, 16);
  const digest = rules.mandate.digest.slice(0, 16).match(/.{4}/g)!.join(" ");

  return (
    <div className="w-full rounded-[22px] bg-surface p-6 text-ink">
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
