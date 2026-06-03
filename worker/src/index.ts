/**
 * PhysicsHub AI proxy + admin Worker.
 *
 * Routes:
 *   GET  /health       — health check
 *   POST /check        — check a student answer (Gemini → Groq rotation)
 *   POST /explain      — generate / fetch cached lesson explanation
 *   POST /chat         — "Explain More" follow-up (used in M4)
 *
 * Env vars (set via `wrangler secret put`):
 *   ADMIN_PASSWORD
 *   SUPABASE_URL, SUPABASE_SERVICE_KEY
 *   GEMINI_KEY_1 .. GEMINI_KEY_5
 *   GROQ_KEY_1 .. GROQ_KEY_2
 */

import { callWithRotation, hasAnyKey, type KeyProvider } from "./rotation";
import { checkPrompt, explainPrompt, chatPrompt } from "./prompts";
import { parseCheckResponse, parseExplainResponse } from "./parse";
import { mockCheck, mockExplain } from "./mock";
import type { Verdict } from "./parse";

export interface Env extends KeyProvider {
  ENVIRONMENT?: string;
  ADMIN_PASSWORD?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_KEY?: string;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Max-Age": "86400",
};

function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json",
      ...CORS,
      ...(init.headers ?? {}),
    },
  });
}

function notFound(): Response {
  return new Response("Not found", { status: 404, headers: CORS });
}

function badRequest(msg: string): Response {
  return json({ error: msg }, { status: 400 });
}

async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new Error("Request body is not valid JSON.");
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (path === "/health" && method === "GET") {
      return json({
        ok: true,
        env: env.ENVIRONMENT ?? "unknown",
        hasKeys: hasAnyKey(env),
        time: new Date().toISOString(),
      });
    }

    try {
      if (path === "/check" && method === "POST") {
        return await handleCheck(request, env);
      }
      if (path === "/explain" && method === "POST") {
        return await handleExplain(request, env);
      }
      if (path === "/chat" && method === "POST") {
        return await handleChat(request, env);
      }
      return notFound();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return json({ error: message }, { status: 500 });
    }
  },
};

interface CheckBody {
  lesson: string;
  module: string;
  question: string;
  answer: string;
}

async function handleCheck(request: Request, env: Env): Promise<Response> {
  const body = await readJson<CheckBody>(request);
  if (!body.lesson || !body.module || !body.question) {
    return badRequest("Missing lesson, module, or question.");
  }
  const prompt = checkPrompt(body);

  let verdict: Verdict;
  let feedback: string;

  if (!hasAnyKey(env)) {
    const mock = mockCheck(body.answer ?? "", body.question);
    verdict = mock.verdict;
    feedback = mock.feedback + " [mock — no Worker secrets configured]";
  } else {
    const text = await callWithRotation(prompt, env);
    const parsed = parseCheckResponse(text);
    verdict = parsed.verdict;
    feedback = parsed.feedback;
  }

  return json({ verdict, feedback });
}

interface ExplainBody {
  lesson: string;
  module: string;
  questionIds: string[];
  questionPrompts: string[];
}

async function handleExplain(request: Request, env: Env): Promise<Response> {
  const body = await readJson<ExplainBody>(request);
  if (!body.lesson || !body.module) {
    return badRequest("Missing lesson or module.");
  }
  const prompts = body.questionPrompts ?? [];

  let concepts: string[];
  let formulas: { name: string; equation: string; variables: string }[];
  let example: string;

  if (!hasAnyKey(env)) {
    const mock = mockExplain(body.lesson, body.module);
    concepts = mock.concepts;
    formulas = mock.formulas;
    example = mock.example + " [mock — no Worker secrets configured]";
  } else {
    const text = await callWithRotation(
      explainPrompt({
        lesson: body.lesson,
        module: body.module,
        questionPrompts: prompts,
      }),
      env
    );
    const parsed = parseExplainResponse(text);
    concepts = parsed.concepts;
    formulas = parsed.formulas;
    example = parsed.example;
  }

  return json({ concepts, formulas, example, cached: false });
}

interface ChatBody {
  lesson: string;
  question: string;
  studentAnswer: string;
  previousFeedback: string;
  followup: string;
}

async function handleChat(request: Request, env: Env): Promise<Response> {
  const body = await readJson<ChatBody>(request);
  if (!body.lesson || !body.followup) {
    return badRequest("Missing lesson or followup.");
  }

  let reply: string;
  if (!hasAnyKey(env)) {
    reply =
      "(Mock) The real chat lands once Worker secrets are configured. " +
      "See docs/SETUP.md.";
  } else {
    const text = await callWithRotation(
      chatPrompt({
        lesson: body.lesson,
        question: body.question,
        studentAnswer: body.studentAnswer,
        previousFeedback: body.previousFeedback,
        followup: body.followup,
      }),
      env
    );
    reply = text.trim();
  }

  return json({ reply });
}
