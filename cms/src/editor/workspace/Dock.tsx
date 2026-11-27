import type { ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * The two docks for the editor's floating notes and bars, so they stack instead of landing on top
 * of each other (they used to each pick their own spot at the bottom centre):
 *
 * - top, under the top bar: the demo strip, draft-sync notes, Claude at work;
 * - bottom, above the bottom edge: the variant band, uploads, hidden frames, loading, tips, the
 *   undo toast.
 *
 * Each dock is a centred column that keeps clear of the side panels and the zoom bar; items keep
 * their own look and take a fixed order (DOCK_ORDER), lowest nearest the edge. On a phone the
 * bottom dock sits above the toolbar and the settings card.
 */
export type DockSlot = "top" | "bottom";

/** Lower comes first: nearest the top bar in the top dock, nearest the bottom edge in the bottom one. */
export const DOCK_ORDER = {
  top: { demo: 1, sync: 2, agent: 3, design: 4 },
  bottom: { variant: 1, uploads: 2, hidden: 3, refs: 4, loading: 5, tip: 6, toast: 7 },
} as const;

function dockEl(slot: DockSlot): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const id = `ed-dock-${slot}`;
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("div");
    el.id = id;
    el.className = `ed-dock ed-dock-${slot}`;
    document.body.appendChild(el);
  }
  return el;
}

/** Put children in a dock. `name` picks the order (DOCK_ORDER) and is a class for slot-specific tweaks. */
export function InDock<S extends DockSlot>({ slot, name, children }: { slot: S; name: keyof (typeof DOCK_ORDER)[S] & string; children: ReactNode }) {
  const el = dockEl(slot);
  if (!el || children == null || children === false) return null;
  const order = (DOCK_ORDER[slot] as Record<string, number>)[name] ?? 9;
  return createPortal(
    <div className={`ed-dock-item ed-dock-${name}`} style={{ order }}>
      {children}
    </div>,
    el,
  );
}
