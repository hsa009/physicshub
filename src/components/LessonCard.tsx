import { Link } from "react-router-dom";
import type { Lesson } from "../types";

interface LessonCardProps {
  lesson: Lesson;
  answeredCount: number;
}

/**
 * Italicizes the last word of a lesson name for the gold-accent trick.
 * e.g. "Projectile Motion" → Projectile *Motion*
 */
function renderTitle(name: string) {
  const words = name.split(" ");
  if (words.length < 2) return <>{name}</>;
  const last = words[words.length - 1];
  const rest = words.slice(0, -1).join(" ");
  return (
    <>
      {rest} <em className="italic text-gold">{last}</em>
    </>
  );
}

function encodeLessonPath(lesson: { id: string } | Lesson): string {
  const id = "id" in lesson ? lesson.id : `${lesson.module}::${lesson.name}`;
  return `/lesson/${encodeURIComponent(id)}`;
}

export default function LessonCard({ lesson, answeredCount }: LessonCardProps) {
  const complete = answeredCount >= lesson.questionCount;
  const progress = `${answeredCount}/${lesson.questionCount}`;

  return (
    <Link
      to={encodeLessonPath(lesson)}
      className="coll-item group relative flex min-h-[220px] flex-col justify-between overflow-hidden border border-border bg-bg-card p-10 transition-colors duration-300 hover:bg-bg-subtle"
    >
      <div className="flex items-center justify-between">
        <span className="text-[0.58rem] uppercase tracking-[0.45em] text-text-label transition-colors duration-300 group-hover:text-gold">
          {lesson.module}
        </span>
        {complete ? (
          <span className="text-[0.58rem] uppercase tracking-[0.3em] text-gold">
            Complete
          </span>
        ) : answeredCount > 0 ? (
          <span className="text-[0.58rem] uppercase tracking-[0.3em] text-text-body">
            {progress}
          </span>
        ) : null}
      </div>

      <div>
        <h3 className="font-serif text-[1.6rem] font-normal leading-[1.1] text-text-primary md:text-[1.8rem]">
          {renderTitle(lesson.name)}
        </h3>
        <div className="mt-5 flex h-9 w-9 items-center justify-center rounded-full border border-border-mid text-text-label transition-all duration-300 group-hover:border-gold group-hover:text-gold group-hover:translate-x-[3px] group-hover:-translate-y-[3px]">
          →
        </div>
      </div>

      {/* Gold underline that fades in on hover */}
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-10 right-10 h-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "linear-gradient(to right, transparent, var(--gold), transparent)",
        }}
      />
    </Link>
  );
}
