import type { ReactNode } from "react";
import { useBoard } from "../board/store";

/**
 * Puck's action bar on the selected block, restyled as the board's name tag:
 * the block's name in the accent colour, then its actions. It is counter-scaled
 * so it stays the same size on screen at any zoom.
 */
export function ActionBar({ label, children, parentAction }: { label?: string; children?: ReactNode; parentAction?: ReactNode }) {
  const zoom = useBoard((s) => s.view.zoom);
  return (
    <div className="ed-tag" style={{ transform: `scale(${1 / zoom}) translateY(calc(-100% - 4px))` }}>
      {label ? <span className="ed-tag-name">{label}</span> : null}
      <span className="ed-tag-actions">
        {parentAction}
        {children}
      </span>
    </div>
  );
}
