import { Check as CheckIcon, Clock, X } from "lucide-react";
import type { Check } from "@/lib/policy";

const ICONS = {
  pass: { Icon: CheckIcon, className: "bg-go text-void", label: "Passes" },
  ask: { Icon: Clock, className: "bg-wait text-void", label: "Needs you" },
  fail: { Icon: X, className: "bg-stop text-void", label: "Fails" },
};

export function CheckList({ checks }: { checks: Check[] }) {
  return (
    <ol className="grid gap-2.5">
      {checks.map((c, i) => {
        const { Icon, className, label } = ICONS[c.result];
        return (
          <li key={i} className="flex items-start gap-3">
            <span
              className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ${className}`}
              title={label}
            >
              <Icon className="size-4" strokeWidth={3} aria-label={label} />
            </span>
            <span>{c.text}</span>
          </li>
        );
      })}
    </ol>
  );
}
