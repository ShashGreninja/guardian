"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { finishWalletSetup, startWalletSetup, walletSdkConfig } from "./actions";

type PayPalButtons = {
  render: (el: HTMLElement) => Promise<void>;
  close: () => Promise<void>;
};

declare global {
  interface Window {
    paypal?: {
      Buttons: (options: Record<string, unknown>) => PayPalButtons;
      FUNDING: { PAYPAL: string };
    };
  }
}

// Load the SDK once per page. Re-inserting the script tears down every
// rendered button ("zoid destroyed all components"), which React's dev-mode
// double mount was triggering.
let sdkPromise: Promise<void> | null = null;

function loadSdk() {
  if (window.paypal) return Promise.resolve();

  sdkPromise ??= (async () => {
    const config = await walletSdkConfig();
    if (!config.ok) throw new Error(config.error);

    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(config.clientId)}&components=buttons`;
      script.dataset.userIdToken = config.idToken;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Couldn't load PayPal. Check your connection."));
      document.body.appendChild(script);
    });
  })().catch((err) => {
    sdkPromise = null; // let a later mount retry
    throw err;
  });

  return sdkPromise;
}

export function WalletConnect({ parentName }: { parentName: string }) {
  const container = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let buttons: PayPalButtons | undefined;
    let cancelled = false;

    (async () => {
      try {
        await loadSdk();
        if (cancelled || !window.paypal || !container.current) return;

        buttons = window.paypal.Buttons({
          fundingSource: window.paypal.FUNDING.PAYPAL,
          style: { shape: "pill", label: "paypal", height: 48 },
          createVaultSetupToken: () => startWalletSetup(),
          onApprove: async ({ vaultSetupToken }: { vaultSetupToken: string }) => {
            const result = await finishWalletSetup(vaultSetupToken);
            if (result.ok) router.refresh();
            else setError(result.error);
          },
          onCancel: () => setError("PayPal window closed before the wallet was saved."),
          onError: (err: unknown) =>
            setError(err instanceof Error ? err.message : "PayPal couldn't save the wallet."),
        });
        await buttons.render(container.current);
      } catch (err) {
        // Closing the buttons on unmount rejects render(); that's expected.
        if (!cancelled) setError(err instanceof Error ? err.message : "PayPal didn't load.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      buttons?.close().catch(() => {});
    };
  }, [router]);

  return (
    <div>
      <p className="text-fg-soft">
        Sign in with {parentName}&apos;s PayPal sandbox account. Guardian saves the wallet so it
        can place holds later, without asking for a password each time.
      </p>
      <div ref={container} className="mt-5 min-h-12 max-w-sm" />
      {loading && <p className="text-fg-soft">Loading PayPal…</p>}
      {error && <p className="mt-3 text-stop">{error}</p>}
    </div>
  );
}
