import type { ReactNode } from "react";

/** One instrument in the bento grid: a lit panel with a HUD label. */
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
        <div className="relative mb-5 flex items-center justify-between gap-3">
          {label && <h2 className="hud text-fg-mute">{label}</h2>}
          {action}
        </div>
      )}
      <div className="relative">{children}</div>
    </section>
  );
}
