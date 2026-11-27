import * as cms from "../../model/cms";
import { createNode, createSection } from "../../model/page-ops";
import type { CmsCollection, CmsFieldType, CmsItem } from "../../schema";
import { getState, setPage, update } from "../store";
import { addExample, EXAMPLES } from "./examples";

/**
 * The Collections view's edits, each one undo step in the editor's history (typing into one cell
 * merges into a single step). They change `site.cms` and design pages like any other draft edit,
 * so they sync to everyone and publish with the rest.
 */

const col = (id: string) => cms.collectionById(getState().site, id);

export function newCollection(name: string, itemName: string): string {
  let made = "";
  update((site) => {
    const blank = blankDesign(itemName);
    const r = cms.addCollection(site, { name: name.trim() || "Collection", itemName: itemName.trim() || "Item", design: blank });
    made = r.id;
    return r.site;
  }, `New collection ${name}`);
  return made;
}

export function newExample(id: (typeof EXAMPLES)[number]["id"]): string {
  let made = "";
  update((site) => {
    const r = addExample(site, id);
    made = r.id;
    return r.site;
  }, `Add ${EXAMPLES.find((e) => e.id === id)?.name ?? "example"} collection`);
  return made;
}

export function newItem(collectionId: string, values: Partial<CmsItem> = {}): string {
  let made = "";
  update((site) => {
    const r = cms.addItem(site, collectionId, values);
    made = r.id;
    return r.site;
  }, `New ${col(collectionId)?.itemName.toLowerCase() ?? "item"}`);
  return made;
}

export const editItem = (collectionId: string, itemId: string, patch: Parameters<typeof cms.updateItem>[3], what = "item") =>
  update((site) => cms.updateItem(site, collectionId, itemId, patch), `Edit ${what}`, { merge: `cms:${itemId}:${Object.keys(patch).join(",")}:${Object.keys(patch.values ?? {}).join(",")}` });

export const setStatus = (collectionId: string, ids: string[], status: CmsItem["status"]) =>
  update((site) => cms.setItemsStatus(site, collectionId, ids, status), ids.length > 1 ? `Set ${ids.length} items ${status}` : status === "live" ? "Set live" : "Set to draft");

export function duplicate(collectionId: string, itemId: string): string {
  let made = "";
  update((site) => {
    const r = cms.duplicateItem(site, collectionId, itemId);
    made = r.id;
    return r.site;
  }, "Duplicate item");
  return made;
}

export const removeItems = (collectionId: string, ids: string[]) => update((site) => cms.removeItems(site, collectionId, ids), ids.length > 1 ? `Delete ${ids.length} items` : "Delete item");
export const moveItem = (collectionId: string, itemId: string, by: number) => update((site) => cms.moveItem(site, collectionId, itemId, by), "Move item");

export function addField(collectionId: string, name: string, type: CmsFieldType): string {
  let made = "";
  update((site) => {
    const r = cms.addField(site, collectionId, { name: name.trim() || "Field", type });
    made = r.id;
    return r.site;
  }, `Add field ${name}`);
  return made;
}
export const editField = (collectionId: string, fieldId: string, patch: Parameters<typeof cms.updateField>[3]) =>
  update((site) => cms.updateField(site, collectionId, fieldId, patch), "Edit field", { merge: `cms-field:${fieldId}:${Object.keys(patch).join(",")}` });
export const moveField = (collectionId: string, fieldId: string, by: number) => update((site) => cms.moveField(site, collectionId, fieldId, by), "Move field");
export const removeField = (collectionId: string, fieldId: string) => update((site) => cms.removeField(site, collectionId, fieldId), "Remove field");

export const editCollection = (collectionId: string, patch: Partial<Pick<CmsCollection, "name" | "itemName" | "summaryField" | "imageField">>) =>
  update((site) => cms.updateCollection(site, collectionId, (c) => ({ ...c, ...patch })), "Edit collection", { merge: `cms-col:${collectionId}:${Object.keys(patch).join(",")}` });
export const moveCollection = (collectionId: string, base: string) => update((site) => cms.setCollectionBase(site, collectionId, base), "Change collection address");
export const removeCollection = (collectionId: string) => update((site) => cms.removeCollection(site, collectionId), "Delete collection");

/** Open the collection's page design on the canvas (making a simple one first if it has none). */
export function openDesign(collectionId: string) {
  const c = col(collectionId);
  if (!c) return;
  let pageId = c.pageId && getState().site.pages.some((p) => p.id === c.pageId) ? c.pageId : "";
  if (!pageId) {
    const design = blankDesign(c.itemName);
    update((site) => cms.setDesignPage(site, collectionId, design), "Add page design");
    pageId = design.id;
  }
  setPage(pageId);
}

/** A simple page design: the title as a heading and a paragraph, both connected. */
function blankDesign(itemName: string) {
  const heading = { ...createNode("Text", { content: { text: `${itemName} title`, styleId: "h1", tag: "h1" } }), bind: { text: cms.TITLE } };
  const body = createNode("Text", { content: { text: `Write about the ${itemName.toLowerCase()} here, or connect this text to a field.`, styleId: "body", tag: "p" } });
  return {
    id: `p_${Math.random().toString(36).slice(2, 10)}`,
    title: `${itemName} page`,
    slug: "/x",
    parentId: null,
    status: "draft" as const,
    template: "blank",
    seo: {},
    isHome: false,
    showInNav: false,
    sections: [createSection("flow", { name: itemName, children: [heading, body] })],
    overlays: [],
  };
}
