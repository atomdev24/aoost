# aoost CMS and visual editor

A Framer-style editor and CMS for aoost, Alex's visual diary. One Cloudflare Worker serves:

- the **public site**: static HTML and CSS, pre-rendered from JSON in `content/`
- the **editor** at `/admin`, behind a password
- the **API** at `/api/*` and the **Claude connector** at `/mcp`

Preview: <https://aoost-cms.aoost-cms.workers.dev> (editor at `/admin`). The spec is `SPEC.md`, the checklist is `PLAN.md`, and the choices made along the way are in `DECISIONS.md`. Things only Alex can do are in `BLOCKERS.md`.

The existing GitHub Pages site (root `index.html`, `art/`, the rodeo game, Supabase) is untouched and keeps working until cut-over.

## How it fits together

```
content/                 the site, as JSON, versioned by git (source of truth)
  site.json              settings, theme tokens, nav, global components, templates, redirects
  collections.json       diary entries and playlists
  pages/<id>.json        one file per page
cms/
  src/schema/            the content model (zod) and validation
  src/responsive/        mobile base + desktop overrides → CSS with media queries
  src/components/<Name>/ one folder per component: render, Puck fields, styles, test
  src/render/            content → static HTML/CSS; the floating pill nav
  src/runtime/           the public site's only script (~9 KB): nav, lightbox, scroll effects
  src/model/             pure edits: pages, slugs and redirects, nav, layers, templates, ops
  src/editor/            the editor (React + Puck) and quick edit for phones
  src/mcp/               the Claude connector's tools
  src/worker/            the Worker: auth, draft store (Durable Object), media (R2), publish, /mcp
  scripts/build-site.ts  renders content/ into dist/
  tests/                 Playwright browser tests (also write docs/screenshots)
docs/                    connect-claude.md, auth.md, screenshots/
```

**Editing flow.** The editor works on a *draft* held in a Durable Object. Every change (yours, or Claude's through `/mcp`) is validated against the schema, saved, and pushed to open editors over a WebSocket. **Publish** commits the draft's `content/` files to GitHub; the `Deploy CMS preview` Action then rebuilds the static site and deploys the Worker. Version history is git history.

**Responsive rule.** The base is mobile. Desktop (900px and up) stores only the values that differ. In the editor a dot marks a property that differs from mobile; click it to reset.

## Local development

Needs Node 20 or newer. On Alex's Mac, prefix npm/npx with `npm_config_cache=/tmp/aoost-npm-cache` (the default npm cache has a permissions problem).

```sh
cd cms
npm install
npm run dev          # builds, then serves everything at http://localhost:8787
```

- Site: <http://localhost:8787>, editor: <http://localhost:8787/admin>
- `npm run dev` links the repo-root `.dev.vars` into `cms/` so the Worker sees your secrets.
- Local drafts and uploads live in `cms/.wrangler/` (simulated Durable Object and R2). Nothing local touches the deployed preview.
- After changing editor code, run `npx vite build`; after changing content or the renderer, `npm run build:site`. `wrangler dev` picks up Worker changes by itself.

### Tests

```sh
npm test             # unit tests (vitest): schema, responsive resolution, slugs/redirects, save, publish, components, MCP tools
npm run test:e2e     # browser tests (Playwright): site, nav, editor, live sync, quick edit; rewrites docs/screenshots
npm run typecheck
npm run build        # typecheck + editor + static site (what CI runs)
```

The browser tests start `wrangler dev` themselves. Editor tests need `EDITOR_PASSWORD` in `.dev.vars` and skip themselves without it. First time only: `npx playwright install chromium`.

## Secrets

Never commit or print these. Locally they live in `.dev.vars` at the repo root (gitignored):

| Name | Used for | Where |
|---|---|---|
| `EDITOR_PASSWORD` | Signing in to `/admin`; bearer token for `/mcp` | `.dev.vars`, and a Worker secret |
| `GITHUB_TOKEN` | Publish: commits `content/` (fine-grained token, Contents read/write on this repo only) | `.dev.vars`, and a Worker secret |
| `CLOUDFLARE_API_TOKEN` | The deploy Action runs `wrangler deploy` | GitHub repo secret (see `BLOCKERS.md`) |

To set or rotate a Worker secret: `cd cms && npx wrangler secret put EDITOR_PASSWORD`.

Non-secret settings are in `cms/wrangler.toml` under `[vars]`: `AUTH_MODE` (`password` or `access`, see `docs/auth.md`), `GITHUB_REPO`, and `PUBLISH_BRANCH` (the branch Publish commits to; `cms-v1` for now).

## Deploy

Only to the `*.workers.dev` preview. `wrangler.toml` has no routes or custom domains; keep it that way until cut-over.

```sh
cd cms
npm run deploy:preview     # build + wrangler deploy
```

Or let the Action do it: any push to `cms-v1` that touches `content/` or `cms/` runs tests, builds and deploys (once `CLOUDFLARE_API_TOKEN` is set as a repo secret).

Lighthouse, mobile, on the deployed preview (15 Nov 2026): `/sample` performance 99 (91 on the run before it), accessibility 100, best practices 100; `/` and `/diary` 100 across the board. `/sample` is unlisted, so its SEO score is lower on purpose (it is marked noindex).

## Using the editor

- **Top bar:** Desktop/Mobile switch (edits apply to the active breakpoint), save status, undo/redo, Preview (the draft, rendered like the live site), Publish.
- **Left rail:** Pages, Add (drag in sections and components), Layers (select, rename, lock, hide per breakpoint, reorder, overlays), Assets (media library: drop files to upload), Library (global components and templates), Theme (colours, fonts, text styles).
- **Right panel:** properties of what is selected. With nothing selected: page settings, navigation items and nav behaviour.
- **Sections:** flow (stacked), grid (split into columns; cells can span), free canvas (drag anywhere; snapping and guides; Shift locks an axis or keeps the ratio when resizing; Alt turns snapping off; arrows nudge; Shift-click selects several, then align or distribute).
- **Frames:** media sits in a frame. The frame has size, aspect ratio, corners, border, shadow; the content has Fill/Fit/Free, a draggable focal point, zoom and pan.
- **On a phone** the editor becomes quick edit: text, image swaps, diary entries, playlists, publish.
- **Claude:** see `docs/connect-claude.md`.

## How to add a component

Each component lives in its own folder under `cms/src/components/`. Say you want a `Quote`:

1. **`Quote/Quote.tsx`**: the content schema and the render. This file is shared by the public site, the draft preview in the Worker and the editor canvas, so it must not import editor code.

   ```tsx
   import { z } from "zod";
   import { defineComponent } from "../types";
   import { css } from "./Quote.styles";

   export const QuoteContent = z.object({ text: z.string(), by: z.string().optional() });
   export type QuoteContent = z.infer<typeof QuoteContent>;

   export const Quote = defineComponent<QuoteContent>({
     type: "Quote",                      // stored in content JSON; never rename it later
     label: "Quote",                     // shown in the editor
     category: "basic",                  // basic | media | embed | site
     schema: QuoteContent,
     defaults: { content: { text: "Say something worth quoting." } },
     css,
     Render: ({ content, ctx }) => (
       <blockquote className="quote">
         <p className="t-h2">{content.text}</p>
         {content.by ? <cite className="t-small">{content.by}</cite> : null}
       </blockquote>
     ),
   });
   ```

   `ctx.editing` is true on the editor canvas (show a placeholder for empty content, never navigate or autoplay). Use theme tokens: `var(--c-rust)` for colours, `t-<styleId>` classes for text styles. Set `framed: true` for media that should get the frame controls.

2. **`Quote/Quote.styles.ts`**: `export const css = \`.quote{…}\`;`. It is inlined only on pages that use the component. Mobile first; add a `@media (min-width:900px)` block for desktop. Respect `prefers-reduced-motion`.

3. **`Quote/Quote.puck.tsx`**: the editor fields for the content (layout, look and scroll effects are added automatically).

   ```tsx
   import type { Fields } from "@puckeditor/core";
   import type { QuoteContent } from "./Quote";

   export const fields: Fields<QuoteContent> = {
     text: { type: "textarea", label: "Quote" },
     by: { type: "text", label: "Who said it" },
   };
   ```

   For images, links and pickers use the helpers in `src/editor/fields/` (`mediaField`, `linkField`, `typeStyleField`, `collectionField`).

4. **`Quote/Quote.test.tsx`**: render it with `renderNode("Quote", { … })` from `../test-utils` and assert on the HTML.

5. **Register it** in two places: add `Quote` to the list in `src/components/registry.ts` (renderer, validation, MCP) and to `src/components/fields.ts` (editor). That is all: it appears in the Add panel, validates on save, renders on the site, and Claude can add it.

6. Check it at 390px, then run `npm test` and `npm run build`.

If the component needs JavaScript on the public site, add a small module under `src/runtime/` and call it from `src/runtime/index.ts`; load anything heavy on demand (see `runtime/lazy.ts`).

## Other things you might change

- **A new nav style:** write a `NavRenderer` (markup + CSS) next to `src/render/nav/pill.tsx` and register it in `src/render/nav/index.ts`.
- **The desktop breakpoint or design widths:** `src/schema/responsive.ts`.
- **Theme starting tokens and seed content:** `src/seed/`. `npx tsx scripts/seed.ts --force` rewrites `content/` from the seed (it overwrites published content, so only use it on a fresh setup).
- **Switching sign-in to Cloudflare Access:** `docs/auth.md`.
