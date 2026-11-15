# Editor sign-in: password now, Cloudflare Access later

Three things are protected: the editor (`/admin`), its API (`/api/editor/*`, `/preview/*`) and the Claude connector (`/mcp`). The public site and `/media/*` are open.

## Now: one password

- `EDITOR_PASSWORD` is a secret (in `.dev.vars` locally, `wrangler secret put EDITOR_PASSWORD` for the deployed Worker).
- The editor's sign-in page exchanges the password for a session cookie: HTTP-only, SameSite=Strict, Secure on https, valid 30 days. The cookie is an HMAC signed with the password, so changing the password signs everyone out.
- `/mcp` and the API also accept `Authorization: Bearer <password>`.
- If the secret is not set, nothing gets in.

## Later: Cloudflare Access (a config change)

1. In Cloudflare Zero Trust, create an Access application for the editor's hostname with paths `/admin*`, `/api/editor/*`, `/preview*` and `/mcp*`. Policy: allow your email only. Add a service token policy for the connector if a client needs one.
2. Note the application's **AUD tag** and your **team domain** (`<team>.cloudflareaccess.com`).
3. In `cms/wrangler.toml` set:
   ```toml
   AUTH_MODE = "access"
   ACCESS_TEAM_DOMAIN = "<team>.cloudflareaccess.com"
   ACCESS_AUD = "<aud tag>"
   ```
4. Deploy. From then on the Worker ignores the password and instead verifies the signed `Cf-Access-Jwt-Assertion` header that Access adds to every request (signature against the team's public keys, audience, issuer, expiry). The sign-in page is no longer used.

The code for both modes is in `cms/src/worker/auth.ts`; nothing else changes.
