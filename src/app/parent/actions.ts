"use server";

import { z } from "zod";
import { requireHousehold } from "@/lib/household";
import { confirmCart, declineCart, type OrderResult } from "@/lib/orders";
import { currentRole } from "@/lib/session";
import { shop, ShopperError, type AlertView, type CartView, type Turn } from "@/lib/shopper";

const turnInput = z.object({
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(2000) }))
    .max(40),
  message: z.string().trim().min(1).max(600),
});

async function requireSignedIn() {
  if (!(await currentRole())) throw new ShopperError("Sign in again to keep shopping.");
  return requireHousehold();
}

export async function talk(input: {
  history: Turn[];
  message: string;
}): Promise<{ ok: true; reply: string; cart: CartView | null; alert: AlertView | null } | { ok: false; error: string }> {
  const parsed = turnInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "I didn't catch that. Try again." };
  try {
    const household = await requireSignedIn();
    const { reply, cart, alert } = await shop(household, parsed.data.history, parsed.data.message);
    return { ok: true, reply, cart, alert };
  } catch (err) {
    if (err instanceof ShopperError) return { ok: false, error: err.message };
    console.error(err);
    return { ok: false, error: "Something went wrong. Try again." };
  }
}

export async function buy(cartId: string): Promise<OrderResult> {
  try {
    const household = await requireSignedIn();
    return await confirmCart(household, z.string().uuid().parse(cartId));
  } catch (err) {
    console.error(err);
    return { outcome: "failed", verdict: null, checks: [], message: "Something went wrong. Try again." };
  }
}

export async function skip(cartId: string) {
  const household = await requireSignedIn();
  await declineCart(household, z.string().uuid().parse(cartId));
}
