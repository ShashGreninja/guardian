import { Mark } from "@/components/logo";

const WORDS = [
  { word: "Held", solid: true },
  { word: "Checked", solid: false },
  { word: "Paid", solid: true },
  { word: "Held", solid: false },
  { word: "Checked", solid: true },
  { word: "Stopped", solid: false },
];

/** The three things that can happen to money, running past at poster size. */
export function Marquee() {
  const row = (hidden: boolean) => (
    <div className="flex shrink-0 items-center gap-10 pr-10" aria-hidden={hidden || undefined}>
      {WORDS.map((w, i) => (
        <span key={i} className="flex items-center gap-10">
          <span
            className={`display text-[clamp(4rem,11vw,10rem)] leading-none ${
              w.solid ? "text-fg" : "text-transparent [-webkit-text-stroke:1.5px_var(--color-fg-soft)]"
            }`}
          >
            {w.word}
          </span>
          <Mark className="size-10 shrink-0 text-scan sm:size-14" />
        </span>
      ))}
    </div>
  );

  return (
    <section className="overflow-clip border-y border-edge py-8" aria-label="Held, checked, then paid or stopped">
      <div className="animate-marquee flex w-max">
        {row(false)}
        {row(true)}
      </div>
    </section>
  );
}
