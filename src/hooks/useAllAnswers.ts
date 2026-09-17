

import { useQuery } from "@tanstack/react-query";
import { useStudent } from "./useStudent";
import { supabase } from "../lib/supabase";
import type { Answer } from "../types";

async function fetchAllAnswers(esis: string): Promise<Answer[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("answers")
    .select("*")
    .eq("esis", esis)
    .order("submitted_at", { ascending: false });

  if (error) throw new Error(`Could not load answers: ${error.message}`);
  return (data ?? []) as Answer[];
}

export function useAllAnswers() {
  const { student } = useStudent();
  return useQuery({
    queryKey: ["answers", "all", student?.esis],
    queryFn: () => fetchAllAnswers(student!.esis),
    enabled: Boolean(student?.esis),
    staleTime: 1000 * 30,
  });
}
