# PhysicsHub — Project Plan & Tracker

> **Source of truth** for the build. Every plan item, decision, change, and fix is recorded here. Update this file as work progresses; check off boxes when items land.

---

## 1. Project Overview

PhysicsHub is a free, school-wide web platform for Grade 11 Physics revision (Semester 2, Modules 6–10). Students enter their **ESIS number** to access 8 lessons / 60 questions, receive AI-generated explanations, type their answers, and get instant feedback. Progress is tracked in Supabase by ESIS and follows the student across devices. A password-protected admin dashboard lets the teacher monitor all students.

Full spec lives in `PhysicsHub_Blueprint.text` (323 lines).

## 2. Tech Stack (locked)

| Layer | Choice |
|---|---|
| Frontend | Vite + React + TypeScript |
| Styling | Tailwind CSS + custom CSS variables (for theme tokens) |
| Routing | React Router |
| Server state | TanStack Query (React Query) |
| Database | Supabase (Postgres) with Row-Level Security |
| Backend / AI proxy | Cloudflare Worker (TypeScript + Wrangler) |
| AI — primary | Google Gemini 1.5 Flash (3–5 keys, rotation) |
| AI — fallback | Groq Llama 3.1 70B (2 keys) |
| Hosting | Cloudflare Pages (auto-deploy from GitHub) |

**Cost: $0** at the 500–1,000 student scale.

## 3. Repository Layout (single repo, no monorepo)

```
physicsproject/
├── src/                          # Vite + React app
│   ├── pages/                    # Welcome, Home, Lesson, Progress, Admin
│   ├── components/               # Reusable UI
│   ├── hooks/                    # useStudent, useAnswers, useExplain
│   ├── lib/                      # supabase client, api client
│   ├── styles/                   # index.css with Noir Luxe tokens
│   ├── types/                    # TypeScript types
│   ├── data/                     # questions.json (imported at build)
│   ├── App.tsx
│   └── main.tsx
├── data/
│   └── questions.json            # 60 extracted questions
├── worker/                       # Cloudflare Worker
│   ├── src/
│   │   ├── index.ts              # routes
│   │   ├── gemini.ts
│   │   ├── groq.ts
│   │   ├── rotation.ts
│   │   ├── prompts.ts
│   │   └── supabase-admin.ts     # service-role key
│   ├── wrangler.toml
│   ├── package.json
│   └── tsconfig.json
├── supabase/
│   └── migrations/
│       ├── 001_create_students.sql
│       ├── 002_create_answers.sql
│       └── 003_rls_policies.sql
├── scripts/
│   └── extract-questions.mjs     # docx → questions.json
├── docs/
│   ├── SETUP.md                  # accounts + env vars checklist
│   └── DEPLOY.md                 # deploy guide
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.cjs
├── package.json
├── wrangler.toml
├── .env.example
├── .gitignore
├── README.md
├── PhysicsHub_Blueprint.text
├── physicsproject_theme.html
└── PHYSICSHUB_PLAN.md            # this file
```

## 4. Theme: "Noir Luxe" (locked)

Reference: `physicsproject_theme.html`. Carry this design language into the app.

### Design tokens
- **Dark mode (default)**
  - `bg` `#0d0d0d`, `bg-card` `#111`, `bg-subtle` `#161616`
  - `border` `#1e1e1e`, `border-mid` `#2a2a2a`
  - `gold` `#c9a96e`, `gold-light` `#e2c896`, `gold-dim` `rgba(201,169,110,0.15)`
  - `text-primary` `#f0e6c8`, `text-body` `rgba(240,230,200,0.55)`, `text-label` `rgba(240,230,200,0.35)`
  - `nav-bg` `rgba(13,13,13,0.92)`
- **Light mode** (`[data-mode="light"]` on `<html>`)
  - `bg` `#f5f0e8`, `bg-card` `#faf6ef`, `bg-subtle` `#ede8df`
  - `border` `#ddd5c4`, `border-mid` `#ccc0a8`
  - `gold` `#8a5e2a`, `gold-light` `#6b4720`, `gold-dim` `rgba(138,94,42,0.1)`
  - `text-primary` `#1a140a`, `text-body` `rgba(26,20,10,0.6)`, `text-label` `rgba(26,20,10,0.38)`
  - `nav-bg` `rgba(245,240,232,0.93)`
- **Fonts**: Cormorant Garamond (display, italic accent words) + Outfit (body, 200–500)
- **Grain overlay**: SVG noise on `body::after`, opacity 0.025, z-index 999
- **Theme toggle**: 52×26 track, gold thumb, 0.4s cubic-bezier slide
- **Color transitions**: 0.5s ease on `background` and `color`

### Reusable component patterns
| Pattern | Use |
|---|---|
| `eyebrow` (uppercase, tracking 0.5em, text-gold, 0.6rem) | Section labels above titles |
| `section-title` (Cormorant, clamp(2rem, 3.5vw, 3.5rem), weight 300) | Page titles; italic gold on one accent word |
| `btn-primary` | Thin gold border, gold fill slides in on hover |
| `btn-ghost` | No border, label + `→` that translates right on hover |
| `.coll-grid` (1px border, items separated by hairline) | Lesson cards on Home |
| `.feature-item` (bordered card, gradient gold underline appears on hover) | Question cards on Lesson View |
| `.quote-section` (large translucent " ornament) | AI Explanation panel |
| `.fade-up` (0.7s ease, 24px translateY) | Scroll-in animation |
| Verdict badge | gold border + icon (✓ ⚠ ✗) — no green/red; subtle opacity for partial/incorrect |

### Italic-gold accent words
- **Logo**: "Physics *Hub*"
- **Welcome headline**: "Begin your *Revision*"
- **Page titles**: italic gold on the most important word (e.g. "Projectile *Motion*")

## 5. Database Schema

### `students` table
| Column | Type | Notes |
|---|---|---|
| `esis` | text | **Primary key** |
| `first_seen` | timestamp | default `now()` |
| `last_active` | timestamp | updated on every interaction |

### `answers` table
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `esis` | text | FK → `students.esis` |
| `question_id` | text | e.g. `"q11"` |
| `lesson` | text | e.g. `"Projectile Motion"` |
| `module` | text | e.g. `"Module 6"` |
| `student_answer` | text | full text |
| `ai_verdict` | text | `correct` / `partial` / `incorrect` |
| `ai_feedback` | text | AI explanation |
| `submitted_at` | timestamp | default `now()` |

### Row-Level Security
- `students`: anyone can `insert`; users can `select`/`update` their own row (filter by ESIS stored client-side)
- `answers`: anyone can `insert`; users can `select` their own rows
- Admin reads all rows via Supabase **service-role key** stored only in the Cloudflare Worker

## 6. AI Prompts

### Answer check
```
You are a physics teacher assistant for Grade 11 NGSS / McGrawHill Physics.
Curriculum: Semester 2 — Modules 6 to 10.
Lesson: [lesson]
Question: [text]
Student's answer: [text]

Check if the student's answer is correct.
Respond in this format:
- Verdict: correct | partial | incorrect
- Feedback: [2–4 sentences; show the correct formula/calculation if the student erred]
```

### Explain More
```
You are a physics tutor. The student is studying [lesson] in Grade 11 Physics.
Question: [text]
Student's answer: [text]
Your previous feedback: [text]

The student now asks: [follow-up]

Answer clearly at a Grade 11 level. Use examples if helpful.
```

## 7. Key Rotation Logic (inside the Worker)
```
try Gemini_1 → if 429 or 5xx → try Gemini_2 → ... → Gemini_5 → try Groq_1 → Groq_2 → 503
```
Per-key cooldown of 60s tracked in a Worker in-memory map.

## 8. Milestones

### Status legend
- `[ ]` not started · `[/]` in progress · `[x]` done · `[!]` blocked / needs user input

### Milestone 1 — Project Setup ✅ COMPLETE (code side; user-side items flagged below)
- [x] Initialize Vite + React + TypeScript in the project root
- [x] Install dependencies: tailwindcss, postcss, autoprefixer, react-router-dom, @tanstack/react-query, @supabase/supabase-js
- [x] Configure Tailwind to map CSS variables (`bg-bg`, `text-gold`, `border-border`, etc.)
- [x] Create `src/styles/index.css` with Noir Luxe design tokens, fonts, grain overlay, body base
- [x] Scaffold the `worker/` folder (Wrangler TypeScript project)
- [x] Write SQL migrations: `001_create_students.sql`, `002_create_answers.sql`, `003_rls_policies.sql`
- [x] Create `.env.example` and `wrangler.toml` with all env var placeholders
- [x] Write `docs/SETUP.md` — accounts to create (Supabase, Cloudflare, Gemini × 3–5, Groq × 2)
- [x] Verify: `npm run dev` shows a placeholder home page; `npm run build` succeeds; typecheck (`npm run lint`) passes
- [ ] Initialize Git repo, create `.gitignore`, push to GitHub *(awaiting user — needs GitHub account choice + remote URL)*
- [ ] Connect GitHub repo to Cloudflare Pages *(awaiting user — requires Cloudflare account + repo push first)*

### Milestone 2 — Content & Data Layer ✅ COMPLETE
- [x] Build `scripts/extract-questions.mjs` to parse `Grade11_Physics_Final_Revision.docx` → `src/data/questions.json`
- [x] Verify all 60 questions are extracted with correct `id`, `module`, `lesson`, `type`, `prompt`
- [x] Set up Supabase JS client in `src/lib/supabase.ts` (graceful no-config state, `isSupabaseConfigured` flag)
- [x] Build `useStudent()` hook + `StudentProvider` (loading/needs-entry/ready/error states, ESIS validation, localStorage persistence, last_active bump, signOut)
- [x] Build Welcome / ESIS Entry page (centered hero, radial gold glow, gold vertical accent, rotating ✦ ornament, eyebrow + section title with italic gold, gold-bordered input, `btn-primary` "Enter", error inline alert, three rendering modes: loading / setup-required / form)
- [x] Build minimal `Home` stub for the post-sign-in state (italic-gold accent, "Browse Lessons" ghost button, sign-out)
- [x] Wire `RootRouter` in `App.tsx` to switch between Welcome and Home based on student status
- [x] Add `src/vite-env.d.ts` with Vite client types
- [x] Verify: `npm run build` succeeds (405.75 kB JS / 11.43 kB CSS, gzipped 116.46 kB / 3.44 kB), `npm run lint` passes, dev server boots
- [ ] Test cross-device: enter ESIS on device A, on device B → same student record loads *(requires real Supabase project — gated on user creating one in SETUP.md)*

### Milestone 3 — Core Student Flow ✅ COMPLETE
- [x] Top nav (`src/components/Nav.tsx`): fixed 72px, backdrop-blur, Cormorant Garamond "Physics *Hub*" logo, NavLink with active-gold treatment, ESIS + sign-out inline, mobile hamburger, theme toggle
- [x] Home / lesson browser (`src/pages/Home.tsx`): hero header "Nine *Lessons* of Motion, Force & Energy", ✦ divider, search bar, 3-col `.coll-grid` of 9 lesson cards with progress counts
- [x] **Search feature** (per user request): filters by lesson name, module name, and question prompts in real time; shows match count; empty state with helpful copy
- [x] `useAnsweredCounts` hook: TanStack Query → Supabase, groups answers by `module::lesson`, exposes `countFor()` helper for the cards
- [x] `useAnswers` + `useSaveAnswer` hooks: per-lesson fetch, latest-answer helper, save with cache invalidation
- [x] Lesson View page (`src/pages/LessonView.tsx`): back link, eyebrow (module), italic-gold title, AI Explanation panel, question list
- [x] Question card (`src/components/QuestionCard.tsx`): type/number eyebrow, prompt, textarea, "Check My Answer" `btn-primary` with spinner, verdict badge (gold + ✓/⚠/✗), feedback box, "Try again" reset, "Explain More" button (M4 placeholder)
- [x] Cloudflare Worker: 5 modules (`index.ts`, `prompts.ts`, `gemini.ts`, `groq.ts`, `rotation.ts`, `parse.ts`, `mock.ts`)
  - [x] `POST /check` — Gemini → Groq rotation, returns `{ verdict, feedback }`, parses with `parseCheckResponse` (regex on "Verdict:" / "Feedback:")
  - [x] `POST /explain` — same rotation, JSON-mode prompt for `{ concepts, formulas, example }`, parsed by `parseExplainResponse` (fenced-JSON tolerant)
  - [x] `POST /chat` — follow-up endpoint (used in M4)
  - [x] `GET /health` — returns `{ ok, hasKeys }` so dev can tell if secrets are set
  - [x] Key rotation: 60s in-memory cooldowns per key, falls through to Groq when all Gemini are exhausted
  - [x] Mock mode: when no keys are configured, returns plausible canned responses prefixed `[mock — no Worker secrets configured]` so the UI is fully exercisable
- [x] Frontend API client (`src/lib/api.ts`): typed `check` / `explain` / `chat` helpers, structured `not configured` errors
- [x] CORS headers on every Worker response so the browser can call it cross-origin
- [x] Loading states: gold-ring spinner in the question card + sync indicator on the home grid
- [x] Error handling: inline error alerts in the form, friendly "AI not configured" notice, navigation guard via `RequireStudent`
- [x] Verify: `npm run build` (461 kB JS / 19.86 kB CSS, gzip 131.79 / 5.05), `npm run lint` clean, frontend dev boots in 151ms (HTTP 200 on `/` and `/lesson/Module%206/Projectile%20Motion`), Worker `wrangler dev` boots; `/health` returns 200; `/check` + `/explain` return 200 with mock responses

### Milestone 4 — Progress & "Explain More"
- [ ] `/progress` page: X/60 totals, per-module progress bars, list of answered questions clickable to review
- [ ] Lesson View reloads prior answers and shows verdict badges on question cards
- [ ] "Explain More" mini chat per question: `POST /chat` to Worker, full context, follow-up response
- [ ] Empty states, loading skeletons

### Milestone 5 — Admin Dashboard
- [ ] `/admin` route with password gate (env var in Worker, `sessionStorage` for session)
- [ ] Worker admin routes using service-role key:
  - [ ] `GET /admin/stats`
  - [ ] `GET /admin/question-analysis`
  - [ ] `GET /admin/student/:esis`
  - [ ] `GET /admin/answers?lesson=…`
  - [ ] `GET /admin/export.csv`
- [ ] Admin UI tabs: Overview, Question Analysis, Student Lookup, Answer Browser, Export
- [ ] Tables: thin border, gold uppercase headers, sortable columns
- [ ] CSV download buttons

### Milestone 6 — Polish & Launch
- [ ] Mobile responsiveness pass (test on iPhone SE, iPhone 14, iPad)
- [ ] Loading skeletons, error toasts, empty states everywhere
- [ ] Stress test: simulate 10 simultaneous `/check` calls, verify key rotation
- [ ] README with public URL
- [ ] Final Cloudflare Pages deploy
- [ ] Share link with school

## 9. Out-of-Band Tasks (user does these)

- [ ] Create Supabase project (free tier)
- [ ] Create Cloudflare account
- [ ] Create 3–5 Google Cloud projects / accounts, generate Gemini API keys
- [ ] Create 2 Groq Cloud accounts, generate API keys
- [ ] Provide values for: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_WORKER_URL`, `ADMIN_PASSWORD`, `SUPABASE_SERVICE_KEY` (in Worker), `GEMINI_KEY_1…5`, `GROQ_KEY_1…2`

## 10. Decisions Log (locked)

| # | Decision | Rationale |
|---|---|---|
| D1 | Vite + React + TypeScript | Best DX for SPA on Cloudflare Pages |
| D2 | Tailwind + custom CSS variables (not Tailwind `dark:` variant) | Keeps the `data-mode` theme pattern from the reference intact |
| D3 | Single repo, no monorepo | Project is small; Wrangler + Vite coexist fine |
| D4 | React Router over Next.js | Pure SPA, no SSR needed |
| D5 | TanStack Query for server state | Best for Supabase caching + refetching |
| D6 | Worker handles admin via service-role key | Service key never reaches the browser |
| D7 | Verdicts use gold + icon, not green/red | Stays on-palette with Noir Luxe |
| D8 | Italic-gold accent word in every major title | Brand consistency, mirrors the reference |
| D9 | Dark mode is default | Matches the reference; light mode is toggle-only |

## 11. Changes & Fixes Log

> Append every change, fix, deviation, or new decision here. **Newest at the top.**

| Date | Milestone | Change / Fix | By |
|---|---|---|---|
| 2026-06-03 | M0 | **AI provider overhaul: Gemini removed, OpenRouter added, per-key cooldown (commit `32a7070`).** Deleted `worker/src/gemini.ts`. Added `worker/src/openrouter.ts` (OpenAI-compatible, `meta-llama/llama-3.3-70b-instruct:free` model, `HTTP-Referer` + `X-Title` headers). Rewrote `worker/src/rotation.ts` — 2 providers (Groq primary, OpenRouter fallback), 3 keys per provider, per-key cooldown of 60s triggered by 429 or 403. Updated `wrangler.toml`, `docs/SETUP.md`, `worker/src/index.ts`, `worker/src/mock.ts` to drop Gemini references. Deleted orphan `GEMINI_KEY_1` from Cloudflare. Set `OPENROUTER_KEY_1` via `wrangler secret put`. Cooldown logic verified by stress test: when both providers rate-limited, the 2nd /check call correctly returned "All AI keys exhausted" with both keys marked cooling down — exactly the design. **Caveat:** Groq's 100k tokens/day free tier is tight; OpenRouter's free Llama 3.3 70B model is often throttled during peak hours. Need 1-2 more keys per provider for production resilience. | build |
| 2026-06-03 | M4.1 | **Button prominence upgrade (commit `1eac4b0`).** Three CSS tiers — `.btn-primary` (2px gold border, larger padding, subtle 3s attention pulse for the obvious primary CTA), `.btn-ghost` (now actually bordered/padded/bg-filled with text-primary — was 35% alpha text-only before), `.btn-soft` (new, for tertiary actions like "Try again" / "Send" / "Clear" / "Close" — bordered + padded but quiet). QuestionCard "Try again" → btn-soft + ↺ icon; "Explain More" → leading ✦ icon to mark it as the AI/chat action. ChatThread header (Clear, Close) and footer (Send) → btn-soft. Build: 472.23 kB JS / 22.31 kB CSS (gzip 134.14 / 5.53). Pages auto-rebuild verified: new bundle `/assets/index-DaCx0-cs.js` (472,732 B) + new CSS `/assets/index-D3mfEgP-.css` (22,309 B), Worker URL `revisionforyou-worker.o8673587.workers.dev` confirmed in bundle. | build |
| 2026-06-03 | Deploy | **Worker model name fix (commit `e903bb8`).** `gemini.ts`: `gemini-1.5-flash-latest` → `gemini-flash-latest` (1.5 Flash no longer in v1beta; new alias for the Flash family). `groq.ts`: `llama-3.1-70b-versatile` → `llama-3.3-70b-versatile` (the 1.1 70B was decommissioned 2025-01-24; 3.3 70B is the official stable replacement). With the dead Gemini key (403 PERMISSION_DENIED), the system runs on Groq alone. | deploy |
| 2026-06-03 | Deploy | **Live end-to-end verified.** Pages site `https://revisionforyou.pages.dev/` returns 200, bundle 472 kB. Supabase tables `students` (1 row, esis=569377) and `answers` (0 rows, schema valid) exist with RLS working. Worker `/check`, `/chat`, `/health` all return 200 with real AI responses. | deploy |
| 2026-06-03 | Deploy | **Worker secrets set (5/5).** ADMIN_PASSWORD, GEMINI_KEY_1, GROQ_KEY_1, SUPABASE_URL, SUPABASE_SERVICE_KEY. Gemini key is **permanently denied** (403 PERMISSION_DENIED — Google's project access revoked). System currently runs on Groq alone (14,400 req/day free tier). | deploy |
| 2026-06-03 | Deploy | **Worker renamed (commit `ac50112`).** `wrangler.toml`: `physicshub-worker` → `revisionforyou-worker` to align with the Pages project name. Worker URL: `https://revisionforyou-worker.o8673587.workers.dev`. | deploy |
| 2026-06-03 | Deploy | **GitHub push complete.** Repo: `reghaith/physicshub` (private, https://github.com/reghaith/physicshub). 54 files / 1 commit on `main` (d30d84c — "Initial commit: M1–M3 scaffold"). Removed stray `.DS_Store`. Set local git identity to `reghaith <198034675+reghaith@users.noreply.github.com>`. Initial push failed with HTTP 400 due to 14MB docx exceeding default `http.postBuffer`; fixed by setting `http.postBuffer=524288000` and retrying. | deploy |
| 2026-06-03 | Deploy | **GitHub push complete.** Repo: `reghaith/physicshub` (private, https://github.com/reghaith/physicshub). 54 files / 1 commit on `main` (d30d84c — "Initial commit: M1–M3 scaffold"). Removed stray `.DS_Store`. Set local git identity to `reghaith <198034675+reghaith@users.noreply.github.com>`. Initial push failed with HTTP 400 due to 14MB docx exceeding default `http.postBuffer`; fixed by setting `http.postBuffer=524288000` and retrying. | deploy |
| 2026-06-03 | Deploy | **Security note:** GitHub PAT was provided in chat. It is now stored in `.git/config` (remote URL) in plain text. User should revoke the token at https://github.com/settings/tokens and switch to a credential helper (`gh auth login` or `osxkeychain`) for future operations. | deploy |
| 2026-06-03 | M3 | Wrote top nav: fixed 72px, backdrop-blur, Cormorant "Physics *Hub*" logo, NavLink with active-gold, ESIS + sign-out inline, mobile hamburger, theme toggle. Created reusable `Logo`, `ThemeToggle`, `SearchBar`, `LessonCard`, `Spinner` components — all on-theme. | build |
| 2026-06-03 | M3 | Wrote `src/lib/api.ts` (typed Worker client: `check`, `explain`, `chat`) and `src/hooks/useAnsweredCounts.ts` + `useAnswers.ts` (TanStack Query wrappers around Supabase with cache invalidation on save). | build |
| 2026-06-03 | M3 | **Search feature per user request** — the Home search bar filters the 9-card grid by lesson name, module name, AND question prompts in real time; shows match count and an empty-state with a "try 'momentum'" hint. | build |
| 2026-06-03 | M3 | Refactored `App.tsx` to use proper React Router nested routes with a `<RequireStudent>` gate component that wraps all protected pages and falls back to `Welcome` until the student is "ready". | build |
| 2026-06-03 | M3 | Wrote `LessonView` page: back link, eyebrow, italic-gold title (auto-splits name and italicizes the last word), AI Explanation panel (loader → fetched content with Concepts / Formulas / Example sections), full question list. | build |
| 2026-06-03 | M3 | Wrote `QuestionCard` component: type eyebrow, prompt, textarea (auto-sized for numerical vs conceptual), "Check My Answer" button with spinner, gold-bordered verdict badge (✓/⚠/✗), feedback block with "Try again" reset, "Explain More" placeholder button (M4). | build |
| 2026-06-03 | M3 | Wrote 5 Worker modules: `prompts.ts` (check/explain/chat templates), `gemini.ts` (Gemini 1.5 Flash REST client, throws RateLimitError on 429/503), `groq.ts` (Groq Llama 3.1 70B OpenAI-compatible client), `rotation.ts` (per-key 60s cooldown, transparent Gemini→Groq fallback), `parse.ts` (Verdict/Feedback regex, fenced-JSON-tolerant explain parser), `mock.ts` (plausible canned responses when no keys are set), `index.ts` (router with CORS, /health, /check, /explain, /chat). | build |
| 2026-06-03 | M3 | Wired the frontend to the Worker via `api.ts`. When `VITE_WORKER_URL` is unset, calls fail with a clear "Worker is not configured" error; the UI degrades gracefully (LessonView shows a "configure the worker" placeholder instead of crashing). | build |
| 2026-06-03 | M3 | **Fix:** Tailwind rejected `duration-400` in `.toggle-track`. Replaced the @apply transition with explicit `transition: ... 0.4s ease ...` to match the reference exactly. Build now succeeds. | build |
| 2026-06-03 | M3 | Build: 461 kB JS / 19.86 kB CSS (gzip 131.79 / 5.05). Lint clean. Frontend dev boots in 151ms. Worker `wrangler dev` boots, /health returns 200, /check + /explain return 200 with mock responses. | build |
| 2026-06-03 | M2 | Wrote `scripts/extract-questions.mjs` (Mammoth-based docx parser). Hardcodes the blueprint lesson map, classifies each question as `conceptual`/`numerical` by verb detection (Calculate/Determine/Find/Compute/Convert/How many/How much in first 300 chars), and outputs `src/data/questions.json` with `{ questions[], lessons[] }`. Result: 60 questions, 28 conceptual + 32 numerical, 9 lessons, all clean (no header leakage). | build |
| 2026-06-03 | M2 | **Fix:** first extraction run leaked the section header "Projectile Motion" into Q7's prompt and "Rotational Motion" into Q18's prompt. Added a two-stage header filter: (a) known lesson names from the blueprint + (b) a `isHeaderLine()` heuristic (length 3–60, no leading `<n>. `, no terminal punctuation). Re-ran extraction — all 60 questions now end cleanly. | build |
| 2026-06-03 | M2 | Wrote `src/lib/supabase.ts` — single client instance, `isSupabaseConfigured` flag detects placeholder env values and returns `null` so the UI can show a friendly "setup required" message instead of crashing. | build |
| 2026-06-03 | M2 | Wrote `src/hooks/useStudent.tsx` (Provider + hook). State machine: `loading` / `needs-entry` / `ready` / `error`. Reads `physicshub-esis` from localStorage on mount, queries Supabase `students` table, bumps `last_active`, inserts new rows, persists to localStorage on success. `signOut()` clears storage. ESIS regex: `/^[A-Za-z0-9-]{3,20}$/`. | build |
| 2026-06-03 | M2 | Wrote `src/types/index.ts` (Question, QuestionType, Lesson, QuestionBank, Answer, Verdict) and `src/data/bank.ts` (typed accessor helpers: `getQuestion`, `getLesson`, `getQuestionsForLesson`). | build |
| 2026-06-03 | M2 | Wrote `src/pages/Welcome.tsx` (centered hero, radial gold glow, gold vertical accent, rotating ✦ ornament with reverse-spin monogram, eyebrow, section title with italic gold, body text, gold-bordered input, primary "Enter" button, error alert, three render modes: loading / setup-required / form). | build |
| 2026-06-03 | M2 | Wrote `src/pages/Home.tsx` (post-sign-in stub: italic-gold "Revise", ESIS display, ghost buttons, sign-out). Removed obsolete M1 `Placeholder.tsx`. | build |
| 2026-06-03 | M2 | Updated `src/App.tsx` to wrap in `StudentProvider` and add a tiny `RootRouter` that switches between `Welcome` and `Home` based on student status. | build |
| 2026-06-03 | M2 | Added `src/vite-env.d.ts` declaring `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_WORKER_URL` on `ImportMetaEnv` (fixes TypeScript errors on `import.meta.env`). | build |
| 2026-06-03 | M2 | Build: 405.75 kB JS / 11.43 kB CSS (gzip 116.46 / 3.44). Lint clean. Dev server boots in 247ms. | build |
| 2026-06-03 | M1 | Scaffolded Vite + React + TS app in project root (no monorepo). Created `package.json`, `vite.config.ts`, `tsconfig.json`, `postcss.config.js`, `tailwind.config.ts` mapping Noir Luxe CSS variables to Tailwind tokens (bg/bg-card/border/gold/etc.). `index.html` references Cormorant Garamond + Outfit from Google Fonts. | build |
| 2026-06-03 | M1 | Wrote `src/styles/index.css` with dark + light CSS variables (data-mode toggle), grain overlay (`body::after` SVG noise, 0.025 opacity), reusable components (`eyebrow`, `section-title`, `btn-primary`, `btn-ghost`, `gold-line`), `.fade-up` and `.slow-rotate` animations, focus + selection styling. | build |
| 2026-06-03 | M1 | Built `useTheme()` hook + `ThemeProvider` (localStorage-persisted `physicshub-theme`, default dark, `data-mode` attribute on `<html>`). Built `Placeholder` page that exercises the theme: eyebrow + section title with italic gold + `btn-primary` + `btn-ghost` toggle. | build |
| 2026-06-03 | M1 | Scaffolded `worker/` (Wrangler TypeScript): `package.json`, `wrangler.toml` with env var names + secret list, `tsconfig.json`, `src/index.ts` with placeholder `/health` route and route list for M3/M5. Worker dev/deploy scripts wired into root `package.json`. | build |
| 2026-06-03 | M1 | Wrote 3 SQL migrations: `001_create_students.sql` (ESIS PK + first/last seen), `002_create_answers.sql` (FK to students, verdict check, indexes on esis/question/lesson), `003_rls_policies.sql` (insert/select/update for anon on both tables; admin uses service-role key which bypasses RLS). | build |
| 2026-06-03 | M1 | Wrote `.env.example` (3 public env vars), `.gitignore` (node_modules, dist, .env, .wrangler, .dev.vars, OS junk), `README.md` (quick start + pointer to plan), `docs/SETUP.md` (full account-creation walkthrough with exact `wrangler secret put` commands), `docs/DEPLOY.md` (placeholder for M6). | build |
| 2026-06-03 | M1 | `npm install` succeeded (148 packages, no errors). `npm run build` succeeded: 188.87 kB JS / 9.07 kB CSS, gzip 60.65 kB / 2.85 kB. `npm run lint` (tsc --noEmit) passed with no errors. Dev server boots in 181ms and returns HTTP 200 at `/`. | build |
| 2026-06-03 | — | Initial plan created. Theme locked to "Noir Luxe" reference. Stack: Vite/React/TS, Supabase, Cloudflare Worker (Gemini → Groq fallback). Single repo, no monorepo. | plan |

## 12. Open Questions

- [ ] (TBD by user) Italic-gold accent word in the welcome headline: "*Revision*" / "*Mastery*" / other
- [ ] (TBD by user) Welcome ornament: keep the reference ✦, or use a custom physics icon (atom SVG)?
- [ ] (TBD by user) Admin password: chosen value
- [ ] (TBD by user) GitHub repo name + visibility (public/private)
- [ ] (TBD by user) Confirm or override any locked decision (D1–D9)
