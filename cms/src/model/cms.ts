import type { CmsCollection, CmsField, CmsFieldType, CmsItem, CmsValue, Node, Overlay, Page, Section, Site } from "../schema";

/**
 * Collections (the Framer-style CMS, EDITOR-COLLECTIONS.md): a collection is a list of items with
 * typed fields, managed in the table view, plus one page design on the canvas. Every item becomes
 * a page made from the design, with the connected block settings (`node.bind`) filled from the
 * item. Pure functions: the editor, the build and the Worker all use them.
 */

/** The design page's own address under the collection (an item can't take this slug). */
export const DESIGN_SLUG = "item-design";
/** The pseudo field every collection has. */
export const TITLE = "title";

export const FIELD_TYPES: { type: CmsFieldType; label: string }[] = [
  { type: "text", label: "Text" },
  { type: "longtext", label: "Long text" },
  { type: "image", label: "Picture" },
  { type: "link", label: "Link" },
  { type: "date", label: "Date" },
  { type: "toggle", label: "On / off" },
  { type: "choice", label: "Choice" },
  { type: "number", label: "Number" },
];

// ------------------------------------------------------------------ reading

export const collectionById = (site: Site, id: string) => site.cms.find((c) => c.id === id);
export const designPageOf = (site: Site, col: CmsCollection): Page | undefined => (col.pageId ? site.pages.find((p) => p.id === col.pageId && p.collectionId === col.id) : undefined);
export const isDesignPage = (p: Pick<Page, "collectionId">) => !!p.collectionId;
export const itemAddress = (col: Pick<CmsCollection, "base">, item: Pick<CmsItem, "slug">) => `${col.base}/${item.slug}`;
export const fieldById = (col: CmsCollection, id: string) => col.fields.find((f) => f.id === id);
/** "Title" or the field's name, for pickers. */
export const fieldName = (col: CmsCollection, id: string) => (id === TITLE ? "Title" : (fieldById(col, id)?.name ?? id));

/** An item's value for a field ("title" is the item's title). */
export function fieldValue(col: CmsCollection, item: CmsItem, fieldId: string): CmsValue | undefined {
  if (fieldId === TITLE) return item.title;
  return item.values[fieldId];
}

/** Live items in table order; with `all`, drafts too. */
export const itemsOf = (col: CmsCollection, all = false) => col.items.filter((i) => all || i.status === "live");

// ------------------------------------------------------------------ slugs

/** "AC Foods optimizes production!" → "ac-foods-optimizes-production" (max 60 characters). */
export function slugify(text: string): string {
  const s = text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return s || "item";
}

/** A slug no other item of the collection has (and not the design page's): "ac-foods", "ac-foods-2"… */
export function uniqueSlug(col: CmsCollection, wanted: string, exceptItemId?: string): string {
  const taken = new Set(col.items.filter((i) => i.id !== exceptItemId).map((i) => i.slug));
  taken.add(DESIGN_SLUG);
  const base = slugify(wanted);
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}

// ------------------------------------------------------------------ values

export function defaultValue(field: Pick<CmsField, "type" | "options">): CmsValue {
  switch (field.type) {
    case "toggle":
      return false;
    case "number":
      return 0;
    case "choice":
      return field.options?.[0] ?? "";
    default:
      return "";
  }
}

/** A value made to fit a field's type (after a type change, or from a text cell). */
export function coerce(field: Pick<CmsField, "type" | "options">, value: unknown): CmsValue {
  switch (field.type) {
    case "toggle":
      return value === true || value === "true" || value === "yes" || value === 1;
    case "number": {
      const n = typeof value === "number" ? value : Number(String(value ?? "").replace(",", "."));
      return Number.isFinite(n) ? n : 0;
    }
    case "date": {
      const s = String(value ?? "");
      return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
    }
    case "choice": {
      const s = String(value ?? "");
      return field.options?.includes(s) ? s : (field.options?.[0] ?? s);
    }
    default:
      return value === undefined || value === null ? "" : String(value);
  }
}

// ------------------------------------------------------------------ item pages

const setPath = (obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> => {
  const [head, ...rest] = path.split(".");
  if (!rest.length) return { ...obj, [head!]: value };
  const inner = obj[head!];
  return { ...obj, [head!]: setPath(inner && typeof inner === "object" && !Array.isArray(inner) ? (inner as Record<string, unknown>) : {}, rest.join("."), value) };
};

/** A block with its connected settings filled from the item. A link setting ({ kind, url }) takes the value as its URL. */
export function bindNode(node: Node, col: CmsCollection, item: CmsItem): Node {
  if (!node.bind) return node;
  let content = node.content;
  for (const [key, fieldId] of Object.entries(node.bind)) {
    const v = fieldValue(col, item, fieldId);
    if (v === undefined) continue;
    const current = key.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), content);
    const isTarget = current && typeof current === "object" && "kind" in (current as object);
    content = setPath(content, key, isTarget ? { kind: "url", url: String(v) } : typeof current === "string" && typeof v !== "string" ? String(v) : v);
  }
  return { ...node, content };
}

const bindSections = (sections: Section[], col: CmsCollection, item: CmsItem): Section[] => sections.map((s) => ({ ...s, children: s.children.map((n) => bindNode(n, col, item)) }));
const bindOverlays = (overlays: Overlay[], col: CmsCollection, item: CmsItem): Overlay[] => overlays.map((o) => ({ ...o, node: bindNode(o.node, col, item) }));

/** The page an item is shown on: the design with the item's values, at the item's address. */
export function itemPage(site: Site, col: CmsCollection, item: CmsItem): Page | null {
  const design = designPageOf(site, col);
  if (!design) return null;
  const text = (id?: string) => {
    const v = id ? fieldValue(col, item, id) : undefined;
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
  };
  const description = text(col.summaryField ?? col.fields.find((f) => f.type === "longtext")?.id);
  const image = text(col.imageField ?? col.fields.find((f) => f.type === "image")?.id);
  return {
    ...design,
    id: `${design.id}--${item.id}`.slice(0, 64),
    title: item.title || col.itemName,
    slug: itemAddress(col, item),
    status: item.status === "live" ? "published" : "draft",
    isHome: false,
    showInNav: false,
    collectionId: undefined,
    translations: undefined,
    seo: { ...design.seo, title: item.title || design.seo.title, ...(description ? { description: description.slice(0, 300) } : {}), ...(image ? { image } : {}) },
    sections: bindSections(design.sections, col, item),
    overlays: bindOverlays(design.overlays, col, item),
  };
}

/** Every item page: live items only (`live`), or drafts too (the signed-in preview). */
export function cmsPages(site: Site, live: boolean): Page[] {
  const out: Page[] = [];
  for (const col of site.cms ?? []) for (const item of itemsOf(col, !live)) {
    const p = itemPage(site, col, item);
    if (p) out.push(p);
  }
  return out;
}

/** The collection and item behind an address ("/success-stories/ac-foods"), if any. */
export function itemAt(site: Site, slug: string): { col: CmsCollection; item: CmsItem } | null {
  for (const col of site.cms ?? []) {
    if (!slug.startsWith(col.base + "/")) continue;
    const item = col.items.find((i) => itemAddress(col, i) === slug);
    if (item) return { col, item };
  }
  return null;
}

// ------------------------------------------------------------------ edits (site → site)

const now = () => new Date().toISOString();
const idFrom = (text: string, taken: Set<string>, prefix: string) => {
  const base = `${prefix}${slugify(text).replace(/-/g, "_")}`.slice(0, 40);
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}_${n}`)) return `${base}_${n}`;
};
const randomId = (prefix: string) => `${prefix}${Math.random().toString(36).slice(2, 10)}`;

export function updateCollection(site: Site, id: string, fn: (c: CmsCollection) => CmsCollection): Site {
  return { ...site, cms: site.cms.map((c) => (c.id === id ? fn(c) : c)) };
}

/** A new collection (and its page design, if one is given). The address is made unique among pages and collections. */
export function addCollection(site: Site, input: { name: string; itemName: string; base?: string; fields?: CmsField[]; items?: CmsItem[]; design?: Page; summaryField?: string; imageField?: string }): { site: Site; id: string } {
  const id = idFrom(input.name, new Set(site.cms.map((c) => c.id)), "c_");
  const takenBases = new Set([...site.cms.map((c) => c.base), ...site.pages.map((p) => p.slug)]);
  let base = `/${slugify(input.base?.replace(/^\//, "") || input.name)}`;
  for (let n = 2; takenBases.has(base); n++) base = `/${slugify(input.base?.replace(/^\//, "") || input.name)}-${n}`;
  const col: CmsCollection = { id, name: input.name, itemName: input.itemName, base, fields: input.fields ?? [], items: input.items ?? [], summaryField: input.summaryField, imageField: input.imageField };
  let next: Site = { ...site, cms: [...site.cms, col] };
  if (input.design) next = setDesignPage(next, id, input.design);
  return { site: next, id };
}

/** Make a page the collection's design (kept as a draft at <base>/item-design). */
export function setDesignPage(site: Site, collectionId: string, page: Page): Site {
  const col = collectionById(site, collectionId);
  if (!col) return site;
  const design: Page = { ...page, collectionId, status: "draft", isHome: false, showInNav: false, slug: `${col.base}/${DESIGN_SLUG}`, title: page.title || `${col.itemName} page` };
  const pages = site.pages.some((p) => p.id === design.id) ? site.pages.map((p) => (p.id === design.id ? design : p)) : [...site.pages, design];
  return updateCollection({ ...site, pages }, collectionId, (c) => ({ ...c, pageId: design.id }));
}

/** Rename a collection or move it to another address (its items and design follow). */
export function setCollectionBase(site: Site, collectionId: string, wanted: string): Site {
  const col = collectionById(site, collectionId);
  if (!col) return site;
  const base = `/${slugify(wanted.replace(/^\//, ""))}`;
  if (base === col.base || site.cms.some((c) => c.id !== col.id && c.base === base) || site.pages.some((p) => p.slug === base && p.id !== col.pageId)) return site;
  const pages = site.pages.map((p) => (p.id === col.pageId ? { ...p, slug: `${base}/${DESIGN_SLUG}` } : p));
  return updateCollection({ ...site, pages }, collectionId, (c) => ({ ...c, base }));
}

/** Remove a collection, its items and its page design. */
export function removeCollection(site: Site, collectionId: string): Site {
  const col = collectionById(site, collectionId);
  if (!col) return site;
  return { ...site, cms: site.cms.filter((c) => c.id !== collectionId), pages: site.pages.filter((p) => p.collectionId !== collectionId) };
}

/** A new item at the end of the table, as a draft, with every field at its default. */
export function addItem(site: Site, collectionId: string, input: Partial<Pick<CmsItem, "title" | "slug" | "status" | "values">> = {}, by?: string): { site: Site; id: string } {
  const col = collectionById(site, collectionId);
  if (!col) return { site, id: "" };
  const id = randomId("i_");
  const title = input.title ?? `New ${col.itemName.toLowerCase()}`;
  const values: Record<string, CmsValue> = {};
  for (const f of col.fields) values[f.id] = input.values?.[f.id] !== undefined ? coerce(f, input.values[f.id]) : defaultValue(f);
  const item: CmsItem = { id, title, slug: uniqueSlug(col, input.slug ?? title), status: input.status ?? "draft", values, updatedAt: now(), ...(by ? { updatedBy: by } : {}) };
  return { site: updateCollection(site, collectionId, (c) => ({ ...c, items: [...c.items, item] })), id };
}

/** Change an item. A new slug is cleaned and made unique; values are made to fit their fields. */
export function updateItem(site: Site, collectionId: string, itemId: string, patch: Partial<Pick<CmsItem, "title" | "slug" | "status">> & { values?: Record<string, unknown> }, by?: string): Site {
  return updateCollection(site, collectionId, (c) => ({
    ...c,
    items: c.items.map((i) => {
      if (i.id !== itemId) return i;
      const values = { ...i.values };
      for (const [k, v] of Object.entries(patch.values ?? {})) {
        const f = fieldById(c, k);
        if (f) values[k] = coerce(f, v);
      }
      return {
        ...i,
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.status ? { status: patch.status } : {}),
        ...(patch.slug !== undefined ? { slug: uniqueSlug(c, patch.slug || patch.title || i.title, i.id) } : {}),
        values,
        updatedAt: now(),
        ...(by ? { updatedBy: by } : {}),
      };
    }),
  }));
}

export function setItemsStatus(site: Site, collectionId: string, ids: string[], status: CmsItem["status"], by?: string): Site {
  const set = new Set(ids);
  return updateCollection(site, collectionId, (c) => ({ ...c, items: c.items.map((i) => (set.has(i.id) && i.status !== status ? { ...i, status, updatedAt: now(), ...(by ? { updatedBy: by } : {}) } : i)) }));
}

/** A copy right after the item, as a draft, with "copy" on its title and a free slug. */
export function duplicateItem(site: Site, collectionId: string, itemId: string): { site: Site; id: string } {
  const col = collectionById(site, collectionId);
  const from = col?.items.find((i) => i.id === itemId);
  if (!col || !from) return { site, id: "" };
  const id = randomId("i_");
  const copy: CmsItem = { ...structuredClone(from), id, title: `${from.title} copy`, slug: uniqueSlug(col, `${from.slug}-copy`), status: "draft", updatedAt: now() };
  const at = col.items.findIndex((i) => i.id === itemId);
  return { site: updateCollection(site, collectionId, (c) => ({ ...c, items: [...c.items.slice(0, at + 1), copy, ...c.items.slice(at + 1)] })), id };
}

export function removeItems(site: Site, collectionId: string, ids: string[]): Site {
  const set = new Set(ids);
  return updateCollection(site, collectionId, (c) => ({ ...c, items: c.items.filter((i) => !set.has(i.id)) }));
}

/** Move an item up or down the table (the order lists use). */
export function moveItem(site: Site, collectionId: string, itemId: string, by: number): Site {
  return updateCollection(site, collectionId, (c) => {
    const i = c.items.findIndex((x) => x.id === itemId);
    const j = Math.max(0, Math.min(c.items.length - 1, i + by));
    if (i < 0 || i === j) return c;
    const items = [...c.items];
    const [it] = items.splice(i, 1);
    items.splice(j, 0, it!);
    return { ...c, items };
  });
}

// ------------------------------------------------------------------ fields

export function addField(site: Site, collectionId: string, input: { name: string; type: CmsFieldType; options?: string[] }): { site: Site; id: string } {
  const col = collectionById(site, collectionId);
  if (!col) return { site, id: "" };
  const id = idFrom(input.name, new Set([TITLE, ...col.fields.map((f) => f.id)]), "");
  const field: CmsField = { id, name: input.name, type: input.type, ...(input.type === "choice" ? { options: input.options?.length ? input.options : ["Option 1"] } : {}) };
  return {
    site: updateCollection(site, collectionId, (c) => ({ ...c, fields: [...c.fields, field], items: c.items.map((i) => ({ ...i, values: { ...i.values, [id]: defaultValue(field) } })) })),
    id,
  };
}

/** Rename a field, change its type (values are converted) or its options. */
export function updateField(site: Site, collectionId: string, fieldId: string, patch: Partial<Pick<CmsField, "name" | "type" | "options" | "help">>): Site {
  return updateCollection(site, collectionId, (c) => {
    const old = fieldById(c, fieldId);
    if (!old) return c;
    const field: CmsField = { ...old, ...patch, ...((patch.type ?? old.type) === "choice" ? { options: patch.options ?? old.options ?? ["Option 1"] } : { options: undefined }) };
    if (field.options === undefined) delete field.options;
    const retype = patch.type && patch.type !== old.type;
    return {
      ...c,
      fields: c.fields.map((f) => (f.id === fieldId ? field : f)),
      items: retype || patch.options ? c.items.map((i) => ({ ...i, values: { ...i.values, [fieldId]: coerce(field, i.values[fieldId]) } })) : c.items,
    };
  });
}

export function moveField(site: Site, collectionId: string, fieldId: string, by: number): Site {
  return updateCollection(site, collectionId, (c) => {
    const i = c.fields.findIndex((f) => f.id === fieldId);
    const j = Math.max(0, Math.min(c.fields.length - 1, i + by));
    if (i < 0 || i === j) return c;
    const fields = [...c.fields];
    const [f] = fields.splice(i, 1);
    fields.splice(j, 0, f!);
    return { ...c, fields };
  });
}

const unbind = (n: Node, fieldId: string): Node => {
  if (!n.bind) return n;
  const bind = Object.fromEntries(Object.entries(n.bind).filter(([, f]) => f !== fieldId));
  const { bind: _b, ...rest } = n;
  return Object.keys(bind).length ? { ...n, bind } : (rest as Node);
};

/** Remove a field: its values, the design's connections to it and its use as summary or picture go too. */
export function removeField(site: Site, collectionId: string, fieldId: string): Site {
  const col = collectionById(site, collectionId);
  if (!col) return site;
  const pages = site.pages.map((p) =>
    p.collectionId === collectionId ? { ...p, sections: p.sections.map((s) => ({ ...s, children: s.children.map((n) => unbind(n, fieldId)) })), overlays: p.overlays.map((o) => ({ ...o, node: unbind(o.node, fieldId) })) } : p,
  );
  return updateCollection({ ...site, pages }, collectionId, (c) => ({
    ...c,
    fields: c.fields.filter((f) => f.id !== fieldId),
    items: c.items.map((i) => {
      const { [fieldId]: _gone, ...values } = i.values;
      return { ...i, values };
    }),
    ...(c.summaryField === fieldId ? { summaryField: undefined } : {}),
    ...(c.imageField === fieldId ? { imageField: undefined } : {}),
  }));
}

// ------------------------------------------------------------------ connections

/** Connect (or with null, disconnect) a block setting on a design page to a field. */
export function setBinding(site: Site, pageId: string, nodeId: string, key: string, fieldId: string | null): Site {
  const touch = (n: Node): Node => {
    if (n.id !== nodeId) return n;
    const bind = { ...(n.bind ?? {}) };
    if (fieldId) bind[key] = fieldId;
    else delete bind[key];
    const { bind: _b, ...rest } = n;
    return Object.keys(bind).length ? { ...n, bind } : (rest as Node);
  };
  return {
    ...site,
    pages: site.pages.map((p) => (p.id === pageId ? { ...p, sections: p.sections.map((s) => ({ ...s, children: s.children.map(touch) })), overlays: p.overlays.map((o) => ({ ...o, node: touch(o.node) })) } : p)),
  };
}

/** Which field types fit a block setting, judged by its current value ("text" settings take text fields, pictures take pictures…). */
export function fieldsFor(col: CmsCollection, key: string, sample: unknown): { id: string; name: string }[] {
  const isLink = /url|href|link/i.test(key) || (sample && typeof sample === "object" && "kind" in (sample as object));
  const isPicture = /^(image|src|photo|picture|logo|poster|background|screen|badge|cover|avatar|icon|thumb)$/i.test(key.split(".").pop() ?? "");
  const all = [{ id: TITLE, name: "Title", type: "text" as CmsFieldType }, ...col.fields];
  const ok = (t: CmsFieldType) => {
    if (typeof sample === "boolean") return t === "toggle";
    if (typeof sample === "number") return t === "number";
    if (isPicture) return t === "image";
    if (isLink) return t === "link" || t === "text";
    return t === "text" || t === "longtext" || t === "date" || t === "choice" || t === "number" || t === "link";
  };
  return all.filter((f) => ok(f.type)).map((f) => ({ id: f.id, name: f.name }));
}
