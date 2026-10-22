"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Mic, Send, Square, Volume2, VolumeX } from "lucide-react";
import { Stamp } from "@/components/payment-tag";
import { Shield, type Incoming } from "@/components/shield";
import { formatMoney } from "@/lib/money";
import type { OrderResult } from "@/lib/orders";
import type { AlertView, CartView, Turn } from "@/lib/shopper";
import { buy, skip, talk } from "./actions";

// Minimal typing for the browser speech APIs (not in TS's DOM lib everywhere).
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

function makeRecognition(): Recognition | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

type Status = "idle" | "listening" | "thinking" | "buying";

export function ShopByVoice({
  parentName,
  caregiverName,
}: {
  parentName: string;
  caregiverName: string;
}) {
  const greeting = `Hello ${parentName}. What do you need today?`;
  const [turns, setTurns] = useState<Turn[]>([{ role: "assistant", text: greeting }]);
  const [status, setStatus] = useState<Status>("idle");
  const [interim, setInterim] = useState("");
  const [typed, setTyped] = useState("");
  const [cart, setCart] = useState<CartView | null>(null);
  const [result, setResult] = useState<OrderResult | null>(null);
  const [blocked, setBlocked] = useState<AlertView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [voiceOn, setVoiceOn] = useState(true);
  const [canListen, setCanListen] = useState(true);
  const [incoming, setIncoming] = useState<Incoming | null>(null);
  const [, startTransition] = useTransition();
  const recognition = useRef<Recognition | null>(null);
  const heard = useRef("");
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Feature detection has to wait for the browser.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCanListen(Boolean(makeRecognition()));
  }, []);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [turns, cart, result]);

  function say(text: string) {
    if (!voiceOn || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  }

  function send(text: string) {
    const message = text.trim();
    if (!message || status === "thinking") return;
    setError(null);
    setResult(null);
    setBlocked(null);
    const history = turns;
    setTurns((t) => [...t, { role: "user", text: message }]);
    setStatus("thinking");
    startTransition(async () => {
      const r = await talk({ history, message });
      setStatus("idle");
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setTurns((t) => [...t, { role: "assistant", text: r.reply }]);
      if (r.cart) setCart(r.cart);
      if (r.alert) {
        setCart(null);
        setBlocked(r.alert);
        setIncoming({ id: Date.now(), outcome: "stopped", travelMs: 1400 });
      }
      say(r.reply);
    });
  }

  function listen() {
    if (status === "listening") {
      recognition.current?.stop();
      return;
    }
    const rec = makeRecognition();
    if (!rec) return;
    window.speechSynthesis?.cancel();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    heard.current = "";
    rec.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      heard.current = text;
      setInterim(text);
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed") setError("Allow the microphone in your browser to talk to Guardian.");
    };
    rec.onend = () => {
      setInterim("");
      setStatus("idle");
      if (heard.current) send(heard.current);
    };
    recognition.current = rec;
    setStatus("listening");
    rec.start();
  }

  function confirm() {
    if (!cart) return;
    const current = cart;
    setStatus("buying");
    startTransition(async () => {
      const r = await buy(current.id);
      setStatus("idle");
      setResult(r);
      if (r.outcome !== "failed") {
        setCart(null);
        setIncoming({
          id: Date.now(),
          outcome: r.outcome === "paid" ? "paid" : r.outcome === "held" ? "held" : "stopped",
          travelMs: 1400,
        });
      }
      setTurns((t) => [...t, { role: "assistant", text: r.message }]);
      say(r.message);
    });
  }

  function change() {
    if (!cart) return;
    const id = cart.id;
    setCart(null);
    startTransition(() => skip(id));
    const text = "No problem. What would you like to change?";
    setTurns((t) => [...t, { role: "assistant", text }]);
    say(text);
  }

  const statusText =
    status === "listening"
      ? "Listening… tap to stop"
      : status === "thinking"
        ? "Thinking…"
        : status === "buying"
          ? "Checking the rules…"
          : canListen
            ? "Tap and speak"
            : "Type below to ask";

  return (
    <div className="mx-auto grid max-w-[90rem] grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
      {/* Voice orb: the shield with the mic button at its centre. */}
      <section className="grid place-items-center lg:sticky lg:top-10 lg:self-start">
        <div className="grid size-[min(30rem,88vw)] place-items-center">
          <div className="pointer-events-none col-start-1 row-start-1 size-full">
            <Shield incoming={incoming} />
          </div>
          <button
            type="button"
            onClick={listen}
            disabled={!canListen || status === "thinking" || status === "buying"}
            aria-label={status === "listening" ? "Stop listening" : "Start talking"}
            className={`col-start-1 row-start-1 grid size-36 place-items-center rounded-full transition-all sm:size-44 ${
              status === "listening"
                ? "scale-105 bg-wait text-void shadow-[0_0_0_14px_rgb(242_178_51/0.18),0_0_80px_rgb(242_178_51/0.45)]"
                : "bg-fg text-void shadow-[0_0_0_14px_rgb(233_239_247/0.06)] hover:scale-105"
            } disabled:opacity-60`}
          >
            {status === "listening" ? (
              <Square className="size-12 sm:size-14" aria-hidden />
            ) : (
              <Mic className="size-14 sm:size-16" aria-hidden />
            )}
          </button>
        </div>
        <p className="mt-6 font-display text-2xl font-bold" aria-live="polite">
          {statusText}
        </p>
        {interim && <p className="mt-3 max-w-md text-center text-xl text-fg-soft">“{interim}”</p>}
      </section>

      <section className="flex min-h-[28rem] flex-col">
        <div className="flex items-center justify-between gap-4">
          <h1 className="display text-[clamp(2.5rem,4.5vw,4rem)]">Hello, {parentName}</h1>
          <button
            type="button"
            onClick={() => {
              setVoiceOn((v) => !v);
              window.speechSynthesis?.cancel();
            }}
            className="flex shrink-0 items-center gap-2 rounded-full border border-edge-strong px-4 py-2 font-bold text-fg-soft hover:text-fg"
            aria-pressed={voiceOn}
          >
            {voiceOn ? <Volume2 className="size-5" aria-hidden /> : <VolumeX className="size-5" aria-hidden />}
            {voiceOn ? "Reading aloud" : "Muted"}
          </button>
        </div>

        <ol className="mt-8 grid gap-5" aria-live="polite">
          {turns.map((t, i) => (
            <li
              key={i}
              className={`max-w-[34rem] animate-rise rounded-3xl px-6 py-4 text-xl leading-relaxed ${
                t.role === "user"
                  ? "justify-self-end rounded-br-md bg-white/[0.08]"
                  : "justify-self-start rounded-bl-md border border-edge bg-panel"
              }`}
            >
              {t.text}
            </li>
          ))}
          {status === "thinking" && (
            <li className="justify-self-start rounded-3xl rounded-bl-md border border-edge bg-panel px-6 py-4 text-xl text-fg-mute">
              …
            </li>
          )}
        </ol>

        {cart && (
          <article className="tag mt-8 max-w-[36rem] animate-rise">
            <p className="text-ink-soft">Your basket from</p>
            <p className="font-display text-2xl font-bold">{cart.store}</p>
            <ul className="mt-4 grid gap-2 text-lg">
              {cart.lines.map((l) => (
                <li key={l.productId} className="flex justify-between gap-4">
                  <span>
                    {l.quantity > 1 && `${l.quantity} × `}
                    {l.name} <span className="text-ink-soft">({l.size})</span>
                  </span>
                  <span className="font-bold">{formatMoney(l.priceCents * l.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-baseline justify-between border-t border-dashed border-line pt-4">
              <span className="text-lg">Total</span>
              <span className="display text-3xl">{formatMoney(cart.totalCents)}</span>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={confirm}
                disabled={status === "buying"}
                className="btn btn-primary min-h-16 text-xl"
              >
                {status === "buying" ? "Checking…" : "Yes, buy it"}
              </button>
              <button type="button" onClick={change} className="btn btn-quiet min-h-16 text-xl">
                No, change it
              </button>
            </div>
            <p className="mt-4 text-ink-soft">
              {caregiverName}&apos;s rules are checked before any money moves.
            </p>
          </article>
        )}

        {result && result.outcome !== "failed" && (
          <div className="mt-6 flex items-center gap-4">
            <Stamp
              status={
                result.outcome === "paid" ? "captured" : result.outcome === "held" ? "authorized" : "stopped"
              }
              delayMs={0}
              onDark
              size="lg"
            />
          </div>
        )}

        {blocked && (
          <div className="mt-6 flex flex-wrap items-center gap-5 rounded-3xl border border-stop/40 bg-stop/10 p-6">
            <Stamp status="stopped" delayMs={0} onDark size="lg" />
            <p className="text-xl">
              No money moved. {caregiverName} has been told.
              <span className="mt-1 block text-lg text-fg-soft">Looks like: {blocked.pattern}</span>
            </p>
          </div>
        )}

        {error && <p className="mt-6 text-xl text-stop">{error}</p>}

        <div ref={bottom} />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(typed);
            setTyped("");
          }}
          className="mt-auto flex gap-3 pt-10"
        >
          <label className="flex-1">
            <span className="sr-only">Type what you need</span>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Or type here: bread and milk"
              className="field min-h-16 text-xl"
            />
          </label>
          <button className="btn btn-gold min-h-16 px-6" aria-label="Send" disabled={status === "thinking"}>
            <Send className="size-6" aria-hidden />
          </button>
        </form>
      </section>
    </div>
  );
}
