/**
 * Key rotation logic.
 *
 * Two providers: Groq (primary) and OpenRouter (fallback).
 * Each provider can have 1+ keys; we iterate them in order.
 *
 * Cooldown policy:
 *   - 429 (rate-limited) or 403 (quota denied / forbidden) marks the key
 *     as cooling down for 60s, in-memory per Worker isolate.
 *   - Other errors (400, 500, parse) do NOT mark cooldown — they're
 *     likely our fault, not the provider's.
 *   - During cooldown, the key is skipped. After 60s it is retried.
 *
 * Net effect: if one provider is rate-limited, we fall through to the
 * other provider immediately (no 60s wait), and we don't hammer the
 * rate-limited key for the next minute.
 */

import { callGroq } from "./groq";
import { callOpenRouter } from "./openrouter";

const COOLDOWN_MS = 60_000;

export interface KeyProvider {
  GROQ_KEY_1?: string;
  GROQ_KEY_2?: string;
  GROQ_KEY_3?: string;
  OPENROUTER_KEY_1?: string;
  OPENROUTER_KEY_2?: string;
  OPENROUTER_KEY_3?: string;
}

type CallFn = (prompt: string, key: string) => Promise<string>;

interface Provider {
  name: "Groq" | "OpenRouter";
  keys: string[];
  call: CallFn;
}

const cooldowns = new Map<string, number>();

function isCoolingDown(key: string): boolean {
  const until = cooldowns.get(key);
  if (!until) return false;
  if (Date.now() > until) {
    cooldowns.delete(key);
    return false;
  }
  return true;
}

function markRateLimited(key: string): void {
  cooldowns.set(key, Date.now() + COOLDOWN_MS);
}

function getGroqKeys(env: KeyProvider): string[] {
  return [1, 2, 3]
    .map((i) => env[`GROQ_KEY_${i}` as keyof KeyProvider] as string | undefined)
    .filter((k): k is string => Boolean(k));
}

function getOpenRouterKeys(env: KeyProvider): string[] {
  return [1, 2, 3]
    .map(
      (i) =>
        env[`OPENROUTER_KEY_${i}` as keyof KeyProvider] as string | undefined
    )
    .filter((k): k is string => Boolean(k));
}

export async function callWithRotation(
  prompt: string,
  env: KeyProvider
): Promise<string> {
  const providers: Provider[] = [
    { name: "Groq", keys: getGroqKeys(env), call: callGroq },
    { name: "OpenRouter", keys: getOpenRouterKeys(env), call: callOpenRouter },
  ];

  const errors: string[] = [];

  for (const provider of providers) {
    for (const key of provider.keys) {
      if (isCoolingDown(key)) {
        errors.push(`${provider.name} …${key.slice(-4)}: cooling down`);
        continue;
      }
      try {
        return await provider.call(prompt, key);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${provider.name} …${key.slice(-4)}: ${msg}`);
        // 429/403 → mark cooldown. Other errors → try next key.
        if (/ 429:/.test(msg) || / 403:/.test(msg)) {
          markRateLimited(key);
        }
      }
    }
  }

  throw new Error(
    `All AI keys exhausted. ${errors.length} attempt(s) failed. Last errors: ${errors
      .slice(-4)
      .join(" | ")}`
  );
}

export function hasAnyKey(env: KeyProvider): boolean {
  return getGroqKeys(env).length + getOpenRouterKeys(env).length > 0;
}
