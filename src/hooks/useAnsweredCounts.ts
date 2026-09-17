

import { useQuery } from "@tanstack/react-query";
import { useStudent } from "./useStudent";
import { supabase } from "../lib/supabase";

export interface LessonCount {
  module: string;
  lesson: string;
  answered: number;
}

async function fetchCounts(esis: string): Promise<LessonCount[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("answers")
    .select("lesson, module, question_id")
    .eq("esis", esis);

  if (error) throw new Error(`Could not load progress: ${error.message}`);

  const map = new Map<string, LessonCount>();
  for (const row of data ?? []) {
    const key = `${row.module}::${row.lesson}`;
    const existing = map.get(key);
    if (existing) {
      existing.answered += 1;
    } else {
      map.set(key, {
        module: row.module,
        lesson: row.lesson,
        answered: 1,
      });
    }
  }
  return [...map.values()];
}

export function useAnsweredCounts() {
  const { student } = useStudent();
  return useQuery({
    queryKey: ["answered-counts", student?.esis],
    queryFn: () => fetchCounts(student!.esis),
    enabled: Boolean(student?.esis),
    staleTime: 1000 * 30,
  });
}

export function countFor(
  counts: LessonCount[] | undefined,
  module: string,
  lesson: string
): number {
  if (!counts) return 0;
  return counts.find((c) => c.module === module && c.lesson === lesson)?.answered ?? 0;
}
