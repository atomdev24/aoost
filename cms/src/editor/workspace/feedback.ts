/**
 * Which edits get the small "done · Undo" message (UI spec, Nov 2026: subtle feedback).
 * Structural changes only: typing, sliders and drags inside a field stay quiet.
 */
const LOUD = /^(Add|Insert|Delete|Remove|Duplicate|Move|Reorder|Hide|Show|Paste|Restore|Undid|Redid)\b/;

export function feedbackFor(label: string | null | undefined): { text: string; undoable: boolean } | null {
  if (!label || !LOUD.test(label)) return null;
  if (label.startsWith("Undid: ")) return { text: `Undone: ${label.slice(7)}`, undoable: false };
  if (label.startsWith("Redid: ")) return { text: `Redone: ${label.slice(7)}`, undoable: true };
  return { text: label, undoable: true };
}
