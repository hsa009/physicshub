

export type Verdict = "correct" | "partial" | "incorrect";

export interface ParsedCheck {
  verdict: Verdict;
  feedback: string;
}

export interface ParsedExplain {
  concepts: string[];
  formulas: { name: string; equation: string; variables: string }[];
  example: string;
}

export type PracticeType = "conceptual" | "numerical";

export interface PracticeQuestion {
  type: PracticeType;
  prompt: string;
}

export interface ParsedPractice {
  questions: PracticeQuestion[];
}

const VERDICT_RE = /\bverdict\s*[:\-]\s*(correct|partial|incorrect)\b/i;
const FEEDBACK_RE = /\bfeedback\s*[:\-]\s*([\s\S]+?)$/i;

export function parseCheckResponse(text: string): ParsedCheck {
  const verdictMatch = text.match(VERDICT_RE);
  const feedbackMatch = text.match(FEEDBACK_RE);

  const verdict = (verdictMatch?.[1]?.toLowerCase() ?? "partial") as Verdict;
  const feedback = (feedbackMatch?.[1] ?? text).trim();
  return { verdict, feedback };
}

export function parseExplainResponse(text: string): ParsedExplain {
  const fenced = text.match(/```(?:json)?\s*([\s\S]+?)\s*```/i);
  const candidate = fenced?.[1] ?? text;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const slice = candidate.slice(firstBrace, lastBrace + 1);
    try {
      const parsed = JSON.parse(slice);
      return {
        concepts: Array.isArray(parsed.concepts) ? parsed.concepts.map(String) : [],
        formulas: Array.isArray(parsed.formulas)
          ? parsed.formulas.map((f: Record<string, unknown>) => ({
              name: String(f.name ?? ""),
              equation: String(f.equation ?? ""),
              variables: String(f.variables ?? ""),
            }))
          : [],
        example: String(parsed.example ?? ""),
      };
    } catch {
    }
  }
  const lines = text
    .split("\n")
    .map((l) => l.replace(/^[-*•\s]+/, "").trim())
    .filter((l) => l.length > 0);
  return {
    concepts: lines.slice(0, 4),
    formulas: [],
    example: lines.slice(-2).join(" "),
  };
}

export function parsePracticeResponse(text: string): ParsedPractice {
  const fenced = text.match(/```(?:json)?\s*([\s\S]+?)\s*```/i);
  const candidate = fenced?.[1] ?? text;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const slice = candidate.slice(firstBrace, lastBrace + 1);
    try {
      const parsed = JSON.parse(slice);
      const raw: unknown[] = Array.isArray(parsed.questions) ? parsed.questions : [];
      const questions: PracticeQuestion[] = raw
        .map((item: unknown): PracticeQuestion | null => {
          const q = item as Record<string, unknown>;
          const prompt = String(q.prompt ?? "").trim();
          if (!prompt) return null;
          const t = String(q.type ?? "conceptual").toLowerCase();
          const type: PracticeType = t === "numerical" ? "numerical" : "conceptual";
          return { type, prompt };
        })
        .filter((q): q is PracticeQuestion => q !== null);
      if (questions.length > 0) return { questions };
    } catch {
    }
  }
  const lines = text
    .split("\n")
    .map((l) => l.replace(/^\s*\d+[.)]\s*/, "").trim())
    .filter((l) => l.length > 12);
  if (lines.length === 0) return { questions: [] };
  const questions: PracticeQuestion[] = lines.slice(0, 3).map((prompt) => {
    const type: PracticeType = /calculate|compute|find the|how (?:many|much)|determine|convert/i.test(
      prompt,
    )
      ? "numerical"
      : "conceptual";
    return { type, prompt };
  });
  return { questions };
}
