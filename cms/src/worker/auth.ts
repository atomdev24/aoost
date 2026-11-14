import type { Env } from "./env";

/**
 * Editor auth, built so that moving from the password to Cloudflare Access is
 * a config change (AUTH_MODE = "access" plus ACCESS_TEAM_DOMAIN / ACCESS_AUD):
 *
 *   password: the editor logs in once and gets an HTTP-only session cookie;
 *             /mcp sends the password as a bearer token.
 *   access:   Cloudflare Access sits in front and adds a signed JWT to every
 *             request (browser logins and service tokens alike). We verify it.
 */
export type Identity = { via: "session" | "bearer" | "access"; who: string };

const COOKIE = "aoost_session";
const SESSION_DAYS = 30;
const enc = new TextEncoder();

async function hmac(key: string, message: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time string comparison (compares fixed-length digests). */
export async function safeEqual(a: string, b: string): Promise<boolean> {
  const [x, y] = await Promise.all([hmac("aoost-compare", a), hmac("aoost-compare", b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

export async function createSession(password: string, now = Date.now()): Promise<string> {
  const body = `v1.${now + SESSION_DAYS * 86400_000}`;
  return `${body}.${await hmac(password, body)}`;
}

export async function verifySession(token: string, password: string, now = Date.now()): Promise<boolean> {
  const [v, expiry, sig] = token.split(".");
  if (v !== "v1" || !expiry || !sig || Number(expiry) < now) return false;
  return safeEqual(sig, await hmac(password, `v1.${expiry}`));
}

export function sessionCookie(token: string, secure: boolean): string {
  return `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_DAYS * 86400}${secure ? "; Secure" : ""}`;
}
export const clearCookie = (secure: boolean) => `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure ? "; Secure" : ""}`;

function readCookie(request: Request): string | null {
  const header = request.headers.get("Cookie") ?? "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === COOKIE) return v.join("=");
  }
  return null;
}

// ------------------------------------------------------- Cloudflare Access

type Jwk = JsonWebKey & { kid: string };
let jwksCache: { at: number; keys: Jwk[] } | null = null;

const b64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

export async function verifyAccessJwt(token: string, env: Env, fetcher: typeof fetch = fetch, now = Date.now()): Promise<Identity | null> {
  const [h, p, s] = token.split(".");
  if (!h || !p || !s || !env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) return null;
  try {
    const header = JSON.parse(new TextDecoder().decode(b64url(h))) as { kid: string; alg: string };
    const payload = JSON.parse(new TextDecoder().decode(b64url(p))) as { aud: string | string[]; exp: number; iss: string; email?: string; common_name?: string };
    if (header.alg !== "RS256") return null;
    const issuer = `https://${env.ACCESS_TEAM_DOMAIN}`;
    if (payload.iss !== issuer || payload.exp * 1000 < now) return null;
    if (![payload.aud].flat().includes(env.ACCESS_AUD)) return null;
    if (!jwksCache || now - jwksCache.at > 3600_000) {
      const res = await fetcher(`${issuer}/cdn-cgi/access/certs`);
      jwksCache = { at: now, keys: ((await res.json()) as { keys: Jwk[] }).keys };
    }
    const jwk = jwksCache.keys.find((k) => k.kid === header.kid);
    if (!jwk) return null;
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64url(s), enc.encode(`${h}.${p}`));
    return ok ? { via: "access", who: payload.email ?? payload.common_name ?? "access" } : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- entry

/** Who is making this request, or null. Works for the editor, the API and /mcp. */
export async function authenticate(request: Request, env: Env): Promise<Identity | null> {
  if (env.AUTH_MODE === "access") {
    const jwt = request.headers.get("Cf-Access-Jwt-Assertion");
    return jwt ? verifyAccessJwt(jwt, env) : null;
  }
  const password = env.EDITOR_PASSWORD;
  if (!password) return null; // no password configured: nothing gets in
  const bearer = /^Bearer\s+(.+)$/i.exec(request.headers.get("Authorization") ?? "")?.[1];
  if (bearer) return (await safeEqual(bearer, password)) ? { via: "bearer", who: "token" } : null;
  const cookie = readCookie(request);
  if (cookie && (await verifySession(cookie, password))) return { via: "session", who: "editor" };
  return null;
}

export async function login(request: Request, env: Env): Promise<Response> {
  const secure = new URL(request.url).protocol === "https:";
  if (env.AUTH_MODE === "access") return Response.json({ ok: true });
  const password = env.EDITOR_PASSWORD;
  if (!password) return Response.json({ ok: false, error: "EDITOR_PASSWORD is not set. See BLOCKERS.md." }, { status: 503 });
  let given = "";
  try {
    given = String(((await request.json()) as { password?: unknown }).password ?? "");
  } catch {
    // fall through to the failure below
  }
  if (!(await safeEqual(given, password))) {
    await new Promise((r) => setTimeout(r, 400)); // slow down guessing
    return Response.json({ ok: false, error: "Wrong password." }, { status: 401 });
  }
  return Response.json({ ok: true }, { headers: { "Set-Cookie": sessionCookie(await createSession(password), secure) } });
}

export function logout(request: Request): Response {
  return Response.json({ ok: true }, { headers: { "Set-Cookie": clearCookie(new URL(request.url).protocol === "https:") } });
}
