/**
 * Key rotation logic.
 *
 * Tries each Gemini key in order, then falls through to each Groq key.
 * When a key returns 429/503, it goes into a 60-second cooldown so we don't
 * pound it. The cooldowns live in module-level memory, which is per-isolate
 * in Cloudflare Workers.
 */

import { callGemini } from "./gemini";
import { callGroq } from "./groq";

const COOLDOWN_MS = 60_000;

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

const cooldowns = new Map<string, number>();

export function isCoolingDown(key: string): boolean {
  const until = cooldowns.get(key);
  if (!until) return false;
  if (Date.now() > until) {
    cooldowns.delete(key);
    return false;
  }
  return true;
}

export function markRateLimited(key: string): void {
  cooldowns.set(key, Date.now() + COOLDOWN_MS);
}

export interface KeyProvider {
  GEMINI_KEY_1?: string;
  GEMINI_KEY_2?: string;
  GEMINI_KEY_3?: string;
  GEMINI_KEY_4?: string;
  GEMINI_KEY_5?: string;
  GROQ_KEY_1?: string;
  GROQ_KEY_2?: string;
}

function getGeminiKeys(env: KeyProvider): string[] {
  return [1, 2, 3, 4, 5]
    .map((i) => env[`GEMINI_KEY_${i}` as keyof KeyProvider] as string | undefined)
    .filter((k): k is string => Boolean(k));
}

function getGroqKeys(env: KeyProvider): string[] {
  return [1, 2]
    .map((i) => env[`GROQ_KEY_${i}` as keyof KeyProvider] as string | undefined)
    .filter((k): k is string => Boolean(k));
}

export async function callWithRotation(
  prompt: string,
  env: KeyProvider
): Promise<string> {
  const errors: string[] = [];

  for (const key of getGeminiKeys(env)) {
    if (isCoolingDown(key)) {
      errors.push(`Gemini …${key.slice(-4)}: cooling down`);
      continue;
    }
    try {
      return await callGemini(prompt, key);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Gemini …${key.slice(-4)}: ${msg}`);
      if (err instanceof RateLimitError) markRateLimited(key);
    }
  }

  for (const key of getGroqKeys(env)) {
    if (isCoolingDown(key)) {
      errors.push(`Groq …${key.slice(-4)}: cooling down`);
      continue;
    }
    try {
      return await callGroq(prompt, key);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Groq …${key.slice(-4)}: ${msg}`);
      if (err instanceof RateLimitError) markRateLimited(key);
    }
  }

  throw new Error(
    `All AI keys exhausted. ${errors.length} attempt(s) failed. Last errors: ${errors
      .slice(-3)
      .join(" | ")}`
  );
}

export function hasAnyKey(env: KeyProvider): boolean {
  return getGeminiKeys(env).length + getGroqKeys(env).length > 0;
}
