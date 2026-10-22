import { Logo } from "@/components/logo";
import type { Household } from "@/lib/db/schema";
import { CaregiverNav } from "./nav";

export function Shell({ household, children }: { household?: Household; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 pb-20 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-5">
        <div className="flex items-center gap-8">
          <Logo />
          {household && <CaregiverNav />}
        </div>
        {household && (
          <p className="text-ink-soft">
            Looking after <span className="font-bold text-ink">{household.parentName}</span>
          </p>
        )}
      </header>
      <main className="pt-2">{children}</main>
    </div>
  );
}
