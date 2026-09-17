

import { allLessons, getLessonById } from "./lessons";
import type { LessonWithSlides } from "../types";

export const learningPath: readonly string[] = [
  "projectile-motion",
  "relative-velocity",
  "gravitation",
  "describing-rotation",
  "rotational-dynamics",
  "impulse-momentum",
  "conservation-momentum",
  "work-energy",
  "energy-conservation",
];

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

export function getPathLessons(): LessonWithSlides[] {
  const out: LessonWithSlides[] = [];
  for (const id of learningPath) {
    const lesson = getLessonById(id);
    if (lesson) out.push(lesson);
  }
  return out;
}

export function getQuestionCount(lessonId: string): number {
  const lesson = getLessonById(lessonId);
  if (!lesson) return 0;
  return lesson.questionIds.length;
}

export function assertPathValid(): void {
  for (const id of learningPath) {
    if (!getLessonById(id)) {
      console.warn(`[learning-path] lesson id not found: ${id}`);
    }
  }
  if (learningPath.length !== allLessons.length) {
    console.warn(
      `[learning-path] path has ${learningPath.length} lessons but lessons.json has ${allLessons.length}`,
    );
  }
}
