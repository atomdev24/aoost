// Heavier players load only on pages that use them, and only once.

const loaded = new Map<string, Promise<void>>();
function loadScript(src: string, module = false): Promise<void> {
  let p = loaded.get(src);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      if (module) s.type = "module";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`could not load ${src}`));
      document.head.appendChild(s);
    });
    loaded.set(src, p);
  }
  return p;
}

type LottiePlayer = { loadAnimation(opts: { container: Element; renderer: "svg"; loop: boolean; autoplay: boolean; path: string }): { play(): void; stop(): void } };

export function initLazy() {
  // YouTube/Vimeo behind a poster: swap in the player on click.
  document.addEventListener("click", (e) => {
    const facade = (e.target as Element).closest<HTMLElement>("[data-video-embed]");
    if (!facade) return;
    const frame = document.createElement("iframe");
    frame.className = "media";
    frame.src = facade.dataset.videoEmbed!;
    frame.title = facade.getAttribute("aria-label")?.replace(/^Play /, "") ?? "Video";
    frame.allow = "autoplay; encrypted-media; fullscreen; picture-in-picture";
    facade.replaceWith(frame);
  });

  const lotties = document.querySelectorAll<HTMLElement>("[data-lottie]");
  if (lotties.length) {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    void loadScript("/assets/lottie.js").then(() => {
      const lottie = (window as unknown as { lottie?: LottiePlayer }).lottie;
      if (!lottie) return;
      lotties.forEach((el) => {
        const auto = el.hasAttribute("data-autoplay") && !still;
        const anim = lottie.loadAnimation({ container: el, renderer: "svg", loop: el.hasAttribute("data-loop"), autoplay: auto, path: el.dataset.lottie! });
        if (!auto && !still) {
          el.addEventListener("pointerenter", () => anim.play());
          el.addEventListener("pointerleave", () => anim.stop());
        }
      });
    });
  }

  if (document.querySelector("model-viewer")) void loadScript("/assets/model-viewer.js", true);
}
