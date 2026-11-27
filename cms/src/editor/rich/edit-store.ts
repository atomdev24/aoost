import { useSyncExternalStore } from "react";

/** Which text block is being edited in place on the canvas (one at a time), and on which screen size. */
type RichEdit = { id: string; bp: string } | null;
let current: RichEdit = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export const getRichEdit = () => current;
export function startRichEdit(id: string, bp: string) {
  if (current?.id === id && current.bp === bp) return;
  current = { id, bp };
  emit();
}
export function stopRichEdit() {
  if (!current) return;
  current = null;
  emit();
}
export const useRichEdit = () =>
  useSyncExternalStore(
    (f) => (subs.add(f), () => void subs.delete(f)),
    () => current,
    () => current,
  );

/** Words inside another block being edited in place: which block, which field, and the elements showing it. */
export type FieldEdit = { id: string; bp: string; path: (string | number)[]; value: string; els: HTMLElement[]; single: boolean; marks: boolean };
let field: FieldEdit | null = null;
const fieldSubs = new Set<() => void>();
export const getFieldEdit = () => field;
export function startFieldEdit(next: FieldEdit) {
  field = next;
  fieldSubs.forEach((f) => f());
}
export function stopFieldEdit() {
  if (!field) return;
  field = null;
  fieldSubs.forEach((f) => f());
}
export const useFieldEdit = () =>
  useSyncExternalStore(
    (f) => (fieldSubs.add(f), () => void fieldSubs.delete(f)),
    () => field,
    () => field,
  );
