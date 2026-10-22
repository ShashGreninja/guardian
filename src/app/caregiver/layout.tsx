import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { LiveClock } from "@/components/landing/live-clock";
import { Logo } from "@/components/logo";
import { getHousehold } from "@/lib/household";
import { currentRole } from "@/lib/session";
import { signOut } from "../login/actions";
import { PageTitle, SideNav, TabBar } from "./nav";

export default async function CaregiverLayout({ children }: { children: React.ReactNode }) {
  if (!(await currentRole())) redirect("/login");
  const household = await getHousehold();

  return (
    <div className="flex min-h-svh flex-1 overflow-x-clip">
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col justify-between border-r border-edge px-4 py-6 lg:flex">
        <div>
          <div className="px-3">
            <Logo tone="light" />
          </div>
          <div className="mt-10">
            <SideNav />
          </div>
        </div>

        <div className="grid gap-3">
          {household && (
            <div className="rounded-2xl border border-edge bg-panel p-4">
              <p className="hud text-fg-mute">Looking after</p>
              <p className="mt-1 font-display text-lg font-bold">{household.parentName}</p>
              <p className="text-sm text-fg-soft">Caregiver: {household.caregiverName}</p>
            </div>
          )}
          <form action={signOut}>
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 font-bold text-fg-soft hover:bg-white/[0.04] hover:text-fg">
              <LogOut className="size-5" aria-hidden />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-edge bg-void/80 px-4 py-4 backdrop-blur-xl sm:px-8">
          <div className="flex items-center gap-4">
            <span className="lg:hidden">
              <Logo tone="light" />
            </span>
            <span className="hidden lg:block">
              <PageTitle />
            </span>
          </div>
          <div className="flex items-center gap-5">
            <p className="hud hidden items-center gap-2 text-go sm:flex">
              <span className="size-1.5 rounded-full bg-go" /> Sandbox live
            </p>
            <LiveClock className="hidden text-fg-mute md:inline" />
            <form action={signOut} className="lg:hidden">
              <button className="hud text-fg-soft">Sign out</button>
            </form>
          </div>
        </header>
        <main className="flex-1 px-4 pt-6 pb-28 sm:px-8 lg:pb-12">{children}</main>
      </div>

      <TabBar />
    </div>
  );
}
