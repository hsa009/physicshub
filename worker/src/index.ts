

import { callWithRotation, hasAnyKey, type KeyProvider } from "./rotation";
import {
  checkPrompt,
  explainPrompt,
  chatPrompt,
  askSlidePrompt,
  practicePrompt,
} from "./prompts";
import {
  parseCheckResponse,
  parseExplainResponse,
  parsePracticeResponse,
} from "./parse";
import { mockCheck, mockExplain, mockPractice } from "./mock";
import { signAdminToken, verifyAdminToken } from "./admin";
import type { Verdict } from "./parse";

export interface Env extends KeyProvider {
  ENVIRONMENT?: string;
  ADMIN_PASSWORD?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_KEY?: string;
  ADMIN_TOKENS?: KVNamespace;
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
      if (path === "/ask" && method === "POST") {
        return await handleAsk(request, env);
      }
      if (path === "/practice" && method === "POST") {
        return await handlePractice(request, env);
      }
      if (path === "/admin/login" && method === "POST") {
        return await handleAdminLogin(request, env);
      }
      if (path === "/admin/verify" && method === "GET") {
        return await handleAdminVerify(request, env);
      }
      if (path === "/admin/stats" && method === "GET") {
        return await handleAdminStats(request, env);
      }
      if (path === "/admin/students" && method === "GET") {
        return await handleAdminStudents(request, env);
      }
      if (path.startsWith("/admin/student/") && method === "GET") {
        const esis = decodeURIComponent(path.slice("/admin/student/".length));
        return await handleAdminStudentDetail(request, env, esis);
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
  history?: { role: "student" | "tutor"; content: string }[];
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
        history: body.history ?? [],
        followup: body.followup,
      }),
      env
    );
    reply = text.trim();
  }

  return json({ reply });
}

interface AskBody {
  lessonName: string;
  moduleName: string;
  slide: {
    title: string;
    body: string;
    formula?: { label: string; expression: string };
  };
  history?: { role: "student" | "tutor"; content: string }[];
  question: string;
}

async function handleAsk(request: Request, env: Env): Promise<Response> {
  const body = await readJson<AskBody>(request);
  if (!body.lessonName || !body.question || !body.slide?.title) {
    return badRequest(
      "Missing lessonName, question, or slide.title.",
    );
  }

  let reply: string;
  if (!hasAnyKey(env)) {
    reply =
      "(Mock) AI tutor is offline until Worker secrets are configured. " +
      "See docs/SETUP.md. The slide you were reading: " +
      `"${body.slide.title}".`;
  } else {
    const text = await callWithRotation(
      askSlidePrompt({
        lessonName: body.lessonName,
        moduleName: body.moduleName,
        slide: body.slide,
        history: (body.history ?? []).map((m) => ({
          role: m.role,
          content: m.content,
        })),
        question: body.question,
      }),
      env
    );
    reply = text.trim();
  }

  return json({ reply });
}

interface PracticeBody {
  lessonName: string;
  moduleName: string;
  slideTitles?: string[];
  sampleQuestionPrompts?: string[];
}

async function handlePractice(request: Request, env: Env): Promise<Response> {
  const body = await readJson<PracticeBody>(request);
  if (!body.lessonName) {
    return badRequest("Missing lessonName.");
  }

  if (!hasAnyKey(env)) {
    const mock = mockPractice(body.lessonName, body.moduleName ?? "");
    return json(mock);
  }

  const text = await callWithRotation(
    practicePrompt({
      lessonName: body.lessonName,
      moduleName: body.moduleName ?? "",
      slideTitles: body.slideTitles ?? [],
      sampleQuestionPrompts: body.sampleQuestionPrompts ?? [],
    }),
    env,
  );
  const parsed = parsePracticeResponse(text);
  if (parsed.questions.length === 0) {
    return badRequest(
      "AI returned no usable practice questions. Try Regenerate.",
    );
  }
  return json(parsed);
}

function adminUnauthorized(): Response {
  return json({ error: "Unauthorized" }, { status: 401 });
}

interface AdminLoginBody {
  password: string;
}

async function handleAdminLogin(request: Request, env: Env): Promise<Response> {
  const body = await readJson<AdminLoginBody>(request);
  if (!body.password || typeof body.password !== "string") {
    return badRequest("Missing password.");
  }
  if (!env.ADMIN_PASSWORD) {
    return adminUnauthorized();
  }
  const token = await signAdminToken(env, body.password);
  if (!token) return adminUnauthorized();
  return json({ token, expiresInMs: 24 * 60 * 60 * 1000 });
}

async function handleAdminVerify(request: Request, env: Env): Promise<Response> {
  if (!(await verifyAdminToken(request, env))) return adminUnauthorized();
  return json({ ok: true });
}

interface SupabaseStudent {
  esis: string;
  first_seen: string;
  last_active: string;
}

interface SupabaseAnswer {
  esis: string;
  question_id: string;
  module: string;
  lesson: string;
  student_answer: string;
  ai_verdict: Verdict;
  ai_feedback: string;
  submitted_at: string;
}

function requireSupabase(env: Env): { url: string; key: string } | Response {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    return json(
      { error: "Supabase is not configured on the Worker." },
      { status: 503 },
    );
  }
  return { url: env.SUPABASE_URL, key: env.SUPABASE_SERVICE_KEY };
}

async function sbFetchAllStudents(
  supa: { url: string; key: string },
): Promise<SupabaseStudent[]> {
  const res = await fetch(
    `${supa.url}/rest/v1/students?select=esis,first_seen,last_active&order=last_active.desc`,
    {
      headers: {
        apikey: supa.key,
        authorization: `Bearer ${supa.key}`,
      },
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase students fetch failed (${res.status}): ${text}`);
  }
  return (await res.json()) as SupabaseStudent[];
}

async function sbFetchAllAnswers(
  supa: { url: string; key: string },
): Promise<SupabaseAnswer[]> {
  const res = await fetch(
    `${supa.url}/rest/v1/answers?select=esis,question_id,module,lesson,student_answer,ai_verdict,ai_feedback,submitted_at&order=submitted_at.desc&limit=2000`,
    {
      headers: {
        apikey: supa.key,
        authorization: `Bearer ${supa.key}`,
      },
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase answers fetch failed (${res.status}): ${text}`);
  }
  return (await res.json()) as SupabaseAnswer[];
}

function countByVerdict(answers: SupabaseAnswer[]): {
  correct: number;
  partial: number;
  incorrect: number;
} {
  const out = { correct: 0, partial: 0, incorrect: 0 };
  for (const a of answers) {
    if (a.ai_verdict === "correct") out.correct += 1;
    else if (a.ai_verdict === "partial") out.partial += 1;
    else if (a.ai_verdict === "incorrect") out.incorrect += 1;
  }
  return out;
}

async function handleAdminStats(
  request: Request,
  env: Env,
): Promise<Response> {
  if (!(await verifyAdminToken(request, env))) return adminUnauthorized();
  const supa = requireSupabase(env);
  if (supa instanceof Response) return supa;
  const [students, answers] = await Promise.all([
    sbFetchAllStudents(supa),
    sbFetchAllAnswers(supa),
  ]);
  const counts = countByVerdict(answers);
  const score = counts.correct + counts.partial * 0.5;
  const total = counts.correct + counts.partial + counts.incorrect;
  const accuracy = total > 0 ? score / total : 0;

  const byLesson = new Map<string, number>();
  for (const a of answers) {
    byLesson.set(a.lesson, (byLesson.get(a.lesson) ?? 0) + 1);
  }
  const perLesson = [...byLesson.entries()]
    .map(([lesson, count]) => ({ lesson, count }))
    .sort((a, b) => b.count - a.count);

  return json({
    studentCount: students.length,
    answerCount: answers.length,
    accuracy,
    verdictCounts: counts,
    perLesson,
  });
}

async function handleAdminStudents(
  request: Request,
  env: Env,
): Promise<Response> {
  if (!(await verifyAdminToken(request, env))) return adminUnauthorized();
  const supa = requireSupabase(env);
  if (supa instanceof Response) return supa;
  const [students, answers] = await Promise.all([
    sbFetchAllStudents(supa),
    sbFetchAllAnswers(supa),
  ]);
  const q = (new URL(request.url).searchParams.get("q") ?? "")
    .toLowerCase()
    .trim();
  const byEsis = new Map<string, SupabaseAnswer[]>();
  for (const a of answers) {
    const arr = byEsis.get(a.esis) ?? [];
    arr.push(a);
    byEsis.set(a.esis, arr);
  }
  const rows = students
    .filter((s) => (q ? s.esis.toLowerCase().includes(q) : true))
    .map((s) => {
      const list = byEsis.get(s.esis) ?? [];
      const counts = countByVerdict(list);
      const total = counts.correct + counts.partial + counts.incorrect;
      const score = counts.correct + counts.partial * 0.5;
      const accuracy = total > 0 ? score / total : 0;
      return {
        esis: s.esis,
        firstSeen: s.first_seen,
        lastActive: s.last_active,
        answerCount: list.length,
        accuracy,
        verdictCounts: counts,
      };
    });
  return json({ students: rows });
}

async function handleAdminStudentDetail(
  request: Request,
  env: Env,
  esis: string,
): Promise<Response> {
  if (!(await verifyAdminToken(request, env))) return adminUnauthorized();
  const supa = requireSupabase(env);
  if (supa instanceof Response) return supa;
  const [students, answers] = await Promise.all([
    sbFetchAllStudents(supa),
    sbFetchAllAnswers(supa),
  ]);
  const student = students.find((s) => s.esis === esis);
  if (!student) {
    return json({ error: `No student with ESIS "${esis}".` }, { status: 404 });
  }
  const myAnswers = answers.filter((a) => a.esis === esis);
  const counts = countByVerdict(myAnswers);
  const total = counts.correct + counts.partial + counts.incorrect;
  const score = counts.correct + counts.partial * 0.5;
  const accuracy = total > 0 ? score / total : 0;

  const byLesson = new Map<string, number>();
  for (const a of myAnswers) {
    byLesson.set(a.lesson, (byLesson.get(a.lesson) ?? 0) + 1);
  }
  return json({
    student,
    answerCount: myAnswers.length,
    accuracy,
    verdictCounts: counts,
    perLesson: [...byLesson.entries()]
      .map(([lesson, count]) => ({ lesson, count }))
      .sort((a, b) => b.count - a.count),
    answers: myAnswers.map((a) => ({
      questionId: a.question_id,
      module: a.module,
      lesson: a.lesson,
      studentAnswer: a.student_answer,
      verdict: a.ai_verdict,
      feedback: a.ai_feedback,
      submittedAt: a.submitted_at,
    })),
  });
}
