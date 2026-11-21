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
      // Something on the first screen starts still and drifts one way as the page scrolls away from it.
      const first = !!inner && top < window.innerHeight;
      const zero = first ? top + r.height / 2 - window.innerHeight / 2 : 0;
      const f = Number(el.dataset.parallax);
      if (inner) {
        inner.classList.add("drifting");
        // The artwork is enlarged just enough for the drift's range, from the side it won't uncover.
        const room = Math.abs(f) * 0.45;
        inner.style.setProperty("--drift-scale", String(Math.round((1 + (first ? room : 2 * room)) * 1000) / 1000));
        inner.style.setProperty("--drift-origin", first ? (f > 0 ? "50% 100%" : "50% 0%") : "50% 50%");
      }
      return { el, inner, first, zero, f };
    });
    let queued = false;
    const update = () => {
      queued = false;
      const mid = window.innerHeight / 2;
      for (const it of items) {
        const rect = it.el.getBoundingClientRect();
        const offset = rect.top + rect.height / 2 - mid;
        if (it.inner) {
          // The artwork moves at f × the scroll speed (positive lags behind, negative runs ahead),
          // up to the room its enlargement leaves.
          const room = it.inner.clientHeight * Math.abs(it.f) * 0.45;
          const y = -(offset - it.zero) * it.f;
          const lo = it.first ? (it.f > 0 ? 0 : -room) : -room;
          const hi = it.first ? (it.f > 0 ? room : 0) : room;
          it.inner.style.setProperty("--drift", `${Math.round(Math.max(lo, Math.min(hi, y)) * 10) / 10}px`);
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
