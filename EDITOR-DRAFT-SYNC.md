# Task: keep drafts in step with the live site, and keep pictures covering their frames

On 19 Nov two problems showed up in the editor:

1. **Stale draft.** The editor's draft (in the `DraftStore` Durable Object, `cms/src/worker/draft-store.ts`) is a full copy of the content files. When content changes in git and deploys (PR #8 changed `home.json` and `site.json`), an existing draft keeps the old content. Publishing it would silently revert those changes. Claude patched Alex's draft by hand this time.
2. **Grey strip.** In Free mode, adjust image lets you pan the picture until the frame's background shows at an edge, which looks broken.

Work on branch `editor-draft-sync` from `main`. Commit after each step. Never push or touch `main`; Claude merges. Follow `CLAUDE.md` and use `npm_config_cache=/tmp/aoost-npm-cache`.

## 1. Drafts follow new deploys

- **Record a base:** store the fingerprint and the files of the **base** the draft started from (the published or built content at the moment the draft was first created or last synced).
- **When a newer deploy is detected** (built fingerprint ≠ the draft's base, and it isn't just our own publish landing), do a **three-way merge** per content file, at the JSON level, with the base as the common ancestor:
  - change only in the deploy: take it;
  - change only in the draft: keep it;
  - the same change on both sides: fine;
  - **a real conflict** (both changed the same value differently): keep the draft's value and record the conflict.
- **Afterwards:** set the new base, save, and broadcast to open editors.
- **Tell the user:**
  - after an automatic sync, show a small toast ("Updated your draft with changes from the live site");
  - if there were conflicts, list them in the publish sheet with "Use live" or "Keep mine" per item.
- **Validate the merged site with the schema.** If it's invalid, don't merge; show a banner offering "Start the draft from the live site" (which discards the draft) or "Keep my draft".
- **Publish safety:** before committing, the publish path must refuse (with a clear message) if the draft's base is older than `main`'s content, unless a sync has just run.
- **Unit tests:** cover the merge cases: deploy-only change, draft-only change, both changed the same, conflict, removed keys, and arrays (match by `id` where items have one, otherwise treat the array as one value).

## 2. Pictures always cover their frame

- **In Free mode, clamp the pan** (and the zoom, minimum 1 relative to cover) so the picture always covers the frame. This applies to `adjust.ts` and to the drag, scroll and pinch handlers in `AdjustImage`.
- **Holding Alt** while dragging allows overhang, for deliberate gaps; show "Alt: free move" in the adjust tag.
- **Add "Fill frame"** to the image popover. It resets a picture to cover, centred on the current focal point.
- **Existing content stays as stored.** The clamp only applies to new moves.
- **Unit tests:** the clamp maths for portrait and landscape pictures in portrait and landscape frames, plus Alt overhang.

## Done means

- All unit tests pass, the build passes, and the editor browser specs pass.
- A new browser test: drag a hero image far left in the Mobile frame and check the picture still covers the frame.
- Public output is byte-identical against `main` (built with the timestamp pinned).
- Append a short summary to `DECISIONS.md`.
