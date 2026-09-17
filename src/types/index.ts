

export type QuestionType = "conceptual" | "numerical";

export interface Question {
  id: string;
  number: number;
  module: string;
  lesson: string;
  type: QuestionType;
  prompt: string;
}

export interface Lesson {
  module: string;
  name: string;
  questionCount: number;
  questionIds: string[];
}

export interface QuestionBank {
  questions: Question[];
  lessons: Lesson[];
}

export type Verdict = "correct" | "partial" | "incorrect";

export interface Answer {
  id: string;
  esis: string;
  question_id: string;
  lesson: string;
  module: string;
  student_answer: string;
  ai_verdict: Verdict;
  ai_feedback: string;
  submitted_at: string;
}

export type SlideSource = "manual" | "docx" | "ai";

export interface ImageRef {
  
  src: string;
  alt: string;
  caption?: string;
}

export interface FormulaRef {
  label: string;
  expression: string;
}

export interface Slide {
  id: string;
  title: string;
  
  body: string;
  image?: ImageRef;
  formula?: FormulaRef;
  source: SlideSource;
}

export interface LessonWithSlides {
  
  id: string;
  module: string;
  name: string;
  
  accentWord: string;
  
  description: string;
  slides: Slide[];
  questionIds: string[];
  
  questionCount: number;
}

export interface LessonsFile {
  lessons: LessonWithSlides[];
}

export interface QuestionImageMap {
  [questionId: string]: {
    src: string;
    alt: string;
  } | null;
}

export interface QuestionImagesFile {
  generated_at: string;
  total: number;
  images: Record<string, { src: string; alt: string }>;
}
