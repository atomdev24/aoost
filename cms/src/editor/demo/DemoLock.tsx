import { useState, type ReactNode } from "react";
import { anchorOf, Popover, type Anchor } from "../ui/Popover";
import { DEMO_LIMITS, type DemoLimit } from "./limits";

/** A small lock drawn beside a label. */
export const LockIcon = () => (
  <svg className="ed-lock-icon" width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
    <path d="M3.5 5.5V4a2.5 2.5 0 0 1 5 0v1.5M2.5 5.5h7v5h-7z" />
  </svg>
);

/**
 * A control that's off in the demo: it keeps its place and label with a lock, and pressing it
 * says why instead of doing anything.
 */
export function DemoLocked({ limit, className = "", children }: { limit: DemoLimit; className?: string; children: ReactNode }) {
  const [at, setAt] = useState<Anchor | null>(null);
  const l = DEMO_LIMITS[limit];
  return (
    <>
      <button type="button" className={`${className} ed-demo-locked`} aria-haspopup="dialog" aria-expanded={!!at} title={`${l.title}: off in the demo`} onClick={(e) => setAt(at ? null : anchorOf(e.currentTarget))}>
        {children}
        <LockIcon />
      </button>
      {at ? (
        <Popover anchor={at} onClose={() => setAt(null)} label={`${l.title} is off in the demo`} width={260} className="ed-demo-why">
          <b>Off in the demo</b>
          <p>{l.why}</p>
        </Popover>
      ) : null}
    </>
  );
}
