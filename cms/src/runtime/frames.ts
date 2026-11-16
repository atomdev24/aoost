// Sandboxed code frames report their content height; size the iframe to fit.

export function initFrames() {
  window.addEventListener("message", (e) => {
    const data = e.data as { aoostFrame?: string; height?: number } | null;
    if (!data || typeof data.aoostFrame !== "string" || typeof data.height !== "number") return;
    const frame = document.querySelector<HTMLIFrameElement>(`iframe[data-frame="${CSS.escape(data.aoostFrame)}"]`);
    // Only trust a message that really came from that frame.
    if (!frame || frame.contentWindow !== e.source) return;
    if (!frame.classList.contains("nav-embed") || frame.closest(".sheet")) frame.style.height = `${Math.min(Math.max(data.height, 20), 4000)}px`;
  });
}
