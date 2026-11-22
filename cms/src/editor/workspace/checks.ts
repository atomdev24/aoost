/**
 * Checks before publishing (site and CMS review, 22 Nov 2026). Each changed page's draft is opened
 * out of sight at phone size (390 × 844), from /preview, and looked over the way a visitor's phone
 * would show it:
 * - nothing spills off the side of the screen,
 * - text meant to be read is at least 12 px,
 * - links and buttons take a tap at least 44 px tall (an invisible tap band counts),
 * - every picture says what it shows, or is marked as decoration,
 * - no picture is heavier than 500 KB.
 * They only warn: publishing is still Alex's call.
 */

export type Check = { id: string; ok: boolean; title: string; detail: string };
export type PageChecks = { page: string; slug: string; checks: Check[] };

const MIN_TEXT = 12;
const MIN_TAP = 44;
const MAX_IMAGE_KB = 500;
/** Readable names for the site's blocks, by their data-ao name. */
const BLOCKS: Record<string, string> = { hero: "Hero", projects: "Projects", journals: "Journals", tools: "Skills", playlists: "Playlists", wall: "The wall", rodeo: "Rodeo", footer: "Footer", viewer: "Artwork viewer" };

const where = (el: Element) => {
  const b = el.closest<HTMLElement>("[data-ao]")?.dataset.ao;
  if (b) return BLOCKS[b] ?? b;
  if (el.closest(".nav, .pill")) return "Navigation";
  return el.closest<HTMLElement>("[data-type]")?.dataset.type ?? "the page";
};
const places = (els: Element[]) => {
  const n = new Map<string, number>();
  els.forEach((e) => n.set(where(e), (n.get(where(e)) ?? 0) + 1));
  return [...n].map(([k, v]) => `${k} (${v})`).join(", ");
};
/** Decoration nobody needs to read: rulers, drawn labels inside pictures, anything hidden from screen readers. */
const decorative = (el: Element) => !!el.closest('svg, [aria-hidden="true"], .mat-ruler, .ghosts, [hidden]');
const shown = (el: Element, win: Window) => {
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return false;
  const cs = win.getComputedStyle(el);
  return cs.visibility !== "hidden" && cs.display !== "none";
};

/** Look over one loaded document at phone width. */
export function inspect(doc: Document): Check[] {
  const win = doc.defaultView!;
  const vw = win.innerWidth;
  const all = [...doc.body.querySelectorAll("*")];

  const spill = all.filter((e) => {
    if (decorative(e) || !shown(e, win)) return false;
    const r = e.getBoundingClientRect();
    return r.right > vw + 2 && win.getComputedStyle(e).position !== "fixed";
  });
  // Report the outermost ones only.
  const spillTop = spill.filter((e) => !spill.some((o) => o !== e && o.contains(e)));
  const pageSpills = doc.documentElement.scrollWidth > vw + 1;

  const small = all.filter((e) => {
    if (decorative(e) || !shown(e, win)) return false;
    if (![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim())) return false;
    return parseFloat(win.getComputedStyle(e).fontSize) < MIN_TEXT;
  });

  const taps = [...doc.querySelectorAll('a[href], button, input:not([type="hidden"]), select, textarea, [role="button"]')].filter((e) => {
    if (decorative(e) || !shown(e, win) || (e as HTMLElement).closest("[inert]")) return false;
    // Layout size, not the drawn box: a section still scaling in as it scrolls into view isn't smaller.
    const el = e as HTMLElement;
    const band = parseFloat(win.getComputedStyle(e, "::after").height) || 0;
    const h = Math.max(el.offsetHeight, win.getComputedStyle(e, "::after").position === "absolute" ? band : 0);
    return h < MIN_TAP - 0.5 || el.offsetWidth < 24;
  });

  const imgs = [...doc.querySelectorAll("img")].filter((i) => !decorative(i));
  const noAlt = imgs.filter((i) => !i.hasAttribute("alt"));
  const heavy = (win.performance.getEntriesByType("resource") as PerformanceResourceTiming[]).filter(
    (r) => (r.initiatorType === "img" || /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(r.name)) && r.encodedBodySize > MAX_IMAGE_KB * 1024,
  );

  return [
    {
      id: "spill",
      ok: !pageSpills,
      title: pageSpills ? "Something spills off the side on phones" : "Fits a phone screen",
      detail: pageSpills ? `Sticks out: ${places(spillTop) || "the page"}` : "Nothing sticks out sideways at 390 px.",
    },
    {
      id: "text",
      ok: !small.length,
      title: small.length ? `${small.length} bits of text under ${MIN_TEXT} px on phones` : `Text is at least ${MIN_TEXT} px`,
      detail: small.length ? places(small) : "Everything meant to be read is big enough.",
    },
    {
      id: "taps",
      ok: !taps.length,
      title: taps.length ? `${taps.length} links or buttons smaller than ${MIN_TAP} px` : `Taps are at least ${MIN_TAP} px`,
      detail: taps.length ? places(taps) : "Every link and button is easy to hit.",
    },
    {
      id: "alt",
      ok: !noAlt.length,
      title: noAlt.length ? `${noAlt.length} pictures without a description` : "Pictures are described",
      detail: noAlt.length ? places(noAlt) : "Each picture has a description or is marked as decoration.",
    },
    {
      id: "weight",
      ok: !heavy.length,
      title: heavy.length ? `${heavy.length} pictures over ${MAX_IMAGE_KB} KB` : `Pictures are under ${MAX_IMAGE_KB} KB`,
      detail: heavy.length ? heavy.map((r) => `${decodeURIComponent(r.name.split("/").pop() ?? "")} (${Math.round(r.encodedBodySize / 1024)} KB)`).join(", ") : "Pages load quickly on a phone connection.",
    },
  ];
}

/** Open a draft page out of sight at phone size and check it. */
export function checkPage(slug: string, timeoutMs = 12000): Promise<Check[]> {
  return new Promise((resolve, reject) => {
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.tabIndex = -1;
    frame.style.cssText = "position:fixed;left:-10000px;top:0;width:390px;height:844px;border:0;opacity:0;pointer-events:none";
    const done = (fn: () => void) => {
      clearTimeout(timer);
      fn();
      frame.remove();
    };
    const timer = setTimeout(() => done(() => reject(new Error("The page took too long to open"))), timeoutMs);
    frame.addEventListener("load", () => {
      // Give the page's scripts a moment to lay things out (the board, the shelf).
      setTimeout(() => {
        try {
          const doc = frame.contentDocument;
          if (!doc?.body) throw new Error("The page couldn't be read");
          const checks = inspect(doc);
          done(() => resolve(checks));
        } catch (e) {
          done(() => reject(e instanceof Error ? e : new Error(String(e))));
        }
      }, 1800);
    });
    frame.src = `/preview${slug === "/" ? "/" : slug}`;
    document.body.appendChild(frame);
  });
}
