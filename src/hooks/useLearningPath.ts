

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
  
  position: number;
  
  total: number;
  
  lesson: LessonWithSlides;
  
  isCompleted: boolean;
  
  answeredCount: number;
  
  questionCount: number;
}

export interface LearningPath {
  
  path: PathEntry[];
  
  currentLessonId: string | undefined;
  
  getNextLessonId: (lessonId: string) => string | undefined;
  
  getPreviousLessonId: (lessonId: string) => string | undefined;
  
  getPosition: (lessonId: string) => number;
  
  total: number;
  
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
  }, [counts, isLoading]);
}

export function isLessonComplete(
  lesson: LessonWithSlides,
  counts: LessonCount[] | undefined,
): boolean {
  const answered = lookupAnswered(counts, lesson.module, lesson.name);
  return lesson.questionIds.length > 0 && answered >= lesson.questionIds.length;
}
