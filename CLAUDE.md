# Rules for this repo (unattended build run)

You're building the aoost CMS and visual editor. `SPEC.md` is the source of truth and `PLAN.md` is the checklist. Alex is not watching, so keep moving.

## Working style

- Work through `PLAN.md` in order. Tick each item and **commit after each one** with a clear message.
- **Don't stop to ask questions.** When something is ambiguous, pick the option most consistent with `SPEC.md` and the mockup canvas, record it in `DECISIONS.md` (one line: decision and why), and carry on.
- When a step needs Alex (a missing secret, a dashboard click, a missing file), write it in `BLOCKERS.md` with exact instructions. Stub or mock the dependency and continue with everything else.
- Test as you go. An item is done only when its tests pass and `npm run build` succeeds.
- Prefer small, readable modules. Each editor component lives in its own folder: component, Puck config, styles and test.

## Hard limits

- Work only on the branch `cms-v1`. Never push to, force-push or merge into `main`. Finish with a PR for Alex to review.
- Don't change or remove the existing GitHub Pages site files or settings, the rodeo game, or the Supabase project and keys.
- Don't touch DNS or domain settings, and don't deploy to the production domain. Deploy only to a `*.workers.dev` preview.
- No paid services, plans or add-ons, and no new accounts.
- Secrets only in `.dev.vars` (gitignored) and Worker or GitHub secrets. Never commit or print them.
- Don't delete files outside `cms/`, `content/`, `docs/` and the files you created yourself.

## Taste

- The site is a visual diary for people in the know: edgy-artistic but clean, clean type, clean motion. Avoid generic template looks.
- **Not cowboy-themed.** The Western line art belongs only to the original homepage and the rodeo mini game. Everything else (new pages, templates, system pages like 404, sign-in, empty states, default labels) stays clean and neutral, with plain wording and no Western references.
- The editor UI is the dark Photoshop-style workspace from the mockups. Keep it calm and clear.
- Mobile first, always. Check every public component at 390px.
