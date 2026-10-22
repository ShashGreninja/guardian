"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Mic, ScrollText } from "lucide-react";

const LINKS = [
  { href: "/caregiver", label: "Overview", Icon: LayoutGrid },
  { href: "/caregiver/rules", label: "Rules", Icon: ScrollText },
];

export function SideNav() {
  const pathname = usePathname();
  return (
    <nav className="grid gap-1.5" aria-label="App">
      {LINKS.map(({ href, label, Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl px-3.5 py-3 font-bold transition-colors ${
              active ? "bg-white/[0.07] text-fg" : "text-fg-soft hover:bg-white/[0.04] hover:text-fg"
            }`}
          >
            <Icon className={`size-5 ${active ? "text-scan" : ""}`} aria-hidden />
            {label}
          </Link>
        );
      })}
      <Link
        href="/parent"
        className="flex items-center gap-3 rounded-xl px-3.5 py-3 font-bold text-fg-soft transition-colors hover:bg-white/[0.04] hover:text-fg"
      >
        <Mic className="size-5" aria-hidden />
        Parent view
      </Link>
    </nav>
  );
}

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-2 gap-1 rounded-2xl border border-edge-strong bg-panel/90 p-1.5 backdrop-blur-xl lg:hidden"
      aria-label="App"
    >
      {LINKS.map(({ href, label, Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 font-bold ${
              active ? "bg-white/[0.08] text-fg" : "text-fg-soft"
            }`}
          >
            <Icon className={`size-5 ${active ? "text-scan" : ""}`} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function PageTitle() {
  const pathname = usePathname();
  const title = LINKS.find((l) => l.href === pathname)?.label ?? "Guardian";
  return <p className="font-display text-xl font-bold">{title}</p>;
}
