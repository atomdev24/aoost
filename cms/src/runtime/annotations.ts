// Fruit annotations on pictures: play in when scrolled into view, the size readings counting up.

import { watchAnn } from "../components/Image/ann-layout";

export function initAnnotations() {
  const sets = document.querySelectorAll<HTMLElement>("[data-ann]");
  if (!sets.length) return;
  // Each reading layer sits on the picture's content (its crop on this screen size).
  watchAnn(document);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const play = (el: HTMLElement) => {
    const wait = Number(el.dataset.delay) || 0;
    if (wait && !el.dataset.waited) {
      el.dataset.waited = "1";
      setTimeout(() => play(el), wait * 1000);
      return;
    }
    el.classList.add("in");
    if (reduce) return;
    el.querySelectorAll<HTMLElement>("[data-count]").forEach((b, i) => {
      const to = Number(b.dataset.count) || 0;
      const delay = i * 650 + 600;
      b.textContent = "0";
      const t0 = performance.now() + delay;
      const step = (t: number) => {
        const p = Math.min(1, Math.max(0, (t - t0) / 700));
        b.textContent = String(Math.round(to * (1 - (1 - p) ** 3)));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  };
  if (!("IntersectionObserver" in window)) return sets.forEach(play);
  // Play once the visible part of the layer is past the bottom fifth of the screen. Not a share of the
  // layer: it covers the whole picture inside its frame, so a zoomed picture's layer can be several
  // screens big and would never reach a share like 35%.
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        play(e.target as HTMLElement);
      }
    },
    { rootMargin: "0px 0px -20% 0px" },
  );
  sets.forEach((s) => io.observe(s));
}
