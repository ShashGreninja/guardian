import type { ReactNode } from "react";
import { formatMoney } from "@/lib/money";

export type TagStatus = "authorized" | "captured" | "voided" | "failed" | "stopped";

const STAMPS: Record<TagStatus, { label: string; className: string }> = {
  authorized: { label: "On hold", className: "text-hold-ink" },
  captured: { label: "Paid", className: "text-guard" },
  voided: { label: "Cancelled", className: "text-ink-soft" },
  failed: { label: "Didn't go through", className: "text-alarm" },
  stopped: { label: "Stopped", className: "text-alarm" },
};

export function Stamp({ status, delayMs }: { status: TagStatus; delayMs?: number }) {
  const stamp = STAMPS[status];
  return (
    <span
      className={`stamp ${stamp.className} ${delayMs !== undefined ? "animate-stamp" : ""}`}
      style={delayMs ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      {stamp.label}
    </span>
  );
}

export function PaymentTag({
  merchant,
  description,
  amountCents,
  status,
  note,
  footer,
  className = "",
  stampDelayMs,
}: {
  merchant: string;
  description: string;
  amountCents: number;
  status: TagStatus;
  note?: ReactNode;
  footer?: ReactNode;
  className?: string;
  /** Plays the stamp animation after this many ms. Omit for a static stamp. */
  stampDelayMs?: number;
}) {
  return (
    <article className={`tag ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-display text-lg font-bold leading-tight">{merchant}</p>
          <p className="truncate text-ink-soft">{description}</p>
        </div>
        <p className="font-display text-xl font-bold">{formatMoney(amountCents)}</p>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <Stamp status={status} delayMs={stampDelayMs} />
        {note && <p className="text-base text-ink-soft">{note}</p>}
      </div>
      {footer && <div className="mt-4 border-t border-dashed border-line pt-4">{footer}</div>}
    </article>
  );
}
