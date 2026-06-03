/**
 * API client for the Cloudflare Worker.
 *
 * Endpoints:
 *   POST /check   — check a student answer
 *   POST /explain — get a lesson-level AI explanation (cached server-side)
 *   POST /chat    — Explain More follow-up (M4)
 *   POST /ask     — slide-aware "Ask Anything" chat (M5.4)
 *   GET  /health  — health check
 *
 * If VITE_WORKER_URL is not set, calls return a structured "not configured"
 * response so the UI can degrade gracefully.
 */

import type { Verdict } from "../types";

const WORKER_URL = (import.meta.env.VITE_WORKER_URL as string | undefined) ?? "";

export const isWorkerConfigured = Boolean(
  WORKER_URL && !WORKER_URL.includes("your-subdomain")
);

export interface CheckRequest {
  lesson: string;
  module: string;
  question: string;
  answer: string;
}

export interface CheckResponse {
  verdict: Verdict;
  feedback: string;
}

export interface ExplainRequest {
  lesson: string;
  module: string;
  questionIds: string[];
  questionPrompts: string[];
}

export interface ExplainResponse {
  concepts: string[];
  formulas: { name: string; equation: string; variables: string }[];
  example: string;
  cached: boolean;
}

export interface ChatMessage {
  role: "student" | "tutor";
  content: string;
}

export interface ChatRequest {
  lesson: string;
  question: string;
  studentAnswer: string;
  previousFeedback: string;
  history?: ChatMessage[];
  followup: string;
}

export interface ChatResponse {
  reply: string;
}

export interface AskRequest {
  lessonName: string;
  moduleName: string;
  slide: {
    title: string;
    body: string;
    formula?: { label: string; expression: string };
  };
  history?: ChatMessage[];
  question: string;
}

export interface AskResponse {
  reply: string;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  if (!isWorkerConfigured) {
    throw new Error(
      "Worker is not configured. Set VITE_WORKER_URL in .env to enable AI features."
    );
  }
  const res = await fetch(`${WORKER_URL}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI request failed (${res.status}): ${text}`);
  }
  return (await res.json()) as T;
}

export const api = {
  check: (req: CheckRequest) => postJson<CheckResponse>("/check", req),
  explain: (req: ExplainRequest) => postJson<ExplainResponse>("/explain", req),
  chat: (req: ChatRequest) => postJson<ChatResponse>("/chat", req),
  askSlide: (req: AskRequest) => postJson<AskResponse>("/ask", req),
};
