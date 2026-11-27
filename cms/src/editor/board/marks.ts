import { useSyncExternalStore } from "react";

/*
 * "Show on the board" (the zoom bar's Show menu): which marks the board draws, per browser.
 *   comments: comment pins;  changes: what a variant changed (purple dashes);
 *   motion: grey lines beside sections that move;  edits: phone- or tablet-only edits (orange).
 * Frames get data-ed-hide on their root (their CSS hides those marks); the board's own layers
 * read classes on <body>.
 */
export type MarkKind = "comments" | "changes" | "motion" | "edits";
export const MARK_KINDS: { id: MarkKind; label: string; hint: string }[] = [
  { id: "comments", label: "Comments", hint: "Comment pins on the pages" },
  { id: "changes", label: "Variant changes", hint: "Purple dashes round what a variant changed" },
  { id: "motion", label: "Motion", hint: "A grey line beside each section that moves" },
  { id: "edits", label: "Screen-size edits", hint: "Outlines on blocks changed for one screen size only" },
];
const KEY = "aoost.marks";
type Marks = Record<MarkKind, boolean>;
const ALL_ON: Marks = { comments: true, changes: true, motion: true, edits: true };

/** Saved choices back to a full set (anything unknown stays on). */
export function marksFrom(raw: unknown): Marks {
  const o = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<string, unknown>>;
  return Object.fromEntries(Object.keys(ALL_ON).map((k) => [k, o[k] !== false])) as Marks;
}

let marks: Marks = (() => {
  try {
    return marksFrom(JSON.parse(localStorage.getItem(KEY) ?? "null"));
  } catch {
    return { ...ALL_ON };
  }
})();
const subs = new Set<() => void>();
const docs = new Set<Document>();

export const hiddenList = (m: Marks = marks) => (Object.keys(m) as MarkKind[]).filter((k) => !m[k]).join(" ");

function apply() {
  const hide = hiddenList();
  for (const d of [...docs]) {
    if (!d.defaultView) {
      docs.delete(d);
      continue;
    }
    if (hide) d.documentElement.setAttribute("data-ed-hide", hide);
    else d.documentElement.removeAttribute("data-ed-hide");
  }
  if (typeof document !== "undefined") for (const k of Object.keys(marks) as MarkKind[]) document.body?.classList.toggle(`ed-hide-${k}`, !marks[k]);
}

export function setMark(kind: MarkKind, on: boolean) {
  marks = { ...marks, [kind]: on };
  try {
    localStorage.setItem(KEY, JSON.stringify(marks));
  } catch {
    /* storage blocked */
  }
  apply();
  subs.forEach((f) => f());
}

/** A frame on the board follows the choices. */
export function followMarks(doc: Document): () => void {
  docs.add(doc);
  apply();
  return () => void docs.delete(doc);
}

export const useMarks = () =>
  useSyncExternalStore(
    (f) => (subs.add(f), () => void subs.delete(f)),
    () => marks,
    () => marks,
  );

/** Frame CSS: hide the marks that are switched off. */
export const marksCss =
  'html[data-ed-hide~="changes"] [data-ed-changed]{outline:none!important}' +
  'html[data-ed-hide~="edits"] [data-ed-over]{outline:none!important;box-shadow:none!important}';

if (typeof document !== "undefined") queueMicrotask(apply);
