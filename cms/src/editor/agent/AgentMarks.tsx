import { useEffect, useRef } from "react";
import { useAgent } from "./store";

/**
 * Inside the editing frame: the blocks Claude is working on glow in Claude's colour, with a small
 * "Claude" tag on the first one, while it works and briefly after.
 */
export function AgentMarks() {
  const marker = useRef<HTMLSpanElement>(null);
  const a = useAgent();
  useEffect(() => {
    const doc = marker.current?.ownerDocument;
    if (!doc) return;
    const ids = a.state === "idle" ? [] : a.nodeIds;
    const want = new Set(ids.flatMap((id) => [...doc.querySelectorAll<HTMLElement>(`[data-node-id="${CSS.escape(id)}"], [data-section-id="${CSS.escape(id)}"]`)]));
    doc.querySelectorAll<HTMLElement>("[data-ed-agent]").forEach((el) => !want.has(el) && el.removeAttribute("data-ed-agent"));
    want.forEach((el) => el.setAttribute("data-ed-agent", a.state));
    let tag = doc.querySelector<HTMLElement>(".ed-agent-tag");
    const first = [...want][0];
    let ring = doc.querySelector<HTMLElement>(".ed-agent-ring");
    if (!first) return void (tag?.remove(), ring?.remove());
    if (!ring) {
      ring = doc.createElement("span");
      ring.className = "ed-agent-ring";
      ring.setAttribute("aria-hidden", "true");
      doc.body.appendChild(ring);
    }
    ring.dataset.state = a.state;
    if (!tag) {
      tag = doc.createElement("span");
      tag.className = "ed-agent-tag";
      tag.setAttribute("aria-hidden", "true");
      doc.body.appendChild(tag);
    }
    tag.textContent = a.state === "working" ? `Claude · ${a.text}` : "Claude · done";
    let raf = 0;
    const place = () => {
      const r = first.getBoundingClientRect();
      tag!.style.left = `${Math.max(0, r.left)}px`;
      tag!.style.top = `${Math.max(0, r.top - 20)}px`;
      // A ring drawn above the page, so blocks with clipped or layered content still show it.
      Object.assign(ring!.style, { left: `${r.left - 3}px`, top: `${r.top - 3}px`, width: `${r.width + 6}px`, height: `${r.height + 6}px` });
      raf = requestAnimationFrame(place);
    };
    place();
    if (a.state === "working") first.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
    return () => cancelAnimationFrame(raf);
  }, [a]);
  return <span ref={marker} hidden />;
}
