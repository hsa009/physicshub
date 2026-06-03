/**
 * lessons — typed access to the curated lessons data (M5.2).
 *
 * Each lesson has a stable `id` (URL slug), the legacy `module` / `name`
 * fields from questions.json, an `accentWord` for italic-gold styling, a
 * short description for the home card, an ordered list of `slides` that
 * the M5.3 LessonPager walks through, and the question IDs that the
 * original LessonView renders afterwards.
 */

import data from "../data/lessons.json";
import questionsData from "../data/questions.json";
import type {
  LessonsFile,
  LessonWithSlides,
  QuestionImageMap,
} from "../types";

export const lessonsFile: LessonsFile = data as LessonsFile;

export const allLessons: LessonWithSlides[] = lessonsFile.lessons;

export const lessonById: Map<string, LessonWithSlides> = new Map(
  allLessons.map((l) => [l.id, l]),
);

export const lessonIdByModuleName: Map<string, string> = new Map(
  allLessons.map((l) => [`${l.module}::${l.name}`, l.id]),
);

export function getLessonById(id: string): LessonWithSlides | undefined {
  return lessonById.get(id);
}

export function getLessonIdByModuleName(
  module: string,
  name: string,
): string | undefined {
  return lessonIdByModuleName.get(`${module}::${name}`);
}

export function getLessonsForModule(module: string): LessonWithSlides[] {
  return allLessons.filter((l) => l.module === module);
}

export function getSlideById(
  lessonId: string,
  slideId: string,
): LessonWithSlides["slides"][number] | undefined {
  return getLessonById(lessonId)?.slides.find((s) => s.id === slideId);
}

/* ------------------------------------------------------------------ */
/* Question-image map (M5.6 input)                                     */
/* ------------------------------------------------------------------ */

import questionImagesRaw from "../data/question-images.json";

const questionImagesData = questionImagesRaw as {
  _meta?: unknown;
  [questionId: string]: { src: string; alt: string } | unknown | null;
};

export const questionImageMap: QuestionImageMap = (() => {
  const out: QuestionImageMap = {};
  for (const [key, value] of Object.entries(questionImagesData)) {
    if (key.startsWith("_")) continue;
    if (
      value &&
      typeof value === "object" &&
      "src" in value &&
      "alt" in value &&
      typeof (value as { src: unknown }).src === "string" &&
      typeof (value as { alt: unknown }).alt === "string"
    ) {
      const v = value as { src: string; alt: string };
      out[key] = { src: v.src, alt: v.alt };
    } else {
      out[key] = null;
    }
  }
  return out;
})();

export function getQuestionImage(
  questionId: string,
): { src: string; alt: string } | null {
  return questionImageMap[questionId] ?? null;
}

/* ------------------------------------------------------------------ */
/* Re-export the question bank for backward compat                    */
/* ------------------------------------------------------------------ */

import type { Question, Lesson as LegacyLesson, QuestionBank } from "../types";
export const questionBank: QuestionBank = questionsData as QuestionBank;
export const allQuestions: Question[] = questionBank.questions;
export const allLegacyLessons: LegacyLesson[] = questionBank.lessons;

export function getQuestion(id: string): Question | undefined {
  return questionBank.questions.find((q) => q.id === id);
}

export function getQuestionsForLesson(module: string, name: string): Question[] {
  const legacy = questionBank.lessons.find(
    (l) => l.module === module && l.name === name,
  );
  if (!legacy) return [];
  const byId = new Map(questionBank.questions.map((q) => [q.id, q]));
  return legacy.questionIds
    .map((id) => byId.get(id))
    .filter((q): q is Question => Boolean(q));
}

export function getLesson(module: string, name: string): LegacyLesson | undefined {
  return questionBank.lessons.find(
    (l) => l.module === module && l.name === name,
  );
}
