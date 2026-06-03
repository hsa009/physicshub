-- 002_create_answers.sql
-- Each row is one answer the student submitted for one question.
-- Latest answer per (esis, question_id) is the active one; older rows remain for history.

create extension if not exists "pgcrypto";

create table if not exists public.answers (
  id              uuid primary key default gen_random_uuid(),
  esis            text not null references public.students(esis) on delete cascade,
  question_id     text not null,
  lesson          text not null,
  module          text not null,
  student_answer  text not null,
  ai_verdict      text not null check (ai_verdict in ('correct', 'partial', 'incorrect')),
  ai_feedback     text not null,
  submitted_at    timestamp with time zone not null default now()
);

create index if not exists answers_esis_submitted_idx
  on public.answers (esis, submitted_at desc);

create index if not exists answers_question_idx
  on public.answers (question_id);

create index if not exists answers_lesson_idx
  on public.answers (lesson);
