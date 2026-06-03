/**
 * useLearningPath — exposes the recommended path + completion state.
 *
 * M5.9: drives the Home grid ordering, the "Up next" badge, the
 * "Next Lesson" CTA, and the All-Done celebration.
 *
 * "Completed" is defined as: every question in the lesson has at least
 * one answer saved (right or wrong). The legacy `LessonCard.complete`
 * flag used the same definition via `answeredCount >= questionCount`.
 *
 * This hook is reactive: it re-derives from `useAnsweredCounts` so
 * navigating to a question, answering it, and returning to Home shows
 * the new "Complete" / "Up next" state automatically (TanStack Query
 * invalidates the answered-counts query on save).
 */

import { useMemo } from "react";
import { useAnsweredCounts, type LessonCount } from "./useAnsweredCounts";
import {
  getNextLessonId,
  getPathPosition,
  getQuestionCount,
  learningPath,
  pathTotal,
} from "../data/learning-path";
import { getLessonById } from "../data/lessons";
import type { LessonWithSlides } from "../types";

export interface PathEntry {
  /** 1-based position in the path (1 = first lesson, 9 = last). */
  position: number;
  /** Total number of lessons in the path. */
  total: number;
  /** The lesson itself. */
  lesson: LessonWithSlides;
  /** True when every question in the lesson has at least one saved answer. */
  isCompleted: boolean;
  /** How many distinct questions have at least one saved answer. */
  answeredCount: number;
  /** Total questions in the lesson. */
  questionCount: number;
}

export interface LearningPath {
  /** Ordered entries, one per lesson in the path. */
  path: PathEntry[];
  /** The first lesson in the path that is not yet completed (or undefined if all done). */
  currentLessonId: string | undefined;
  /** The id of the next lesson after the given one, or undefined if last. */
  getNextLessonId: (lessonId: string) => string | undefined;
  /** The id of the previous lesson before the given one, or undefined if first. */
  getPreviousLessonId: (lessonId: string) => string | undefined;
  /** 1-based position of the given lesson id in the path (0 if not in path). */
  getPosition: (lessonId: string) => number;
  /** Total lessons in the path. */
  total: number;
  /** Number of completed lessons. */
  completedCount: number;
}

function lookupAnswered(
  counts: LessonCount[] | undefined,
  module: string,
  name: string,
): number {
  if (!counts) return 0;
  return (
    counts.find((c) => c.module === module && c.lesson === name)?.answered ?? 0
  );
}

export function useLearningPath(): LearningPath {
  const { data: counts, isLoading } = useAnsweredCounts();

  return useMemo<LearningPath>(() => {
    const entries: PathEntry[] = [];
    let completed = 0;
    let currentLessonId: string | undefined;

    for (let i = 0; i < learningPath.length; i++) {
      const id = learningPath[i];
      const lesson = getLessonById(id);
      if (!lesson) continue;
      const questionCount = getQuestionCount(id);
      const answeredCount = lookupAnswered(counts, lesson.module, lesson.name);
      const isCompleted =
        questionCount > 0 && answeredCount >= questionCount;
      if (isCompleted) completed += 1;
      if (!isCompleted && currentLessonId === undefined) {
        currentLessonId = id;
      }
      entries.push({
        position: i + 1,
        total: pathTotal,
        lesson,
        isCompleted,
        answeredCount,
        questionCount,
      });
    }

    return {
      path: entries,
      currentLessonId,
      getNextLessonId,
      getPreviousLessonId: (id) => {
        const idx = learningPath.indexOf(id);
        if (idx <= 0) return undefined;
        return learningPath[idx - 1];
      },
      getPosition: (id) => getPathPosition(id),
      total: pathTotal,
      completedCount: completed,
    };
    // isLoading is exposed for callers that want to defer the badge; not
    // a real dependency of the computed result (it just means counts=[]).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counts, isLoading]);
}

/**
 * Lightweight helper for non-hook consumers: a lesson is complete when
 * every question has at least one saved answer. Use this in components
 * that already have the answered counts in scope.
 */
export function isLessonComplete(
  lesson: LessonWithSlides,
  counts: LessonCount[] | undefined,
): boolean {
  const answered = lookupAnswered(counts, lesson.module, lesson.name);
  return lesson.questionIds.length > 0 && answered >= lesson.questionIds.length;
}
