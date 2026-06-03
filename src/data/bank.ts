/**
 * questionBank — typed access to the extracted questions.
 * Importing the JSON directly gives us full type safety + tree-shaking.
 */

import data from "../data/questions.json";
import type { QuestionBank } from "../types";

export const questionBank: QuestionBank = data as QuestionBank;

export function getQuestion(id: string): QuestionBank["questions"][number] | undefined {
  return questionBank.questions.find((q) => q.id === id);
}

export function getLesson(module: string, name: string) {
  return questionBank.lessons.find(
    (l) => l.module === module && l.name === name
  );
}

export function getQuestionsForLesson(module: string, name: string) {
  const lesson = getLesson(module, name);
  if (!lesson) return [];
  const byId = new Map(questionBank.questions.map((q) => [q.id, q]));
  return lesson.questionIds
    .map((id) => byId.get(id))
    .filter((q): q is NonNullable<typeof q> => Boolean(q));
}
