/**
 * Key rotation logic.
 *
 * Tries each Gemini key in order, then falls through to each Groq key.
 * If a key fails, immediately tries the next one — no cooldown. With
 * per-isolate memory and small per-key free tiers, hammering a key
 * for a few seconds is fine; the user shouldn't wait 60s before retry.
 */

import { callGemini } from "./gemini";
import { callGroq } from "./groq";

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
    try {
      return await callGemini(prompt, key);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Gemini …${key.slice(-4)}: ${msg}`);
    }
  }

  for (const key of getGroqKeys(env)) {
    try {
      return await callGroq(prompt, key);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Groq …${key.slice(-4)}: ${msg}`);
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
