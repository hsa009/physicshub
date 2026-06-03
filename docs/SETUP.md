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

## 3. Groq API keys (AI primary) — free tier

Llama 3.3 70B Versatile free tier: **14,400 requests/day** per key.

1. Go to https://console.groq.com and sign up.
2. **API Keys** → **Create API Key**. Copy and save it.
3. Set as a Worker secret:
   ```bash
   cd worker
   wrangler secret put GROQ_KEY_1
   # paste key, press Enter
   ```
4. (Optional) Create additional Groq accounts for more keys. The Worker supports up to 3 (`GROQ_KEY_1` through `GROQ_KEY_3`).

> Groq is the primary provider. One key is enough for 500–1,000 students; add more if you expect traffic spikes.

---

## 4. OpenRouter API keys (AI fallback) — free tier

We use OpenRouter as the fallback when Groq is rate-limited. OpenRouter is an OpenAI-compatible aggregator that hosts many models on a free tier.

Model used: `meta-llama/llama-3.3-70b-instruct:free` (free tier, ~20 req/min, daily cap varies).

1. Go to https://openrouter.ai and sign up.
2. **Keys** → **Create Key**. Copy and save it.
3. Set as a Worker secret:
   ```bash
   wrangler secret put OPENROUTER_KEY_1
   # paste key, press Enter
   ```
4. (Optional) Create additional OpenRouter keys for redundancy. The Worker supports up to 3 (`OPENROUTER_KEY_1` through `OPENROUTER_KEY_3`).

> The Worker tries Groq first, falls through to OpenRouter on 429/403. Per-key cooldown is 60 seconds — if a key rate-limits, the next request skips it.

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
- `GROQ_KEY_1` (optional: `GROQ_KEY_2`, `GROQ_KEY_3`)
- `OPENROUTER_KEY_1` (optional: `OPENROUTER_KEY_2`, `OPENROUTER_KEY_3`)

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
