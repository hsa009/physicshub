import { Link } from "react-router-dom";
import type { Answer, Question } from "../types";
import QuestionCard from "./QuestionCard";
import Spinner from "./Spinner";

interface NextLessonMeta {
  id: string;
  name: string;
}

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
  /**
   * M5.9: True when every question in the lesson has at least one saved
   * answer. Used to swap the last question's "Next →" button for a
   * "Continue to [Next Lesson] →" CTA.
   */
  isComplete: boolean;
  /**
   * M5.9: The next lesson in the learning path (or undefined if this is
   * the last lesson). The pager renders an "All lessons complete"
   * celebration block when isComplete is true AND this is undefined.
   */
  nextLesson?: NextLessonMeta;
  /**
   * M5.9: Navigates to the next lesson. Passed in by LessonView so the
   * pager stays a pure presentation component.
   */
  onNextLesson?: () => void;
}

/**
 * Paged UI for a lesson's questions. Renders ONE question at a time with
 * explicit Previous / Next buttons. The questions section never auto-scrolls
 * between cards — the student navigates manually, just like the slide pager.
 *
 * Replaces the old "all questions stacked, auto-scroll on Complete" flow:
 * the questions section is only revealed when the student explicitly asks
 * for it (Go to Questions, Skip to questions, or finishing the last slide).
 *
 * M5.9: When the student is on the last question AND every question in
 * the lesson has been answered, the Next button transforms into a
 * "Continue to [Next Lesson] →" CTA. If there's no next lesson, the
 * pager renders an All-Done celebration block.
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
  isComplete,
  nextLesson,
  onNextLesson,
}: QuestionsPagerProps) {
  const total = questions.length;
  const isFirst = index <= 0;
  const isLast = index >= total - 1;
  const progress = total > 0 ? ((index + 1) / total) * 100 : 0;
  const current = questions[index];

  // M5.9: on the last question, when complete, "Next" becomes
  // "Continue to [Next Lesson] →" (or an all-done block when no next).
  const showContinueCta = isLast && isComplete && Boolean(nextLesson) && Boolean(onNextLesson);
  const showAllDone = isLast && isComplete && !nextLesson;

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

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[0.6rem] uppercase tracking-eyebrow text-text-label">
          <button
            type="button"
            onClick={onBackToSlides}
            className="transition-colors hover:text-gold"
          >
            ← Back to slides
          </button>
          <div className="flex items-center gap-5">
            {nextLesson && onNextLesson && (
              <button
                type="button"
                onClick={onNextLesson}
                className="transition-colors hover:text-gold"
                aria-label={`Continue to ${nextLesson.name}`}
              >
                Next Lesson →
              </button>
            )}
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

      {current && !showAllDone ? (
        <QuestionCard
          key={current.id}
          question={current}
          module={module}
          lesson={lesson}
          priorAnswers={priorAnswers}
        />
      ) : !current ? (
        <div className="border border-border bg-bg-card p-10 text-center">
          <p className="body-text">No questions for this lesson yet.</p>
        </div>
      ) : null}

      {showAllDone && <AllDoneCelebration />}

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

        {showContinueCta && nextLesson && onNextLesson ? (
          <button
            type="button"
            onClick={onNextLesson}
            className="btn-primary self-end md:self-auto"
            aria-label={`Continue to ${nextLesson.name}`}
          >
            <span>
              Continue to{" "}
              <span className="italic text-gold-light">{nextLesson.name}</span>
            </span>
            <span aria-hidden>→</span>
          </button>
        ) : showAllDone ? (
          <Link
            to="/"
            className="btn-primary self-end md:self-auto"
            aria-label="Back to all lessons"
          >
            <span>Back to Lessons</span>
            <span aria-hidden>↺</span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => onIndexChange(index + 1)}
            disabled={isLast}
            className="btn-ghost self-end md:self-auto"
            aria-label="Next question"
          >
            Next →
          </button>
        )}
      </nav>
    </section>
  );
}

function AllDoneCelebration() {
  return (
    <div className="feature-item relative border border-border bg-bg-card p-12 text-center">
      <div className="mb-6 flex items-center justify-center gap-4">
        <div className="gold-line" />
        <span className="eyebrow">All lessons complete</span>
        <div className="gold-line" />
      </div>
      <h2 className="section-title text-[2.2rem] md:text-[2.8rem]">
        Nine <em>Lessons</em> Done
      </h2>
      <p className="body-text mx-auto mt-6 max-w-xl">
        Every slide reviewed, every question answered. The full Grade 11
        physics path — from projectiles to energy conservation — is now
        yours.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <Link to="/" className="btn-ghost">
          <span aria-hidden>↺</span>
          Review any lesson
        </Link>
        <Link to="/progress" className="btn-primary">
          <span>View Progress</span>
          <span aria-hidden>→</span>
        </Link>
      </div>
    </div>
  );
}
