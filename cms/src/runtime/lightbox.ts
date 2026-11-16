// Full-screen lightbox for images marked with data-lightbox.

export function initLightbox() {
  let dialog: HTMLDialogElement | null = null;

  const open = (src: string, caption: string) => {
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.className = "lbx";
      dialog.innerHTML = '<button type="button" class="lbx-close" aria-label="Close">×</button><img alt=""><p></p>';
      document.body.appendChild(dialog);
      dialog.addEventListener("click", (e) => {
        if ((e.target as Element).tagName !== "IMG") dialog!.close();
      });
    }
    const img = dialog.querySelector("img")!;
    img.src = src.startsWith("/media/") ? `${src}?w=2400` : src;
    img.alt = caption;
    dialog.querySelector("p")!.textContent = caption;
    dialog.showModal();
  };

  document.addEventListener("click", (e) => {
    const frame = (e.target as Element).closest<HTMLElement>("[data-lightbox]");
    if (!frame) return;
    e.preventDefault();
    open(frame.dataset.lightbox!, frame.dataset.caption ?? "");
  });
  document.querySelectorAll<HTMLElement>("[data-lightbox]").forEach((el) => {
    el.tabIndex = 0;
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", `View ${el.dataset.caption || "image"} full screen`);
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open(el.dataset.lightbox!, el.dataset.caption ?? "");
      }
    });
  });
}
