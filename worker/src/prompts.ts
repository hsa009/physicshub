

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

export interface ChatMessage {
  role: "student" | "tutor";
  content: string;
}

export interface ChatInput {
  lesson: string;
  question: string;
  studentAnswer: string;
  previousFeedback: string;
  history: ChatMessage[];
  followup: string;
}

export function chatPrompt(input: ChatInput): string {
  const historyBlock =
    input.history.length > 0
      ? `\nConversation so far:\n${input.history
          .map(
            (m) =>
              `${m.role === "student" ? "Student" : "Tutor"}: ${m.content}`
          )
          .join("\n")}\n`
      : "";

  return `You are a physics tutor. The student is studying ${input.lesson} in Grade 11 Physics.
The question was: ${input.question}
The student's answer was: ${input.studentAnswer}
Your previous feedback was: ${input.previousFeedback}
${historyBlock}
The student now asks: ${input.followup}

Answer clearly at a Grade 11 level. Use examples if helpful. Keep your response under 200 words.`;
}

export interface AskSlideInput {
  lessonName: string;
  moduleName: string;
  slide: {
    title: string;
    body: string;
    formula?: { label: string; expression: string };
  };
  history: ChatMessage[];
  question: string;
}

export function askSlidePrompt(input: AskSlideInput): string {
  const formulaBlock = input.slide.formula
    ? `\nKey formula on the slide: ${input.slide.formula.label} — ${input.slide.formula.expression}`
    : "";

  const cleanBody = input.slide.body.replace(/\*\*/g, "");

  const historyBlock =
    input.history.length > 0
      ? `\nConversation so far:\n${input.history
          .map(
            (m) =>
              `${m.role === "student" ? "Student" : "Tutor"}: ${m.content}`
          )
          .join("\n")}\n`
      : "";

  return `You are a patient, encouraging Grade 11 physics tutor.

The student is studying "${input.lessonName}" (${input.moduleName}) and is reading this slide right now:

## ${input.slide.title}
${cleanBody}${formulaBlock}

Rules:
- Help the student UNDERSTAND. Do not solve the lesson's graded questions for them.
- If they ask about a graded question, ask a guiding question instead and point them back to the slide.
- Build on the slide's vocabulary and examples. Do not introduce new topics that aren't on the slide.
- Keep each response to 1-3 short paragraphs (max ~90 words). Be concise.
- Use **bold** for key physics terms when you introduce them.
- No emojis. No filler. No "Great question!" openers.
- If the student asks something off-topic, gently redirect to the current slide.
- The student is reading in English. Respond in English.${historyBlock}
Student's latest question: ${input.question}

Your reply:`;
}

export interface PracticeInput {
  lessonName: string;
  moduleName: string;
  slideTitles: string[];
  sampleQuestionPrompts: string[];
}

export function practicePrompt(input: PracticeInput): string {
  const slidesBlock = input.slideTitles.length
    ? input.slideTitles.map((t, i) => `${i + 1}. ${t}`).join("\n")
    : "(no slides on file)";

  const samplesBlock = input.sampleQuestionPrompts.length
    ? input.sampleQuestionPrompts
        .slice(0, 2)
        .map((q, i) => `${i + 1}. ${q}`)
        .join("\n")
    : "(no sample questions on file)";

  return `You are a Grade 11 physics teacher writing brand-new practice questions for a student.

Lesson: ${input.lessonName} (${input.moduleName})

The student has just read these slides:
${slidesBlock}

For STYLE and DIFFICULTY reference, here are 2 existing questions from this lesson:
${samplesBlock}

Write 3 NEW practice questions that:
- Are DIFFERENT from the reference questions above.
- Match the Grade 11 NGSS / McGraw-Hill style (concrete, real-world, answerable in 2-4 sentences).
- Mix types: at least 1 conceptual AND at least 1 numerical.
- Numerical questions must be solvable with the formulas taught on the slides.
- Use realistic numbers (masses in kg, distances in m, times in s, etc.).
- Never reference images, tables, or figures ("the picture above", "as shown", etc.).

Return ONLY a JSON object (no markdown fences, no prose):
{
  "questions": [
    { "type": "conceptual" | "numerical", "prompt": "<the question text>" }
  ]
}

Constraints:
- Exactly 3 questions.
- \`type\` must be "conceptual" or "numerical".
- No extra keys. No commentary. JSON only.`;
}
