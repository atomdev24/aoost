import { copyOf, copyStyle, pasteClip, pasteStyle, type Clip, type StyleClip } from "../../model/clipboard";
import { locate, remove, updateNode } from "../../model/page-ops";
import { selectBlock } from "../board/bridge";
import { currentPage, getState, updatePage } from "../store";

/*
 * Copy, cut, paste and Copy style / Paste style for the selected block or section (⌘C ⌘X ⌘V,
 * ⌥⌘C ⌥⌘V, the right-click menu, ⌘K). What's copied is kept in this browser (localStorage), so it
 * pastes on another page or after a reload.
 */
const CLIP = "aoost.clip";
const STYLE = "aoost.styleClip";

function read<T>(key: string): T | null {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: only this visit */
  }
  memory.set(key, value);
}
const memory = new Map<string, unknown>();
const get = <T,>(key: string): T | null => (memory.get(key) as T | undefined) ?? read<T>(key);

const selected = () => getState().selection[0] ?? null;

/** Words highlighted anywhere (the editor or a page frame): ⌘C and ⌘X then copy those, as usual. */
function textSelected(): boolean {
  const docs: Document[] = [document];
  document.querySelectorAll("iframe").forEach((f) => {
    try {
      if (f.contentDocument) docs.push(f.contentDocument);
    } catch {
      /* another site's frame */
    }
  });
  return docs.some((d) => {
    const sel = d.getSelection();
    return !!sel && !sel.isCollapsed && sel.toString().trim().length > 0;
  });
}

export const hasClip = () => !!get<Clip>(CLIP);
export const hasStyleClip = () => !!get<StyleClip>(STYLE);

export function copySelection(): boolean {
  if (textSelected()) return false;
  const id = selected();
  const clip = id ? copyOf(currentPage(getState()), id) : null;
  if (!clip) return false;
  write(CLIP, clip);
  return true;
}

export function cutSelection(): boolean {
  if (textSelected()) return false;
  const id = selected();
  const page = currentPage(getState());
  const clip = id ? copyOf(page, id) : null;
  if (!id || !clip) return false;
  write(CLIP, clip);
  updatePage(page.id, (p) => remove(p, id), clip.kind === "section" ? "Cut section" : "Cut block");
  selectBlock(null);
  return true;
}

export function pasteClipboard(): boolean {
  const clip = get<Clip>(CLIP);
  if (!clip) return false;
  const page = currentPage(getState());
  let made = "";
  updatePage(
    page.id,
    (p) => {
      const r = pasteClip(p, clip, selected());
      made = r.id;
      return r.page;
    },
    clip.kind === "section" ? "Paste section" : "Paste block",
  );
  if (made) selectBlock(made);
  return !!made;
}

export function copyStyleOfSelection(): boolean {
  const id = selected();
  const at = id ? locate(currentPage(getState()), id) : null;
  const node = at?.kind === "node" ? at.node : at?.kind === "overlay" ? at.overlay.node : null;
  if (!node) return false;
  write(STYLE, copyStyle(node));
  return true;
}

export function pasteStyleOnSelection(): boolean {
  const clip = get<StyleClip>(STYLE);
  const ids = getState().selection;
  if (!clip || !ids.length) return false;
  const page = currentPage(getState());
  const nodes = ids.filter((id) => {
    const at = locate(page, id);
    return at?.kind === "node" || at?.kind === "overlay";
  });
  if (!nodes.length) return false;
  updatePage(page.id, (p) => nodes.reduce((acc, id) => updateNode(acc, id, (n) => pasteStyle(n, clip)), p), "Paste style");
  return true;
}
