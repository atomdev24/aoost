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
