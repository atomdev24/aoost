# Rules for this repo

You're working on the aoost CMS and visual editor, which is also becoming the editor for the
Aerobotics website. Start with `HANDBOOK.md` (how it's built and run), then `ROADMAP.md` (agreed
decisions and the order of work). `SPEC.md` is the original spec; `DECISIONS.md` logs choices.

## Working style

- One branch per change (a worktree under `/tmp` is easiest), tests and `npm run build` passing,
  then a PR. Pushing to `main` deploys, so merge only when Alex has asked for it or has approved
  that kind of change.
- Bigger pieces start with a short brief at the repo root (`EDITOR-*.md` style): goal, choices,
  checks. Record new decisions in `DECISIONS.md` (one line: decision and why) and update
  `ROADMAP.md` when something is done or a decision changes.
- When a step needs Alex (a secret, a dashboard click, an approval), write it in `BLOCKERS.md` with
  exact instructions and carry on with the rest.
- Test as you go: unit tests next to the code, browser tests in `cms/tests/`. Check the editor and
  the public site at 390px as well as desktop.
- Prefer small, readable modules. Each block lives in its own folder: component, fields, styles, test.

## Hard limits

- Don't touch DNS or domain settings. Don't change the Supabase project or keys (rodeo leaderboard).
- No paid services, plans or add-ons, and no new accounts without Alex.
- Secrets only in `.dev.vars` (gitignored) and Worker or GitHub secrets. Never commit or print them.
- Never commit `cms/node_modules`. Restore `docs/screenshots` after browser tests unless the change
  is about them.
- Anything outside a page frame (board references, notes) must never reach published content.

## Taste

- aoost is a visual diary for people in the know: edgy-artistic but clean, clean type, clean
  motion, "barely there" copy. Avoid generic template looks.
- **Not cowboy-themed.** Western line art belongs only to the original homepage and the rodeo
  game. Everything else stays clean and neutral with plain wording.
- The editor UI is the dark, Apple "Pro apps" style workspace with frosted glass panels. Keep it
  calm and clear. It must also work for non-designers (teammates at Aerobotics): plain words,
  content before layout controls.
- Mobile first, always.

## Coding guides (read when relevant)

Copied from vercel-labs/agent-skills (MIT, commit 5a37a63) into `.claude/skills/`:
- `web-design-guidelines`: check UI changes against its rules (accessibility, focus, forms, motion, touch).
- `react-best-practices`: React performance rules. aoost is Vite, not Next.js, so skip the server and Next-only rules.
- `composition-patterns`: how to split components instead of piling on boolean props.
They don't override the rules above. Where they disagree with aoost's taste or decisions, aoost wins.
