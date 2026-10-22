import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { LiveClock } from "@/components/landing/live-clock";
import { Logo } from "@/components/logo";
import { getHousehold } from "@/lib/household";
import { currentRole } from "@/lib/session";
import { signOut } from "../login/actions";
import { ShopByVoice } from "./shop-by-voice";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Shop · Guardian" };

export default async function ParentPage() {
  if (!(await currentRole())) redirect("/login");
  const household = await getHousehold();

  return (
    <div className="flex min-h-svh flex-1 flex-col overflow-x-clip">
      <header className="flex items-center justify-between gap-4 border-b border-edge px-4 py-5 sm:px-8 lg:px-10">
        <Logo tone="light" />
        <div className="flex items-center gap-6">
          <LiveClock className="hidden text-fg-mute sm:inline" />
          <form action={signOut}>
            <button className="flex items-center gap-2 rounded-full px-4 py-2 text-lg font-bold text-fg-soft hover:bg-white/[0.05] hover:text-fg">
              <LogOut className="size-5" aria-hidden />
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="flex-1 px-4 py-8 sm:px-8 lg:px-10 lg:py-12">
        {household?.vaultId ? (
          <ShopByVoice parentName={household.parentName} caregiverName={household.caregiverName} />
        ) : (
          <section className="mx-auto max-w-2xl py-16 text-center">
            <h1 className="display text-[clamp(2.75rem,6vw,4.5rem)]">Almost ready</h1>
            <p className="mt-6 text-xl text-fg-soft">
              {household
                ? `${household.caregiverName} needs to connect your PayPal before you can shop.`
                : "Your family needs to finish setting up Guardian before you can shop."}
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
