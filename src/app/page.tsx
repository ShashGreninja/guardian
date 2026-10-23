import Link from "next/link";
import { Holo } from "@/components/holo";
import { Intro } from "@/components/landing/intro";
import { LiveClock } from "@/components/landing/live-clock";
import { Marquee } from "@/components/landing/marquee";
import { ScrollCheckpoint } from "@/components/landing/scroll-checkpoint";
import { Logo } from "@/components/logo";
import { Shield } from "@/components/shield";

const promises = [
  { title: "Held first", body: "Every payment starts as a PayPal authorization. Nothing is charged yet." },
  { title: "Signed rules", body: "Your rules are signed with Ed25519. Edited rules stop working." },
  { title: "Second agent", body: "It checks the cart against your rules and never hears the call." },
  { title: "Scam shield", body: "Money to people is stopped unless you've said it's fine." },
];

const stations = [
  {
    title: "You write the rules",
    body: "In plain English. Claude reads them into a rule set, you check the reading, and Guardian signs it.",
  },
  {
    title: "She asks out loud",
    body: "Guardian finds the items, builds the cart, and reads it back to her before anything happens.",
  },
  {
    title: "PayPal holds the money",
    body: "The payment is authorized on her saved wallet but not taken. Nothing has left her account.",
  },
  {
    title: "A second agent decides",
    body: "Pass, ask you, or stop. Paid only when it passes; the hold disappears when it doesn't.",
  },
];

const specs = [
  { k: "Payments", v: "PayPal Orders v2: authorize, then capture or void" },
  { k: "Wallet", v: "PayPal Vault payment tokens. No passwords stored" },
  { k: "Rules", v: "Claude structured outputs, signed with Ed25519" },
  { k: "Decisions", v: "Deterministic policy engine. No model moves money" },
];

const rules = [
  { said: "Up to $60 a week on groceries and the pharmacy.", kind: "Budget" },
  { said: "Anything over $25, ask me first.", kind: "Approval" },
  { said: "Never send money to a person.", kind: "Hard stop" },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col overflow-x-clip">
      <Intro />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative isolate flex min-h-svh flex-col overflow-clip">
          <div className="pointer-events-none absolute top-[4vh] right-[-45vw] -z-10 size-[min(120vh,125vw)] opacity-55 sm:right-[-22vw] sm:opacity-100 lg:right-[-10vw]">
            <Shield ambient />
          </div>

          <header className="mx-auto grid w-full max-w-[90rem] grid-cols-[1fr_auto] items-start gap-4 px-4 pt-5 sm:px-8 lg:grid-cols-6">
            <div className="border-t border-edge-strong pt-3">
              <Logo tone="light" />
            </div>
            <a href="#checkpoint" className="hud hidden border-t border-edge-strong pt-3 text-fg-soft hover:text-fg lg:block">
              (01) The checkpoint
            </a>
            <a href="#how" className="hud hidden border-t border-edge-strong pt-3 text-fg-soft hover:text-fg lg:block">
              (02) How it works
            </a>
            <a href="#rules" className="hud hidden border-t border-edge-strong pt-3 text-fg-soft hover:text-fg lg:block">
              (03) Rules
            </a>
            <div className="hidden border-t border-edge-strong pt-3 lg:block">
              <LiveClock className="text-fg-soft" />
              <p className="hud mt-1 flex items-center gap-2 text-go">
                <span className="size-1.5 rounded-full bg-go" /> Shield armed
              </p>
            </div>
            <div className="border-t border-edge-strong pt-3 lg:justify-self-end">
              <Link href="/login" className="btn btn-gold min-h-10 px-5 text-sm">
                Open Guardian
              </Link>
            </div>
          </header>

          <div className="mx-auto grid w-full max-w-[90rem] flex-1 content-end gap-16 px-4 pt-24 pb-16 sm:px-8 lg:gap-24">
            <div className="max-w-4xl">
              <p className="hud after-intro animate-rise text-scan">
                A PayPal shopping agent for aging parents
              </p>
              <h1 className="display mt-6 after-intro animate-rise text-[clamp(3.2rem,8vw,8rem)]" style={{ "--d": "0.1s" } as React.CSSProperties}>
                <span className="block">Mom can shop</span>
                <span className="block">by voice.</span>
                <span className="block">A scammer can&apos;t.</span>
              </h1>
              <p className="mt-8 max-w-[44ch] after-intro animate-rise text-lg text-fg-soft" style={{ "--d": "0.25s" } as React.CSSProperties}>
                You set the rules once. Every payment is held on her PayPal wallet, checked by a
                second agent, and only then paid.
              </p>
              <div className="mt-10 flex after-intro animate-rise flex-wrap gap-4" style={{ "--d": "0.35s" } as React.CSSProperties}>
                <Link href="/login" className="btn btn-gold">
                  Open Guardian
                </Link>
                <a href="#checkpoint" className="btn btn-quiet">
                  Watch the checkpoint
                </a>
              </div>
            </div>

            <dl className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-10">
              {promises.map((p, i) => (
                <div key={p.title} className="border-t border-edge-strong pt-4">
                  <dt className="hud text-fg-mute">({String(i + 1).padStart(2, "0")})</dt>
                  <dd className="mt-4">
                    <span className="block font-display text-lg font-bold">{p.title}</span>
                    <span className="mt-2 block max-w-[32ch] text-fg-soft">{p.body}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <p
            aria-hidden
            className="display pointer-events-none -mb-[4.5vw] text-center text-[24vw] leading-[0.78] text-transparent select-none [-webkit-text-stroke:1px_var(--color-edge-strong)]"
          >
            GUARDIAN
          </p>
        </section>

        <Marquee />

        <ScrollCheckpoint />

        {/* How it works */}
        <section id="how" className="mx-auto w-full max-w-[90rem] px-4 py-32 sm:px-8 lg:py-48">
          <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
            <p className="hud text-fg-mute">(03) How it works</p>
            <h2 className="display text-[clamp(2.75rem,6vw,6rem)]">
              Four stops between asking and paying
            </h2>
          </div>
          <ol className="mt-24 grid gap-x-10 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
            {stations.map((s, i) => (
              <li key={s.title} className="border-t border-edge-strong pt-5">
                <span className="hud text-scan">({String(i + 1).padStart(2, "0")})</span>
                <h3 className="mt-8 text-xl font-bold">{s.title}</h3>
                <p className="mt-4 max-w-[34ch] text-fg-soft">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Rules */}
        <section id="rules" className="relative overflow-clip border-y border-edge">
          <div
            aria-hidden
            className="rosette pointer-events-none absolute top-1/2 -left-[20rem] size-[50rem] -translate-y-1/2 text-scan/[0.05]"
          />
          <div className="mx-auto grid w-full max-w-[90rem] grid-cols-[minmax(0,1fr)] items-center gap-20 px-4 py-32 sm:px-8 lg:grid-cols-2 lg:gap-24 lg:py-48">
            <div>
              <p className="hud text-fg-mute">(04) Rules</p>
              <h2 className="display mt-6 text-[clamp(2.75rem,6vw,6rem)]">
                <span className="block">Your words.</span>
                <span className="block">Signed.</span>
              </h2>
              <p className="mt-8 max-w-[46ch] text-lg text-fg-soft">
                Write what you&apos;d tell a neighbour who was helping out. Claude turns it into a
                rule set you can read back. Guardian signs it and attaches the signature to every
                PayPal order, so you can always see which rule let a payment through.
              </p>
            </div>

            <Holo className="holo-light rounded-[26px]">
              <figure className="relative rounded-[26px] bg-surface p-2 text-ink shadow-[0_40px_80px_-40px_rgb(0_0_0/0.9)]">
                <div className="relative overflow-clip rounded-[20px] border-2 border-engrave/60 p-6 sm:p-8">
                  <div
                    aria-hidden
                    className="rosette pointer-events-none absolute -right-24 -bottom-24 size-72 text-engrave/30"
                  />
                  <figcaption className="font-display text-lg font-bold">
                    Priya&apos;s rules for Asha
                  </figcaption>
                  <ul className="mt-6 grid gap-5">
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
          </div>
        </section>

        {/* Specs */}
        <section className="mx-auto w-full max-w-[90rem] px-4 py-32 sm:px-8 lg:py-48">
          <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
            <p className="hud text-fg-mute">(05) Under the hood</p>
            <dl>
              {specs.map((s) => (
                <div
                  key={s.k}
                  className="grid gap-3 border-t border-edge-strong py-7 sm:grid-cols-[12rem_1fr]"
                >
                  <dt className="hud pt-1 text-scan">{s.k}</dt>
                  <dd className="text-lg">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Closing */}
        <section className="relative isolate grid place-items-center overflow-clip border-t border-edge py-16 lg:py-24">
          {/* Shield and copy share one grid cell, so the copy sits in the circle's centre. */}
          <div className="pointer-events-none col-start-1 row-start-1 aspect-square w-[min(58rem,160vw)] opacity-80">
            <Shield />
          </div>
          <div className="col-start-1 row-start-1 grid max-w-[30rem] justify-items-center px-6 text-center">
            <p className="hud text-scan">(06) Ready when you are</p>
            <h2 className="display mt-6 text-[clamp(3rem,6.5vw,6rem)]">
              <span className="block">Set it up</span>
              <span className="block">once.</span>
            </h2>
            <p className="mt-6 max-w-[30ch] text-lg text-fg-soft">
              Connect her PayPal, write the rules, and stop worrying every time the phone rings.
            </p>
            <Link href="/login" className="btn btn-gold mt-9">
              Open Guardian
            </Link>
          </div>
        </section>
      </main>

      <footer className="mx-auto grid w-full max-w-[90rem] gap-4 border-t border-edge px-4 py-8 sm:grid-cols-3 sm:px-8">
        <p className="hud text-fg-mute">Guardian — PayPal AI Hackathon</p>
        <LiveClock className="text-fg-mute sm:text-center" />
        <p className="hud text-fg-mute sm:text-right">Sandbox. No real money moves.</p>
      </footer>
    </div>
  );
}
