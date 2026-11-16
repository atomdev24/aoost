// Scroll effects: enter animations and parallax. Skipped entirely when the
// visitor prefers reduced motion (the CSS leaves everything visible).

export function initEffects() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const entering = document.querySelectorAll<HTMLElement>("[data-enter]");
  if (entering.length) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    entering.forEach((el) => io.observe(el));
  }

  const drifting = Array.from(document.querySelectorAll<HTMLElement>("[data-parallax]"));
  if (drifting.length) {
    let queued = false;
    const update = () => {
      queued = false;
      const mid = window.innerHeight / 2;
      for (const el of drifting) {
        const rect = el.getBoundingClientRect();
        const offset = rect.top + rect.height / 2 - mid;
        el.style.translate = `0 ${Math.round(-offset * Number(el.dataset.parallax))}px`;
      }
    };
    const onScroll = () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(update);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  }
}
