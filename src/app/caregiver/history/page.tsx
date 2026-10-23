import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getHousehold, recentActivity, recentPayments } from "@/lib/household";
import { Activity, Ledger } from "../history-parts";
import { Tile } from "../tile";
import { TryPaymentForm } from "../try-payment-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "History · Guardian" };

export default async function HistoryPage() {
  const household = await getHousehold();
  if (!household) redirect("/caregiver");

  const [payments, activity] = await Promise.all([
    recentPayments(household.id, 50),
    recentActivity(household.id, 40),
  ]);
  const settled = payments.filter((p) => p.status !== "authorized");

  return (
    <div className="mx-auto grid max-w-[90rem] grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-12">
      <Tile label="Payments" className="lg:col-span-8">
        <Ledger payments={settled} />
      </Tile>

      <div className="grid content-start gap-8 lg:col-span-4">
        {household.vaultId && (
          <Tile label="Test a payment">
            <p className="-mt-2 mb-6 text-fg-soft">
              Puts a hold on {household.parentName}&apos;s wallet so you can see how approvals
              work. Nothing is paid until you say so.
            </p>
            <TryPaymentForm />
          </Tile>
        )}
      </div>

      <Tile label="Everything that happened" className="lg:col-span-12">
        <Activity events={activity} />
      </Tile>
    </div>
  );
}
