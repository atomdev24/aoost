// Video: desktop-only section backgrounds, and "play when in view".

export function initVideo() {
  // A YouTube cover with no picture of its own uses the full-size thumbnail; a few videos only have the small one.
  document.querySelectorAll<HTMLImageElement>("img[data-yt-fallback]").forEach((img) => {
    const swap = () => {
      if (img.dataset.ytFallback && img.src !== img.dataset.ytFallback) img.src = img.dataset.ytFallback;
    };
    if (img.complete && !img.naturalWidth) swap();
    img.addEventListener("error", swap, { once: true });
  });

  const desktop = window.matchMedia("(min-width:900px)");
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Background videos never load on phones; the poster image shows instead.
  const loadBackgrounds = () => {
    if (!desktop.matches || still) return;
    document.querySelectorAll<HTMLVideoElement>("video[data-bg-src]").forEach((v) => {
      v.src = v.dataset.bgSrc!;
      v.removeAttribute("data-bg-src");
      void v.play().catch(() => {});
    });
  };
  loadBackgrounds();
  desktop.addEventListener("change", loadBackgrounds);

  // Phones can get a lighter file.
  document.querySelectorAll<HTMLVideoElement>("video[data-mobile-src]").forEach((v) => {
    if (!desktop.matches) v.src = v.dataset.mobileSrc!;
  });

  const inView = document.querySelectorAll<HTMLVideoElement>("video[data-inview]");
  if (inView.length && !still) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const v = e.target as HTMLVideoElement;
          if (e.isIntersecting) void v.play().catch(() => {});
          else v.pause();
        }
      },
      { threshold: 0.35 },
    );
    inView.forEach((v) => io.observe(v));
  }
}
