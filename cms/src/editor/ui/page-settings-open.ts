/**
 * Open a page's settings in the Pages panel from elsewhere (pre-flight's Fix for search text). Kept
 * apart from the panel so callers don't load it.
 */
let wanted: string | null = null;
const listeners = new Set<(id: string) => void>();

export function openPageSettings(pageId: string) {
  wanted = pageId;
  listeners.forEach((l) => l(pageId));
}
/** The panel, when it opens: the page asked for, if any (asked once). */
export function takePageSettings(): string | null {
  const w = wanted;
  wanted = null;
  return w;
}
export function onOpenPageSettings(fn: (id: string) => void) {
  const l = (id: string) => {
    wanted = null;
    fn(id);
  };
  listeners.add(l);
  return () => void listeners.delete(l);
}
