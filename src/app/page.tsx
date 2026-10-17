import Link from "next/link";
import { Logo } from "@/components/logo";
import { PaymentTag } from "@/components/payment-tag";

const heroTags = [
  {
    merchant: "Corner Grocer",
    description: "Bread, oat milk, bananas",
    amountCents: 1842,
    status: "captured",
    note: "Inside her weekly grocery limit",
  },
  {
    merchant: "Maple Street Pharmacy",
    description: "Blood pressure refill, 90 days",
    amountCents: 3800,
    status: "authorized",
    note: "Over $25, so it's waiting for you",
  },
  {
    merchant: "Send money to “Danny”",
    description: "“Bail money, please don't tell Dad”",
    amountCents: 50000,
    status: "stopped",
    note: "Matches the grandchild emergency scam",
  },
] as const;

const steps = [
  {
    title: "You write the rules",
    body: "In plain English: up to $60 a week on groceries and pharmacy, ask me about anything else, never send money to people.",
  },
  {
    title: "She asks out loud",
    body: "“I need my pills and some bread.” Guardian finds the items, builds the cart, and reads it back to her.",
  },
  {
    title: "A second agent checks the cart",
    body: "It never sees the conversation, so nobody can talk it into anything. It only sees the cart and your rules.",
  },
  {
    title: "Money moves, or it doesn't",
    body: "PayPal holds the payment first. It's paid once the check passes, and the hold disappears if it doesn't.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-8">
        <Logo />
        <Link href="/caregiver" className="btn btn-quiet">
          Open dashboard
        </Link>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,1fr)] items-center gap-12 px-4 pb-20 pt-10 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:pt-20">
          <div>
            <h1 className="text-[2.6rem] leading-none font-extrabold sm:text-4xl">
              <span className="block">Mom can shop by voice.</span>
              <span className="block">A scammer can&apos;t.</span>
            </h1>
            <p className="mt-6 max-w-[46ch] text-lg text-ink-soft">
              Guardian is a shopping agent for aging parents, built on PayPal. You set the rules
              once. Every payment is held, checked by a second agent, and only then paid.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/caregiver" className="btn btn-primary">
                Set up your family
              </Link>
              <a href="#how" className="btn btn-quiet">
                How it works
              </a>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md" aria-label="Example payments">
            {heroTags.map((tag, i) => (
              <div
                key={tag.merchant}
                className="animate-tag-in"
                style={{
                  animationDelay: `${200 + i * 380}ms`,
                  marginLeft: `${i * 1.25}rem`,
                  marginTop: i === 0 ? 0 : "1rem",
                }}
              >
                <PaymentTag {...tag} stampDelayMs={900 + i * 380} />
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="border-t border-line bg-surface/60">
          <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-8">
            <h2 className="max-w-[20ch] text-2xl font-extrabold">
              Four steps between asking and paying
            </h2>
            <ol className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, i) => (
                <li key={step.title}>
                  <span className="font-display text-3xl font-extrabold text-line">{i + 1}</span>
                  <h3 className="mt-2 text-lg font-bold">{step.title}</h3>
                  <p className="mt-2 text-ink-soft">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-4 py-8 text-base text-ink-soft sm:px-8">
        Runs on the PayPal sandbox. No real money moves.
      </footer>
    </div>
  );
}
