import type { CSSProperties, ReactNode } from "react";
import { formatMoney } from "@/lib/money";

export type TagStatus =
  | "authorized"
  | "captured"
  | "voided"
  | "failed"
  | "stopped"
  | "signed"
  | "tampered";

const STATUS: Record<
  TagStatus,
  { label: string; text: string; onDark: string; accent: string }
> = {
  signed: { label: "Signed", text: "text-guard", onDark: "text-go", accent: "var(--color-guard)" },
  tampered: {
    label: "Signature broken",
    text: "text-alarm",
    onDark: "text-stop",
    accent: "var(--color-alarm)",
  },
  authorized: {
    label: "On hold",
    text: "text-hold-ink",
    onDark: "text-wait",
    accent: "var(--color-hold)",
  },
  captured: { label: "Paid", text: "text-guard", onDark: "text-go", accent: "var(--color-guard)" },
  voided: {
    label: "Cancelled",
    text: "text-ink-soft",
    onDark: "text-fg-soft",
    accent: "var(--color-engrave)",
  },
  failed: {
    label: "Didn't go through",
    text: "text-alarm",
    onDark: "text-stop",
    accent: "var(--color-alarm)",
  },
  stopped: { label: "Stopped", text: "text-alarm", onDark: "text-stop", accent: "var(--color-alarm)" },
};

export function Stamp({
  status,
  delayMs,
  size = "md",
  onDark = false,
}: {
  status: TagStatus;
  /** Plays the stamp animation after this many ms. Omit for a static stamp. */
  delayMs?: number;
  size?: "sm" | "md" | "lg";
  /** Use the bright signal colours, for stamps sitting on dark panels. */
  onDark?: boolean;
}) {
  const s = STATUS[status];
  const sizeClass = size === "lg" ? "stamp-lg" : size === "sm" ? "stamp-sm" : "";
  return (
    <span
      className={`stamp ${sizeClass} ${onDark ? s.onDark : s.text} ${delayMs !== undefined ? "animate-stamp" : ""}`}
      style={delayMs ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      {s.label}
    </span>
  );
}

export function PaymentTag({
  merchant,
  description,
  amountCents,
  status,
  serial,
  note,
  footer,
  className = "",
  stampDelayMs,
  hideStamp = false,
}: {
  merchant: string;
  description: string;
  amountCents: number;
  status: TagStatus;
  serial?: string;
  note?: ReactNode;
  footer?: ReactNode;
  className?: string;
  stampDelayMs?: number;
  /** Keeps the stamp's space but doesn't show it yet. */
  hideStamp?: boolean;
}) {
  return (
    <article
      className={`tag ${className}`}
      style={
        { "--tag-accent": hideStamp ? undefined : STATUS[status].accent } as CSSProperties
      }
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-display text-lg leading-tight font-bold">{merchant}</p>
          <p className="truncate text-ink-soft">{description}</p>
        </div>
        <p className="display text-xl whitespace-nowrap">{formatMoney(amountCents)}</p>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <span className={hideStamp ? "invisible" : undefined}>
          <Stamp status={status} delayMs={stampDelayMs} />
        </span>
        {note && <p className="text-sm text-ink-soft">{note}</p>}
      </div>
      {serial && (
        <p className="mt-3 text-[0.72rem] tracking-[0.18em] text-engrave">No. {serial}</p>
      )}
      {footer && <div className="mt-4 border-t border-dashed border-line pt-4">{footer}</div>}
    </article>
  );
}
