import { Stamp } from "@/components/payment-tag";
import type { ActivityEvent, Payment } from "@/lib/db/schema";
import { formatDay, formatTime } from "@/lib/format";
import { formatMoney } from "@/lib/money";

export function Ledger({ payments }: { payments: Payment[] }) {
  if (payments.length === 0) {
    return <p className="text-fg-soft">Paid and cancelled payments will be listed here.</p>;
  }
  return (
    <ul className="divide-y divide-edge">
      {payments.map((p) => (
        <li
          key={p.id}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-2 py-5 first:pt-0 last:pb-0 sm:grid-cols-[5.5rem_minmax(0,1fr)_auto_9rem]"
        >
          <span className="text-fg-mute">{formatDay(p.createdAt)}</span>
          <span className="col-span-2 min-w-0 sm:col-span-1">
            <span className="block truncate text-lg font-bold">{p.merchant}</span>
            <span className="block truncate text-fg-soft">
              {p.status === "failed" ? p.failureReason : p.description}
            </span>
          </span>
          <span className="font-display text-xl font-bold">{formatMoney(p.amountCents)}</span>
          <span className="grid justify-items-end gap-1 justify-self-end">
            <Stamp status={p.status} size="sm" onDark />
            {p.decidedBy && (
              <span className="text-sm text-fg-mute">
                by {p.decidedBy === "caregiver" ? "you" : p.decidedBy}
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function Activity({ events, limit }: { events: ActivityEvent[]; limit?: number }) {
  if (events.length === 0) return <p className="text-fg-soft">Nothing has happened yet.</p>;
  return (
    <ol className="grid gap-5">
      {events.slice(0, limit ?? events.length).map((e) => (
        <li
          key={e.id}
          className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 sm:grid-cols-[auto_minmax(0,1fr)_auto]"
        >
          <span className={`mt-2.5 size-2.5 rounded-full ${dotColor(e.type)}`} />
          <p className="text-lg">{e.message}</p>
          <p className="col-start-2 text-fg-mute sm:col-start-3 sm:pt-0.5">{formatTime(e.createdAt)}</p>
        </li>
      ))}
    </ol>
  );
}

function dotColor(type: string) {
  if (type.endsWith("captured") || type.startsWith("wallet") || type.startsWith("rules")) {
    return "bg-go";
  }
  if (type.endsWith("refused") || type === "scam.blocked" || type.endsWith("failed")) return "bg-stop";
  if (type.endsWith("held") || type.startsWith("order")) return "bg-wait";
  return "bg-fg-mute";
}
