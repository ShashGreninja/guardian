import Link from "next/link";
import { CheckpointDemo } from "@/components/checkpoint-demo";
import { Holo } from "@/components/holo";
import { Logo } from "@/components/logo";

const stations = [
  {
    title: "You write the rules",
    body: "In plain English. Guardian turns them into a signed rule set that every payment is checked against.",
  },
  {
    title: "She asks out loud",
    body: "Guardian finds the items, builds the cart, and reads it back to her before anything happens.",
  },
  {
    title: "PayPal holds the money",
    body: "The payment is authorized on her wallet but not taken. Nothing has left her account yet.",
  },
  {
    title: "A second agent decides",
    body: "It never hears the conversation, so nobody can talk it into anything. Pass, ask you, or stop.",
  },
];

const rules = [
  { said: "Up to $60 a week on groceries and the pharmacy.", kind: "Budget" },
  { said: "Anything over $25, ask me first.", kind: "Approval" },
  { said: "Never send money to a person.", kind: "Hard stop" },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col overflow-x-clip">
      <main className="flex-1">
        <section className="relative isolate overflow-clip bg-ink text-surface">
          <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-8">
            <Logo tone="light" />
            <nav className="flex items-center gap-2 sm:gap-6">
              <a href="#how" className="hidden font-bold text-surface/80 hover:text-surface sm:inline">
                How it works
              </a>
              <Link href="/caregiver" className="btn btn-gold min-h-11 px-5 whitespace-nowrap">
                <span className="sm:hidden">Dashboard</span>
                <span className="hidden sm:inline">Open dashboard</span>
              </Link>
            </nav>
          </header>

          <div className="mx-auto grid w-full max-w-7xl grid-cols-[minmax(0,1fr)] items-center gap-10 px-4 pt-6 pb-20 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:gap-12 lg:pt-10 lg:pb-24">
            <div>
              <h1 className="display text-[clamp(3.4rem,8.5vw,7rem)]">
                <span className="block">Mom can shop</span>
                <span className="block">by voice.</span>
                <span className="mt-2 block">A scammer can&apos;t.</span>
              </h1>
              <p className="mt-7 max-w-[44ch] text-lg text-surface/75">
                Guardian is a PayPal shopping agent for aging parents. You set the rules once.
                Every payment is held on her wallet, checked by a second agent, and only then
                paid.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link href="/caregiver" className="btn btn-gold">
                  Set up your family
                </Link>
                <a href="#how" className="btn btn-quiet text-surface">
                  How it works
                </a>
              </div>
            </div>

            <CheckpointDemo />
          </div>
        </section>

        <section id="how" className="relative bg-paper-deep">
          <div aria-hidden className="band h-5 w-full text-engrave" />
          <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-8 lg:py-28">
            <h2 className="display max-w-[16ch] text-[clamp(2.5rem,5vw,4rem)]">
              Four stops between asking and paying
            </h2>

            <div className="relative mt-14">
              <div
                aria-hidden
                className="absolute top-5 right-0 left-5 hidden h-0.5 bg-[repeating-linear-gradient(90deg,var(--color-ink)_0_10px,transparent_10px_18px)] opacity-25 md:block"
              />
              <ol className="relative grid gap-10 md:grid-cols-4 md:gap-8">
                {stations.map((s, i) => (
                  <li key={s.title} className="relative">
                    <span
                      className={`relative grid size-10 place-items-center rounded-full font-display text-lg font-extrabold text-surface ${
                        i === stations.length - 1 ? "bg-guard" : "bg-ink"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <h3 className="mt-5 text-xl font-bold">{s.title}</h3>
                    <p className="mt-2 max-w-[32ch] text-ink-soft">{s.body}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-7xl grid-cols-[minmax(0,1fr)] items-center gap-12 px-4 py-20 sm:px-8 lg:grid-cols-[1fr_1.1fr] lg:py-28">
          <div>
            <h2 className="display max-w-[14ch] text-[clamp(2.5rem,5vw,4rem)]">
              Rules in your words, enforced in code
            </h2>
            <p className="mt-6 max-w-[46ch] text-lg text-ink-soft">
              Write what you&apos;d tell a neighbour who was helping out. Guardian turns it into
              a rule set you can read back, signs it, and attaches the signature to every PayPal
              order it places. You can always see which rule let a payment through.
            </p>
          </div>

          <Holo className="holo-light rounded-[26px]">
          <figure className="relative rounded-[26px] bg-surface p-2 shadow-[0_30px_60px_-40px_rgb(16_36_63/0.7)]">
            <div className="relative overflow-clip rounded-[20px] border-2 border-engrave/60 p-6 sm:p-8">
              <div
                aria-hidden
                className="rosette pointer-events-none absolute -right-24 -bottom-24 size-72 text-engrave/30"
              />
              <figcaption className="font-display text-lg font-bold">
                Priya&apos;s rules for Asha
              </figcaption>
              <ul className="mt-5 grid gap-4">
                {rules.map((r) => (
                  <li key={r.said} className="flex items-baseline justify-between gap-4">
                    <span className="text-lg">“{r.said}”</span>
                    <span className="shrink-0 rounded-full bg-paper px-3 py-0.5 text-sm font-bold text-ink-soft">
                      {r.kind}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-7 flex flex-wrap items-end justify-between gap-4 border-t border-dashed border-line pt-5">
                <div>
                  <p className="text-sm text-ink-soft">Signed rule set</p>
                  <p className="font-bold tracking-wide">7f3a 91c2 0be4 d815</p>
                </div>
                <span className="stamp text-guard">Signed by Priya</span>
              </div>
            </div>
          </figure>
          </Holo>
        </section>

        <section className="relative isolate overflow-clip bg-ink text-surface">
          <div
            aria-hidden
            className="rosette pointer-events-none absolute -right-48 -bottom-72 -z-10 size-[46rem] text-surface/[0.06]"
          />
          <div className="mx-auto flex w-full max-w-7xl flex-col items-start gap-8 px-4 py-20 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:py-24">
            <h2 className="display max-w-[15ch] text-[clamp(2.5rem,5vw,4rem)]">
              Set it up once. Stop worrying about the phone ringing.
            </h2>
            <Link href="/caregiver" className="btn btn-gold">
              Set up your family
            </Link>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-7xl flex-wrap justify-between gap-4 px-4 py-8 text-sm text-ink-soft sm:px-8">
        <p>Guardian runs on the PayPal sandbox. No real money moves.</p>
        <p>Built for the PayPal AI Hackathon</p>
      </footer>
    </div>
  );
}
