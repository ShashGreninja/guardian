import "server-only";

import { randomUUID } from "node:crypto";

const BASE_URL =
  process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

export class PayPalError extends Error {
  constructor(
    message: string,
    public status: number,
    public debugId?: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "PayPalError";
  }
}

export function paypalConfigured() {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

function basicAuth() {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) {
    throw new PayPalError("PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are not set", 500);
  }
  return Buffer.from(`${id}:${secret}`).toString("base64");
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function oauth(extra: Record<string, string> = {}) {
  const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials", ...extra }),
    cache: "no-store",
  });
  const data = await res.json();
  if (res.status === 401) {
    throw new PayPalError(
      "PayPal rejected the client ID or secret. Check PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in .env.local.",
      401,
    );
  }
  if (!res.ok) {
    throw new PayPalError(data.error_description ?? "PayPal auth failed", res.status);
  }
  return data as { access_token: string; expires_in: number; id_token?: string };
}

async function accessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }
  const data = await oauth();
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.value;
}

/** Short-lived token the JS SDK needs before it can save a wallet. */
export async function userIdToken(customerId?: string | null) {
  const data = await oauth({
    response_type: "id_token",
    ...(customerId ? { target_customer_id: customerId } : {}),
  });
  if (!data.id_token) throw new PayPalError("PayPal did not return an id_token", 502);
  return data.id_token;
}

async function call<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
  retried = false,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: init.method ?? "POST",
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": randomUUID(),
      Prefer: "return=representation",
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));

  // Scopes are baked into the access token. If app features were changed in
  // the dashboard after we cached it, a fresh token picks them up.
  if (res.status === 403 && !retried) {
    cachedToken = null;
    return call<T>(path, init, true);
  }

  if (!res.ok) {
    const issue = data.details?.[0];
    const message = issue
      ? `${issue.issue}${issue.description ? `: ${issue.description}` : ""}`
      : (data.message ?? `PayPal returned ${res.status}`);
    throw new PayPalError(message, res.status, data.debug_id, data.details);
  }
  return data as T;
}

/* ---------- Vault: save the parent's wallet once ---------- */

type SetupToken = { id: string; status: string; customer?: { id: string } };

export async function createSetupToken(origin: string) {
  try {
    return await call<SetupToken>("/v3/vault/setup-tokens", {
      body: {
        payment_source: {
          paypal: {
            usage_type: "MERCHANT",
            experience_context: {
              return_url: `${origin}/caregiver?wallet=connected`,
              cancel_url: `${origin}/caregiver?wallet=cancelled`,
            },
          },
        },
      },
    });
  } catch (err) {
    if (err instanceof PayPalError && err.status === 403) {
      throw new PayPalError(
        "This PayPal app isn't allowed to save wallets. Turn on Save payment methods for the app, and make sure its sandbox business account is in the US.",
        403,
        err.debugId,
      );
    }
    throw err;
  }
}

type PaymentToken = {
  id: string;
  customer: { id: string };
  payment_source: { paypal?: { email_address?: string; payer_id?: string } };
};

export function createPaymentToken(setupTokenId: string) {
  return call<PaymentToken>("/v3/vault/payment-tokens", {
    body: { payment_source: { token: { id: setupTokenId, type: "SETUP_TOKEN" } } },
  });
}

/* ---------- Orders & authorizations ---------- */

type Authorization = { id: string; status: string };
type Order = {
  id: string;
  status: string;
  purchase_units?: { payments?: { authorizations?: Authorization[] } }[];
};

/**
 * Puts a hold on the saved wallet without moving money.
 * With a vault_id PayPal usually authorizes in the same call; if it doesn't,
 * we authorize the order explicitly.
 */
export async function authorizeWithVault(input: {
  vaultId: string;
  amountCents: number;
  currency: string;
  description: string;
  referenceId: string;
  customId?: string;
}) {
  const value = (input.amountCents / 100).toFixed(2);
  let order = await call<Order>("/v2/checkout/orders", {
    body: {
      intent: "AUTHORIZE",
      purchase_units: [
        {
          reference_id: input.referenceId,
          description: input.description.slice(0, 127),
          custom_id: input.customId?.slice(0, 127),
          amount: { currency_code: input.currency, value },
        },
      ],
      payment_source: { paypal: { vault_id: input.vaultId } },
    },
  });

  if (order.status === "PAYER_ACTION_REQUIRED") {
    throw new PayPalError("The saved wallet needs to be approved again", 409);
  }
  if (order.status !== "COMPLETED") {
    order = await call<Order>(`/v2/checkout/orders/${order.id}/authorize`, { body: {} });
  }

  const auth = order.purchase_units?.[0]?.payments?.authorizations?.[0];
  if (!auth) throw new PayPalError("PayPal did not return an authorization", 502);
  return { orderId: order.id, authorizationId: auth.id, status: auth.status };
}

export function captureAuthorization(authorizationId: string) {
  return call<{ id: string; status: string }>(
    `/v2/payments/authorizations/${authorizationId}/capture`,
    { body: { final_capture: true } },
  );
}

/* ---------- Webhooks ---------- */

/** Asks PayPal whether a webhook delivery really came from PayPal. */
export async function verifyWebhook(headers: Headers, event: unknown) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return false;
  const result = await call<{ verification_status: string }>(
    "/v1/notifications/verify-webhook-signature",
    {
      body: {
        auth_algo: headers.get("paypal-auth-algo"),
        cert_url: headers.get("paypal-cert-url"),
        transmission_id: headers.get("paypal-transmission-id"),
        transmission_sig: headers.get("paypal-transmission-sig"),
        transmission_time: headers.get("paypal-transmission-time"),
        webhook_id: webhookId,
        webhook_event: event,
      },
    },
  );
  return result.verification_status === "SUCCESS";
}

export function voidAuthorization(authorizationId: string) {
  return call<void>(`/v2/payments/authorizations/${authorizationId}/void`);
}
