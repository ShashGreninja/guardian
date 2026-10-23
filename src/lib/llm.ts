import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat, betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { ApiError, GoogleGenAI, type Content, type Part } from "@google/genai";
import { z } from "zod";

/**
 * One place that talks to a language model. Guardian runs on Gemini when
 * GEMINI_API_KEY is set (it has a free tier), otherwise on Claude.
 * LLM_PROVIDER=anthropic|gemini forces one when both keys are present.
 */
export type LlmProvider = "gemini" | "anthropic";

export class LlmError extends Error {}

export function llmProvider(): LlmProvider | null {
  const gemini = Boolean(process.env.GEMINI_API_KEY);
  const anthropic = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
  const preferred = process.env.LLM_PROVIDER;
  if (preferred === "anthropic" && anthropic) return "anthropic";
  if (preferred === "gemini" && gemini) return "gemini";
  if (gemini) return "gemini";
  if (anthropic) return "anthropic";
  return null;
}

function requireProvider() {
  const provider = llmProvider();
  if (!provider) {
    throw new LlmError("Guardian needs an AI key. Add GEMINI_API_KEY or ANTHROPIC_API_KEY to .env.local.");
  }
  return provider;
}

const CLAUDE_MODEL = "claude-opus-5-5";
const geminiModel = () => process.env.GEMINI_MODEL || "gemini-3.8-flash";

let anthropicClient: Anthropic | null = null;
let geminiClient: GoogleGenAI | null = null;
const anthropic = () => (anthropicClient ??= new Anthropic());
const gemini = () => (geminiClient ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }));

/** Zod schema as plain JSON Schema, without the $schema header Gemini doesn't want. */
function jsonSchema(schema: z.ZodType) {
  const out = z.toJSONSchema(schema) as Record<string, unknown>;
  delete out.$schema;
  return out;
}

function translate(err: unknown): never {
  if (err instanceof LlmError) throw err;
  if (err instanceof Anthropic.AuthenticationError) throw new LlmError("The Claude API key was rejected.");
  if (err instanceof Anthropic.RateLimitError) throw new LlmError("The AI is busy right now. Try again in a minute.");
  if (err instanceof Anthropic.APIError) throw new LlmError(`The AI returned an error (${err.status}). Try again.`);
  if (err instanceof ApiError) {
    if (err.status === 400 && /api key/i.test(err.message)) throw new LlmError("The Gemini API key was rejected.");
    if (err.status === 401 || err.status === 403) throw new LlmError("The Gemini API key was rejected.");
    if (err.status === 429) throw new LlmError("The free AI quota is used up for now. Try again in a minute.");
    throw new LlmError(`The AI returned an error (${err.status}). Try again.`);
  }
  throw err;
}

/* ---------- Structured output ---------- */

/**
 * Asks the model for JSON matching `schema`. Returns null if the model
 * declined or the reply didn't validate; throws LlmError for setup and
 * quota problems.
 */
export async function generateObject<S extends z.ZodType>(input: {
  schema: S;
  system: string;
  prompt: string;
  effort?: "low" | "medium";
}): Promise<z.infer<S> | null> {
  const provider = requireProvider();
  try {
    if (provider === "anthropic") {
      const response = await anthropic().beta.messages.parse({
        model: CLAUDE_MODEL,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: input.effort ?? "low", format: betaZodOutputFormat(input.schema) },
        system: input.system,
        messages: [{ role: "user", content: input.prompt }],
      });
      if (response.stop_reason === "refusal") return null;
      return (response.parsed_output as z.infer<S> | null) ?? null;
    }

    const response = await gemini().models.generateContent({
      model: geminiModel(),
      contents: [{ role: "user", parts: [{ text: input.prompt }] }],
      config: {
        systemInstruction: input.system,
        responseMimeType: "application/json",
        responseJsonSchema: jsonSchema(input.schema),
      },
    });
    if (!response.text) return null;
    const parsed = input.schema.safeParse(JSON.parse(response.text));
    return parsed.success ? parsed.data : null;
  } catch (err) {
    if (err instanceof SyntaxError) return null;
    translate(err);
  }
}

/* ---------- Agent with tools ---------- */

export type AgentTool<S extends z.ZodObject = z.ZodObject> = {
  name: string;
  description: string;
  schema: S;
  run: (input: z.infer<S>) => Promise<string>;
};

export function tool<S extends z.ZodObject>(t: AgentTool<S>): AgentTool {
  return t as unknown as AgentTool;
}

export type Turn = { role: "user" | "assistant"; text: string };

/**
 * Runs a tool-using conversation turn and returns the model's final words.
 * Returns an empty string if the model declined.
 */
export async function runAgent(input: {
  system: string;
  history: Turn[];
  message: string;
  tools: AgentTool[];
  maxSteps?: number;
}): Promise<string> {
  const provider = requireProvider();
  const maxSteps = input.maxSteps ?? 6;

  try {
    if (provider === "anthropic") {
      const final = await anthropic().beta.messages.toolRunner({
        model: CLAUDE_MODEL,
        max_tokens: 4000,
        max_iterations: maxSteps,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "low" },
        system: input.system,
        tools: input.tools.map((t) =>
          betaZodTool({ name: t.name, description: t.description, inputSchema: t.schema, run: t.run }),
        ),
        messages: [
          ...input.history.map((t) => ({ role: t.role, content: t.text })),
          { role: "user" as const, content: input.message },
        ],
      });
      if (final.stop_reason === "refusal") return "";
      return final.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
        .map((b) => b.text)
        .join(" ")
        .trim();
    }

    const contents: Content[] = [
      ...input.history.map((t) => ({
        role: t.role === "assistant" ? "model" : "user",
        parts: [{ text: t.text }],
      })),
      { role: "user", parts: [{ text: input.message }] },
    ];
    const declarations = input.tools.map((t) => ({
      name: t.name,
      description: t.description,
      parametersJsonSchema: jsonSchema(t.schema),
    }));

    for (let step = 0; step < maxSteps; step++) {
      const response = await gemini().models.generateContent({
        model: geminiModel(),
        contents,
        config: { systemInstruction: input.system, tools: [{ functionDeclarations: declarations }] },
      });
      const calls = response.functionCalls ?? [];
      if (calls.length === 0) return (response.text ?? "").trim();

      // Keep the model's own turn as-is; it carries the thought signatures
      // Gemini needs to continue the conversation.
      const modelTurn = response.candidates?.[0]?.content;
      if (modelTurn) contents.push(modelTurn);

      const results: Part[] = [];
      for (const call of calls) {
        const t = input.tools.find((x) => x.name === call.name);
        let output: string;
        if (!t) {
          output = `Unknown tool ${call.name}.`;
        } else {
          const args = t.schema.safeParse(call.args ?? {});
          output = args.success ? await t.run(args.data) : `Invalid input: ${args.error.issues[0]?.message}`;
        }
        results.push({ functionResponse: { id: call.id, name: call.name, response: { result: output } } });
      }
      contents.push({ role: "user", parts: results });
    }
    return "";
  } catch (err) {
    translate(err);
  }
}
