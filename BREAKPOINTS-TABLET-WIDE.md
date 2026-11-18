# Task: tablet and widescreen as full editor breakpoints

Alex asked (Nov 2026) for **tablet and widescreen** to be full editor breakpoints alongside mobile and desktop. Today there are two (`cms/src/schema/responsive.ts`: `Breakpoint = "mobile" | "desktop"`, `DESIGN_WIDTH` 390 and 1440). Work on branch `breakpoints-tablet-wide`, created fresh from the latest `main` (delete and recreate any old local branch of that name; it holds no work). Commit after each step. **Never push or touch `main`**: Claude reviews and merges.

Follow `CLAUDE.md`:
- log every judgement call in `DECISIONS.md` and anything that needs Alex in `BLOCKERS.md`;
- use `npm_config_cache=/tmp/aoost-npm-cache`;
- never print secrets.

## Hard rule: existing content is untouched

Content with no tablet or widescreen values must render **byte-identically**, on every public page. Verify this:
1. Build `main` first to `/tmp/aoost-dist-before-bp` with the build timestamp pinned.
2. Diff it against this branch's build (excluding `admin/`).

The content format change must be **additive and optional**: no migration of existing files.

## 1. Model

- Add `tablet` (design width **834**) and `widescreen` (design width **1920**).
- Before choosing the cascade and the media-query ranges, read how `resolve` and `setAt` and the public CSS output treat mobile vs desktop today. Then extend them consistently. A sensible default:
  - desktop stays the base;
  - widescreen inherits desktop;
  - tablet inherits desktop;
  - mobile inherits tablet, then desktop.
- Log the chosen cascade and ranges in `DECISIONS.md`.
- Everything per-breakpoint must accept the new keys: style, layout, visibility ("Visible on"), canvas layer boxes and `ResponsiveFrameFit`, including the optional `frame` on aoost image items.

## 2. Public render

- Emit CSS for the new breakpoints only when a value is set.
- Nav, the aoost blocks and the runtime scripts must behave at 834 and 1920 widths; fix only real breakages.

## 3. Editor

- **Frames:** Tablet and Widescreen frames exist on the free canvas and are **hidden by default** (Section 1 decision). Shown frames remember their position per page.
- **Centre island:** breakpoint buttons for all four sizes.
- **Inspector:**
  - the scope bar reads "Editing Tablet · N changes";
  - tinted fields and the label menu work for every breakpoint;
  - "Reset to desktop" becomes "Reset to <the size it inherits from>". Keep "Use on all sizes".
- **"+ Add a breakpoint" slot:** remove the disabled slot, or make it toggle the hidden frames.
- **Image framing and adjust mode** write to the active frame's breakpoint.
- **The Claude connector (`/mcp`)** must accept the new breakpoints in its tools and schemas.

## 4. Tests and done

- **Unit tests:**
  - resolve and cascade for all four sizes;
  - CSS output only when set;
  - schema round-trip.
- **Browser tests:**
  - show the Tablet frame, change columns there, and confirm desktop and mobile are unchanged and the scope bar counts it;
  - reset it;
  - adjust a hero image on Widescreen.
- **Screenshot:** `docs/screenshots/breakpoints/four-frames.png` (all four frames shown).
- **Checks:**
  - all unit tests and the build pass;
  - the editor browser specs pass;
  - public output is byte-identical against `/tmp/aoost-dist-before-bp`.
- **Summary:** append a short summary to `DECISIONS.md`.
