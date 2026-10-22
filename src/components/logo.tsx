import Link from "next/link";

export function Mark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path
        d="M4 9.5 11.5 3h15A2.5 2.5 0 0 1 29 5.5v21a2.5 2.5 0 0 1-2.5 2.5h-15L4 22.5z"
        fill="currentColor"
      />
      <circle cx="11.5" cy="16" r="2.6" className="fill-paper [.text-surface_&]:fill-ink" />
      <path
        d="m17 16.2 2.6 2.6 5-5.4"
        fill="none"
        className="stroke-paper [.text-surface_&]:stroke-ink"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ tone = "ink" }: { tone?: "ink" | "light" }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2 ${tone === "light" ? "text-surface" : "text-ink"}`}
    >
      <Mark />
      <span className="font-display text-xl font-extrabold tracking-tight">Guardian</span>
    </Link>
  );
}
