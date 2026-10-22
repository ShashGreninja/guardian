"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/caregiver", label: "Payments" },
  { href: "/caregiver/rules", label: "Rules" },
];

export function CaregiverNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 rounded-full bg-paper-deep p-1" aria-label="Dashboard">
      {LINKS.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-4 py-1.5 font-bold transition-colors ${
              active ? "bg-ink text-surface" : "text-ink-soft hover:text-ink"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
