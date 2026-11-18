import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { currentPage, useEditor } from "../store";
import { filterCatalog, insertAnchorName, insertBlock } from "./catalog";
import { Thumb } from "./thumbs";

let open = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
export const openQuickInsert = () => {
  open = true;
  emit();
};
export const closeQuickInsert = () => {
  open = false;
  emit();
};
export const isQuickInsertOpen = () => open;

/**
 * Quick insert: "/" (when not typing) opens a centred palette. Search on the
 * left with a filtered list, a preview of the highlighted block on the right.
 * ↑↓ to choose, Enter to insert below the selection, Esc to close.
 */
export function QuickInsert() {
  const shown = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => open,
  );
  return shown ? <Palette /> : null;
}

function Palette() {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const page = useEditor(currentPage);
  const selected = useEditor((s) => s.selection[0]);
  const below = insertAnchorName(page, selected);
  const items = useMemo(() => filterCatalog(query, "all"), [query]);
  const list = useRef<HTMLUListElement>(null);
  const current = items[Math.min(index, items.length - 1)];
  useEffect(() => setIndex(0), [query]);
  useEffect(() => {
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [index]);
  const choose = (type: string) => {
    closeQuickInsert();
    insertBlock(type);
  };
  return (
    <div className="ed-qi-backdrop" onPointerDown={(e) => e.target === e.currentTarget && closeQuickInsert()}>
      <div className="ed-qi" role="dialog" aria-modal="true" aria-label="Quick insert">
        <div className="ed-qi-left">
          <input
            className="ed-qi-search"
            autoFocus
            placeholder="Add a block…"
            aria-label="Search blocks to add"
            aria-controls="ed-qi-list"
            aria-activedescendant={current ? `ed-qi-${current.type}` : undefined}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIndex((i) => Math.min(items.length - 1, i + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setIndex((i) => Math.max(0, i - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (current) choose(current.type);
              } else if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                closeQuickInsert();
              }
            }}
          />
          <ul id="ed-qi-list" ref={list} role="listbox" aria-label="Blocks">
            {items.map((it, i) => (
              <li key={it.type} id={`ed-qi-${it.type}`} role="option" aria-selected={it === current} onPointerMove={() => setIndex(i)} onClick={() => choose(it.type)}>
                <span className="ed-qi-icon">
                  <Thumb type={it.type} />
                </span>
                <span className="ed-qi-name">{it.label}</span>
                <span className="ed-qi-kind">{it.chip === "layout" ? "Layout" : it.chip === "media" ? "Media" : "Text"}</span>
              </li>
            ))}
            {!items.length ? <li className="ed-empty">Nothing matches "{query}".</li> : null}
          </ul>
        </div>
        <div className="ed-qi-right" aria-live="polite">
          {current ? (
            <>
              <div className="ed-qi-preview">
                <Thumb type={current.type} />
              </div>
              <strong>{current.label}</strong>
              {current.hint !== current.label ? <span className="ed-qi-hint">{current.hint}</span> : null}
              <span className="ed-qi-where">{below ? `Adds below ${below}` : "Adds at the end of the page"}</span>
            </>
          ) : null}
          <span className="ed-qi-keys">↑↓ choose · Enter add · Esc close</span>
        </div>
      </div>
    </div>
  );
}
