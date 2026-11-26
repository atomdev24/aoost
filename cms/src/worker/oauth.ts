import { authenticate, safeEqual, type Identity } from "./auth";
import { draftStub, type Env } from "./env";

/**
 * OAuth 2.1 for the Claude connector (the MCP spec's authorization flow), so a claude.ai account can
 * add the editor under Settings → Connectors: the client registers itself, Alex approves it on an
 * editor page (signed in as he is now), and Claude gets a token for /mcp. Authorization codes need
 * PKCE (S256). Everything is kept in the draft Durable Object; tokens are stored only as hashes.
 */

const CODE_TTL = 5 * 60_000;
const ACCESS_TTL = 60 * 60_000;
const REFRESH_TTL = 60 * 24 * 60 * 60_000;

type Client = { id: string; name: string; redirectUris: string[] };
type CodeGrant = { clientId: string; redirectUri: string; challenge: string; who: string };
type TokenGrant = { clientId: string; who: string };

const b64url = (bytes: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const random = (n = 32) => b64url(crypto.getRandomValues(new Uint8Array(n)));
export const sha256 = async (s: string) => b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const json = (v: unknown, status = 200) => new Response(JSON.stringify(v), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" } });
const oauthError = (error: string, description: string, status = 400) => json({ error, error_description: description }, status);

/** Redirect URIs a client may register: https anywhere, or http on this machine (local MCP clients). */
export const allowedRedirect = (u: string) => {
  try {
    const url = new URL(u);
    return url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname));
  } catch {
    return false;
  }
};

export const resourceMetadataUrl = (origin: string) => `${origin}/.well-known/oauth-protected-resource`;

/** The OAuth routes, or null for anything else. */
export async function oauthRoute(request: Request, env: Env, url: URL): Promise<Response | null> {
  const origin = url.origin;
  const path = url.pathname;
  if (request.method === "OPTIONS" && (path.startsWith("/.well-known/") || path.startsWith("/oauth/"))) {
    return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization, mcp-protocol-version" } });
  }
  if (path === "/.well-known/oauth-protected-resource" || path === "/.well-known/oauth-protected-resource/mcp") {
    return json({ resource: `${origin}/mcp`, authorization_servers: [origin], bearer_methods_supported: ["header"], resource_name: "aoost site editor" });
  }
  if (path === "/.well-known/oauth-authorization-server" || path === "/.well-known/openid-configuration") {
    return json({
      issuer: origin,
      authorization_endpoint: `${origin}/admin/oauth/authorize`,
      token_endpoint: `${origin}/oauth/token`,
      registration_endpoint: `${origin}/oauth/register`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
      scopes_supported: ["editor"],
    });
  }
  if (path === "/oauth/register" && request.method === "POST") return register(request, env);
  if (path === "/oauth/token" && request.method === "POST") return token(request, env);
  if (path === "/admin/oauth/authorize") return authorize(request, env, url);
  return null;
}

async function register(request: Request, env: Env): Promise<Response> {
  let body: { redirect_uris?: unknown; client_name?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return oauthError("invalid_client_metadata", "Send JSON.");
  }
  const uris = Array.isArray(body.redirect_uris) ? body.redirect_uris.filter((u): u is string => typeof u === "string" && allowedRedirect(u)).slice(0, 10) : [];
  if (!uris.length) return oauthError("invalid_redirect_uri", "Give at least one https redirect URI.");
  const client: Client = { id: random(16), name: typeof body.client_name === "string" ? body.client_name.slice(0, 80) : "An MCP client", redirectUris: uris };
  await draftStub(env).kvPut(`oauth:client:${client.id}`, client, 0);
  return json({ client_id: client.id, client_name: client.name, redirect_uris: uris, token_endpoint_auth_method: "none", grant_types: ["authorization_code", "refresh_token"], response_types: ["code"] }, 201);
}

const page = (title: string, body: string) =>
  new Response(
    `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><meta name=robots content=noindex><title>${esc(title)}</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#161618;color:#ececee;font:15px/1.5 -apple-system,Inter,system-ui,sans-serif}main{width:min(420px,92vw);background:#232327;border-radius:16px;padding:28px}h1{font-size:20px;margin:0 0 8px}p{color:#b8b8bf;margin:0 0 14px}input{width:100%;box-sizing:border-box;height:40px;border-radius:8px;border:1px solid #3a3a40;background:#18181b;color:#ececee;padding:0 10px;font-size:16px;margin-bottom:12px}.row{display:flex;gap:8px}button{flex:1;height:42px;border-radius:21px;border:0;font:600 15px inherit;cursor:pointer}.go{background:#0A84FF;color:#fff}.no{background:#34343a;color:#ececee}.err{color:#ff8a80}</style><main>${body}</main>`,
    { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Frame-Options": "DENY" } },
  );

async function authorize(request: Request, env: Env, url: URL): Promise<Response> {
  const form = request.method === "POST" ? await request.formData() : null;
  const get = (k: string) => String(form?.get(k) ?? url.searchParams.get(k) ?? "");
  const clientId = get("client_id");
  const redirectUri = get("redirect_uri");
  const state = get("state");
  const challenge = get("code_challenge");
  const client = clientId ? ((await draftStub(env).kvGet(`oauth:client:${clientId}`)) as Client | null) : null;
  if (!client || !client.redirectUris.includes(redirectUri)) return page("Can't connect", `<h1>Can't connect</h1><p>This connection request isn't from a registered app. Start again from Claude.</p>`);
  const back = (params: Record<string, string>) => {
    const to = new URL(redirectUri);
    for (const [k, v] of Object.entries(params)) to.searchParams.set(k, v);
    if (state) to.searchParams.set("state", state);
    return Response.redirect(to.toString(), 302);
  };
  if (get("response_type") !== "code") return back({ error: "unsupported_response_type" });
  if (!challenge || get("code_challenge_method") !== "S256") return back({ error: "invalid_request", error_description: "PKCE (S256) is required." });

  // Who is approving: the editor sign-in (cookie or Cloudflare Access), or the editor password typed here.
  let who: Identity | null = await authenticate(request, env);
  let wrong = false;
  if (!who && form && env.AUTH_MODE !== "access" && env.EDITOR_PASSWORD) {
    if (await safeEqual(String(form.get("password") ?? ""), env.EDITOR_PASSWORD)) who = { via: "session", who: "editor" };
    else wrong = !!form.get("password");
  }
  if (form && who && form.get("decision") === "deny") return back({ error: "access_denied" });
  if (form && who && form.get("decision") === "allow") {
    const code = random();
    await draftStub(env).kvPut(`oauth:code:${code}`, { clientId, redirectUri, challenge, who: who.who } satisfies CodeGrant, CODE_TTL);
    return back({ code });
  }
  const hidden = ["client_id", "redirect_uri", "state", "code_challenge", "code_challenge_method", "response_type", "scope", "resource"].map((k) => `<input type=hidden name="${k}" value="${esc(get(k))}">`).join("");
  const needsPassword = !who;
  return page(
    "Connect Claude",
    `<h1>Let ${esc(client.name)} edit this site?</h1><p>It can read the site and change the <b>draft</b>, which you see live in the editor and can undo. It only publishes when you ask it to in the chat.</p>
<form method=post>${hidden}${needsPassword ? `<input type=password name=password placeholder="Editor password" autocomplete=current-password autofocus>${wrong ? `<p class=err>Wrong password.</p>` : ""}` : ""}
<div class=row><button class=no name=decision value=deny>Cancel</button><button class=go name=decision value=allow>Allow</button></div></form>`,
  );
}

async function token(request: Request, env: Env): Promise<Response> {
  const body = new URLSearchParams(await request.text());
  const store = draftStub(env);
  const grant = body.get("grant_type");
  let tokenGrant: TokenGrant | null = null;
  if (grant === "authorization_code") {
    const code = body.get("code") ?? "";
    const saved = (await store.kvGet(`oauth:code:${code}`)) as CodeGrant | null;
    if (!saved) return oauthError("invalid_grant", "That code is unknown or has expired.");
    await store.kvDelete(`oauth:code:${code}`);
    if (saved.clientId !== body.get("client_id") || saved.redirectUri !== body.get("redirect_uri")) return oauthError("invalid_grant", "The code was issued to another client.");
    if ((await sha256(body.get("code_verifier") ?? "")) !== saved.challenge) return oauthError("invalid_grant", "PKCE check failed.");
    tokenGrant = { clientId: saved.clientId, who: saved.who };
  } else if (grant === "refresh_token") {
    const key = `oauth:rt:${await sha256(body.get("refresh_token") ?? "")}`;
    tokenGrant = (await store.kvGet(key)) as TokenGrant | null;
    if (!tokenGrant || tokenGrant.clientId !== body.get("client_id")) return oauthError("invalid_grant", "That refresh token is unknown or has expired.");
    await store.kvDelete(key); // refresh tokens rotate
  } else return oauthError("unsupported_grant_type", "Use authorization_code or refresh_token.");
  const access = random();
  const refresh = random();
  await store.kvPut(`oauth:at:${await sha256(access)}`, tokenGrant, ACCESS_TTL);
  await store.kvPut(`oauth:rt:${await sha256(refresh)}`, tokenGrant, REFRESH_TTL);
  return json({ access_token: access, token_type: "Bearer", expires_in: ACCESS_TTL / 1000, refresh_token: refresh, scope: "editor" });
}

/** A connector's OAuth access token → who approved it, or null. */
export async function oauthIdentity(request: Request, env: Env): Promise<Identity | null> {
  const bearer = /^Bearer\s+(.+)$/i.exec(request.headers.get("Authorization") ?? "")?.[1];
  if (!bearer) return null;
  const grant = (await draftStub(env).kvGet(`oauth:at:${await sha256(bearer)}`)) as TokenGrant | null;
  return grant ? { via: "oauth", who: grant.who } : null;
}
