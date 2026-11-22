import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/** Groups folded by hand stay folded, per name, on this browser. */
const FOLD_KEY = "ed-folded-groups";
const readFolded = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(FOLD_KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};
const writeFolded = (label: string, folded: boolean) => {
  try {
    const set = new Set(readFolded());
    if (folded) set.add(label);
    else set.delete(label);
    localStorage.setItem(FOLD_KEY, JSON.stringify([...set]));
  } catch {
    /* private mode: it just won't be remembered */
  }
};

/**
 * Puck's field label, drawn as a dense inspector row: the label in a 62px
 * column and the value beside it. Lists and groups (Puck renders those as a
 * div) need the full width, so they stack under their label instead, and a
 * list or a set of settings can be folded away under its name.
 */
export function FieldLabel({ children, label, el = "label", readOnly }: { children?: ReactNode; label: string; el?: "label" | "div"; readOnly?: boolean; icon?: ReactNode; className?: string }) {
  const El = el;
  const value = useRef<HTMLDivElement>(null);
  const [group, setGroup] = useState(false);
  const [folded, setFolded] = useState(false);
  // A list or a set of fields (not a single control such as a radio) can fold.
  useLayoutEffect(() => {
    if (el !== "div" || !value.current) return;
    const isGroup = !!value.current.querySelector(':scope > [class*="_ArrayField_"], :scope > fieldset, :scope > [class*="_ObjectField"], :scope > [class*="_FieldGroup"]');
    setGroup(isGroup);
    if (isGroup && readFolded().includes(label)) setFolded(true);
  }, [el, label]);
  const toggle = () => {
    setFolded(!folded);
    writeFolded(label, !folded);
  };
  return (
    <El className={`ed-prow${el === "div" || label.length > 16 ? " is-stack" : ""}${readOnly ? " is-readonly" : ""}${group ? " is-group" : ""}${folded ? " is-folded" : ""}`}>
      {group ? (
        <button type="button" className="ed-group-head" aria-expanded={!folded} onClick={toggle}>
          <svg className="ed-chev" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="M3 4.5l3 3 3-3" />
          </svg>
          <span className="ed-label" title={label}>
            <span>{label}</span>
          </span>
        </button>
      ) : (
        <span className="ed-label" title={label}>
          <span>{label}</span>
        </span>
      )}
      <div className="ed-prow-value" ref={value} hidden={folded}>
        {children}
      </div>
    </El>
  );
}
