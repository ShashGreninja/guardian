"use client";

import { useState, useTransition } from "react";
import type { RuleSet } from "@/lib/rules";
import { readRulesAction, signRulesAction } from "./actions";
import { RuleFacts, RuleReading } from "./rule-facts";

const EXAMPLE = `Up to $60 a week on groceries and the pharmacy.
Anything over $25, ask me first.
Never send money to anyone, even if they say they're family.
No gift cards.`;

export function RulesEditor({
  initialText,
  parentName,
}: {
  initialText: string | null;
  parentName: string;
}) {
  const [text, setText] = useState(initialText ?? EXAMPLE);
  const [draft, setDraft] = useState<RuleSet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signedVersion, setSignedVersion] = useState<number | null>(null);
  const [reading, startReading] = useTransition();
  const [signing, startSigning] = useTransition();

  function read() {
    setError(null);
    setSignedVersion(null);
    startReading(async () => {
      const result = await readRulesAction(text);
      if (result.ok) setDraft(result.rules);
      else setError(result.error);
    });
  }

  function signDraft() {
    if (!draft) return;
    setError(null);
    startSigning(async () => {
      const result = await signRulesAction(text, draft);
      if (result.ok) {
        setSignedVersion(result.version);
        setDraft(null);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <section className="panel">
      <h2 className="hud relative text-fg-mute">{draft ? "Check the reading" : "Write the rules"}</h2>
      <p className="relative mt-3 text-fg-soft">
        Say it the way you&apos;d tell a neighbour who was helping {parentName} shop.
      </p>

      <label className="relative mt-5 block">
        <span className="sr-only">Rules in your own words</span>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setDraft(null);
          }}
          rows={6}
          maxLength={2000}
          className="field min-h-44 resize-y py-3 text-lg leading-relaxed"
        />
      </label>

      <div className="relative mt-4 flex flex-wrap items-center gap-3">
        <button className="btn btn-primary" onClick={read} disabled={reading || signing}>
          {reading ? "Reading…" : draft ? "Read again" : "Read my rules"}
        </button>
        {signedVersion && (
          <p className="font-bold text-go">Signed. Rule set v{signedVersion} is now on.</p>
        )}
        {error && <p className="text-stop">{error}</p>}
      </div>

      {draft && (
        <div className="relative mt-8 animate-rise border-t border-dashed border-edge-strong pt-6">
          <h3 className="text-xl font-bold">Here&apos;s how Guardian read them</h3>
          <p className="mt-1 text-fg-soft">Check each line. Nothing changes until you sign.</p>

          <div className="mt-5">
            <RuleFacts rules={draft} />
          </div>
          <div className="mt-4">
            <RuleReading rules={draft} />
          </div>

          {draft.unclear.length > 0 && (
            <div className="mt-5 rounded-2xl border border-wait/40 bg-wait/10 p-4 text-wait">
              <p className="font-bold">Guardian couldn&apos;t turn these into rules</p>
              <ul className="mt-2 list-disc pl-5">
                {draft.unclear.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
              <p className="mt-2">Reword them and read again, or sign without them.</p>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button className="btn btn-gold" onClick={signDraft} disabled={signing}>
              {signing ? "Signing…" : "Sign and turn on"}
            </button>
            <button className="btn btn-quiet" onClick={() => setDraft(null)} disabled={signing}>
              Edit the wording
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
