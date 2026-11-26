/**
 * After a drag, the browser may follow the pointer-up with a click that would select whatever is
 * underneath: swallow that one click. Only that one: if no click comes (the pointer was let go
 * outside the frame, say), the guard goes away by itself, so the next real click is never eaten
 * (which felt like having to click to confirm a drop).
 */
export function swallowNextClick(doc: Document) {
  const stop = (c: Event) => c.stopPropagation();
  doc.addEventListener("click", stop, { capture: true, once: true });
  setTimeout(() => doc.removeEventListener("click", stop, { capture: true }), 250);
}
