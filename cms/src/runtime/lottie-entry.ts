// Bundled separately as /assets/lottie.js (the light, SVG-only player).
import lottie from "lottie-web/build/player/lottie_light";

(window as unknown as { lottie: typeof lottie }).lottie = lottie;
