// The public site's only script: small, deferred, no framework.
import { initEffects } from "./effects";
import { initFrames } from "./frames";
import { initLightbox } from "./lightbox";
import { initNav } from "./nav";
import { initSearch } from "./search";
import { initVideo } from "./video";

const start = () => {
  initNav();
  initEffects();
  initLightbox();
  initFrames();
  initSearch();
  initVideo();
};
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
else start();
