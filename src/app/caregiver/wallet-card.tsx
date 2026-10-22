import { Mark } from "@/components/logo";
import type { Household } from "@/lib/db/schema";

/** The parent's saved PayPal wallet, drawn like an engraved card. */
export function WalletCard({ household }: { household: Household }) {
  return (
    <div className="relative isolate aspect-[1.6] w-full max-w-sm overflow-clip rounded-[22px] bg-[linear-gradient(135deg,#1b3a5c,#10243f_60%)] p-6 text-surface shadow-[0_30px_50px_-30px_rgb(0_0_0/0.8)] ring-1 ring-white/10">
      <div
        aria-hidden
        className="rosette pointer-events-none absolute -top-24 -right-24 -z-10 size-80 text-surface/[0.12]"
      />
      <div aria-hidden className="band absolute inset-x-6 bottom-5 h-4 text-hold/50" />
      <div className="flex items-start justify-between">
        <p className="font-display text-lg font-bold">{household.parentName}&apos;s PayPal</p>
        <Mark className="size-7 text-hold" />
      </div>
      <p className="mt-8 truncate text-lg">{household.payerEmail ?? "Saved PayPal account"}</p>
      <p className="mt-1 text-sm text-surface/65">
        Saved with PayPal Vault
        {household.walletConnectedAt &&
          ` on ${household.walletConnectedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
      </p>
    </div>
  );
}
