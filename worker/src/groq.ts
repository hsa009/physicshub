/**
 * Groq Llama 3.1 70B client.
 * Free tier: 14,400 req/day per key.
 */

import { RateLimitError } from "./rotation";

const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
// Use the latest stable Llama 3.1 70B model on Groq.
const MODEL = "llama-3.1-70b-versatile";

export async function callGroq(
  prompt: string,
  apiKey: string
): Promise<string> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429) {
      throw new RateLimitError(`Groq 429: ${body.slice(0, 200)}`);
    }
    throw new Error(`Groq ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("Groq returned an empty response.");
  }
  return text;
}
