import { getState } from "../store";

/**
 * The editor keeps scroll effects still (they would fight dragging and
 * selecting), so moving the Parallax slider shows a short preview instead: the
 * selected block's picture slides through the range it would cover while the
 * page scrolls past, then settles back.
 */
let last = 0;
export function previewDrift(f: number) {
  const id = getState().selection[0];
  const doc = document.querySelector<HTMLIFrameElement>("#preview-frame")?.contentDocument;
  if (!id || !doc || !f) return;
  const now = performance.now();
  if (now - last < 250) return; // one preview per slider gesture step, not per pixel
  last = now;
  const node = doc.querySelector<HTMLElement>(`[data-node-id="${CSS.escape(id)}"]`);
  if (!node || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const inner = node.querySelector<HTMLElement>("[data-parallax-inner]");
  const timing: KeyframeAnimationOptions = { duration: 700, iterations: 2, direction: "alternate", easing: "ease-in-out" };
  if (inner) {
    const room = inner.clientHeight * Math.abs(f) * 0.45;
    const scale = String(1 + 2 * Math.abs(f) * 0.45);
    const y = room * Math.sign(f);
    inner.getAnimations().forEach((a) => a.cancel());
    inner.animate([{ translate: `0 ${-y}px`, scale }, { translate: `0 ${y}px`, scale }], timing);
  } else {
    const y = Math.round(node.clientHeight * f * 0.5);
    node.getAnimations().forEach((a) => a.cancel());
    node.animate([{ translate: `0 ${-y}px` }, { translate: `0 ${y}px` }], timing);
  }
}
