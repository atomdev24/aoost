import { describe, expect, it } from "vitest";
import { ACTION_IDS, ACTIONS, GROUPS } from "./registry";
import { comboName, keyLabels, matchShortcut, shortcutFor, SHORTCUTS } from "./shortcuts";

const press = (key: string, o: Partial<{ code: string; meta: boolean; ctrl: boolean; shift: boolean; alt: boolean }> = {}) => ({
  key,
  code: o.code ?? "",
  metaKey: !!o.meta,
  ctrlKey: !!o.ctrl,
  shiftKey: !!o.shift,
  altKey: !!o.alt,
});

describe("action registry", () => {
  it("has every action exactly once, each with a title and a known group", () => {
    expect(ACTIONS.map((a) => a.id)).toEqual([...ACTION_IDS]);
    expect(new Set(ACTIONS.map((a) => a.id)).size).toBe(ACTIONS.length);
    for (const a of ACTIONS) {
      expect(a.title.trim()).not.toBe("");
      expect(GROUPS).toContain(a.group);
    }
  });
  it("lists common actions for the empty palette, all of them runnable from it", () => {
    const common = ACTIONS.filter((a) => a.common);
    expect(common.length).toBeGreaterThanOrEqual(4);
    expect(common.every((a) => !a.hidden)).toBe(true);
    expect(common.map((a) => a.id)).toContain("publish.now");
  });
  it("offers the editor actions the brief names", () => {
    for (const id of ["publish.now", "frame.desktop", "canvas.grid", "block.hide", "block.resetOverrides"] as const) expect(ACTION_IDS).toContain(id);
  });
});

describe("shortcut map", () => {
  it("has no duplicate keys", () => {
    const names = SHORTCUTS.flatMap((s) => s.combos.map(comboName));
    expect(names.length).toBe(new Set(names).size);
    // A shift-agnostic combo must not shadow a shifted or unshifted one on the same key.
    const base = (n: string) => n.replace(/(anyshift|shift)\+/, "");
    const agnostic = names.filter((n) => n.includes("anyshift+")).map(base);
    const others = names.filter((n) => !n.includes("anyshift+")).map(base);
    expect(agnostic.filter((n) => others.includes(n))).toEqual([]);
  });
  it("has unique ids and only runs actions that exist, each at most once", () => {
    expect(new Set(SHORTCUTS.map((s) => s.id)).size).toBe(SHORTCUTS.length);
    const actions = SHORTCUTS.flatMap((s) => (s.action ? [s.action] : []));
    for (const a of actions) expect(ACTION_IDS).toContain(a);
    expect(new Set(actions).size).toBe(actions.length);
  });
  it("covers Alex's list", () => {
    const want: [ReturnType<typeof press>, string][] = [
      [press("k", { meta: true }), "palette.open"],
      [press("?", { shift: true }), "help.shortcuts"],
      [press("v"), "tool.select"],
      [press("f"), "tool.frame"],
      [press("t"), "tool.text"],
      [press("i"), "tool.image"],
      [press(" ", { code: "Space" }), "canvas.pan"],
      [press("=", { meta: true }), "canvas.zoomIn"],
      [press("-", { meta: true }), "canvas.zoomOut"],
      [press("0", { meta: true }), "canvas.zoom100"],
      [press("!", { code: "Digit1", shift: true }), "canvas.fitAll"],
      [press("1", { code: "Digit1", meta: true }), "frame.widescreen"],
      [press("2", { code: "Digit2", meta: true }), "frame.desktop"],
      [press("3", { code: "Digit3", meta: true }), "frame.tablet"],
      [press("4", { code: "Digit4", meta: true }), "frame.mobile"],
      [press("'", { code: "Quote" }), "canvas.grid"],
      [press("d", { meta: true }), "block.duplicate"],
      [press("Backspace"), "block.delete"],
      [press("Delete"), "block.delete"],
      [press("ArrowUp", { meta: true }), "block.moveUp"],
      [press("ArrowDown", { meta: true }), "block.moveDown"],
      [press("H", { meta: true, shift: true }), "block.hide"],
      [press("Enter"), "block.edit"],
      [press("Escape"), "block.stepOut"],
      [press("l"), "panel.layers"],
      [press("p"), "panel.pages"],
      [press("m"), "panel.media"],
      [press("a"), "panel.insert"],
      [press("/"), "insert.quick"],
      [press("z", { meta: true }), "history.undo"],
      [press("Z", { meta: true, shift: true }), "history.redo"],
      [press("s", { meta: true }), "draft.save"],
      [press("P", { meta: true, shift: true }), "publish.sheet"],
    ];
    for (const [e, id] of want) expect(matchShortcut(e)?.id, `${e.key}`).toBe(id);
  });
  it("maps ⌘ to Ctrl on Windows and leaves Alt alone", () => {
    expect(matchShortcut(press("k", { ctrl: true }))?.id).toBe("palette.open");
    expect(matchShortcut(press("2", { code: "Digit2", ctrl: true }))?.id).toBe("frame.desktop");
    expect(matchShortcut(press("v", { alt: true }))).toBeNull();
    expect(matchShortcut(press("j", { meta: true }))).toBeNull();
    // ⌘V pastes a copied block (fields keep their own paste: shortcuts don't fire while typing).
    expect(matchShortcut(press("v", { meta: true }))?.id).toBe("block.paste");
    // ⌥⌘C on a Mac types "ç": the physical key is what counts.
    expect(matchShortcut(press("ç", { code: "KeyC", meta: true, alt: true }))?.id).toBe("block.copyStyle");
    expect(keyLabels(shortcutFor("block.pasteStyle")!, true)).toEqual(["⌥", "⌘", "V"]);
  });
  it("writes keys for each platform", () => {
    const s = shortcutFor("block.hide")!;
    expect(keyLabels(s, true)).toEqual(["⌘", "⇧", "H"]);
    expect(keyLabels(s, false)).toEqual(["Ctrl", "Shift", "H"]);
  });
  it("lets only ⌘ shortcuts fire while typing", () => {
    for (const s of SHORTCUTS.filter((x) => x.whileTyping)) expect(s.combos.every((c) => c.mod)).toBe(true);
  });
});
