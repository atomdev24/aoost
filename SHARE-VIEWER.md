# Task: clover share preview and favicon, and a "dark room" artwork viewer

Alex chose these on 19 Nov 2026. See the design canvas https://claude.ai/artifact/CkfE64KhFqkR9rQQM5G8Sy, boards "Share preview and favicon" (option A) and "Viewer 1 · Dark room". Work on branch `share-viewer` from the latest `main`. Commit after each step. Never push or touch `main`; Claude merges. Follow `CLAUDE.md`, use `npm_config_cache=/tmp/aoost-npm-cache`, and never commit `cms/node_modules`.

## 1. Share preview and favicon (every public page)

- **Share image:** make a 1200×630 Open Graph image. Use the clover icon (`art/app-icon-1024.png`), centred at about 60% of the height, on pure black. Save it as a static asset.
- **Tags on every public page:**
  - `og:image`, `og:image:width`, `og:image:height`, `og:title` (the page title, which is "aoost" for Home), `og:url` and `og:type=website`;
  - `twitter:card=summary_large_image`;
  - **no description text**, since Alex wants the site barely there. If a description tag already exists, leave it empty or remove it.
- **Favicon:**
  - favicon.ico plus 32 px and 16 px PNGs, made from the clover (`art/app-icon-*.png`);
  - `apple-touch-icon` 180 px.
  - The editor's PWA icons are added in another branch (`editor-phone-palette`). If that's merged by the time you start, reuse its files rather than duplicating them.
- **Settings:** add a site setting so the share image can be swapped later in the editor (Site or Global settings, "Share image"); the default is the clover image.

## 2. Artwork viewer: dark room (AoostViewer, the lightbox that opens when a project piece is tapped)

- **Room:** a near-black background (`#0c0c0d`) with the artwork centred, as large as fits (contain), with generous margins.
- **Controls:**
  - a mono counter "2 / 6" at the top left;
  - round outline close (X) at the top right;
  - previous and next arrows in the middle of each side;
  - swipe on touch;
  - ← → and Esc keys;
  - focus is trapped while it's open.
- **No labels by default.** Each project piece gets optional plaque fields in the editor: title, medium, year and note. Only if a piece has any of them does a small round "i" button appear at the bottom left; tapping it shows a quiet plaque card (title, then "medium, year" in mono, then the note). Pieces without plaque text show nothing extra.
- **Motion:** opening fades from black with the piece scaling up gently from where it was on the table; respect `prefers-reduced-motion`.
- **Scope:** keep the existing open-from-table behaviour, and apply the viewer everywhere the projects open it.

## Done means

- **Unit tests:**
  - the OG and favicon tags on a built page;
  - the plaque only rendering when fields exist.
- **Browser test:** open a piece, press → to go to the next, the counter updates, the "i" is absent with no plaque and present when a plaque is set, and Esc closes.
- **Screenshots:** `docs/screenshots/share-viewer/` (viewer at 1440 and 390, plus the OG image).
- **Checks:** all unit tests and the build pass. Public output changes only in the head tags, the new icon and OG files, and the viewer markup, CSS and JS.
- **Summary:** append a short summary to `DECISIONS.md`.

## 3. Inside a sketchbook: two-page spread in the dark room (AoostJournals, the opened-book view)

Board "Inside · Your pick: spread + dark room + arrows" on the canvas.

- **Opening a book:** it opens into the same dark room as the artwork viewer (`#0c0c0d`). A **two-page spread** sits centred on the book's own cover:
  - the cover edge shows about 4px around the pages, in the cover colour or material (kraft or leather where set);
  - there's a soft gutter shadow at the spine;
  - the pages keep their existing paper and items.
- **Controls:**
  - top left: a small cover swatch plus the book title (mono);
  - top right: a counter "4–5 / 12" and a round close (X);
  - round outline previous and next arrows beside the spread;
  - dots below the spread.
- **Turning:** the arrows turn a whole spread with a quick page-turn animation (about 450ms, a 3D rotateY page-flip; a crossfade under `prefers-reduced-motion`). There's **no drag to turn**. ← → keys and swipe also turn.
- **Phones (under 768px):** one page at a time with the same controls, and the counter shows a single page number.
- **Keep everything else as it is:** the existing editor for placing items on pages, and how the books open from the shelf.
- **Browser test:** open sketchbook 1, check that two pages are visible on desktop and one on mobile, that → advances the counter, and that Esc closes.

## 4. About page (draft; Alex publishes it himself)

Board "About 1 · One line and the tools", but keep the **original skills display**.

- **Content:** fill the existing `about` page in `content/` (it's a draft; **keep it a draft**, because publishing it adds it to the nav, and Alex will decide when):
  - a small mono label "aoost / about";
  - the line `Things I make, when I get to them.` large and light (Lexend 300, about 48px desktop and 30px mobile);
  - `Alex · Cape Town` in small mono;
  - a hairline;
  - the **skills block exactly as it was on the homepage**: reuse the AoostTools block, with its tools, level words and stat bars, and its animation;
  - two links, Instagram and Spotify, from `settings.socials`.
- **Background:** the cutting mat, as on the homepage.
- **Headings:** sentence case, with no other text.
- The homepage's hidden skills section stays hidden. Don't delete it.

## 5. 404 page: the clover

Board "404: three options", option B.

- Pure black, the clover (`art/app-icon-1024.png`, or the OG/favicon source) centred at about 200px and slowly turning (around 40s per rotation; still under `prefers-reduced-motion`).
- Below it, in small mono: `404 · back`, where "back" links to `/`.
- No other text.
- The page title is "aoost".
- It must be served for unknown paths as the current 404 is.

**Checks for 4–5:** a browser test that an unknown URL shows the clover 404 with a link to `/`, and that the draft preview of `/about` shows the line, the skills bars and the links.
