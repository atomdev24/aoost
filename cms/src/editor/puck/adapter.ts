import type { Node, Page, Section } from "../../schema";

/**
 * Page ⇄ Puck data. Our content model stays the stored format; Puck's data
 * is derived for the canvas and converted straight back on every change.
 *
 *   Section → { type: "FlowSection" | "GridSection" | "CanvasSection",
 *               props: { id, name, locked, layout, customDesktop, items: [...] } }
 *   Node    → { type: node.type,
 *               props: { id, name, locked, style, frame, effects, ...content } }
 */
export type PuckItem = { type: string; props: Record<string, unknown> & { id: string } };
export type PuckData = { root: { props: Record<string, unknown> }; content: PuckItem[]; zones?: Record<string, PuckItem[]> };

export const SECTION_TYPES = { flow: "FlowSection", grid: "GridSection", canvas: "CanvasSection" } as const;
const KIND_OF: Record<string, Section["kind"]> = { FlowSection: "flow", GridSection: "grid", CanvasSection: "canvas" };
export const isSectionType = (type: string) => type in KIND_OF;

/** Props on a node item that are not component content. */
export const NODE_META = ["id", "name", "locked", "style", "frame", "effects", "bind"] as const;

const defined = <T extends object>(o: T): T => {
  const out = {} as Record<string, unknown>;
  for (const [k, v] of Object.entries(o)) if (v !== undefined) out[k] = v;
  return out as T;
};

export function nodeToItem(node: Node): PuckItem {
  return { type: node.type, props: defined({ ...node.content, id: node.id, name: node.name, locked: node.locked, style: node.style, frame: node.frame, effects: node.effects, bind: node.bind }) };
}

/** Column stacks: each column is its own Puck slot (c0…c3), so blocks drop into a column. */
export const STACK_SLOTS = ["c0", "c1", "c2", "c3"] as const;

export function itemToNode(item: PuckItem): Node {
  const { id, name, locked, style, frame, effects, bind, puck: _puck, editMode: _editMode, ...rest } = item.props as Record<string, unknown> & { id: string };
  // "__" props are inspector-only headings and switches, never content.
  const content = Object.fromEntries(Object.entries(rest).filter(([k]) => !k.startsWith("__")));
  return defined({
    id,
    type: item.type,
    name: (name as string) || undefined,
    locked: (locked as boolean) || undefined,
    content,
    style: (style as Node["style"]) ?? { base: {} },
    frame: frame as Node["frame"],
    effects: effects as Node["effects"],
    bind: bind && typeof bind === "object" && Object.keys(bind).length ? (bind as Record<string, string>) : undefined,
  }) as Node;
}

export function sectionToItem(section: Section): PuckItem {
  return {
    type: SECTION_TYPES[section.kind],
    props: defined({
      id: section.id,
      name: section.name,
      locked: section.locked,
      layout: section.layout,
      customDesktop: section.customDesktop,
      stacks: section.stacks,
      items: section.stacks ? [] : section.children.map(nodeToItem),
      ...(section.kind === "grid" && !section.stacks ? Object.fromEntries(STACK_SLOTS.map((k) => [k, []])) : {}),
      ...(section.stacks ? Object.fromEntries(STACK_SLOTS.map((k, i) => [k, i < section.stacks! ? section.children.filter((n) => Math.min(section.stacks! - 1, n.col ?? 0) === i).map(nodeToItem) : []])) : {}),
    }),
  };
}

export function itemToSection(item: PuckItem): Section {
  const p = item.props as PuckItem["props"] & { items?: PuckItem[] } & Partial<Record<(typeof STACK_SLOTS)[number], PuckItem[]>>;
  const stacks = (p.stacks as number | undefined) || undefined;
  // A stacks section: its blocks column by column, each knowing its column.
  const children = stacks
    ? [...(p.items ?? []).map((i) => ({ ...itemToNode(i), col: 0 })), ...STACK_SLOTS.slice(0, stacks).flatMap((k, col) => (p[k] ?? []).map((i) => ({ ...itemToNode(i), col })))]
    : (p.items ?? []).map(itemToNode);
  return defined({
    id: p.id,
    kind: KIND_OF[item.type] ?? "flow",
    name: (p.name as string) || undefined,
    locked: (p.locked as boolean) || undefined,
    layout: p.layout as Section["layout"],
    customDesktop: (p.customDesktop as boolean) || undefined,
    stacks,
    children,
  }) as Section;
}

export function pageToPuck(page: Page): PuckData {
  return { root: { props: {} }, content: page.sections.map(sectionToItem) };
}

/** Rebuild the page from Puck data. Anything dropped outside a section is ignored. */
export function puckToPage(data: PuckData, page: Page): Page {
  return { ...page, sections: data.content.filter((i) => isSectionType(i.type)).map(itemToSection) };
}
