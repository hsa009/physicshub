/**
 * admin — token + password helpers for the M5.A admin dashboard.
 *
 * Authentication model:
 *   - The admin password is stored as a Worker secret (`ADMIN_PASSWORD`).
 *   - On a successful `POST /admin/login`, the Worker writes a fresh
 *     random token into the `ADMIN_TOKENS` KV namespace, keyed by the
 *     token itself, with the expiry timestamp as the value. The client
 *     stores the token in localStorage and sends it as
 *     `Authorization: Bearer <token>` on every subsequent request.
 *   - Tokens are valid for 24h. We delete on `verify` if expired.
 *
 * Why KV and not an in-memory Map?
 *   - Cloudflare Workers do not share module-level state across
 *     isolates. A second request can land on a fresh isolate with an
 *     empty Map, which is exactly what the M5.A first deploy hit
 *     (login succeeded, verify 401'd in the same shell session).
 *   - KV is free at our scale and persists across isolates.
 *
 * Caveats:
 *   - There is intentionally no per-IP rate limiting on `/admin/login`
 *     in M5.A. A long, strong password + the obscurity of the route
 *     is the mitigation. Bump to a real rate limit if/when we move
 *     past the teacher-tool phase.
 *   - Constant-time comparison on the password to avoid timing leaks.
 */

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const TOKEN_BYTES = 32;

function timingSafeEqual(a: string, b: string): boolean {
  // Avoid short-circuit early-returns — loop over the longer input.
  const len = Math.max(a.length, b.length);
  let result = a.length === b.length;
  for (let i = 0; i < len; i++) {
    const ac = i < a.length ? a.charCodeAt(i) : 0;
    const bc = i < b.length ? b.charCodeAt(i) : 0;
    if (ac !== bc) result = false;
  }
  return result;
}

function randomToken(): string {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  // base64url (no +, /, =).
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export interface AdminEnv {
  ADMIN_PASSWORD?: string;
  ADMIN_TOKENS?: KVNamespace;
}

/**
 * Compare a candidate password against the configured `ADMIN_PASSWORD`.
 * Always returns false in constant time, even when the env secret is missing.
 */
export function checkAdminPassword(env: AdminEnv, password: string): boolean {
  const expected = env.ADMIN_PASSWORD ?? "";
  // Use a dummy fallback of the same length as the candidate to keep
  // the comparison length-stable when no password is configured.
  const dummy = "x".repeat(Math.max(expected.length, password.length));
  return timingSafeEqual(expected || dummy, password);
}

/**
 * Issue a fresh token bound to the configured admin password. Returns
 * `null` if the password is wrong or the KV binding is missing.
 */
export async function signAdminToken(
  env: AdminEnv,
  password: string,
): Promise<string | null> {
  if (!checkAdminPassword(env, password)) return null;
  if (!env.ADMIN_TOKENS) return null;
  const token = randomToken();
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  // KV's `put` takes a string; we store the expiry as a numeric string.
  // `expirationTtl` ensures the entry auto-cleans 24h after creation
  // even if `verify` never sees it.
  await env.ADMIN_TOKENS.put(`t:${token}`, String(expiresAt), {
    expirationTtl: Math.ceil(TOKEN_TTL_MS / 1000),
  });
  return token;
}

/**
 * Verify a token from an incoming request. Returns true if the token is
 * present, well-formed, and unexpired. Expired tokens are deleted lazily.
 */
export async function verifyAdminToken(
  req: Request,
  env: AdminEnv,
): Promise<boolean> {
  if (!env.ADMIN_PASSWORD || !env.ADMIN_TOKENS) return false;
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+([A-Za-z0-9_-]{20,})$/.exec(header);
  if (!match) return false;
  const token = match[1];
  const raw = await env.ADMIN_TOKENS.get(`t:${token}`);
  if (!raw) return false;
  const expiresAt = Number(raw);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    // Lazily remove expired entries.
    await env.ADMIN_TOKENS.delete(`t:${token}`);
    return false;
  }
  return true;
}
