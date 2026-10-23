import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HeartHandshake, Mic } from "lucide-react";
import { LiveClock } from "@/components/landing/live-clock";
import { Logo } from "@/components/logo";
import { Shield } from "@/components/shield";
import { getHousehold } from "@/lib/household";
import { currentRole } from "@/lib/session";
import { signInAsCaregiver, signInAsParent } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sign in · Guardian" };

export default async function LoginPage() {
  const role = await currentRole();
  if (role) redirect(role === "parent" ? "/parent" : "/caregiver");
  const household = await getHousehold();

  return (
    <div className="grid min-h-svh flex-1 lg:grid-cols-[1.1fr_1fr]">
      <section className="relative isolate hidden overflow-clip border-r border-edge lg:grid lg:place-items-center">
        {/* Shield and headline share one grid cell, so the words sit in its centre. */}
        <div className="pointer-events-none col-start-1 row-start-1 aspect-square w-[min(52rem,115%)]">
          <Shield ambient />
        </div>
        <div className="col-start-1 row-start-1 grid max-w-[20rem] justify-items-center text-center">
          <p className="hud flex items-center gap-2 text-go">
            <span className="size-2 rounded-full bg-go" /> Protection on
          </p>
          <p className="display mt-5 text-[clamp(2.4rem,3.4vw,3.6rem)]">
            Every payment checked before it moves.
          </p>
        </div>
        <div className="absolute top-10 left-10">
          <Logo tone="light" />
        </div>
        <LiveClock className="absolute bottom-10 left-10 text-fg-mute" />
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

          <form action={signInAsCaregiver} className="mt-12">
            <button
              type="submit"
              className="group flex w-full items-start gap-4 rounded-[22px] border border-edge-strong bg-panel p-6 text-left transition-colors hover:border-scan"
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

          <form action={signInAsParent} className="mt-5">
            <button
              type="submit"
              className="group flex w-full items-start gap-4 rounded-[22px] border border-edge-strong bg-panel p-6 text-left transition-colors hover:border-wait"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-wait/10 text-wait">
                <Mic className="size-6" aria-hidden />
              </span>
              <span className="flex-1">
                <span className="block font-display text-xl font-bold">I&apos;m shopping</span>
                <span className="mt-1 block text-fg-soft">
                  {household
                    ? `Continue as ${household.parentName}. Ask for what you need out loud.`
                    : "Ask for what you need out loud."}
                </span>
              </span>
            </button>
          </form>

          <p className="hud mt-10 text-fg-mute">
            Demo sign-in. This build serves one household on the PayPal sandbox.
          </p>
        </div>
      </section>
    </div>
  );
}
