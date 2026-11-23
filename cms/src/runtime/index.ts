// The public site's only script: small, deferred, no framework.
import { initEffects } from "./effects";
import { initFrames } from "./frames";
import { initLazy } from "./lazy";
import { initLightbox } from "./lightbox";
import { initNav } from "./nav";
import { initSearch } from "./search";
import { initVideo } from "./video";
import { initAnnotations } from "./annotations";

const start = () => {
  initNav();
  initEffects();
  initLightbox();
  initFrames();
  initSearch();
  initVideo();
  initAnnotations();
  initLazy();
};
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
else start();
