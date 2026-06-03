/**
 * useAnswers — fetch and save answers for the current student.
 *
 * The lesson view calls useAnswers(module, lesson) to load prior verdicts.
 * Saving happens via saveAnswer() which invalidates the matching queries.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useStudent } from "./useStudent";
import { supabase } from "../lib/supabase";
import type { Answer, Verdict } from "../types";

export interface SaveAnswerInput {
  questionId: string;
  module: string;
  lesson: string;
  studentAnswer: string;
  verdict: Verdict;
  feedback: string;
}

async function fetchAnswers(
  esis: string,
  module: string,
  lesson: string
): Promise<Answer[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("answers")
    .select("*")
    .eq("esis", esis)
    .eq("module", module)
    .eq("lesson", lesson)
    .order("submitted_at", { ascending: false });

  if (error) throw new Error(`Could not load answers: ${error.message}`);
  return (data ?? []) as Answer[];
}

async function insertAnswer(
  esis: string,
  input: SaveAnswerInput
): Promise<Answer> {
  if (!supabase) {
    throw new Error("Supabase is not configured; cannot save answer.");
  }
  const { data, error } = await supabase
    .from("answers")
    .insert({
      esis,
      question_id: input.questionId,
      module: input.module,
      lesson: input.lesson,
      student_answer: input.studentAnswer,
      ai_verdict: input.verdict,
      ai_feedback: input.feedback,
    })
    .select()
    .single();
  if (error) throw new Error(`Could not save answer: ${error.message}`);
  return data as Answer;
}

export function useAnswers(module: string, lesson: string) {
  const { student } = useStudent();
  return useQuery({
    queryKey: ["answers", student?.esis, module, lesson],
    queryFn: () => fetchAnswers(student!.esis, module, lesson),
    enabled: Boolean(student?.esis),
    staleTime: 1000 * 30,
  });
}

export function useSaveAnswer() {
  const { student } = useStudent();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveAnswerInput) => {
      if (!student) throw new Error("No student signed in.");
      return insertAnswer(student.esis, input);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["answers", student?.esis, vars.module, vars.lesson] });
      qc.invalidateQueries({ queryKey: ["answered-counts", student?.esis] });
    },
  });
}

/** Most recent answer for a given question_id in the loaded list. */
export function latestFor(
  answers: Answer[] | undefined,
  questionId: string
): Answer | undefined {
  if (!answers) return undefined;
  return answers.find((a) => a.question_id === questionId);
}
