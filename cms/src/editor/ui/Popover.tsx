import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type Anchor = { x: number; y: number; w?: number; h?: number };

/** The anchor box of an element, for opening a popover beside it. */
export const anchorOf = (el: Element): Anchor => {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
};

/**
 * A small frosted popover in screen space (portalled to <body>). It opens
 * below its anchor (or to its left when `side` is "left"), stays inside the
 * window, and closes on Esc or a press outside.
 */
export function Popover({ anchor, onClose, children, className = "", side = "below", label, width }: { anchor: Anchor; onClose: () => void; children: ReactNode; className?: string; side?: "below" | "left"; label?: string; width?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current!;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    let left = side === "left" ? anchor.x - w - 8 : anchor.x;
    let top = side === "left" ? anchor.y : anchor.y + (anchor.h ?? 0) + 4;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    top = Math.max(8, Math.min(top, window.innerHeight - h - 8));
    setPos({ left, top });
  }, [anchor.x, anchor.y, anchor.h, side]);
  useEffect(() => {
    const down = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && onClose();
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      e.preventDefault();
      onClose();
    };
    // Wait a tick so the press that opened the popover doesn't close it.
    const t = setTimeout(() => document.addEventListener("pointerdown", down, true));
    document.addEventListener("keydown", key, true);
    return () => {
      clearTimeout(t);
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("keydown", key, true);
    };
  }, [onClose]);
  return createPortal(
    <div ref={ref} className={`ed-pop ${className}`} role="dialog" aria-label={label} style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999, width }} onPointerDown={(e) => e.stopPropagation()}>
      {children}
    </div>,
    document.body,
  );
}

export type MenuItem = { label: string; onSelect?: () => void; note?: boolean; checked?: boolean; danger?: boolean };

/** A small menu: a popover holding a list of actions (and muted notes). */
export function Menu({ anchor, items, onClose, label }: { anchor: Anchor; items: MenuItem[]; onClose: () => void; label: string }) {
  return (
    <Popover anchor={anchor} onClose={onClose} className="ed-pop-menu" label={label}>
      <ul role="menu" aria-label={label}>
        {items.map((it) =>
          it.note ? (
            <li key={it.label} role="none" className="ed-pop-note">
              {it.label}
            </li>
          ) : (
            <li key={it.label} role="none">
              <button
                type="button"
                role="menuitem"
                className={it.danger ? "is-danger" : undefined}
                aria-checked={it.checked}
                onClick={() => {
                  onClose();
                  it.onSelect?.();
                }}
              >
                {it.label}
              </button>
            </li>
          ),
        )}
      </ul>
    </Popover>
  );
}
