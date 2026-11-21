import { contentFields } from "../../components/fields";
import type { SlotPath } from "./slots";

/**
 * Open a list item in the inspector and bring it into view: picking a piece or fixture on the canvas
 * shows its own settings, so a change never lands on whichever item happened to be open. The list is
 * found by its field's label (the inspector shows Puck's array fields); the other items in it close.
 */
export function revealItem(type: string, path: SlotPath, root: ParentNode = document) {
  const [field, index] = path;
  if (typeof field !== "string" || typeof index !== "number") return;
  const label = String((contentFields[type]?.[field] as { label?: string } | undefined)?.label ?? "").trim();
  if (!label) return;
  let tries = 0;
  const go = () => {
    const lists = [...root.querySelectorAll<HTMLElement>('.ed-inspector [class*="ArrayField_"]')];
    const list = lists.find((l) => (l.closest('[class*="InputWrapper"]')?.querySelector('[class*="label"]')?.textContent ?? "").trim().startsWith(label));
    // The inspector may still be switching to this block: try again for a moment.
    if (!list) return void (tries++ < 30 && setTimeout(go, 50));
    const items = [...list.querySelectorAll<HTMLElement>('[class*="ArrayFieldItem_"]')].filter((el) => el.closest('[class*="ArrayField_"]') === list);
    const item = items[index];
    if (!item) return;
    // only the picked item stays open: close what's open in the block's other lists too
    for (const other of lists) {
      if (other === list) continue;
      for (const el of other.querySelectorAll<HTMLElement>('[class*="ArrayFieldItem--isExpanded"]')) {
        if (el.closest('[class*="ArrayField_"]') === other) el.querySelector<HTMLElement>('[class*="ArrayFieldItem-summary"]')?.click();
      }
    }
    items.forEach((el, i) => {
      const open = /ArrayFieldItem--isExpanded/.test(el.className);
      if (open !== (i === index)) el.querySelector<HTMLElement>('[class*="ArrayFieldItem-summary"]')?.click();
    });
    requestAnimationFrame(() => item.scrollIntoView({ block: "nearest", behavior: "smooth" }));
  };
  go();
}
