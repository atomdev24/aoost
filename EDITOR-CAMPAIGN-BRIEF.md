# Campaign pages from a brief

**Goal.** A teammate fills in a short brief and gets a finished, on-brand Aerobotics campaign page
in one step, then asks Claude to polish the wording. Alex picked A (form) then C (Claude refines).

**Choices**
- Lives in New page → Campaign page, as "From a brief | From a template". The brief is offered in
  the demo and on sites that use the Aerobotics nav; otherwise only templates show.
- Fields: event name, dates, where, product (Bin Scan, Size, Grade), the ask (book a meeting,
  request a demo, find out more), one optional line, extra languages, optional end date.
- The page is built from the Aerobotics blocks: hero → product split → testimonial → a booking
  section with the HubSpot form (off until switched on, as for all forms) → footer. The hero button
  points at the form. "Find out more" has no form and links to the product page.
- Extra languages are added as translations of the page. The SEO description comes from the brief.
- "Ask Claude to polish the words" leaves an @Claude comment on the hero with the brief, asking for
  tighter wording and the translations. Nothing is published: the page starts as a draft.

**Checks**
- Unit tests: `src/editor/templates/campaign-brief.test.ts`.
- Browser: filled the brief in the demo at 1440 and 390; the page, its sections and the comment
  thread were created.
