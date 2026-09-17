

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

export type PracticeType = "conceptual" | "numerical";

export interface PracticeQuestion {
  type: PracticeType;
  prompt: string;
}

export interface PracticeRequest {
  lessonName: string;
  moduleName: string;
  slideTitles?: string[];
  sampleQuestionPrompts?: string[];
}

export interface PracticeResponse {
  questions: PracticeQuestion[];
}

export interface AdminLoginResponse {
  token: string;
  expiresInMs: number;
}

export interface AdminStatsResponse {
  studentCount: number;
  answerCount: number;
  accuracy: number;
  verdictCounts: { correct: number; partial: number; incorrect: number };
  perLesson: { lesson: string; count: number }[];
}

export interface AdminStudentRow {
  esis: string;
  firstSeen: string;
  lastActive: string;
  answerCount: number;
  accuracy: number;
  verdictCounts: { correct: number; partial: number; incorrect: number };
}

export interface AdminStudentsResponse {
  students: AdminStudentRow[];
}

export interface AdminAnswerRow {
  questionId: string;
  module: string;
  lesson: string;
  studentAnswer: string;
  verdict: Verdict;
  feedback: string;
  submittedAt: string;
}

export interface AdminStudentDetailResponse {
  student: {
    esis: string;
    first_seen: string;
    last_active: string;
  };
  answerCount: number;
  accuracy: number;
  verdictCounts: { correct: number; partial: number; incorrect: number };
  perLesson: { lesson: string; count: number }[];
  answers: AdminAnswerRow[];
}

const ADMIN_TOKEN_KEY = "physicshub-admin-token";

export function getAdminToken(): string | null {
  try {
    return window.localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string): void {
  try {
    window.localStorage.setItem(ADMIN_TOKEN_KEY, token);
  } catch {
    
  }
}

export function clearAdminToken(): void {
  try {
    window.localStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {
    
  }
}

async function adminGet<T>(path: string): Promise<T> {
  if (!isWorkerConfigured) {
    throw new Error(
      "Worker is not configured. Set VITE_WORKER_URL in .env to enable admin features."
    );
  }
  const token = getAdminToken();
  if (!token) throw new Error("Not signed in as admin.");
  const res = await fetch(`${WORKER_URL}${path}`, {
    method: "GET",
    headers: {
      authorization: `Bearer ${token}`,
    },
  });
  if (res.status === 401) {
    clearAdminToken();
    throw new Error("Admin session expired. Please sign in again.");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Admin request failed (${res.status}): ${text}`);
  }
  return (await res.json()) as T;
}

export const adminApi = {
  login: async (password: string): Promise<AdminLoginResponse> => {
    if (!isWorkerConfigured) {
      throw new Error(
        "Worker is not configured. Set VITE_WORKER_URL in .env to enable admin features."
      );
    }
    const res = await fetch(`${WORKER_URL}/admin/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.status === 401) {
      throw new Error("Wrong admin password.");
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Admin login failed (${res.status}): ${text}`);
    }
    const data = (await res.json()) as AdminLoginResponse;
    setAdminToken(data.token);
    return data;
  },

  verify: (): Promise<{ ok: true }> => adminGet<{ ok: true }>("/admin/verify"),

  stats: (): Promise<AdminStatsResponse> =>
    adminGet<AdminStatsResponse>("/admin/stats"),

  listStudents: (q?: string): Promise<AdminStudentsResponse> => {
    const qs = q && q.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
    return adminGet<AdminStudentsResponse>(`/admin/students${qs}`);
  },

  getStudent: (esis: string): Promise<AdminStudentDetailResponse> =>
    adminGet<AdminStudentDetailResponse>(
      `/admin/student/${encodeURIComponent(esis)}`,
    ),
};

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
  generatePractice: (req: PracticeRequest) =>
    postJson<PracticeResponse>("/practice", req),
};
