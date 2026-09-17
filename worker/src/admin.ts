

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const TOKEN_BYTES = 32;

function timingSafeEqual(a: string, b: string): boolean {
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
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\
}

export interface AdminEnv {
  ADMIN_PASSWORD?: string;
  ADMIN_TOKENS?: KVNamespace;
}

export function checkAdminPassword(env: AdminEnv, password: string): boolean {
  const expected = env.ADMIN_PASSWORD ?? "";
  const dummy = "x".repeat(Math.max(expected.length, password.length));
  return timingSafeEqual(expected || dummy, password);
}

export async function signAdminToken(
  env: AdminEnv,
  password: string,
): Promise<string | null> {
  if (!checkAdminPassword(env, password)) return null;
  if (!env.ADMIN_TOKENS) return null;
  const token = randomToken();
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  await env.ADMIN_TOKENS.put(`t:${token}`, String(expiresAt), {
    expirationTtl: Math.ceil(TOKEN_TTL_MS / 1000),
  });
  return token;
}

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
    await env.ADMIN_TOKENS.delete(`t:${token}`);
    return false;
  }
  return true;
}
