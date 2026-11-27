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
export function Popover({ anchor, onClose, children, className = "", side = "below", label, width }: { anchor: Anchor; onClose: () => void; children: ReactNode; className?: string; side?: "below" | "left" | "right"; label?: string; width?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; origin: string } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current!;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const rawLeft = side === "left" ? anchor.x - w - 8 : side === "right" ? anchor.x + (anchor.w ?? 0) + 8 : anchor.x;
    const rawTop = side === "below" ? anchor.y + (anchor.h ?? 0) + 4 : anchor.y;
    const left = Math.max(8, Math.min(rawLeft, window.innerWidth - w - 8));
    const top = Math.max(8, Math.min(rawTop, window.innerHeight - h - 8));
    const anchorRight = anchor.x + (anchor.w ?? 0);
    // If a below popover shifts left to stay inside the window, anchor its scale to the right edge.
    const shiftedRight = side === "below" && left < rawLeft && Math.abs(left + w - anchorRight) <= Math.abs(left - anchor.x);
    const origin = side === "left" ? "top right" : side === "right" ? "top left" : shiftedRight ? "top right" : "top left";
    setPos({ left, top, origin });
  }, [anchor.x, anchor.y, anchor.w, anchor.h, side]);
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
    <div ref={ref} className={`ed-pop ${className}`} data-side={side} role="dialog" aria-label={label} style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999, transformOrigin: pos?.origin, width }} onPointerDown={(e) => e.stopPropagation()}>
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
