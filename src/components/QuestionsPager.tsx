import type { Answer, Question } from "../types";
import QuestionCard from "./QuestionCard";
import Spinner from "./Spinner";

interface QuestionsPagerProps {
  questions: Question[];
  priorAnswers: Answer[] | undefined;
  module: string;
  lesson: string;
  index: number;
  onIndexChange: (i: number) => void;
  onBackToSlides: () => void;
  onPractice: () => void;
  firstQid?: string;
  lastQid?: string;
  answersLoading: boolean;
}

/**
 * Paged UI for a lesson's questions. Renders ONE question at a time with
 * explicit Previous / Next buttons. The questions section never auto-scrolls
 * between cards — the student navigates manually, just like the slide pager.
 *
 * Replaces the old "all questions stacked, auto-scroll on Complete" flow:
 * the questions section is only revealed when the student explicitly asks
 * for it (Go to Questions, Skip to questions, or finishing the last slide).
 */
export default function QuestionsPager({
  questions,
  priorAnswers,
  module,
  lesson,
  index,
  onIndexChange,
  onBackToSlides,
  onPractice,
  firstQid,
  lastQid,
  answersLoading,
}: QuestionsPagerProps) {
  const total = questions.length;
  const isFirst = index <= 0;
  const isLast = index >= total - 1;
  const progress = total > 0 ? ((index + 1) / total) * 100 : 0;
  const current = questions[index];

  return (
    <section aria-label="Questions">
      <header className="mb-10">
        <div className="mb-3 flex items-center justify-between text-[0.6rem] uppercase tracking-eyebrow">
          <span className="text-text-label">Questions</span>
          <span className="text-text-label">
            <span className="text-gold">{Math.min(index + 1, total)}</span> /{" "}
            {total}
          </span>
        </div>
        <div
          className="h-px w-full bg-border-mid relative overflow-hidden"
          role="progressbar"
          aria-valuenow={Math.min(index + 1, total)}
          aria-valuemin={1}
          aria-valuemax={total}
          aria-label="Question progress"
        >
          <div
            className="absolute inset-y-0 left-0 bg-gold transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 text-[0.6rem] uppercase tracking-eyebrow text-text-label">
          <button
            type="button"
            onClick={onBackToSlides}
            className="transition-colors hover:text-gold"
          >
            ← Back to slides
          </button>
          <button
            type="button"
            onClick={onPractice}
            className="transition-colors hover:text-gold"
          >
            <span aria-hidden className="mr-1 text-gold">
              ✦
            </span>
            Practice Mode
          </button>
        </div>
        <p className="mt-3 text-[0.6rem] uppercase tracking-eyebrow text-text-label">
          {answersLoading ? (
            <span className="flex items-center gap-2">
              <Spinner size={12} /> Loading prior answers…
            </span>
          ) : (
            "Your saved answers appear on each card as you submit them."
          )}
        </p>
      </header>

      {current ? (
        <QuestionCard
          key={current.id}
          question={current}
          module={module}
          lesson={lesson}
          priorAnswers={priorAnswers}
        />
      ) : (
        <div className="border border-border bg-bg-card p-10 text-center">
          <p className="body-text">No questions for this lesson yet.</p>
        </div>
      )}

      <nav
        className="mt-12 flex flex-col-reverse items-stretch justify-between gap-6 border-t border-border pt-8 md:flex-row md:items-center"
        aria-label="Question navigation"
      >
        <button
          type="button"
          onClick={() => onIndexChange(index - 1)}
          disabled={isFirst}
          className="btn-soft"
          aria-label="Previous question"
        >
          ← Previous
        </button>

        <span className="text-center text-[0.6rem] uppercase tracking-eyebrow text-text-label">
          {current?.id}
          {firstQid && lastQid && firstQid !== lastQid
            ? ` · ${firstQid} → ${lastQid}`
            : firstQid
              ? ` · ${firstQid}`
              : ""}
        </span>

        <button
          type="button"
          onClick={() => onIndexChange(index + 1)}
          disabled={isLast}
          className="btn-ghost self-end md:self-auto"
          aria-label="Next question"
        >
          Next →
        </button>
      </nav>
    </section>
  );
}
