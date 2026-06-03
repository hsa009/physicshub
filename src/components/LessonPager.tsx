import { useCallback, useEffect } from "react";
import type { LessonWithSlides } from "../types";
import Slide from "./Slide";
import { useSlidePosition } from "../hooks/useSlidePosition";

interface LessonPagerProps {
  lesson: LessonWithSlides;
  /** Called when the student clicks "Go to Questions" on the last slide. */
  onComplete: () => void;
  /** Called when the student clicks "Practice Mode" on the last slide. */
  onPractice: () => void;
}

/**
 * Paged UI for a lesson's slides. Owns the current slide index,
 * the progress bar, the back / next buttons, and the keyboard nav.
 * Persists `position` to localStorage via `useSlidePosition` so the
 * student can leave and resume on the same slide.
 */
export default function LessonPager({
  lesson,
  onComplete,
  onPractice,
}: LessonPagerProps) {
  const { position, setPosition, reset } = useSlidePosition(lesson.id);
  const total = lesson.slides.length;
  const isFirst = position === 0;
  const isLast = position === total - 1;
  const progress = ((position + 1) / total) * 100;

  const goNext = useCallback(() => {
    if (isLast) {
      onComplete();
    } else {
      setPosition(position + 1);
    }
  }, [isLast, onComplete, position, setPosition]);

  const goPrev = useCallback(() => {
    if (!isFirst) setPosition(position - 1);
  }, [isFirst, position, setPosition]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement) {
        const tag = e.target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable) {
          return;
        }
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev]);

  const slide = lesson.slides[position];
  if (!slide) return null;

  return (
    <section className="lesson-pager" aria-label="Lesson slides">
      <header className="mb-10">
        <div className="mb-3 flex items-center justify-between text-[0.6rem] uppercase tracking-eyebrow">
          <span className="text-text-label">Reading slides</span>
          <span className="text-text-label">
            <span className="text-gold">{position + 1}</span> / {total}
          </span>
        </div>
        <div
          className="h-px w-full bg-border-mid relative overflow-hidden"
          role="progressbar"
          aria-valuenow={position + 1}
          aria-valuemin={1}
          aria-valuemax={total}
          aria-label="Slide progress"
        >
          <div
            className="absolute inset-y-0 left-0 bg-gold transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <div className="min-h-[420px]">
        <Slide
          key={slide.id}
          slide={slide}
          lessonName={lesson.name}
          slideNumber={position + 1}
          totalSlides={total}
        />
      </div>

      <nav
        className="mt-14 flex flex-col-reverse items-stretch justify-between gap-6 border-t border-border pt-8 md:flex-row md:items-center"
        aria-label="Slide navigation"
      >
        <button
          type="button"
          onClick={goPrev}
          disabled={isFirst}
          className="btn-soft"
          aria-label="Previous slide"
        >
          ← Back
        </button>

        {isLast ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button type="button" onClick={onPractice} className="btn-ghost">
              <span aria-hidden>✦</span> Practice Mode
            </button>
            <button type="button" onClick={onComplete} className="btn-primary">
              <span>Go to Questions</span>
              <span aria-hidden>→</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={goNext}
            className="btn-ghost self-end md:self-auto"
            aria-label="Next slide"
          >
            Next
          </button>
        )}
      </nav>

      <div className="mt-6 flex items-center justify-between text-[0.6rem] uppercase tracking-eyebrow text-text-label">
        <button
          type="button"
          onClick={reset}
          className="transition-colors hover:text-gold"
        >
          ↺ Start over
        </button>
        <button
          type="button"
          onClick={onComplete}
          className="transition-colors hover:text-gold"
        >
          Skip to questions ↓
        </button>
      </div>
    </section>
  );
}
