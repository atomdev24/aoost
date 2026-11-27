# Text editing (foundation 1)

**Goal.** Text you can style like in HubSpot or a design app, without losing the guardrails:
style single words on the page, and set the whole block's type per screen size.

**Before.** One plain box per text block (`**bold**`, `*italic*`, `[link](url)` typed as code);
size, colour and alignment for the whole block only.

**Choices**
- *On the page:* double-click a text block (or select it and press Enter) to edit it where it
  sits. A frosted bar above it (docked at the bottom on phones, above the keyboard) has Bold,
  Italic, Underline, Strikethrough, Colour (theme colours first, or a hex code), Link, bulleted and
  numbered lists, Clear formatting and Done. Esc, Done or a click elsewhere finishes.
- *Whole block, per screen size* (Style → Text): Font (display, body, mono), Size, Weight
  (100–900), Line height, Letter spacing, Colour, Align, Case. Empty means the text style decides,
  so the theme's type scale stays the default.
- *Storage:* `text` stays the words (search, Claude, translations, templates all keep working);
  `rich` is added only when the words carry more than `text` can say (colour, underline, lists,
  paragraphs). It's a strict subset of Tiptap's JSON, checked by zod (`schema/rich.ts`), and drawn
  as React elements, never as HTML (`render/rich.tsx`). The rich version is drawn only while it
  still says what `text` says, so a change to just the words (Claude, a translation) simply wins.
  No migration: existing pages are untouched until someone edits a block.
- *Engine:* Tiptap (already inside Puck), loaded only when you first edit text (not in the
  first-load bundle). Its own undo works while typing; the whole edit is one step in the editor's
  history.

**Not yet** (next steps): the same editor for the Aerobotics blocks' text fields; inline font
size; a Simple mode that hides the per-block type controls for teammates (brand guardrails).

**Checks.** `model/rich.test.tsx` (round trip, matching rule, cleaning, drawing). Browser: edit,
bold, colour, list, undo inside and after, at 1440 and 390.

## Words in other blocks (27 Nov 2026)
Double-click any words a block shows (Aerobotics headings, descriptions, FAQ answers, button labels;
the aoost blocks' headings too) to edit them in place: the elements hide and an editor in the same
type sits exactly over them. It works out which field the words came from by matching what a visitor
reads (editor/rich/field-locate.ts), so blocks need no changes to take part.
- Fields a block draws with render/inline keep their marked-up form (**bold**, *italic*,
  [link](/x)) and get Bold, Italic and Link; the list is `MARKED` in field-locate.ts. The Aerobotics
  descriptions, answers and card text now draw those marks.
- Every other field is edited as plain words: no buttons, no shortcuts.
- One-line fields finish on Enter; Esc, Done or a click elsewhere finish too. Saved once, one undo step.
- Not yet: font size inside a field (the marked-up form can't hold it).
