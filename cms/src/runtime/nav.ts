// Floating pill behaviour (SPEC §6): hide on scroll down, show on scroll up,
// menu-button dropdowns, the mobile full-screen menu, and section highlighting.

const HIDE_AFTER = 140; // px scrolled before the pill may hide
const HYSTERESIS = 4; // px of movement needed to change direction
const HOVER_DELAY = 120; // ms before a dropdown opens on hover

export function initNav() {
  const nav = document.querySelector<HTMLElement>(".nav");
  if (!nav) return;
  scrollBehaviour(nav);
  menus(nav);
  sheet(nav);
  sectionLinks(nav);
  expireBadges();
}

function scrollBehaviour(nav: HTMLElement) {
  let lastY = window.scrollY;
  const canHide = nav.hasAttribute("data-hide");
  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle("is-scrolled", y > 8);
    if (canHide) {
      if (y > lastY + HYSTERESIS && y > HIDE_AFTER && !nav.querySelector('[aria-expanded="true"]')) nav.classList.add("is-hidden");
      else if (y < lastY - HYSTERESIS || y <= HIDE_AFTER) nav.classList.remove("is-hidden");
    }
    if (Math.abs(y - lastY) > HYSTERESIS) lastY = y;
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  // Keyboard users must never lose the nav.
  nav.addEventListener("focusin", () => nav.classList.remove("is-hidden"));
  onScroll();
}

function menus(nav: HTMLElement) {
  const groups = Array.from(nav.querySelectorAll<HTMLElement>("[data-menu]"));
  const closers: (() => void)[] = [];
  for (const group of groups) {
    const trigger = group.querySelector<HTMLButtonElement>("button[aria-controls]")!;
    const menu = group.querySelector<HTMLElement>(".menu")!;
    const items = () => Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"], a[href], button'));
    let timer = 0;

    const open = (focusFirst = false) => {
      closers.forEach((c) => c !== close && c());
      menu.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      requestAnimationFrame(() => menu.classList.add("is-open"));
      menu.querySelectorAll<HTMLVideoElement>("video[data-autoplay]").forEach((v) => void v.play().catch(() => {}));
      if (focusFirst) items()[0]?.focus();
    };
    const close = (returnFocus = false) => {
      clearTimeout(timer);
      if (menu.hidden) return;
      menu.classList.remove("is-open");
      menu.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      if (returnFocus) trigger.focus();
    };
    closers.push(close);

    trigger.addEventListener("click", () => (menu.hidden ? open() : close()));
    trigger.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        open(true);
      }
    });
    // Hover with a short delay, mouse only: touch uses tap.
    group.addEventListener("pointerenter", (e) => {
      if (e.pointerType !== "mouse") return;
      clearTimeout(timer);
      timer = window.setTimeout(() => open(), HOVER_DELAY);
    });
    group.addEventListener("pointerleave", (e) => {
      if (e.pointerType !== "mouse") return;
      clearTimeout(timer);
      timer = window.setTimeout(() => close(), HOVER_DELAY);
    });
    menu.addEventListener("keydown", (e) => {
      const list = items();
      const i = list.indexOf(document.activeElement as HTMLElement);
      if (e.key === "Escape") {
        e.preventDefault();
        close(true);
      } else if (menu.getAttribute("role") === "menu") {
        let next = -1;
        if (e.key === "ArrowDown") next = (i + 1) % list.length;
        else if (e.key === "ArrowUp") next = (i - 1 + list.length) % list.length;
        else if (e.key === "Home") next = 0;
        else if (e.key === "End") next = list.length - 1;
        if (next >= 0) {
          e.preventDefault();
          list[next]?.focus();
        }
      }
    });
    group.addEventListener("focusout", (e) => {
      if (!group.contains(e.relatedTarget as Node | null)) close();
    });
  }
  document.addEventListener("click", (e) => {
    if (!(e.target as Element).closest("[data-menu]")) closers.forEach((c) => c());
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closers.forEach((c) => c());
  });
}

function sheet(nav: HTMLElement) {
  const opener = nav.querySelector<HTMLButtonElement>(".pill-menu");
  const panel = document.getElementById("nav-sheet");
  if (!opener || !panel) return;
  panel.querySelectorAll<HTMLElement>(".sheet-links > *, .sheet-foot").forEach((el, i) => el.style.setProperty("--i", String(i)));

  const setOpen = (open: boolean) => {
    panel.hidden = !open;
    panel.classList.toggle("is-open", open);
    opener.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("is-locked", open);
    if (open) panel.querySelector<HTMLElement>(".sheet-close")?.focus();
    else opener.focus();
  };
  opener.addEventListener("click", () => setOpen(true));
  panel.querySelector(".sheet-close")?.addEventListener("click", () => setOpen(false));
  panel.addEventListener("click", (e) => {
    const link = (e.target as Element).closest("a[href]");
    if (link) setOpen(false);
  });
  panel.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
    if (e.key !== "Tab") return;
    // Keep focus inside the open menu.
    const focusable = Array.from(panel.querySelectorAll<HTMLElement>("a[href], button, input")).filter((el) => el.offsetParent !== null);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  });
  // Dropdowns become accordions on phones.
  panel.querySelectorAll<HTMLButtonElement>(".sheet-acc").forEach((btn) => {
    btn.addEventListener("click", () => {
      const sub = document.getElementById(btn.getAttribute("aria-controls")!);
      if (!sub) return;
      const open = btn.getAttribute("aria-expanded") !== "true";
      btn.setAttribute("aria-expanded", String(open));
      sub.hidden = !open;
    });
  });
  window.matchMedia("(min-width:900px)").addEventListener("change", (e) => {
    if (e.matches && !panel.hidden) setOpen(false);
  });
}

/** Section links on the current page light up as their section scrolls into view. */
function sectionLinks(nav: HTMLElement) {
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[data-section]")).filter(
    (a) => new URL(a.href, location.href).pathname === location.pathname,
  );
  if (!links.length || !("IntersectionObserver" in window)) return;
  const byId = new Map<string, HTMLAnchorElement[]>();
  for (const a of links) {
    const id = a.dataset.section!;
    byId.set(id, [...(byId.get(id) ?? []), a]);
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        for (const a of byId.get(entry.target.id) ?? []) {
          if (entry.isIntersecting) a.setAttribute("data-current", "");
          else a.removeAttribute("data-current");
        }
      }
    },
    { rootMargin: "-30% 0px -60% 0px" },
  );
  for (const id of byId.keys()) {
    const el = document.getElementById(id);
    if (el) io.observe(el);
  }
  void nav;
}

function expireBadges() {
  const today = new Date().toISOString().slice(0, 10);
  document.querySelectorAll<HTMLElement>(".nav-badge[data-expires]").forEach((b) => {
    if (b.dataset.expires! < today) b.remove();
  });
}
