// Fruit annotations on pictures: play in when scrolled into view, the size readings counting up.

export function initAnnotations() {
  const sets = document.querySelectorAll<HTMLElement>("[data-ann]");
  if (!sets.length) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const play = (el: HTMLElement) => {
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
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        play(e.target as HTMLElement);
      }
    },
    { threshold: 0.35 },
  );
  sets.forEach((s) => io.observe(s));
}
