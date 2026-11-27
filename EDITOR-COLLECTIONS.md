# Collections (Framer-style CMS)

**Goal.** Colleagues manage repeated pages (success stories, events, case studies, blog-like
entries) from a simple table, while the page design stays on the canvas. Like Framer's CMS: one
design per collection, one row per entry, each live row is its own page.

## Choices

- **Data.** `site.cms` (stored in `content/cms.json`, absent = none): a list of collections. A
  collection has a name, an item name ("Story"), a one-segment address (`/success-stories`), its
  fields (text, long text, image, link, date, toggle, choice, number) and its items. An item has a
  title, a slug, a status (Live or Draft) and a value per field. Entries are rows, not pages, so a
  hundred stories don't mean a hundred page files.
- **Page design.** Each collection has one design page (`page.collectionId`), a normal page you edit
  on the canvas, kept as a draft so it is never built itself (its address is `<base>/item-design`,
  a slug items can't take). Blocks on it are **connected** to fields with `node.bind`
  (`{ contentKey: fieldId }`, `title` for the title).
- **Item pages are made, not stored.** `cmsPages(site)` turns every item into a page: the design's
  sections with connected values filled in, the item's title and address, share text from the
  collection's summary field. The build, preview, staging, history and live views find pages
  through `builtPages` and `pageAt`, so item pages work everywhere pages do. Live items are built
  and listed; draft items only show in the signed-in preview.
- **Table view** (rail › Collections, ⌘K "Collections"): full screen. Collections on the left; the
  table on the right with Title, Address, Status and a column per field. Cells edit in place;
  pictures open the picture library; the status pill switches Live/Draft; rows can be added,
  opened, duplicated and deleted, sorted by any column and filtered by status or search; selected
  rows can be set live, set to draft or deleted together. Opening a row shows a form with every
  field beside a live preview of the item page. **Fields** edits the collection (add, rename,
  change type, reorder, remove); **Page design** opens the design on the canvas.
- **Connecting on the canvas.** On a design page the inspector shows **Connect to collection**:
  each text, picture and link setting of the selected block can take a field. Connected blocks
  wear a purple tag on the canvas, as in Framer.
- **Lists.** The Success stories and Events blocks can fill themselves from a collection (Source:
  a collection, plus which field is the picture, the text, the date…), newest or in table order.
- **Saving and publishing.** Edits are ordinary draft edits (one `set cms` op), so they sync live to
  everyone, go to staging and publish with the rest. Last write wins on the collections, like the
  other site settings.
- **Demo.** The demo starts with two example collections (Success stories, Events) built from the
  Aerobotics blocks; an empty site offers them with one click.

## Not yet

- Editors limited to the table (design locked): the Worker would need to accept `cms`-only edits
  from the Editor role.
- References between collections, rich text, per-language values, scheduled items, CSV import.

## Checks

- Unit: model (slugs, fields, bindings, item pages, removal of a field drops its values and
  connections), build (item pages built, sitemap, search; drafts not built), Worker preview of an
  item, schema with and without `cms.json`.
- Browser (local `wrangler dev`, demo): open the table, add an item, edit cells, switch status,
  connect a block, preview an item, list block filled from a collection; desktop and 390px.
