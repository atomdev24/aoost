// The dark-room viewer's chrome, shared by the server markup (AoostViewer.tsx) and the script's
// fallback (runtime/viewer.js makes the same dialog when the block isn't on the page).
const icon = (d: string) => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;

export const viewerInner =
  `<p class="vcount" id="vCount" aria-live="polite"></p>` +
  `<button class="vbtn vclose" id="vClose" type="button" aria-label="Close">${icon("M6 6l12 12M18 6L6 18")}</button>` +
  `<div class="stage" id="vStage"></div>` +
  `<button class="vbtn vnav vprev" id="vPrev" type="button" aria-label="Previous">${icon("M15 5l-7 7 7 7")}</button>` +
  `<button class="vbtn vnav vnext" id="vNext" type="button" aria-label="Next">${icon("M9 5l7 7-7 7")}</button>` +
  `<button class="vbtn vinfo" id="vInfo" type="button" aria-label="About this piece" aria-expanded="false" aria-controls="vPlaque" hidden>i</button>` +
  `<div class="vplaque" id="vPlaque" hidden></div>`;
