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
