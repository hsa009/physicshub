import { Link, useParams } from "react-router-dom";
import { getLessonById, getQuestionsForLesson } from "../data/lessons";
import Nav from "../components/Nav";
import PracticePanel from "../components/PracticePanel";

export default function PracticePage() {
  const { lessonId = "" } = useParams<{ lessonId: string }>();
  const lesson = getLessonById(lessonId);

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
            <Link to="/" className="btn-ghost mt-8 inline-flex">
              Back to lessons
            </Link>
          </div>
        </main>
      </>
    );
  }

  const questions = getQuestionsForLesson(lesson.module, lesson.name);

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

        <div className="mx-auto max-w-3xl">
          <Link
            to={`/lesson/${lesson.id}`}
            className="text-[0.6rem] uppercase tracking-eyebrow text-text-label transition-colors hover:text-gold"
          >
            ← Back to {lesson.name}
          </Link>

          <div className="mt-6 mb-3 flex items-center gap-4">
            <div className="gold-line" />
            <span className="eyebrow">{lesson.module} · Practice Mode</span>
          </div>
          <h1 className="section-title">
            Practice{" "}
            <em className="italic text-gold">{lesson.accentWord}</em>
          </h1>
          <p className="body-text mt-5 max-w-2xl">{lesson.description}</p>
        </div>

        <div className="mt-16">
          <PracticePanel lesson={lesson} questions={questions} />
        </div>
      </main>
    </>
  );
}
