"use client";

import { useEffect, useState } from "react";

/** Local time, ticking, the way a control room shows it. */
export function LiveClock({ className = "" }: { className?: string }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const time = now
    ? now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "--:--:--";
  const zone = now
    ? (new Intl.DateTimeFormat("en-US", { timeZoneName: "short" })
        .formatToParts(now)
        .find((p) => p.type === "timeZoneName")?.value ?? "")
    : "";

  return (
    <span className={`tick tabular-nums ${className}`} suppressHydrationWarning>
      {time} {zone}
    </span>
  );
}
