/**
 * Prompt templates for the AI calls.
 *
 * The "check" prompt asks for a structured response (Verdict / Feedback).
 * The "explain" prompt asks for a JSON object so the Worker can pass it
 * through to the frontend without re-parsing.
 */

export interface CheckInput {
  lesson: string;
  module: string;
  question: string;
  answer: string;
}

export function checkPrompt(input: CheckInput): string {
  return `You are a physics teacher assistant for Grade 11 NGSS / McGrawHill Physics.
Curriculum: Semester 2 — Modules 6 to 10.
Lesson: ${input.lesson} (${input.module})

Question: ${input.question}

Student's answer: ${input.answer}

Check if the student's answer is correct. Be encouraging but accurate.

Respond in EXACTLY this format (no extra prose before or after):
Verdict: correct | partial | incorrect
Feedback: <2-4 sentences explaining what is right or wrong, and the correct approach if needed. Show the correct formula or calculation if the student erred.>`;
}

export interface ExplainInput {
  lesson: string;
  module: string;
  questionPrompts: string[];
}

export function explainPrompt(input: ExplainInput): string {
  return `You are a physics teacher preparing a concise revision sheet for Grade 11 students.
Lesson: ${input.lesson} (${input.module})

The lesson's questions are:
${input.questionPrompts.map((q, i) => `${i + 1}. ${q}`).join("\n")}

Produce a short explanation that would help a student answer these questions.

Return ONLY a JSON object (no markdown fences, no prose) with this exact shape:
{
  "concepts": ["<concept 1>", "<concept 2>", "<concept 3>"],
  "formulas": [
    { "name": "<short name>", "equation": "<equation>", "variables": "<what each variable means>" }
  ],
  "example": "<one real-life example in 1-2 sentences>"
}

Constraints:
- 3 to 5 concepts (short noun phrases, not full sentences).
- 2 to 4 formulas. Use plain text for equations (e.g. "F = m·a"), not LaTeX.
- Example should be concrete and relatable.
- No extra keys. No commentary. JSON only.`;
}

export interface ChatInput {
  lesson: string;
  question: string;
  studentAnswer: string;
  previousFeedback: string;
  followup: string;
}

export function chatPrompt(input: ChatInput): string {
  return `You are a physics tutor. The student is studying ${input.lesson} in Grade 11 Physics.
The question was: ${input.question}
The student's answer was: ${input.studentAnswer}
Your previous feedback was: ${input.previousFeedback}

The student now asks: ${input.followup}

Answer clearly at a Grade 11 level. Use examples if helpful. Keep your response under 200 words.`;
}
