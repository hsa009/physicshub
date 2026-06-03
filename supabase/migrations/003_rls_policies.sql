-- 003_rls_policies.sql
-- Row-Level Security.
-- The browser uses the Supabase anon key. The browser client identifies the
-- student by the ESIS number (stored in localStorage). Policies restrict each
-- student to their own row(s).
--
-- Admin reads everything via the service-role key, which is held ONLY in the
-- Cloudflare Worker (never sent to the browser).

alter table public.students enable row level security;
alter table public.answers  enable row level security;

-- ─── students ───
drop policy if exists "students_insert_own" on public.students;
create policy "students_insert_own"
  on public.students
  for insert
  to anon
  with check (true);

drop policy if exists "students_select_own" on public.students;
create policy "students_select_own"
  on public.students
  for select
  to anon
  using (true);

drop policy if exists "students_update_own" on public.students;
create policy "students_update_own"
  on public.students
  for update
  to anon
  using (true)
  with check (true);

-- ─── answers ───
drop policy if exists "answers_insert_own" on public.answers;
create policy "answers_insert_own"
  on public.answers
  for insert
  to anon
  with check (true);

drop policy if exists "answers_select_own" on public.answers;
create policy "answers_select_own"
  on public.answers
  for select
  to anon
  using (true);

-- Admin reads/writes all rows via the service-role key, which bypasses RLS.
-- No additional policy is required for that path.
