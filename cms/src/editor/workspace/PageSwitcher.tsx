import { useEffect, useRef, useState } from "react";
import { createVariant, ownerPage } from "../../model/variants";
import { currentPage, getState, setPage, update, useEditor } from "../store";

/** Make a variant of the page on screen (or of its page, on a variant) and open it. */
export function newVariant(pageId?: string) {
  const s = getState();
  const made = createVariant(s.site, pageId ?? s.pageId);
  if (!made) return;
  update(() => made.site, "New variant");
  setPage(made.pageId);
}

/** "Home ▾": jump to another page without leaving the canvas. */
export function PageSwitcher() {
  const page = useEditor(currentPage);
  const pages = useEditor((s) => s.site.pages);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const site = useEditor((s) => s.site);
  const withVariants = (p: (typeof pages)[number]) => [p, ...pages.filter((v) => v.variantOf === p.id)];
  const ordered = pages.filter((p) => !p.parentId && !p.variantOf).flatMap((p) => [...withVariants(p), ...pages.filter((c) => c.parentId === p.id && !c.variantOf).flatMap(withVariants)]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div className="ed-switcher" ref={box}>
      <button type="button" className="ed-switcher-btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="ed-switcher-title">{page.title}</span>
        {page.variantOf ? <span className="ed-switcher-variant" title={`Variant: ${page.variantName}`}>{page.variantName}</span> : null}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
          <path d="M2.500 4l2.500 2.500L7.500 4" />
        </svg>
      </button>
      {open ? (
        <ul className="ed-menu" role="menu" aria-label="Pages">
          {ordered.map((p) => (
            <li key={p.id} role="none">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={p.id === page.id}
                className={[p.parentId ? "is-child" : "", p.variantOf ? "is-variant" : ""].filter(Boolean).join(" ") || undefined}
                onClick={() => {
                  setPage(p.id);
                  setOpen(false);
                }}
              >
                <span>{p.variantOf ? p.variantName : p.title}</span>
                <small>{p.variantOf ? `Variant of ${p.title}` : p.status === "published" ? p.slug : `${p.slug} · ${p.status === "draft" ? "draft" : "unlisted"}`}</small>
              </button>
            </li>
          ))}
          <li role="none" className="ed-menu-sep" aria-hidden="true" />
          <li role="none">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                newVariant(page.id);
                setOpen(false);
              }}
            >
              <span>New variant of {ownerPage(site, page).title}</span>
              <small>Try ideas without touching the live page</small>
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
