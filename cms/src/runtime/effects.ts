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
    // A block can name the part of it that drifts ([data-parallax-inner], e.g. the hero's artwork
    // inside its frame); otherwise the whole block drifts. The drift is a transform, so it adds to
    // an enter animation (which uses translate) instead of replacing it.
    const items = drifting.map((el) => {
      const inner = el.querySelector<HTMLElement>("[data-parallax-inner]");
      const r = el.getBoundingClientRect();
      const top = r.top + window.scrollY;
      // Something on the first screen starts still and drifts as the page scrolls away from it.
      const zero = inner && top < window.innerHeight ? top + r.height / 2 - window.innerHeight / 2 : 0;
      if (inner) inner.classList.add("drifting");
      return { el, inner, zero, f: Number(el.dataset.parallax) };
    });
    let queued = false;
    const update = () => {
      queued = false;
      const mid = window.innerHeight / 2;
      for (const it of items) {
        const rect = it.el.getBoundingClientRect();
        const offset = rect.top + rect.height / 2 - mid;
        if (it.inner) {
          // Inside a frame the artwork is enlarged a little, so it can move without showing an edge.
          const room = it.inner.clientHeight * 0.055;
          const y = Math.max(-room, Math.min(room, -(offset - it.zero) * it.f * 0.6));
          it.inner.style.setProperty("--drift", `${Math.round(y * 10) / 10}px`);
        } else {
          it.el.style.transform = `translate3d(0, ${Math.round(-offset * it.f)}px, 0)`;
        }
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
