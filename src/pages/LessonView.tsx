import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getLessonById,
  getQuestionsForLesson,
  getLesson,
} from "../data/lessons";
import { useAnswers } from "../hooks/useAnswers";
import { useLearningPath, isLessonComplete } from "../hooks/useLearningPath";
import { useAnsweredCounts } from "../hooks/useAnsweredCounts";
import Nav from "../components/Nav";
import LessonPager from "../components/LessonPager";
import QuestionsPager from "../components/QuestionsPager";
import AskDrawer from "../components/AskDrawer";
import AskToggleButton from "../components/AskToggleButton";
import { renderAccentTitle } from "../lib/format";
import type { Slide as SlideType } from "../types";

export default function LessonView() {
  const { lessonId = "" } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const lesson = getLessonById(lessonId);

  if (!lesson) {
    return <NotFound />;
  }

  const questions = getQuestionsForLesson(lesson.module, lesson.name);
  const legacyLesson = getLesson(lesson.module, lesson.name);
  const { data: priorAnswers, isLoading: answersLoading } = useAnswers(
    lesson.module,
    lesson.name,
  );
  const { data: counts } = useAnsweredCounts();
  const { getNextLessonId: getNext } = useLearningPath();

  const isComplete = isLessonComplete(lesson, counts);
  const nextLessonId = getNext(lesson.id);
  const nextLesson = (() => {
    if (!nextLessonId) return undefined;
    const nl = getLessonById(nextLessonId);
    return nl ? { id: nl.id, name: nl.name, accentWord: nl.accentWord } : undefined;
  })();

  const questionsRef = useRef<HTMLElement>(null);
  const [currentSlide, setCurrentSlide] = useState<SlideType>(lesson.slides[0]);
  const [askOpen, setAskOpen] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);

  const goToQuestions = () => {
    setShowQuestions(true);
    setQuestionIndex(0);
  };
  const goBackToSlides = () => setShowQuestions(false);
  const goToPractice = () => navigate(`/lesson/${lesson.id}/practice`);
  const goToNextLesson = () => {
    if (nextLessonId) {
      navigate(`/lesson/${nextLessonId}`);
    }
  };

  useEffect(() => {
    if (showQuestions) {
      questionsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [showQuestions]);

  const firstQid = legacyLesson?.questionIds[0];
  const lastQid = legacyLesson?.questionIds[legacyLesson.questionIds.length - 1];

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

        <div className="mx-auto max-w-5xl">
          <Link
            to="/"
            className="text-[0.6rem] uppercase tracking-eyebrow text-text-label transition-colors hover:text-gold"
          >
            ← All lessons
          </Link>

          <div className="mt-6 mb-3 flex items-center gap-4">
            <div className="gold-line" />
            <span className="eyebrow">{lesson.module}</span>
            {isComplete && (
              <span
                className="ml-2 inline-flex items-center gap-2 border border-gold px-3 py-1 text-[0.55rem] uppercase tracking-[0.3em] text-gold"
                aria-label="This lesson is complete"
              >
                <span aria-hidden>✓</span>
                Completed
              </span>
            )}
          </div>
          <h1 className="section-title">
            {renderAccentTitle(lesson.name, lesson.accentWord)}
          </h1>
          <p className="body-text mt-5 max-w-2xl">{lesson.description}</p>
          <p className="mt-4 text-[0.65rem] uppercase tracking-eyebrow text-text-label">
            {lesson.slides.length} slides · {questions.length} questions
            {firstQid && lastQid && firstQid !== lastQid
              ? ` · ${firstQid} → ${lastQid}`
              : firstQid
                ? ` · ${firstQid}`
                : ""}
          </p>
        </div>

        {!showQuestions ? (
          <section
            aria-label="Slides"
            className="mx-auto mt-16 max-w-5xl"
          >
            <LessonPager
              lesson={lesson}
              onComplete={goToQuestions}
              onPractice={goToPractice}
              onSlideChange={setCurrentSlide}
            />
          </section>
        ) : (
          <section
            ref={questionsRef}
            aria-label="Questions"
            className="mx-auto mt-16 max-w-4xl scroll-mt-[120px]"
          >
            <div className="mb-3 flex items-center gap-4">
              <div className="gold-line" />
              <span className="eyebrow">Questions</span>
            </div>
            <h2 className="section-title text-[2rem] md:text-[2.4rem]">
              {questions.length} <em>Questions</em>
            </h2>
            <div className="mt-10">
              <QuestionsPager
                questions={questions}
                priorAnswers={priorAnswers}
                module={lesson.module}
                lesson={lesson.name}
                index={questionIndex}
                onIndexChange={setQuestionIndex}
                onBackToSlides={goBackToSlides}
                onPractice={goToPractice}
                firstQid={firstQid}
                lastQid={lastQid}
                answersLoading={answersLoading}
                isComplete={isComplete}
                nextLesson={nextLesson}
                onNextLesson={goToNextLesson}
              />
            </div>
          </section>
        )}
      </main>

      <AskToggleButton
        open={askOpen}
        onClick={() => setAskOpen((v) => !v)}
        hasMessages={false}
      />
      <AskDrawer
        lesson={lesson}
        currentSlide={currentSlide}
        open={askOpen}
        onClose={() => setAskOpen(false)}
      />
    </>
  );
}

function NotFound() {
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
          <Link to="/" className="btn-ghost mt-8 inline-flex">
            Back to lessons
          </Link>
        </div>
      </main>
    </>
  );
}
