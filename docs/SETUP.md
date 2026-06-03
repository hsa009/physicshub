# Setup Checklist — External Accounts & Secrets

Follow these in order. Each block is one account or secret.

---

## 1. Supabase (database) — free tier

1. Create an account at https://supabase.com.
2. Create a new project (any name, e.g. `physicshub`). Pick a strong database password and **save it somewhere safe**.
3. Choose the closest region (e.g. `ap-southeast-1` for UAE).
4. Wait for the project to provision (~2 min).
5. In the project dashboard, go to **SQL Editor** and run each migration file in `supabase/migrations/` **in order**:
   - `001_create_students.sql`
   - `002_create_answers.sql`
   - `003_rls_policies.sql`
6. Go to **Project Settings → API** and copy:
   - **Project URL** → set as `VITE_SUPABASE_URL` in `.env`
   - **anon public** key → set as `VITE_SUPABASE_ANON_KEY` in `.env`
   - **service_role** key (click "Reveal") → set as `SUPABASE_SERVICE_KEY` Worker secret (NEVER in `.env`)

---

## 2. Cloudflare account + Pages (hosting) — free

1. Create an account at https://dash.cloudflare.com/sign-up.
2. Once logged in, note the email you used — you'll need to grant Pages access to your GitHub repo later.

(You will push the project to GitHub first; then come back to wire Cloudflare Pages to it. The exact flow is in `docs/DEPLOY.md` once you reach M6.)

---

## 3. Google Gemini API keys (AI primary) — free tier

Gemini 1.5 Flash free tier: **1,500 requests/day** and **15 requests/minute** per key.

1. Create 3–5 Google accounts. You can use a personal Gmail + 2 aliases, or ask friends/family to generate one each (each account is independent).
2. For each account, go to https://aistudio.google.com/app/apikey.
3. Click **Create API key** → **Create API key in new project** (or pick an existing one).
4. Copy each key. Label them `GEMINI_KEY_1` through `GEMINI_KEY_5`.
5. Set each as a Worker secret:
   ```bash
   cd worker
   wrangler secret put GEMINI_KEY_1
   # paste key, press Enter
   wrangler secret put GEMINI_KEY_2
   # ...
   ```

> The Worker rotates through these in order. 5 keys = ~7,500 free requests/day, which is more than enough for 500–1,000 students.

---

## 4. Groq API keys (AI fallback) — free tier

Llama 3.1 70B free tier: **14,400 requests/day** per key.

1. Create 2 accounts at https://console.groq.com (sign up with separate emails).
2. For each, go to **API Keys** → **Create API Key**.
3. Copy both, set as Worker secrets:
   ```bash
   wrangler secret put GROQ_KEY_1
   wrangler secret put GROQ_KEY_2
   ```

> The Worker falls through to Groq only when all Gemini keys are exhausted.

---

## 5. Admin password (for `/admin` dashboard)

Choose a password only the teacher will know. Set as Worker secret:
```bash
wrangler secret put ADMIN_PASSWORD
# type the password, press Enter
```

The browser asks for this on first visit to `/admin`. The Worker compares it on every admin request.

---

## 6. Final `.env` (frontend) and Worker secrets

After everything above, your `.env` (at project root) should look like:
```
VITE_SUPABASE_URL=https://abcdefgh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
VITE_WORKER_URL=https://physicshub-worker.YOUR-SUBDOMAIN.workers.dev
```

Your Worker should have these secrets set:
- `ADMIN_PASSWORD`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `GEMINI_KEY_1` … `GEMINI_KEY_5`
- `GROQ_KEY_1`, `GROQ_KEY_2`

You can verify with:
```bash
cd worker
wrangler secret list
```

---

## Notes

- **All services used are free at the 500–1,000 student scale.** No payment method required.
- **Never commit `.env` to git.** It's already in `.gitignore`.
- **Never commit Worker secrets.** They're set via `wrangler secret put` and live only in Cloudflare's secret store.
- The service-role key bypasses RLS — keep it server-side (Worker) only.
