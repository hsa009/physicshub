/**
 * PracticePanel — the session UI for a single set of 3 AI-generated
 * practice questions (M5.5). Owns the practice state for one lesson:
 * the current set of questions, the per-question skip set, and the
 * loading / error state for generation. Re-render-free between sets:
 * a fresh set is generated on user click.
 */

import { useCallback, useState } from "react";
import {
  api,
  isWorkerConfigured,
  type PracticeQuestion,
} from "../lib/api";
import type { LessonWithSlides, Question } from "../types";
import Spinner from "./Spinner";
import PracticeQuestionCard from "./PracticeQuestionCard";

interface PracticePanelProps {
  lesson: LessonWithSlides;
  questions: Question[];
}

export default function PracticePanel({ lesson, questions }: PracticePanelProps) {
  const [set, setSet] = useState<PracticeQuestion[]>([]);
  const [skipped, setSkipped] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = set.filter((_, i) => !skipped.has(i));

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSkipped(new Set());
    try {
      const res = await api.generatePractice({
        lessonName: lesson.name,
        moduleName: lesson.module,
        slideTitles: lesson.slides.map((s) => s.title),
        sampleQuestionPrompts: questions.slice(0, 2).map((q) => q.prompt),
      });
      if (res.questions.length === 0) {
        setError("The AI returned no questions. Try Regenerate.");
        setSet([]);
      } else {
        setSet(res.questions);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSet([]);
    } finally {
      setLoading(false);
    }
  }, [lesson.module, lesson.name, lesson.slides, questions]);

  const onSkip = (i: number) => {
    setSkipped((prev) => new Set(prev).add(i));
  };

  if (set.length === 0 && !loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="border border-border bg-bg-card p-10 text-center md:p-14">
          <div className="mb-5 flex items-center justify-center gap-4">
            <div className="gold-line" />
            <span className="eyebrow">Practice Mode</span>
            <div className="gold-line" />
          </div>
          <h2 className="section-title text-[1.8rem] md:text-[2.2rem]">
            3 fresh <em>questions</em>, just for you
          </h2>
          <p className="body-text mt-5 max-w-md mx-auto">
            The AI generates 3 brand-new questions tailored to this lesson —
            mixed conceptual and numerical. Your answers are <em>not</em> saved
            to your progress; practice is for the moment.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={generate}
              disabled={!isWorkerConfigured || loading}
              className="btn-primary"
            >
              <span className="flex items-center gap-3">
                <span aria-hidden>✦</span>
                Generate Practice Questions
              </span>
            </button>
          </div>
          {!isWorkerConfigured && (
            <p className="mt-5 text-[0.6rem] uppercase tracking-eyebrow text-text-label">
              AI not configured · set VITE_WORKER_URL
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="mt-5 text-[0.8rem] text-text-body"
            >
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="border border-border bg-bg-card p-10 text-center md:p-14">
          <Spinner size={16} />
          <p className="mt-4 eyebrow">Generating 3 fresh questions…</p>
          <p className="body-text mt-3">Usually takes 5-15 seconds.</p>
        </div>
        <SkeletonCards />
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="border border-border bg-bg-card p-10 text-center md:p-14">
          <span aria-hidden className="text-gold text-[1.4rem]">
            ✦
          </span>
          <h2 className="section-title mt-4 text-[1.6rem] md:text-[1.9rem]">
            Set complete
          </h2>
          <p className="body-text mt-4">
            You skipped or finished all 3. Want another set?
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={generate}
              className="btn-primary"
            >
              <span className="flex items-center gap-3">
                <span aria-hidden>↺</span>
                <span>Regenerate Set</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">Practice Mode</span>
          <p className="mt-2 text-[0.7rem] text-text-label">
            {visible.length} of {set.length} questions in this set
          </p>
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="btn-ghost"
        >
          <span aria-hidden>↺</span>
          Regenerate Set
        </button>
      </header>

      <div className="flex flex-col gap-6">
        {visible.map((q) => {
          const originalIndex = set.indexOf(q);
          return (
            <PracticeQuestionCard
              key={`${q.prompt.slice(0, 24)}-${originalIndex}`}
              question={q}
              index={originalIndex}
              total={set.length}
              lesson={lesson.name}
              moduleName={lesson.module}
              onSkip={() => onSkip(originalIndex)}
            />
          );
        })}
      </div>

      {error && (
        <div
          role="alert"
          className="mt-6 border border-border-mid bg-bg-subtle px-4 py-3 text-[0.78rem] text-text-body"
        >
          {error}
        </div>
      )}
    </div>
  );
}

function SkeletonCards() {
  return (
    <div className="mt-8 flex flex-col gap-6">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="border border-border bg-bg-card p-8 md:p-10 animate-pulse"
        >
          <div className="h-3 w-32 bg-bg-subtle rounded" />
          <div className="mt-5 h-5 w-full bg-bg-subtle rounded" />
          <div className="mt-2 h-5 w-2/3 bg-bg-subtle rounded" />
          <div className="mt-7 h-20 w-full bg-bg-subtle rounded" />
        </div>
      ))}
    </div>
  );
}
