export type InspectorTab = "content" | "style" | "layout";
const ORDER: InspectorTab[] = ["content", "style", "layout"];

/**
 * Sort the inspector's fields under the Content / Style / Layout tabs. Our own groups carry a
 * data-tab (see InspectorGroup and the Content heading); a field without one (a block's own text,
 * image or link fields, the layer name) belongs to the tab of the last marked field before it, or
 * Content when nothing came before. The layer name sits with Content (Layout for blocks without content). Returns the tabs that have something in them, in order.
 */
export function tagInspectorTabs(root: HTMLElement): InspectorTab[] {
  const fields = [...root.querySelectorAll<HTMLElement>('[class*="_PuckFields-field_"]')].filter((f) => !f.parentElement?.closest('[class*="_PuckFields-field_"]'));
  // Panels that aren't Puck fields (overlays, globals) have no tabs.
  if (!fields.length) return [];
  const has = new Set<InspectorTab>();
  let current: InspectorTab = "content";
  // The layer name is the last field; it goes with Content, or Layout when a block has no content.
  const nameField = fields.find((f) => f.textContent?.trim().startsWith("Layer name"));
  for (const f of fields) {
    if (f === nameField) continue;
    const marks = [...f.querySelectorAll<HTMLElement>("[data-tab]")].map((m) => m.dataset.tab as InspectorTab);
    if (marks.length) {
      f.removeAttribute("data-field-tab");
      marks.forEach((m) => has.add(m));
      current = marks[marks.length - 1]!;
    } else {
      if (f.dataset.fieldTab !== current) f.dataset.fieldTab = current;
      has.add(current);
    }
  }
  if (nameField) {
    const tab: InspectorTab = has.has("content") ? "content" : "layout";
    if (nameField.dataset.fieldTab !== tab) nameField.dataset.fieldTab = tab;
    has.add(tab);
  }
  return ORDER.filter((t) => has.has(t));
}
