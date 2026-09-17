#!/usr/bin/env node

import mammoth from "mammoth";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DOCX = resolve(__dirname, "..", "Grade11_Physics_Final_Revision.docx");
const OUT = resolve(__dirname, "..", "src", "data", "questions.json");

const LESSON_MAP = {
  "1-7":   { module: "Module 7",  lesson: "Universal Gravitation" },
  "8-13":  { module: "Module 6",  lesson: "Projectile Motion" },
  "14-18": { module: "Module 6",  lesson: "Relative Velocity" },
  "19-25": { module: "Module 8",  lesson: "Describing Rotational Motion" },
  "26-32": { module: "Module 8",  lesson: "Rotational Dynamics" },
  "33-40": { module: "Module 9",  lesson: "Impulse and Momentum" },
  "41-46": { module: "Module 9",  lesson: "Conservation of Momentum" },
  "47-53": { module: "Module 10", lesson: "Work and Energy" },
  "54-60": { module: "Module 10", lesson: "Energy Forms and Conservation" },
};

const LESSON_HEADERS = new Set(
  Object.values(LESSON_MAP).map((l) => l.lesson)
);

function lookupLesson(num) {
  for (const [range, info] of Object.entries(LESSON_MAP)) {
    const [lo, hi] = range.split("-").map(Number);
    if (num >= lo && num <= hi) return info;
  }
  throw new Error(`No lesson mapping for question ${num}`);
}

const NUMERICAL_VERBS = [
  "Calculate",
  "Determine",
  "Find",
  "Compute",
  "Convert",
  "How many",
  "How much",
];

function classifyType(prompt) {
  const head = prompt.slice(0, 300);
  for (const v of NUMERICAL_VERBS) {
    if (new RegExp(`\\b${v}\\b`, "i").test(head)) return "numerical";
  }
  return "conceptual";
}

function cleanText(raw) {
  return raw
    .replace(/^\d+\.\s+/, "")
    .replace(/[…\.]{20,}/g, "")
    .replace(/\bQ\s*\d+\b\.?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isHeaderLine(line) {
  const t = line.trim();
  if (t.length < 3 || t.length > 60) return false;
  if (/^\d+\.\s+/.test(t)) return false;
  if (/[.!?]\s*$/.test(t)) return false;
  return true;
}

async function extract() {
  console.log(`Reading ${DOCX} …`);
  const { value } = await mammoth.extractRawText({ path: DOCX });
  const lines = value.split("\n");

  const starts = new Map();
  const re = /^(\d+)\.\s+/;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(re);
    if (m) {
      const n = Number(m[1]);
      if (n >= 1 && n <= 60) starts.set(n, i);
    }
  }

  if (starts.size !== 60) {
    const found = [...starts.keys()].sort((a, b) => a - b);
    const missing = [];
    for (let n = 1; n <= 60; n++) if (!starts.has(n)) missing.push(n);
    throw new Error(
      `Expected 60 questions, found ${starts.size}. Missing: ${missing.join(", ")}. Found: ${found.join(", ")}`
    );
  }

  const questions = [];
  for (let n = 1; n <= 60; n++) {
    const start = starts.get(n);
    const end = starts.has(n + 1) ? starts.get(n + 1) : lines.length;
    const block = lines.slice(start, end).filter(
      (l) => !LESSON_HEADERS.has(l.trim()) && !isHeaderLine(l)
    );
    const raw = block.join("\n");
    const prompt = cleanText(raw);
    if (!prompt) throw new Error(`Question ${n} has empty prompt after cleaning.`);
    const { module, lesson } = lookupLesson(n);
    questions.push({
      id: `q${n}`,
      number: n,
      module,
      lesson,
      type: classifyType(prompt),
      prompt,
    });
  }

  const lessonOrder = [
    ["Module 6",  "Projectile Motion"],
    ["Module 6",  "Relative Velocity"],
    ["Module 7",  "Universal Gravitation"],
    ["Module 8",  "Describing Rotational Motion"],
    ["Module 8",  "Rotational Dynamics"],
    ["Module 9",  "Impulse and Momentum"],
    ["Module 9",  "Conservation of Momentum"],
    ["Module 10", "Work and Energy"],
    ["Module 10", "Energy Forms and Conservation"],
  ];
  const lessons = lessonOrder.map(([module, name]) => {
    const qs = questions.filter((q) => q.module === module && q.lesson === name);
    return {
      module,
      name,
      questionCount: qs.length,
      questionIds: qs.map((q) => q.id),
    };
  });

  const out = { questions, lessons };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n", "utf8");

  const counts = { conceptual: 0, numerical: 0 };
  for (const q of questions) counts[q.type]++;
  console.log(`\nWrote ${OUT}`);
  console.log(`  total questions: ${questions.length}`);
  console.log(`  conceptual:      ${counts.conceptual}`);
  console.log(`  numerical:       ${counts.numerical}`);
  console.log(`  lessons:         ${lessons.length}`);
  for (const l of lessons) {
    console.log(`    ${l.module} — ${l.name} (${l.questionCount})`);
  }
}

extract().catch((err) => {
  console.error("Extraction failed:", err);
  process.exit(1);
});
