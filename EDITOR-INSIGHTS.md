# Visitor insights with Microsoft Clarity (foundation 4)

**Goal.** See how people use the published pages, from inside the editor, and show it in the demo
using aoost.com's own numbers.

**Choices**
- *Setup in the editor:* ⋯ → Visitor insights… → paste the Clarity project ID (or a link to the
  project) → Save → publish. The ID lives in the site settings (it's public anyway). Removing it
  and publishing takes Clarity off the pages.
- *On the site:* Clarity's standard tag on published pages only (never previews or the editor),
  plus a small cookie notice bottom left ("OK" / "No thanks"), kept on the device and passed to
  Clarity's consent API. Clarity already waits for consent from visitors in Europe (since 31 Oct
  2025); outside Europe it counts by default. The notice can be switched off. Not legal advice:
  check the wording if the Aerobotics site uses this.
- *Numbers:* Clarity's export API gives only the last 1–3 days and 10 requests a day, so the server
  fetches the last 24 hours every morning (03:00 Cape Town, the existing 01:00 UTC cron), by page and
  by device, and keeps 120 days with the real draft. "Fetch now" for Managers, at most every 3 hours.
  The token is a Worker secret (`CLARITY_API_TOKEN`) and never reaches a browser.
- *The view:* visits (with a trend), how far people scroll, active time, frustrated clicks (rage,
  dead, quick backs), device split, and every page with links to its heatmap and recordings in
  Clarity. 7, 30 or 90 days. The demo shows the same view, read-only, with the real site's numbers.
- Clarity documents only its Traffic fields; the rest are read defensively (a missing field shows
  "–"). Each day's full reply is stored, so new fields can be shown later without losing history.

**Checks.** `model/insights.test.ts`, the tag test in `render/render.test.tsx`; browser: admin
setup, demo with sample numbers at 1440 and 390, empty state, the cookie notice at 390.
