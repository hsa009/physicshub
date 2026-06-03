/**
 * OpenRouter client.
 *
 * OpenRouter is an OpenAI-compatible aggregator. We use the free
 * Llama 3.3 70B model as a fallback when Groq is rate-limited.
 *
 * Required headers (per OpenRouter docs):
 *   - Authorization: Bearer <key>
 *   - HTTP-Referer: helps OpenRouter attribute traffic (good citizenship)
 *   - X-Title:       same
 *
 * Free tier notes:
 *   - `:free` models may queue during peak hours
 *   - Per-key daily limits depend on the model
 */

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "meta-llama/llama-3.3-70b-instruct:free";
const APP_REFERER = "https://revisionforyou.pages.dev/";
const APP_TITLE = "PhysicsHub";

export async function callOpenRouter(
  prompt: string,
  apiKey: string
): Promise<string> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": APP_REFERER,
      "X-Title": APP_TITLE,
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
    throw new Error(`OpenRouter ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("OpenRouter returned an empty response.");
  }
  return text;
}
