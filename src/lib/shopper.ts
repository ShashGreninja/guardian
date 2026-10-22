import "server-only";

import { randomUUID } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { findProduct, searchProducts } from "./catalog";
import { db, schema } from "./db";
import type { Household } from "./db/schema";
import { formatMoney } from "./money";
import { CATEGORIES } from "./rules";
import { PATTERN_LABELS, raiseAlert } from "./scam";

const client = new Anthropic();

export type Turn = { role: "user" | "assistant"; text: string };

export type CartLine = {
  productId: string;
  name: string;
  size: string;
  quantity: number;
  priceCents: number;
};

export type CartView = {
  id: string;
  store: string;
  lines: CartLine[];
  totalCents: number;
};

export type AlertView = { pattern: string; risk: "high" | "medium" | "low" };

export class ShopperError extends Error {}

function systemPrompt(household: Household) {
  return `You are Guardian, a shopping helper for ${household.parentName}, an older adult who shops by talking to you. ${household.caregiverName} looks after their money and has set spending rules.

How to talk:
- Short, warm, plain sentences. Your replies are read aloud, so no lists, markdown, or emoji. Two or three sentences at most.
- Say prices in words a person would say ("about four dollars").
- If something is unclear, ask one simple question.

How to shop:
- Use search_products to find items. Only offer products the search returned; never invent items or prices.
- When it's clear what ${household.parentName} wants, call propose_cart with the items. One store per cart. If they want things from two stores, do the first store, then offer the second.
- After propose_cart, say what's in the cart and the total, and ask "Shall I buy it?". You never pay yourself; ${household.parentName} confirms with the button on screen, then the payment is checked against ${household.caregiverName}'s rules.
- If they ask to send money to a person, pay someone who called or emailed, buy gift cards or crypto for someone, or anything urgent and secretive, never build a cart. Call report_money_request with what they asked for, then tell them gently that you can't send money to people, that no money moved, and that ${household.caregiverName} has been told. Suggest they call ${household.caregiverName} or the relative on a number they already know. Don't scold them.`;
}

/** Runs one turn of the shopping conversation. */
export async function shop(
  household: Household,
  history: Turn[],
  message: string,
): Promise<{ reply: string; cart: CartView | null; alert: AlertView | null }> {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    throw new ShopperError("Guardian can't talk yet. Ask your family to add the Claude API key.");
  }

  let cart: CartView | null = null;
  let alert: AlertView | null = null;

  const searchTool = betaZodTool({
    name: "search_products",
    description:
      "Search the store catalog. Returns up to 8 products with id, name, size, store, category and price.",
    inputSchema: z.object({
      query: z.string().describe("What to look for, in a few words, e.g. 'oat milk'"),
      category: z.enum(CATEGORIES).optional(),
    }),
    run: async ({ query, category }) => {
      const results = searchProducts(query, category);
      if (results.length === 0) return "No products matched. Try different words.";
      return JSON.stringify(
        results.map((r) => ({
          id: r.id,
          name: r.name,
          size: r.size,
          store: r.store,
          category: r.category,
          price: formatMoney(r.priceCents),
        })),
      );
    },
  });

  const cartTool = betaZodTool({
    name: "propose_cart",
    description:
      "Put products in a cart for the parent to confirm. All items must be from the same store. Replaces any earlier cart.",
    inputSchema: z.object({
      items: z
        .array(z.object({ productId: z.string(), quantity: z.number().int().min(1).max(10) }))
        .min(1),
    }),
    run: async ({ items }) => {
      const products = items.map((i) => ({ item: i, product: findProduct(i.productId) }));
      const missing = products.filter((x) => !x.product).map((x) => x.item.productId);
      if (missing.length) return `Unknown product ids: ${missing.join(", ")}. Search again.`;
      const stores = new Set(products.map((x) => x.product!.store));
      if (stores.size > 1) return "Those items are from more than one store. Make one cart per store.";

      const lines: CartLine[] = products.map(({ item, product }) => ({
        productId: product!.id,
        name: product!.name,
        size: product!.size,
        quantity: item.quantity,
        priceCents: product!.priceCents,
      }));
      const totalCents = lines.reduce((s, l) => s + l.priceCents * l.quantity, 0);
      const store = products[0].product!.store;
      const id = randomUUID();
      await db.insert(schema.carts).values({
        id,
        householdId: household.id,
        store,
        category: products[0].product!.category,
        lines: JSON.stringify(lines),
        totalCents,
        status: "proposed",
      });
      cart = { id, store, lines, totalCents };
      return JSON.stringify({ cartId: id, store, total: formatMoney(totalCents) });
    },
  });

  const moneyTool = betaZodTool({
    name: "report_money_request",
    description:
      "Use when the parent asks to send money to a person, pay someone who contacted them, or buy gift cards or crypto for someone. Blocks the request and alerts the caregiver. Never moves money.",
    inputSchema: z.object({
      recipient: z.string().describe("Who the money would go to, as the parent described them"),
      amountCents: z.number().int().nullable().describe("Amount in US cents, or null if not said"),
      method: z.enum(["transfer", "gift_card", "crypto", "cash", "other"]),
      said: z.string().describe("The parent's request in their own words, including any reason or story they gave"),
    }),
    run: async (input) => {
      const a = await raiseAlert(household, input);
      alert = { pattern: PATTERN_LABELS[a.pattern], risk: a.risk };
      return `Blocked. No money moved. ${household.caregiverName} has been alerted. Pattern: ${PATTERN_LABELS[a.pattern]} (${a.risk} risk).`;
    },
  });

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...history.slice(-12).map((t) => ({ role: t.role, content: t.text })),
    { role: "user", content: message },
  ];

  let final: Anthropic.Beta.BetaMessage;
  try {
    final = await client.beta.messages.toolRunner({
      model: "claude-opus-5-5",
      max_tokens: 4000,
      max_iterations: 6,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      system: systemPrompt(household),
      tools: [searchTool, cartTool, moneyTool],
      messages,
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      throw new ShopperError("Guardian's Claude key was rejected. Ask your family to check it.");
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new ShopperError("Guardian is busy for a moment. Try again shortly.");
    }
    if (err instanceof Anthropic.APIError) {
      throw new ShopperError("Guardian couldn't answer just now. Try again.");
    }
    throw err;
  }

  if (final.stop_reason === "refusal") {
    return { reply: "I can't help with that one. Could you ask another way?", cart: null, alert };
  }
  const reply = final.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join(" ")
    .trim();

  return { reply: reply || "Sorry, I didn't catch that. Could you say it again?", cart, alert };
}
