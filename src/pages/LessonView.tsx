import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getQuestionsForLesson, getLesson } from "../data/bank";
import { useAnswers } from "../hooks/useAnswers";
import { api, isWorkerConfigured, type ExplainResponse } from "../lib/api";
import Nav from "../components/Nav";
import QuestionCard from "../components/QuestionCard";
import Spinner from "../components/Spinner";

export default function LessonView() {
  const { module = "", name = "" } = useParams<{ module: string; name: string }>();
  const decodedModule = decodeURIComponent(module);
  const decodedName = decodeURIComponent(name);

  const lesson = getLesson(decodedModule, decodedName);
  const questions = getQuestionsForLesson(decodedModule, decodedName);
  const { data: priorAnswers, isLoading: answersLoading } = useAnswers(
    decodedModule,
    decodedName
  );

  const [explanation, setExplanation] = useState<ExplainResponse | null>(null);
  const [explanationError, setExplanationError] = useState<string | null>(null);
  const [explanationLoading, setExplanationLoading] = useState(false);

  useEffect(() => {
    if (!lesson) return;
    if (!isWorkerConfigured) {
      // Without the worker we show a static teaser instead of failing.
      setExplanation({
        concepts: [
          "Configure VITE_WORKER_URL to fetch an AI-generated explanation.",
        ],
        formulas: [],
        example: "",
        cached: false,
      });
      return;
    }
    let cancelled = false;
    setExplanationLoading(true);
    setExplanationError(null);
    api
      .explain({
        lesson: decodedName,
        module: decodedModule,
        questionIds: questions.map((q) => q.id),
        questionPrompts: questions.map((q) => q.prompt),
      })
      .then((res) => {
        if (!cancelled) setExplanation(res);
      })
      .catch((err) => {
        if (!cancelled)
          setExplanationError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setExplanationLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [decodedModule, decodedName, lesson, questions]);

  if (!lesson) {
    return (
      <>
        <Nav />
        <main className="flex min-h-screen items-center justify-center px-6 pt-[120px]">
          <div className="max-w-md text-center">
            <div className="mb-6 flex items-center justify-center gap-4">
              <div className="gold-line" />
              <span className="eyebrow">Not found</span>
              <div className="gold-line" />
            </div>
            <h1 className="section-title">
              No such <em>Lesson</em>
            </h1>
            <p className="body-text mt-6">
              We couldn't find a lesson at this URL.
            </p>
            <Link
              to="/"
              className="btn-ghost mt-8 inline-flex"
            >
              Back to lessons
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Nav />
      <main className="relative min-h-screen px-6 pb-24 pt-[120px] md:px-12 md:pt-[140px]">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 -top-40 h-[600px] w-[600px] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse, rgba(201,169,110,0.06), transparent 65%)",
          }}
        />

        <div className="mx-auto max-w-4xl">
          <Link
            to="/"
            className="text-[0.6rem] uppercase tracking-eyebrow text-text-label transition-colors hover:text-gold"
          >
            ← All lessons
          </Link>

          <div className="mt-6 mb-3 flex items-center gap-4">
            <div className="gold-line" />
            <span className="eyebrow">{decodedModule}</span>
          </div>
          <h1 className="section-title">
            {decodedName.split(" ").slice(0, -1).join(" ")}{" "}
            <em className="italic text-gold">
              {decodedName.split(" ").slice(-1)[0]}
            </em>
          </h1>
          <p className="body-text mt-5">
            {questions.length} questions · {lesson.questionIds[0]} →{" "}
            {lesson.questionIds[lesson.questionIds.length - 1]}
          </p>
        </div>

        {/* AI Explanation panel */}
        <section className="quote-section fade-up mx-auto mt-12 max-w-4xl border-y border-border bg-bg-subtle px-8 py-12 md:px-12 md:py-16">
          <span className="eyebrow">AI Explanation</span>
          <ExplanationBody
            explanation={explanation}
            loading={explanationLoading}
            error={explanationError}
            lessonName={decodedName}
          />
        </section>

        {/* Question list */}
        <section className="mx-auto mt-16 max-w-4xl">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="font-serif text-[1.6rem] font-light text-text-primary md:text-[2rem]">
              <em className="italic text-gold">Questions</em>
            </h2>
            {answersLoading && (
              <span className="flex items-center gap-2 text-[0.65rem] uppercase tracking-eyebrow text-text-label">
                <Spinner size={12} /> Loading prior answers…
              </span>
            )}
          </div>
          <div className="flex flex-col gap-px border border-border bg-border">
            {questions.map((q) => (
              <QuestionCard
                key={q.id}
                question={q}
                module={decodedModule}
                lesson={decodedName}
                priorAnswers={priorAnswers}
              />
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

function ExplanationBody({
  explanation,
  loading,
  error,
  lessonName,
}: {
  explanation: ExplainResponse | null;
  loading: boolean;
  error: string | null;
  lessonName: string;
}) {
  if (loading) {
    return (
      <div className="mt-6 flex items-center gap-3 text-[0.8rem] text-text-body">
        <Spinner size={14} /> Generating explanation for {lessonName}…
      </div>
    );
  }
  if (error) {
    return (
      <p className="mt-6 text-[0.8rem] text-text-body">
        Could not load an AI explanation right now: {error}
      </p>
    );
  }
  if (!explanation) return null;

  return (
    <div className="mt-6 space-y-7">
      {explanation.concepts.length > 0 && (
        <div>
          <h3 className="font-serif text-[1.05rem] italic text-gold">
            Key concepts
          </h3>
          <ul className="mt-3 list-inside list-disc space-y-1.5 text-[0.9rem] leading-[1.7] text-text-body">
            {explanation.concepts.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}
      {explanation.formulas.length > 0 && (
        <div>
          <h3 className="font-serif text-[1.05rem] italic text-gold">
            Formulas
          </h3>
          <ul className="mt-3 space-y-3">
            {explanation.formulas.map((f, i) => (
              <li
                key={i}
                className="border-l border-gold-dim bg-bg-card px-5 py-3"
              >
                <div className="text-[0.65rem] uppercase tracking-eyebrow text-gold">
                  {f.name}
                </div>
                <div className="mt-1 font-serif text-[1.1rem] text-text-primary">
                  {f.equation}
                </div>
                <div className="mt-1 text-[0.78rem] text-text-body">
                  {f.variables}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {explanation.example && (
        <div>
          <h3 className="font-serif text-[1.05rem] italic text-gold">
            Real-life example
          </h3>
          <p className="mt-3 text-[0.9rem] leading-[1.8] text-text-body">
            {explanation.example}
          </p>
        </div>
      )}
      {explanation.cached && (
        <p className="text-[0.6rem] uppercase tracking-eyebrow text-text-label">
          Cached explanation
        </p>
      )}
    </div>
  );
}
