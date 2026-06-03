# PhysicsHub

Free, school-wide Grade 11 Physics revision platform. 8 lessons, 60 questions, AI-powered feedback, progress tracked across devices by ESIS number.

> **The full project plan, milestones, theme spec, decisions, and changelog live in [PHYSICSHUB_PLAN.md](./PHYSICSHUB_PLAN.md).** Read that first.
>
> The original specification is in [PhysicsHub_Blueprint.text](./PhysicsHub_Blueprint.text).
>
> The visual reference is [physicsproject_theme.html](./physicsproject_theme.html) — the "Noir Luxe" design language used throughout the app.

## Quick start (development)

```bash
npm install
npm run dev
```

App will be on http://localhost:5173.

## Build

```bash
npm run build
npm run preview
```

## Worker (AI proxy + admin)

```bash
npm --prefix worker install
npm --prefix worker run dev
```

Deploy:
```bash
npm --prefix worker run deploy
```

## Before first deploy

1. Follow **[docs/SETUP.md](./docs/SETUP.md)** to create every external account (Supabase, Cloudflare, Gemini, Groq).
2. Copy `.env.example` to `.env` and fill in the public values.
3. Set Worker secrets with `wrangler secret put NAME` (see Worker section of SETUP.md).
4. Run the SQL migrations in `supabase/migrations/` against your Supabase project (in order: 001, 002, 003).

## Status

Currently in **Milestone 1** — project scaffold only. See [PHYSICSHUB_PLAN.md](./PHYSICSHUB_PLAN.md) for the full roadmap.
