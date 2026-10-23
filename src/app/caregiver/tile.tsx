import type { ReactNode } from "react";

/** One card on a dashboard page. Every panel in the app uses this shape. */
export function Tile({
  label,
  action,
  className = "",
  children,
}: {
  label?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`panel min-w-0 ${className}`}>
      {(label || action) && (
        <div className="relative mb-6 flex items-center justify-between gap-3">
          {label && <h2 className="text-xl font-bold">{label}</h2>}
          {action}
        </div>
      )}
      <div className="relative">{children}</div>
    </section>
  );
}
