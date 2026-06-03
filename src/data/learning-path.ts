/**
 * learning-path — the recommended order lessons should be completed in.
 *
 * M5.9 introduces a linear learning path so students move through the
 * curriculum in the order it was taught. The path is BY MODULE NUMBER
 * (Module 6 → 7 → 8 → 9 → 10), then by canonical position within each
 * module as defined in `lessons.json`.
 *
 * The path is purely a presentation/UX concern. All data is still keyed
 * by `lesson.id`; the path is the recommended sequence, not a hard
 * constraint. Students can navigate to any lesson by URL or by clicking
 * a card — the path just gives the Home grid a clear order and exposes
 * a "Next Lesson" CTA at the end of each lesson.
 */

import { allLessons, getLessonById } from "./lessons";
import type { LessonWithSlides } from "../types";

/**
 * Ordered lesson ids, top to bottom, left to right on the Home grid.
 * 1-based position = `pathPosition = index + 1`.
 */
export const learningPath: readonly string[] = [
  "projectile-motion", // Module 6
  "relative-velocity", // Module 6
  "gravitation", // Module 7
  "describing-rotation", // Module 8
  "rotational-dynamics", // Module 8
  "impulse-momentum", // Module 9
  "conservation-momentum", // Module 9
  "work-energy", // Module 10
  "energy-conservation", // Module 10
];

/** Total lessons in the path (kept as a constant for the hero progress bar). */
export const pathTotal: number = learningPath.length;

export function getLessonAtPathPosition(position: number): LessonWithSlides | undefined {
  const id = learningPath[position - 1];
  return id ? getLessonById(id) : undefined;
}

export function getPathPosition(lessonId: string): number {
  const idx = learningPath.indexOf(lessonId);
  return idx < 0 ? 0 : idx + 1;
}

export function getNextLessonId(lessonId: string): string | undefined {
  const idx = learningPath.indexOf(lessonId);
  if (idx < 0) return undefined;
  return learningPath[idx + 1];
}

export function getPreviousLessonId(lessonId: string): string | undefined {
  const idx = learningPath.indexOf(lessonId);
  if (idx <= 0) return undefined;
  return learningPath[idx - 1];
}

/**
 * Return the lessons in the order they should appear on the Home grid.
 * Unknown ids (e.g. legacy lessons not in `lessons.json`) are filtered
 * out so the grid only ever shows the canonical 9.
 */
export function getPathLessons(): LessonWithSlides[] {
  const out: LessonWithSlides[] = [];
  for (const id of learningPath) {
    const lesson = getLessonById(id);
    if (lesson) out.push(lesson);
  }
  return out;
}

/**
 * The legacy `questionCount` we read off `questionBank.lessons` in
 * `Home.tsx` and `LessonCard.tsx` is keyed by `(module, name)`. Expose
 * a quick lookup so the hook can use it without duplicating the join.
 */
export function getQuestionCount(lessonId: string): number {
  const lesson = getLessonById(lessonId);
  if (!lesson) return 0;
  return lesson.questionIds.length;
}

/**
 * Sanity check used in dev only — ensure every id in `learningPath`
 * resolves to a real lesson. Logs a console warning if not.
 */
export function assertPathValid(): void {
  for (const id of learningPath) {
    if (!getLessonById(id)) {
      // eslint-disable-next-line no-console
      console.warn(`[learning-path] lesson id not found: ${id}`);
    }
  }
  if (learningPath.length !== allLessons.length) {
    // eslint-disable-next-line no-console
    console.warn(
      `[learning-path] path has ${learningPath.length} lessons but lessons.json has ${allLessons.length}`,
    );
  }
}
