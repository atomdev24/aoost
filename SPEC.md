# aoost CMS & visual editor: spec

Owner: Alex Oostendurp · Repo: `atomdev24/aoost` · Domain: `alexoostendurp.com` (on Cloudflare)
Design reference: the "aoost — nav bar & page editor mockup" canvas (nav, nav lab, editor, menus, media artboards).

## 1. What this is

aoost is Alex's personal art site: a visual diary for people in the know, not a corporate portfolio. Most visitors come from an Instagram bio link, so **mobile comes first**. The look is edgy-artistic but clean, with clean modern type and clean animation. Western line art (cowboys, cacti, scorpions) appears only on the original homepage and in the rodeo mini game; the rest of the site is not cowboy-themed.

This project adds a **Framer-style visual editor and CMS** so Alex can design and publish pages without a developer. It needs real design freedom (frames, layout splits, a grid/freeform mix, overlays, separate mobile and desktop layouts) without turning into a rigid WordPress/HubSpot page builder.

Existing pieces that must keep working: the current GitHub Pages site (until cut-over), the rodeo lasso game, and its Supabase leaderboard.

## 2. Stack (decided; don't re-litigate)

| Concern | Decision |
|---|---|
| Language / UI | TypeScript, React, Vite |
| Editor engine | Puck (MIT, `@puckeditor/core`; check the current package name and version in its README) with our own components and custom fields |
| Public site | Pre-rendered static HTML/CSS from page JSON at build time. Minimal JS, only where a component needs it |
| Hosting | Cloudflare Workers with static assets: one Worker serves the site, `/admin` (editor) and `/api/*` |
| Content storage | JSON files in the repo under `content/` (source of truth, versioned by git) |
| Drafts and live sync | A Durable Object per site holding the working draft and broadcasting changes over WebSocket. If Durable Objects aren't usable on the free plan, fall back to KV plus 1-second polling and note it in `DECISIONS.md` |
| Media | Cloudflare R2 bucket (`aoost-media`), served through the Worker with resizing and modern formats |
| Editor auth | For now: an `EDITOR_PASSWORD` secret (session cookie for the editor, bearer token for `/mcp`). Later: Cloudflare Access in front of `/admin`, `/api/editor/*` and `/mcp`. Build it so switching is a config change |
| Publishing | Publish commits `content/` to GitHub through the API (token in a Worker secret), then a GitHub Action builds and runs `wrangler deploy` |
| Cost | Free tiers only. Never add a paid service |

## 3. Content model

```
Site
  settings     { title, socials[], defaultSeo, favicon }
  theme        { colors, fonts, typeStyles, radii, spacing }   // design tokens
  nav          NavConfig                                       // see section 6
  globals      Component[]                                     // reusable "symbols", e.g. footer
  pages        Page[]
  redirects    { from, to }[]

Page
  id, title, slug, parentId | null, status: "published" | "draft" | "unlisted"
  template, seo { title, description, image }, isHome
  sections     Section[]

Section
  id, kind: "flow" | "grid" | "canvas"
  layout       Responsive<SectionLayout>   // columns, rows, gap, padding, min-height, background
  children     Node[]                      // flow/grid: ordered cells; canvas: positioned layers

Node (frame or component)
  id, type, content { ... }                // shared across breakpoints
  style        Responsive<Style>           // size, position, radius per corner, border, shadow, opacity, blend, visibility
  frame?       Responsive<FrameFit>        // media nodes: fit (fill/fit/free), focal point, zoom, pan

Overlay (page level)
  node, anchor: { sectionId, edge, offset } | "viewport", sticky?, z
```

### Responsive model (core rule)

- `Responsive<T> = { base: T; desktop?: Partial<T> }`. **The base is mobile.** Desktop inherits from mobile and only stores the values Alex changed. Leave room for `tablet` later; don't build it now.
- Content (text, media source, links) is never per-breakpoint. Layout and style are.
- **Canvas sections:** every layer stores `x, y, w, h, rotation, z` per breakpoint. If desktop has none yet, derive it by scaling from mobile until Alex moves it.
- A section can switch to a fully custom desktop layout. Content stays shared.
- The editor shows an override dot on any property that differs from mobile, with "reset to mobile".
- Rendering turns resolved styles into plain CSS with media queries at build time. No layout JS and no flash on load.

## 4. Editor (v1 features)

- Canvas preview with a Desktop/Mobile switch. Edits apply to the active breakpoint.
- **Sections:** add, reorder, duplicate, delete. Kinds are flow, grid (split into N columns/rows with drop zones) and free canvas (drag anywhere, snapping, smart guides, axis lock with Shift, align and distribute).
- **Frames:** InDesign-style frame vs content. The frame has size, aspect ratio and per-corner radius. The content inside has fit, focal point, zoom and pan.
- **Overlays** that straddle sections or stick to the viewport.
- A layers panel with lock, hide and rename.
- **Text and colour styles** (like paragraph styles): change one style and it updates everywhere. Theme tokens are editable in a Theme panel.
- **Global components:** edit once, update everywhere.
- **Templates:** save a section or a page as a template. Built-in starters: Blank, Gallery, Diary entry, Playlist.
- Undo/redo, autosave to draft, Preview, and Publish. Version history comes from git history.
- **Scroll effects** per node: fade/slide in on enter, parallax, sticky. Honour `prefers-reduced-motion`.
- **On small screens:** the editor drops to a "quick edit" mode for swapping text and images, adding diary entries or playlists, and publishing. Precise drag layout is desktop-only.
- **Starter components** for v1: Text, Image, Video, Embed, Code, Button, Spacer, Divider, Gallery grid, Playlist card, Spotify embed, Diary list. More come in a later run.

## 5. Pages

This matches the Editor artboard.

- **Pages list:** home (the logo link) and nested sub-pages, one level deep.
- **New page:** name, then an automatic URL (editable), a template, "show in navigation" and "place it" (top level or under a page).
- **Page settings:**
  - Rename. The nav label follows the name unless it's overridden.
  - Edit the URL. The old URL gets a redirect automatically, and children update with it.
  - Status: Published, Draft, or Unlisted (live by link only).
  - Search and share fields.
  - Duplicate.
  - Delete, with confirmation. Deleting a page removes its children and its nav entries and leaves a redirect to home.
- Pages hidden from the nav still work at their URL, e.g. `/links`.

## 6. Navigation (chosen: floating pill)

Behaviour, matching Nav lab style 2:

- A dark (`#141414`) capsule floating 16px from the top, centred: logo, then links, then optional items.
- **Scroll down** more than 140px: it slides up out of view (`translateY(-140%)`). **Any scroll up:** it slides back. Use 4px of hysteresis. Transition `transform .5s cubic-bezier(.2,.8,.2,1)`. A soft shadow appears once you've scrolled.
- **Current page or section:** the link gets a bone pill (`#F3EFE6` background, ink text). Hover is a faint bone tint. Pressing scales to 0.95.
- **Mobile:** the pill shows the logo and a Menu button. The menu is full-screen ink with big Space Grotesk links that stagger up (`rise` .5s, 60ms stagger), with Instagram and Spotify at the bottom.
- Alternative styles in the lab (bar, dock, rail, corner, inline) are **not** needed for v1. Keep the nav renderer pluggable so a style can be added later.

**Ten nav item types**, from the Menus artboard: page link, section link, external link/email, dropdown (automatic from sub-pages, or manual), mega menu (a panel built with the same editor: columns, link lists, image/video cards, embeds), button/CTA, social icons, search (pages, diary entries, artwork titles), embed/code (sandboxed), and label/divider.

**Item settings:** label, link target (page, section, URL or email), icon (none/left/right), badge (text plus optional expiry date), show on (both/desktop/mobile), hover effect, new tab, and screen-reader label. The current-page marker is a global setting.

**Menu behaviour:** opens on hover with a 120ms delay on desktop, or on tap. Keyboard and screen readers work properly (menu-button pattern). On phones, dropdowns become accordions and mega menus stack. Motion respects reduced-motion settings.

## 7. Media & embeds

- **Images:** JPG, PNG, WebP, AVIF, GIF and SVG. Upload to R2 and serve resized WebP/AVIF per breakpoint.
  - Frame controls: fill, fit, or free pan/zoom; focal point; crop per breakpoint.
  - Effects: border, shadow, opacity, blend mode, grayscale and duotone.
  - Also: alt text, caption, lazy loading, and a full-screen lightbox.
- **Video:** MP4/WebM uploads to R2, or YouTube/Vimeo links.
  - Options: autoplay muted, loop, controls, play when in view, and a poster frame.
  - On phones: a lighter file or a still image instead.
  - Video can fill a frame or sit behind a section.
- **Audio:** an audio player block, plus Spotify and SoundCloud embeds.
- **Embeds:** paste a link from Spotify, YouTube, SoundCloud, Instagram or Google Maps. Lottie and `.glb` 3D models are their own blocks.
- **Custom code:** an HTML/CSS/JS block with two modes:
  - **Sandboxed** (default): `<iframe sandbox srcdoc>` that resizes itself to fit its content.
  - **Inline**: an advanced opt-in with a warning.
- **Fonts:** upload (Facile Sans) or pick Google Fonts.
- **Files:** PDFs and zips as download links.

## 8. Claude connector (MCP) and live sync

Goal: Alex chats with Claude while the editor is open, and Claude's edits show up on his canvas within about a second.

- A **remote MCP server** at `/mcp` in the same Worker, using streamable HTTP. For now it's protected by the `EDITOR_PASSWORD` bearer token. Later it moves behind Cloudflare Access, with a service token for Claude.
- **Tools**, all with typed schemas:
  - `list_pages`, `get_page`, `get_site` (theme, nav, globals)
  - `get_editor_context`: the page Alex has open, the selected node ids, and the active breakpoint
  - `add_section`, `update_node`, `move_node`, `delete_node`, `set_responsive_override`
  - `create_page`, `update_page_settings`, `update_nav`
  - `upload_media_from_url`
  - `get_preview_screenshot`: page and breakpoint as a PNG, using Cloudflare Browser Rendering if the free tier allows. Otherwise the open editor captures the preview itself and posts it back.
  - `publish`: only when Alex explicitly asks in chat. The tool description must say so.
- Every tool writes to the **draft** through the Durable Object. Nothing goes live without Publish.
- **Live sync:** the editor subscribes to the Durable Object over WebSocket. Claude's changes apply as patches, briefly highlight the changed nodes, and go on the undo stack as "Claude: <summary>".
- The editor publishes Alex's current selection and breakpoint to the Durable Object, so "make this rounder" resolves to the clicked node.
- Write `docs/connect-claude.md` explaining how Alex adds the connector to Claude.

## 9. Design tokens (starting point)

- **Colours:** bone `#F3EFE6`, sand `#E7E0D2`, ink `#141414`, muted text `#3D3830` / `#5E584E`, rust `#B5421A` (on light) / `#E2683A` (on dark).
- **Editor UI (dark):** `#141416`, `#1C1C1F` and `#222226`, with lines `#34343A` / `#45454C` and text `#ECE9E3` / `#A8A39A`.
- **Type:** Facile Sans for display once Alex supplies the files (`assets/fonts/`). Until then use Space Grotesk for display and Inter for body.
- **Motion easing:** `cubic-bezier(.2,.8,.2,1)`.
- **Accessibility:** contrast at least 4.5:1 for text, touch targets at least 44px, real buttons and links.

## 10. Not in this run

The full component library and polish, migrating every existing page, the separate app, analytics, a shop/e-commerce, multi-user editing, the tablet breakpoint, and the alternative nav styles.

## 11. Done means

- The editor runs at `/admin` behind the password, on a `*.workers.dev` preview URL. Alex can create, rename, re-URL, duplicate and delete pages, build sections with all three section kinds, set mobile and desktop layouts, use every media type, configure the floating pill nav and its menus, and publish.
- The published site renders from JSON as static HTML/CSS, and Lighthouse mobile performance is at least 90 on a sample page.
- The Claude connector works end to end: an edit made through `/mcp` appears live in an open editor.
- Tests cover the content schema, responsive resolution, slug/redirect logic, and save/publish. Playwright screenshots at 390px and 1440px of a sample page, committed to `docs/screenshots/`.
- The README covers local dev, deploy, secrets, and how to add a component.
