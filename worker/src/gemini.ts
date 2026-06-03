/**
 * Google Gemini 1.5 Flash client.
 * Free tier: 1500 req/day and 15 req/min per key.
 */

import { RateLimitError } from "./rotation";

const ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";

export async function callGemini(
  prompt: string,
  apiKey: string
): Promise<string> {
  const url = `${ENDPOINT}?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429 || res.status === 503) {
      throw new RateLimitError(`Gemini ${res.status}: ${body.slice(0, 200)}`);
    }
    throw new Error(`Gemini ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }
  return text;
}
