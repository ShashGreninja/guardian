export function formatDay(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatTime(d: Date) {
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Short, printable reference for a payment, like the number on a ticket. */
export function serial(id: string) {
  return `GRD-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** True for dates inside the rolling 7-day window the weekly budget uses. */
export function inLastWeek(d: Date) {
  return d.getTime() >= Date.now() - WEEK_MS;
}

export function greeting(now = new Date()) {
  const h = now.getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}
