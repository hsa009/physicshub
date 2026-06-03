import { Link } from "react-router-dom";
import type { Lesson } from "../types";
import { getLessonIdByModuleName } from "../data/lessons";

interface LessonCardProps {
  lesson: Lesson;
  answeredCount: number;
  /** 1-based position in the learning path; omitted to hide the badge. */
  pathPosition?: number;
  /** Total lessons in the path; used for "n/total" labelling. */
  pathTotal?: number;
  /**
   * True when this card is the next-incomplete lesson in the path.
   * Renders a gold "Up next" pill in the top-right corner.
   */
  isUpNext?: boolean;
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

function encodeLessonPath(lesson: Lesson): string {
  const id = getLessonIdByModuleName(lesson.module, lesson.name);
  if (!id) {
    return `/lesson/${encodeURIComponent(`${lesson.module}::${lesson.name}`)}`;
  }
  return `/lesson/${encodeURIComponent(id)}`;
}

export default function LessonCard({
  lesson,
  answeredCount,
  pathPosition,
  pathTotal,
  isUpNext = false,
}: LessonCardProps) {
  const complete = answeredCount >= lesson.questionCount;
  const progress = `${answeredCount}/${lesson.questionCount}`;

  return (
    <Link
      to={encodeLessonPath(lesson)}
      className="coll-item group relative flex min-h-[220px] flex-col justify-between overflow-hidden border border-border bg-bg-card p-10 transition-colors duration-300 hover:bg-bg-subtle"
    >
      {/* Up-next gold border highlight (M5.9). Uses ring instead of border
          so the card layout doesn't shift. */}
      {isUpNext && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 ring-1 ring-gold/60"
        />
      )}

      <div className="flex items-center justify-between">
        <span className="text-[0.58rem] uppercase tracking-[0.45em] text-text-label transition-colors duration-300 group-hover:text-gold">
          {pathPosition && pathTotal
            ? `${pathPosition} of ${pathTotal} · ${lesson.module}`
            : lesson.module}
        </span>
        <div className="flex items-center gap-3">
          {isUpNext && !complete && (
            <span
              className="border border-gold px-2.5 py-1 text-[0.55rem] uppercase tracking-[0.3em] text-gold"
              aria-label="This is the next lesson in your path"
            >
              <span aria-hidden className="mr-1">
                ✦
              </span>
              Up next
            </span>
          )}
          {complete ? (
            <span className="text-[0.58rem] uppercase tracking-[0.3em] text-gold">
              ✓ Complete
            </span>
          ) : answeredCount > 0 ? (
            <span className="text-[0.58rem] uppercase tracking-[0.3em] text-text-body">
              {progress}
            </span>
          ) : null}
        </div>
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
