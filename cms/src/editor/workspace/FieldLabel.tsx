import type { ReactNode } from "react";

/**
 * Puck's field label, drawn as a dense inspector row: the label in a 62px
 * column and the value beside it. Lists and groups (Puck renders those as a
 * div) need the full width, so they stack under their label instead.
 */
export function FieldLabel({ children, label, el = "label", readOnly }: { children?: ReactNode; label: string; el?: "label" | "div"; readOnly?: boolean; icon?: ReactNode; className?: string }) {
  const El = el;
  return (
    <El className={`ed-prow${el === "div" ? " is-stack" : ""}${readOnly ? " is-readonly" : ""}`}>
      <span className="ed-label" title={label}>
        <span>{label}</span>
      </span>
      <div className="ed-prow-value">{children}</div>
    </El>
  );
}
