import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HeartHandshake, Mic } from "lucide-react";
import { LiveClock } from "@/components/landing/live-clock";
import { Logo } from "@/components/logo";
import { Shield } from "@/components/shield";
import { getHousehold } from "@/lib/household";
import { currentRole } from "@/lib/session";
import { signInAsCaregiver } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sign in · Guardian" };

export default async function LoginPage() {
  if (await currentRole()) redirect("/caregiver");
  const household = await getHousehold();

  return (
    <div className="grid min-h-svh flex-1 lg:grid-cols-[1.1fr_1fr]">
      <section className="relative isolate hidden overflow-clip border-r border-edge lg:flex lg:flex-col lg:justify-between lg:p-10">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <Shield ambient />
        </div>
        <Logo tone="light" />
        <div>
          <p className="hud text-scan">Shield armed</p>
          <p className="display mt-4 max-w-[12ch] text-[clamp(3rem,5vw,5rem)]">
            Every payment checked before it moves.
          </p>
        </div>
        <LiveClock className="text-fg-mute" />
      </section>

      <section className="flex flex-col justify-center px-4 py-16 sm:px-10">
        <div className="mx-auto w-full max-w-md">
          <div className="lg:hidden">
            <Logo tone="light" />
          </div>
          <h1 className="display mt-10 text-[clamp(2.75rem,5vw,4rem)] lg:mt-0">Sign in</h1>
          <p className="mt-3 text-fg-soft">
            {household
              ? `Choose how you're using Guardian for ${household.parentName}.`
              : "Choose how you're using Guardian."}
          </p>

          <form action={signInAsCaregiver} className="mt-10">
            <button
              type="submit"
              className="group flex w-full items-start gap-4 rounded-[22px] border border-edge-strong bg-panel p-5 text-left transition-colors hover:border-scan"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-scan/10 text-scan">
                <HeartHandshake className="size-6" aria-hidden />
              </span>
              <span className="flex-1">
                <span className="block font-display text-xl font-bold">I look after a parent</span>
                <span className="mt-1 block text-fg-soft">
                  {household
                    ? `Continue as ${household.caregiverName}. Approve payments and set the rules.`
                    : "Set up the household, connect PayPal, and write the rules."}
                </span>
              </span>
            </button>
          </form>

          <div className="mt-4 flex items-start gap-4 rounded-[22px] border border-dashed border-edge p-5">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/5 text-fg-mute">
              <Mic className="size-6" aria-hidden />
            </span>
            <span>
              <span className="block font-display text-xl font-bold text-fg-soft">
                I&apos;m shopping
              </span>
              <span className="mt-1 block text-fg-mute">
                The voice view for parents arrives in the next build.
              </span>
            </span>
          </div>

          <p className="hud mt-10 text-fg-mute">
            Demo sign-in. This build serves one household on the PayPal sandbox.
          </p>
        </div>
      </section>
    </div>
  );
}
