import type { ActionId, Group } from "./registry";

/**
 * The keyboard map (Alex confirmed this list). A combo matches on `key`
 * (e.key, lower-cased) or `code` (e.code, for keys whose character changes
 * with Shift). `mod` is ⌘ on a Mac and Ctrl elsewhere.
 */
export type Combo = { key?: string; code?: string; mod?: boolean; shift?: boolean | "any" };

export type Shortcut = {
  id: string;
  /** What it runs; none for held keys (Space-drag) the board handles itself. */
  action?: ActionId;
  group: Group;
  label: string;
  /** How it's written, in order: "mod", "shift", then keys. */
  keys: string[];
  combos: Combo[];
  /** Also fires while typing in a field (only ⌘ shortcuts may). */
  whileTyping?: boolean;
};

const one = (action: ActionId, group: Group, label: string, key: string, extra: Partial<Shortcut> = {}): Shortcut => ({
  id: action,
  action,
  group,
  label,
  keys: [key.toUpperCase()],
  combos: [{ key }],
  ...extra,
});

export const SHORTCUTS: Shortcut[] = [
  { id: "palette.open", action: "palette.open", group: "Palette and help", label: "Search and commands", keys: ["mod", "K"], combos: [{ key: "k", mod: true }], whileTyping: true },
  { id: "help.shortcuts", action: "help.shortcuts", group: "Palette and help", label: "Keyboard shortcuts", keys: ["?"], combos: [{ key: "?", shift: "any" }] },

  one("tool.select", "Tools", "Select", "v"),
  one("tool.frame", "Tools", "Frame", "f"),
  one("tool.text", "Tools", "Text", "t"),
  one("tool.image", "Tools", "Image", "i"),

  { id: "canvas.pan", group: "Canvas", label: "Pan (hold and drag)", keys: ["Space"], combos: [{ code: "Space" }] },
  { id: "canvas.zoomIn", action: "canvas.zoomIn", group: "Canvas", label: "Zoom in", keys: ["mod", "+"], combos: [{ key: "=", mod: true, shift: "any" }, { key: "+", mod: true, shift: "any" }] },
  { id: "canvas.zoomOut", action: "canvas.zoomOut", group: "Canvas", label: "Zoom out", keys: ["mod", "−"], combos: [{ key: "-", mod: true, shift: "any" }, { key: "_", mod: true, shift: "any" }] },
  { id: "canvas.zoom100", action: "canvas.zoom100", group: "Canvas", label: "Zoom to 100%", keys: ["mod", "0"], combos: [{ key: "0", mod: true }] },
  { id: "canvas.fitAll", action: "canvas.fitAll", group: "Canvas", label: "Fit all", keys: ["shift", "1"], combos: [{ code: "Digit1", shift: true }] },
  { id: "frame.widescreen", action: "frame.widescreen", group: "Canvas", label: "Widescreen frame", keys: ["mod", "1"], combos: [{ code: "Digit1", mod: true }] },
  { id: "frame.desktop", action: "frame.desktop", group: "Canvas", label: "Desktop frame", keys: ["mod", "2"], combos: [{ code: "Digit2", mod: true }] },
  { id: "frame.tablet", action: "frame.tablet", group: "Canvas", label: "Tablet frame", keys: ["mod", "3"], combos: [{ code: "Digit3", mod: true }] },
  { id: "frame.mobile", action: "frame.mobile", group: "Canvas", label: "Mobile frame", keys: ["mod", "4"], combos: [{ code: "Digit4", mod: true }] },
  { id: "canvas.grid", action: "canvas.grid", group: "Canvas", label: "Dot grid", keys: ["'"], combos: [{ key: "'" }, { code: "Quote" }] },

  { id: "block.duplicate", action: "block.duplicate", group: "Blocks", label: "Duplicate", keys: ["mod", "D"], combos: [{ key: "d", mod: true }] },
  { id: "block.delete", action: "block.delete", group: "Blocks", label: "Delete", keys: ["Delete"], combos: [{ key: "delete" }, { key: "backspace" }] },
  { id: "block.moveUp", action: "block.moveUp", group: "Blocks", label: "Move up", keys: ["mod", "↑"], combos: [{ key: "arrowup", mod: true }] },
  { id: "block.moveDown", action: "block.moveDown", group: "Blocks", label: "Move down", keys: ["mod", "↓"], combos: [{ key: "arrowdown", mod: true }] },
  { id: "block.hide", action: "block.hide", group: "Blocks", label: "Hide on this size", keys: ["mod", "shift", "H"], combos: [{ key: "h", mod: true, shift: true }] },
  { id: "block.edit", action: "block.edit", group: "Blocks", label: "Edit or adjust", keys: ["Enter"], combos: [{ key: "enter" }] },
  { id: "block.stepOut", action: "block.stepOut", group: "Blocks", label: "Step out", keys: ["Esc"], combos: [{ key: "escape" }] },

  one("panel.layers", "Panels", "Layers", "l"),
  one("panel.pages", "Panels", "Pages", "p"),
  one("panel.media", "Panels", "Media", "m"),
  one("panel.insert", "Panels", "Add (Insert)", "a"),
  { id: "insert.quick", action: "insert.quick", group: "Panels", label: "Quick insert", keys: ["/"], combos: [{ key: "/" }] },

  { id: "history.undo", action: "history.undo", group: "History and publishing", label: "Undo", keys: ["mod", "Z"], combos: [{ key: "z", mod: true }] },
  { id: "history.redo", action: "history.redo", group: "History and publishing", label: "Redo", keys: ["mod", "shift", "Z"], combos: [{ key: "z", mod: true, shift: true }] },
  { id: "draft.save", action: "draft.save", group: "History and publishing", label: "Save the draft", keys: ["mod", "S"], combos: [{ key: "s", mod: true }], whileTyping: true },
  { id: "publish.sheet", action: "publish.sheet", group: "History and publishing", label: "Publish sheet", keys: ["mod", "shift", "P"], combos: [{ key: "p", mod: true, shift: true }], whileTyping: true },
];

type KeyLike = { key: string; code: string; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean };

const fits = (c: Combo, e: KeyLike) => {
  const mod = e.metaKey || e.ctrlKey;
  if (!!c.mod !== mod) return false;
  if (c.shift !== "any" && !!c.shift !== e.shiftKey) return false;
  if (c.code) return e.code === c.code;
  return e.key.toLowerCase() === c.key;
};

/** The shortcut a key press means, if any. Alt combinations are left to the browser and the fields. */
export function matchShortcut(e: KeyLike): Shortcut | null {
  if (e.altKey) return null;
  return SHORTCUTS.find((s) => s.combos.some((c) => fits(c, e))) ?? null;
}

/** A stable name for a combo, to find clashes. */
export const comboName = (c: Combo) => `${c.mod ? "mod+" : ""}${c.shift === true ? "shift+" : c.shift === "any" ? "anyshift+" : ""}${c.code ? `code:${c.code}` : `key:${c.key}`}`;

export const isMac = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/** The keys as shown: ⌘ ⇧ on a Mac, Ctrl Shift elsewhere. */
export function keyLabels(s: Shortcut, mac = isMac()): string[] {
  return s.keys.map((k) => (k === "mod" ? (mac ? "⌘" : "Ctrl") : k === "shift" ? (mac ? "⇧" : "Shift") : k));
}

export const shortcutFor = (action: ActionId) => SHORTCUTS.find((s) => s.action === action) ?? null;
