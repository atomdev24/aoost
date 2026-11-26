# Blockers (things only Alex can do)

Each entry: what is needed, exact steps, and what is stubbed meanwhile.

## Facile Sans licence
- `assets/fonts/FacileSans-info.txt` says "Freeware, Non-Commercial". Please confirm on https://www.fontspace.com/facile-sans-font-f20188 that web embedding on a personal, non-commercial site is allowed. If it is not, delete `assets/fonts/FacileSans-Regular.otf`; the site falls back to Space Grotesk automatically.

## Deploy Action needs a Cloudflare token
- The workflow `.github/workflows/deploy-cms.yml` builds and runs `wrangler deploy` whenever the editor publishes (a commit under `content/` on `cms-v1`). It needs a repository secret:
  1. Cloudflare dashboard → My Profile → API Tokens → Create Token → template "Edit Cloudflare Workers" → limit it to your account → Create.
  2. GitHub → `atomdev24/aoost` → Settings → Secrets and variables → Actions → New repository secret → name `CLOUDFLARE_API_TOKEN`, paste the token.
  3. If the deploy then asks which account to use, add a second secret `CLOUDFLARE_ACCOUNT_ID` (Cloudflare dashboard → Workers & Pages → Account ID on the right).
- Until then the workflow runs the tests and the build and prints a warning instead of deploying. Publishing from the editor still commits to `cms-v1`; deploy by hand with `cd cms && npm run deploy:preview`.

## Social profile links
- The footer, the nav's social icons and the Links page point at `https://www.instagram.com/` and `https://open.spotify.com/` because your profile URLs are not in the repo. Until there is a Site settings panel, set them in `content/site.json` under `settings.socials` (and the Instagram button on the Links page in the editor), then publish.

## Rodeo page
- `/rodeo` links to `https://alexoostendurp.com/` (the current site, where the game lives). Moving the game itself into the new site is outside this run (SPEC §10).

## After the run (from PLAN Phase 0)
- Cloudflare Access for the editor and the connector: steps are in `docs/auth.md`. Until then the editor, `/api/editor` and `/mcp` are protected by `EDITOR_PASSWORD` only.
- Cut-over to the real domain is not part of this run. When you do it, change `PUBLISH_BRANCH` in `cms/wrangler.toml` and the branch in `.github/workflows/deploy-cms.yml`.

## Publish progress: let the token read GitHub Actions (optional)
- Since Editor Sections 2 and 3 the Publish button shows "Rebuilding…" until the deploy Action for that commit finishes, then "Live". It reads the run's status through `GET /api/editor/publish/status`, using the same `GITHUB_TOKEN` the editor publishes with.
- If the token can't read Actions, the editor waits about 25 seconds, then shows "Live" with the note "GitHub didn't report the rebuild. It usually takes about a minute." Nothing breaks.
- To get the real status: GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → the editor's token → Repository permissions → **Actions: Read-only** → Save. (A classic token with the `repo` scope can already read it.) No new secret is needed.

## Make the editor sign-in last longer
- The editor now installs as a home-screen app (Share → Add to Home Screen on the iPhone). With the default Access session it keeps asking for the email code.
- Cloudflare dashboard → Zero Trust → Access → Applications → the editor app → Edit → Session Duration → **1 month** → Save.
- Only you can do this (it's your Cloudflare account). Nothing is stubbed: until then the app works, it just asks for the code more often.

## Team roles and Google sign-in (Nov 2026)
Roles are built (Owner, Manager, Editor, Viewer; … → Team in the editor) and enforced by the
Worker. They only tell people apart when the editor is behind Cloudflare Access, which it is
(`AUTH_MODE = "access"` in `cms/wrangler.toml`). Until anyone is added in Team, everyone who can
sign in stays an owner, as before, and whoever saves the team list always stays an owner.
1. **Make yourself a permanent owner:** Cloudflare dashboard → Workers & Pages → the aoost
   Worker → Settings → Variables → add `OWNER_EMAILS` = the email you sign in with (comma-separate
   more). Or ask Claude to add it to `cms/wrangler.toml` once you say which email.
2. **Google sign-in:** Cloudflare Zero Trust (free up to 50 users) → Settings → Authentication →
   Login methods → Add new → Google. It asks for a Google OAuth client: Google Cloud console →
   APIs & Services → Credentials → Create credentials → OAuth client ID → Web application →
   Authorised redirect URI `https://rapid-cake-bd62.cloudflareaccess.com/cdn-cgi/access/callback`
   → paste the client ID and secret back into Cloudflare.
3. **Who may sign in:** Zero Trust → Access → Applications → the editor app → Policies → allow
   "Emails ending in" `@aerobotics.com`, plus any guests by email. Keep `/mcp` outside the
   Access app (the Claude connector signs in with its bearer token).
4. For the Aerobotics site this is a CTO decision (which Google Workspace, who may sign in).
- Not built: email or Slack notifications for @mentions and replies. Email needs a sending
  service (Cloudflare Email Routing can't send to arbitrary inboxes; Resend/Postmark have free
  tiers but are new accounts) and Slack needs the CTO's approval for the app. @mentions in
  comments already suggest teammates from the Team list.
