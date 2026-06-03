-- 001_create_students.sql
-- Student identity is keyed by the ESIS number (school-issued student ID).
-- No name, no email, no password.

create extension if not exists "pgcrypto";

create table if not exists public.students (
  esis        text primary key,
  first_seen  timestamp with time zone not null default now(),
  last_active timestamp with time zone not null default now()
);

create index if not exists students_last_active_idx
  on public.students (last_active desc);
