import { describe, expect, it } from "vitest";
import { authenticate, createSession, safeEqual, sessionCookie, verifySession } from "./auth";
import type { Env } from "./env";

const env = (over: Partial<Env> = {}) => ({ AUTH_MODE: "password", EDITOR_PASSWORD: "howdy", ACCESS_TEAM_DOMAIN: "", ACCESS_AUD: "", ...over }) as Env;
const req = (headers: Record<string, string> = {}) => new Request("https://x.workers.dev/api/editor/site", { headers });

describe("editor auth", () => {
  it("compares strings safely", async () => {
    expect(await safeEqual("a", "a")).toBe(true);
    expect(await safeEqual("a", "b")).toBe(false);
    expect(await safeEqual("a", "aa")).toBe(false);
  });
  it("issues sessions that verify, expire and can't be forged", async () => {
    const token = await createSession("howdy", 1000);
    expect(await verifySession(token, "howdy", 2000)).toBe(true);
    expect(await verifySession(token, "other", 2000)).toBe(false);
    expect(await verifySession(token, "howdy", 1000 + 31 * 86400_000)).toBe(false);
    const [v, exp, sig] = token.split(".");
    expect(await verifySession(`${v}.${Number(exp) + 1}.${sig}`, "howdy", 2000)).toBe(false);
  });
  it("sets an HTTP-only, same-site cookie", () => {
    expect(sessionCookie("t", true)).toMatch(/HttpOnly; SameSite=Strict; Path=\/; Max-Age=\d+; Secure$/);
    expect(sessionCookie("t", false)).not.toContain("Secure");
  });
  it("accepts the session cookie for the editor and the bearer token for /mcp", async () => {
    const token = await createSession("howdy");
    expect(await authenticate(req({ Cookie: `a=b; aoost_session=${token}` }), env())).toMatchObject({ via: "session" });
    expect(await authenticate(req({ Authorization: "Bearer howdy" }), env())).toMatchObject({ via: "bearer" });
  });
  it("rejects everything else", async () => {
    expect(await authenticate(req(), env())).toBeNull();
    expect(await authenticate(req({ Authorization: "Bearer nope" }), env())).toBeNull();
    expect(await authenticate(req({ Cookie: "aoost_session=v1.9999999999999.bad" }), env())).toBeNull();
    expect(await authenticate(req({ Authorization: "Bearer " }), env({ EDITOR_PASSWORD: undefined }))).toBeNull();
  });
  it("in access mode ignores the password and requires an Access JWT", async () => {
    const access = env({ AUTH_MODE: "access", ACCESS_TEAM_DOMAIN: "team.cloudflareaccess.com", ACCESS_AUD: "aud" });
    expect(await authenticate(req({ Authorization: "Bearer howdy" }), access)).toBeNull();
    expect(await authenticate(req({ "Cf-Access-Jwt-Assertion": "a.b.c" }), access)).toBeNull();
  });
});
