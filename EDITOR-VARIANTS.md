# Variants front and centre (Nov 2026)

Alex's answers: **anyone proposes, managers pick**; variants show as **rows on the board**; **A/B tests
later**. Mockups: Design canvas "aoost editor: variants front and centre"
(https://claude.ai/artifact/6zbBAbhrJmJgMhvxjhczZz). Alex said "build them all out" and will try the
experience after the other changes.

## How it works
- **Rows on the board.** Under the page being edited, every other version of it (the page and its
  variants) draws as its own row of frames, one per screen size shown (`variants/VersionRows.tsx`).
  A label to the left of each row: name, status (Live page / Draft / Proposed), who made it, votes,
  open comments, "Edit this one" and a ⋯ menu (propose, rename, review, pick, new variant from
  this, delete). Clicking a row (or a block in it) opens that version in the top row; the camera
  stays put. Below the rows: **+ New variant of <page>**. Phones show one frame, so no rows there.
- **What changed** is outlined in purple, dashed, in the editable frame, the side frames, the rows
  and Review (`changedIds` in `model/variants.ts`, by the variant's ids mapped to the page's).
- **Statuses** (`Page.variantStatus`): draft (unset) → `proposed` → picked (becomes the page) or
  `archived` (an earlier version). `variantBy` is who made it; `variantVotes` one per person.
- **Propose** from the variant band or the row menu. Proposed variants count on the Pages button
  and under Pages → **To review**.
- **Review** (`templates/DesignsBoard.tsx`, opened from the top bar's **Versions** button, the
  band, a row menu, Pages, ⌘K): every version side by side in columns, Desktop or Mobile, scrolling
  together, changes outlined with a count, votes, comments, Edit, and Pick for managers. "Copy review
  link" opens Review for that page (`?page=…&review=1`).
- **Pick** (`variants/PickSheet.tsx`, Managers and Owners): the steps Draft → Proposed → Picked →
  Staging → Live; the picked content replaces the page in the draft; **nothing is thrown away**: the
  page as it was ("Home before 26 Nov") and every other variant become earlier versions, votes and
  all (`pickVersion`). Then send to staging (default) or just pick. "Test it live against the page"
  shows as Later.
- **Versions** button (top bar, when a page has variants or earlier versions): jump between
  versions, Review, + New variant, how the board shows rows (every version / the page and proposed
  ones / only the one I'm editing), outline on or off, and earlier versions to bring back or delete.
- The old Elect (variant band, ⌘K, Compare's action) now opens the Pick sheet.

## Not yet
- A/B tests: live traffic split between a page and a proposed variant, with Clarity numbers.
- Notifications (the mockup's "Jess proposed Spring hero"): needs the push/mention work in
  HANDOVER.md's "Web app extras".
- Variant rows on phones; dragging a block from one row to another.

## Checks
Unit tests (`model/variants.test.ts`: propose, votes, pick keeps the others, keep as it is, bring
back, what changed); build within budget; browser at 1440 and 390.
