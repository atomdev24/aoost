import { getComponent } from "../components/registry";
import { setAt } from "../responsive/resolve";
import { DEFAULT_FRAME_FIT, newId, type Breakpoint, type Node, type Overlay, type Page, type Responsive, type Section, type SectionLayout, type Style } from "../schema";

/**
 * Pure edits to one page: used by the layers panel, the overlay panel and
 * the Claude connector. Each returns a new page (or the same object when
 * nothing changed) and never mutates its input.
 */

export type Located =
  | { kind: "section"; section: Section; index: number }
  | { kind: "node"; section: Section; node: Node; index: number }
  | { kind: "overlay"; overlay: Overlay; node: Node; index: number };

export function locate(page: Page, id: string): Located | null {
  for (const [si, section] of page.sections.entries()) {
    if (section.id === id) return { kind: "section", section, index: si };
    const ni = section.children.findIndex((n) => n.id === id);
    if (ni >= 0) return { kind: "node", section, node: section.children[ni]!, index: ni };
  }
  const oi = page.overlays.findIndex((o) => o.id === id || o.node.id === id);
  if (oi >= 0) return { kind: "overlay", overlay: page.overlays[oi]!, node: page.overlays[oi]!.node, index: oi };
  return null;
}

const mapSections = (page: Page, fn: (s: Section) => Section): Page => {
  let changed = false;
  const sections = page.sections.map((s) => {
    const next = fn(s);
    if (next !== s) changed = true;
    return next;
  });
  return changed ? { ...page, sections } : page;
};

export function updateSection(page: Page, id: string, fn: (s: Section) => Section): Page {
  return mapSections(page, (s) => (s.id === id ? fn(s) : s));
}

/** Change a node wherever it lives: in a section or as an overlay. */
export function updateNode(page: Page, id: string, fn: (n: Node) => Node): Page {
  const next = mapSections(page, (s) => {
    const i = s.children.findIndex((n) => n.id === id);
    if (i < 0) return s;
    const node = fn(s.children[i]!);
    return node === s.children[i] ? s : { ...s, children: s.children.map((n, j) => (j === i ? node : n)) };
  });
  if (next !== page) return next;
  const oi = page.overlays.findIndex((o) => o.node.id === id || o.id === id);
  if (oi < 0) return page;
  const node = fn(page.overlays[oi]!.node);
  return node === page.overlays[oi]!.node ? page : { ...page, overlays: page.overlays.map((o, j) => (j === oi ? { ...o, node } : o)) };
}

/** Delete a section, a node or an overlay. Overlays anchored to a deleted section go with it. */
export function remove(page: Page, id: string): Page {
  const at = locate(page, id);
  if (!at) return page;
  if (at.kind === "section") {
    return { ...page, sections: page.sections.filter((s) => s.id !== id), overlays: page.overlays.filter((o) => o.anchor === "viewport" || o.anchor.sectionId !== id) };
  }
  if (at.kind === "overlay") return { ...page, overlays: page.overlays.filter((_, i) => i !== at.index) };
  return updateSection(page, at.section.id, (s) => ({ ...s, children: s.children.filter((n) => n.id !== id) }));
}

const clamp = (n: number, max: number) => Math.max(0, Math.min(max, n));

/** Move a section to a new position in the page. */
export function moveSection(page: Page, id: string, toIndex: number): Page {
  const from = page.sections.findIndex((s) => s.id === id);
  if (from < 0) return page;
  const sections = page.sections.filter((s) => s.id !== id);
  const to = clamp(toIndex, sections.length);
  if (to === from) return page;
  sections.splice(to, 0, page.sections[from]!);
  return { ...page, sections };
}

/** Move a node within its section or into another one. */
export function moveNode(page: Page, id: string, toSectionId: string, toIndex: number): Page {
  const at = locate(page, id);
  if (!at || at.kind !== "node" || !page.sections.some((s) => s.id === toSectionId)) return page;
  if (at.section.id === toSectionId && clamp(toIndex, at.section.children.length - 1) === at.index) return page;
  return mapSections(page, (s) => {
    let children = s.children;
    if (s.id === at.section.id) children = children.filter((n) => n.id !== id);
    if (s.id === toSectionId) {
      children = [...children];
      children.splice(clamp(toIndex, children.length), 0, at.node);
    }
    return children === s.children ? s : { ...s, children };
  });
}

/** Step a section or node one place up or down in the layers list. */
export function nudgeOrder(page: Page, id: string, delta: -1 | 1): Page {
  const at = locate(page, id);
  if (!at) return page;
  if (at.kind === "section") return moveSection(page, id, at.index + delta);
  if (at.kind === "node") return moveNode(page, id, at.section.id, at.index + delta);
  const to = clamp(at.index + delta, page.overlays.length - 1);
  if (to === at.index) return page;
  const overlays = [...page.overlays];
  overlays.splice(to, 0, ...overlays.splice(at.index, 1));
  return { ...page, overlays };
}

export function rename(page: Page, id: string, name: string): Page {
  const at = locate(page, id);
  const value = name.trim() || undefined;
  if (!at) return page;
  return at.kind === "section" ? updateSection(page, id, (s) => ({ ...s, name: value })) : updateNode(page, at.node.id, (n) => ({ ...n, name: value }));
}

export function setLocked(page: Page, id: string, locked: boolean): Page {
  const at = locate(page, id);
  if (!at) return page;
  const value = locked || undefined;
  return at.kind === "section" ? updateSection(page, id, (s) => ({ ...s, locked: value })) : updateNode(page, at.node.id, (n) => ({ ...n, locked: value }));
}

/** Hide or show at one breakpoint (visibility is per breakpoint, SPEC §3). */
export function setHidden(page: Page, id: string, bp: Breakpoint, hidden: boolean): Page {
  const at = locate(page, id);
  if (!at) return page;
  const r: Responsive<{ hidden?: boolean }> = at.kind === "section" ? at.section.layout : at.node.style;
  const baseHidden = !!r.base.hidden;
  const desktopHidden = r.desktop?.hidden ?? baseHidden;
  let next: Responsive<{ hidden?: boolean }>;
  if (bp === "desktop") {
    // On desktop "shown" must be stored explicitly when mobile hides it.
    next = setAt(r, "desktop", { hidden: hidden ? true : baseHidden ? false : undefined });
  } else {
    // A change on mobile leaves desktop as it was.
    next = setAt(r, "mobile", { hidden: hidden || undefined });
    next = setAt(next, "desktop", { hidden: desktopHidden === hidden ? undefined : desktopHidden });
  }
  if (at.kind === "section") return updateSection(page, id, (s) => ({ ...s, layout: next as Responsive<SectionLayout> }));
  return updateNode(page, at.node.id, (n) => ({ ...n, style: next as Responsive<Style> }));
}

export function isHidden(item: Section | Node, bp: Breakpoint): boolean {
  const r = "kind" in item ? item.layout : item.style;
  const base = !!r.base.hidden;
  return bp === "mobile" ? base : (r.desktop?.hidden ?? base);
}

/** A new node of a registered component type, with that component's defaults. */
export function createNode(type: string, overrides: { content?: Record<string, unknown>; style?: Style; id?: string } = {}): Node {
  const def = getComponent(type);
  if (!def) throw new Error(`Unknown component type: ${type}`);
  return {
    id: overrides.id ?? newId("n"),
    type,
    content: { ...(def.defaults.content as Record<string, unknown>), ...overrides.content },
    style: { base: { ...def.defaults.style, ...overrides.style } },
    ...(def.framed ? { frame: { base: DEFAULT_FRAME_FIT } } : {}),
  };
}

export const SECTION_DEFAULTS: Record<Section["kind"], Section["layout"]> = {
  flow: { base: { columns: 1, gap: 18, padding: "56px 20px", maxWidth: 1160 }, desktop: { padding: "96px 56px" } },
  grid: { base: { columns: 1, gap: 14, padding: "56px 20px", maxWidth: 1160 }, desktop: { columns: 3, padding: "96px 56px" } },
  canvas: { base: { columns: 1, gap: 0, padding: "0px", height: 480 } },
};

export function createSection(kind: Section["kind"], overrides: Partial<Section> = {}): Section {
  return { id: newId("s"), kind, layout: SECTION_DEFAULTS[kind], children: [], ...overrides };
}

export function addSection(page: Page, section: Section, index = page.sections.length): Page {
  const sections = [...page.sections];
  sections.splice(clamp(index, sections.length), 0, section);
  return { ...page, sections };
}

export function addNode(page: Page, sectionId: string, node: Node, index?: number): Page {
  return updateSection(page, sectionId, (s) => {
    const children = [...s.children];
    children.splice(clamp(index ?? children.length, children.length), 0, node);
    return { ...s, children };
  });
}

/** A new overlay: a node floating over a section edge or over the viewport. */
export function createOverlay(type: string, anchor: Overlay["anchor"]): Overlay {
  return {
    id: newId("o"),
    node: createNode(type),
    anchor,
    place: { base: { h: anchor === "viewport" ? "right" : "center", v: anchor === "viewport" ? "bottom" : "top", dx: anchor === "viewport" ? -16 : 0, dy: anchor === "viewport" ? -16 : 0, width: 160 } },
    z: 5,
  };
}

export function updateOverlay(page: Page, id: string, fn: (o: Overlay) => Overlay): Page {
  const i = page.overlays.findIndex((o) => o.id === id);
  if (i < 0) return page;
  const next = fn(page.overlays[i]!);
  return next === page.overlays[i] ? page : { ...page, overlays: page.overlays.map((o, j) => (j === i ? next : o)) };
}

/** Deep-copy a section or node with fresh ids, placed right after the original. */
export function duplicate(page: Page, id: string): Page {
  const at = locate(page, id);
  if (!at) return page;
  const copyNode = (n: Node): Node => ({ ...structuredClone(n), id: newId("n") });
  if (at.kind === "section") {
    const copy: Section = { ...structuredClone(at.section), id: newId("s"), children: at.section.children.map(copyNode) };
    return addSection(page, copy, at.index + 1);
  }
  if (at.kind === "node") return addNode(page, at.section.id, copyNode(at.node), at.index + 1);
  return { ...page, overlays: [...page.overlays, { ...structuredClone(at.overlay), id: newId("o"), node: copyNode(at.node) }] };
}
