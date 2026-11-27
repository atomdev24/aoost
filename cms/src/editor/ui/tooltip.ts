import "./tooltip.css";

export const FIRST_DELAY = 500;
export const WARM_WINDOW = 300;

const GAP = 6;
const EDGE_PAD = 8;

/**
 * How long to wait before showing a tooltip: 0ms when one is already visible
 * or closed within the last 300ms, otherwise 500ms.
 */
export function nextDelay(now: number, lastHiddenAt: number | null, visible: boolean): number {
  if (visible) return 0;
  if (lastHiddenAt !== null && now - lastHiddenAt <= WARM_WINDOW) return 0;
  return FIRST_DELAY;
}

/**
 * Replaces native `title=` tooltips across the editor document with one shared
 * fast tooltip. Skips touch/pen pointers, rail buttons that draw their own
 * hover label, and `[data-no-tip]` elements. Returns a cleanup function.
 */
export function startTooltips(doc: Document): () => void {
  const win = doc.defaultView;
  let tipEl: HTMLDivElement | null = null;
  let activeTarget: Element | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let visible = false;
  let lastHiddenAt: number | null = null;
  let hadPointerDown = false;

  const ensureTip = (): HTMLDivElement | null => {
    if (!doc.body) return null;
    if (!tipEl) {
      tipEl = doc.createElement("div");
      tipEl.className = "ed-tooltip";
      tipEl.setAttribute("role", "tooltip");
      tipEl.hidden = true;
      doc.body.appendChild(tipEl);
    }
    return tipEl;
  };

  const swapTitle = (el: Element): string | null => {
    if (el.hasAttribute("data-ed-tip")) return el.getAttribute("data-ed-tip");
    const text = el.getAttribute("title");
    if (!text || !text.trim()) return null;
    // Move title out while hovered/focused so the browser doesn't draw a second native tooltip.
    el.setAttribute("data-ed-tip", text);
    el.removeAttribute("title");
    return text;
  };

  const restoreTitle = (el: Element | null) => {
    if (!el) return;
    if (el.hasAttribute("data-ed-tip") && !el.hasAttribute("title")) {
      const text = el.getAttribute("data-ed-tip") ?? "";
      if (text) el.setAttribute("title", text);
    }
    el.removeAttribute("data-ed-tip");
  };

  const findTarget = (node: EventTarget | null): Element | null => {
    if (!node || typeof (node as Element).closest !== "function") return null;
    const el = (node as Element).closest("[title], [data-ed-tip]");
    if (!el || el.tagName === "IFRAME") return null;
    if (el.matches(".ed-rail-btn, [data-no-tip]") || el.closest(".ed-rail-btn, [data-no-tip]")) return null;
    const text = el.getAttribute("data-ed-tip") ?? el.getAttribute("title");
    if (!text || !text.trim()) return null;
    return el;
  };

  const positionTip = (tip: HTMLDivElement, target: Element) => {
    const r = target.getBoundingClientRect();
    const vw = win?.innerWidth ?? 1280;
    const vh = win?.innerHeight ?? 800;
    tip.style.left = "-9999px";
    tip.style.top = "-9999px";
    tip.hidden = false;
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    let top = r.bottom + GAP;
    let above = false;
    if (top + th > vh - EDGE_PAD && r.top - GAP - th >= EDGE_PAD) {
      top = r.top - GAP - th;
      above = true;
    }
    top = Math.max(EDGE_PAD, Math.min(top, vh - th - EDGE_PAD));
    let left = r.left + (r.width - tw) / 2;
    left = Math.max(EDGE_PAD, Math.min(left, vw - tw - EDGE_PAD));
    tip.style.left = `${Math.round(left)}px`;
    tip.style.top = `${Math.round(top)}px`;
    tip.style.transformOrigin = above ? "bottom center" : "top center";
    tip.dataset.side = above ? "above" : "below";
  };

  const show = (el: Element, animate: boolean) => {
    const text = swapTitle(el);
    if (!text) {
      hide();
      return;
    }
    const tip = ensureTip();
    if (!tip) return;
    tip.classList.remove("is-anim");
    tip.textContent = text;
    positionTip(tip, el);
    if (animate) {
      void tip.offsetWidth;
      tip.classList.add("is-anim");
    }
    visible = true;
  };

  const hide = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (visible) {
      lastHiddenAt = Date.now();
      visible = false;
    }
    if (tipEl) {
      tipEl.hidden = true;
      tipEl.classList.remove("is-anim");
    }
    restoreTitle(activeTarget);
    activeTarget = null;
  };

  const scheduleShow = (el: Element) => {
    if (el === activeTarget) return;
    const now = Date.now();
    const delay = nextDelay(now, lastHiddenAt, visible);
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (visible) {
      lastHiddenAt = now;
      visible = false;
    }
    restoreTitle(activeTarget);
    activeTarget = el;
    swapTitle(el);
    if (delay === 0) {
      show(el, false);
      return;
    }
    timer = setTimeout(() => {
      timer = null;
      if (activeTarget === el) show(el, true);
    }, delay);
  };

  const onPointerOver = (e: Event) => {
    const pt = (e as PointerEvent).pointerType;
    if (pt === "touch" || pt === "pen") {
      hide();
      return;
    }
    hadPointerDown = false;
    const el = findTarget(e.target);
    if (!el) {
      if (activeTarget) hide();
      return;
    }
    scheduleShow(el);
  };

  const onPointerOut = (e: Event) => {
    if (!activeTarget) return;
    const rel = (e as PointerEvent).relatedTarget;
    if (rel && typeof (rel as Node).nodeType === "number" && activeTarget.contains(rel as Node)) return;
    hide();
  };

  const onFocusIn = (e: FocusEvent) => {
    if (hadPointerDown) return;
    const el = findTarget(e.target);
    if (!el) return;
    scheduleShow(el);
  };

  const onFocusOut = (e: FocusEvent) => {
    if (!activeTarget) return;
    const rel = e.relatedTarget;
    if (rel && typeof (rel as Node).nodeType === "number" && activeTarget.contains(rel as Node)) return;
    hide();
  };

  const onPointerDown = () => {
    hadPointerDown = true;
    hide();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    hadPointerDown = false;
    if (e.key === "Escape") hide();
  };

  const onScroll = () => {
    if (activeTarget || visible) hide();
  };

  doc.addEventListener("pointerover", onPointerOver, true);
  doc.addEventListener("pointerout", onPointerOut, true);
  doc.addEventListener("focusin", onFocusIn, true);
  doc.addEventListener("focusout", onFocusOut, true);
  doc.addEventListener("pointerdown", onPointerDown, true);
  doc.addEventListener("keydown", onKeyDown, true);
  doc.addEventListener("scroll", onScroll, true);

  return () => {
    hide();
    doc.removeEventListener("pointerover", onPointerOver, true);
    doc.removeEventListener("pointerout", onPointerOut, true);
    doc.removeEventListener("focusin", onFocusIn, true);
    doc.removeEventListener("focusout", onFocusOut, true);
    doc.removeEventListener("pointerdown", onPointerDown, true);
    doc.removeEventListener("keydown", onKeyDown, true);
    doc.removeEventListener("scroll", onScroll, true);
    tipEl?.remove();
    tipEl = null;
  };
}
