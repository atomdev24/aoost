import { Mark, mergeAttributes } from "@tiptap/core";
import Bold from "@tiptap/extension-bold";
import Document from "@tiptap/extension-document";
import HardBreak from "@tiptap/extension-hard-break";
import Italic from "@tiptap/extension-italic";
import Link from "@tiptap/extension-link";
import { BulletList, ListItem, OrderedList } from "@tiptap/extension-list";
import Paragraph from "@tiptap/extension-paragraph";
import Strike from "@tiptap/extension-strike";
import Text from "@tiptap/extension-text";
import Underline from "@tiptap/extension-underline";
import { UndoRedo } from "@tiptap/extensions";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { updateNode } from "../../model/page-ops";
import { cleanDoc, docToText, isPlain, richFor, textToDoc } from "../../model/rich";
import type { Node } from "../../schema";
import { getState, updatePage, useEditor as useStore } from "../store";
import { getRichEdit, stopRichEdit } from "./edit-store";
import "./rich.css";

/** A colour on a few words: a theme token ("token:rust") or a hex colour. */
const Colour = Mark.create({
  name: "color",
  addAttributes: () => ({ color: { default: null } }),
  parseHTML: () => [{ tag: "span[data-colour]", getAttrs: (el) => ({ color: (el as HTMLElement).getAttribute("data-colour") }) }],
  renderHTML: ({ HTMLAttributes }) => {
    const c = String(HTMLAttributes.color ?? "");
    const m = /^token:([a-zA-Z][a-zA-Z0-9]*)$/.exec(c);
    return ["span", mergeAttributes({ "data-colour": c, style: `color:${m ? `var(--c-${m[1]})` : c}` }), 0];
  },
});

const EXTENSIONS = [
  Document,
  Paragraph,
  Text,
  HardBreak,
  Bold,
  Italic,
  Underline,
  Strike,
  Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: null, target: null } }),
  BulletList,
  OrderedList,
  ListItem,
  Colour,
  UndoRedo,
];

/** Save the edited words: `text` always, `rich` only when the words carry more than `text` can say. */
function save(id: string, editor: Editor, merge: string) {
  const doc = cleanDoc(editor.getJSON());
  if (!doc) return;
  const text = docToText(doc);
  const rich = isPlain(doc) ? undefined : doc;
  const page = getState().pageId;
  updatePage(
    page,
    (p) =>
      updateNode(p, id, (n) => {
        if (n.content.text === text && JSON.stringify(n.content.rich ?? null) === JSON.stringify(rich ?? null)) return n;
        const content: Node["content"] = { ...n.content, text };
        if (rich) content.rich = rich;
        else delete content.rich;
        return { ...n, content };
      }),
    "Edit text",
    { merge },
  );
}

/**
 * Editing a text block where it sits: the same element and classes as the page draws, with a
 * small formatting bar above it (docked at the bottom on phones). Every change is saved after a
 * short pause, as one undo step for the whole edit; Esc, Done or a click elsewhere finishes.
 */
export function RichEditing({ node }: { node: Node }) {
  const content = node.content as { text: string; styleId: string; tag: string; rich?: unknown };
  const styles = useStore((s) => s.site.theme.typeStyles);
  const known = content.styleId in styles;
  const merge = useRef(`rich:${node.id}:${Date.now()}`).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editor = useEditor({
    extensions: EXTENSIONS,
    content: richFor(content) ?? textToDoc(content.text ?? ""),
    autofocus: "end",
    immediatelyRender: true,
    editorProps: { attributes: { class: `tx t-${known ? content.styleId : "body"} tx-flow tx-editing`, "data-rich-editing": "", "aria-label": "Edit text", spellcheck: "true" } },
    onUpdate: ({ editor }) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => save(node.id, editor, merge), 450);
    },
  });

  // Finish: save straight away and leave editing.
  const finish = useRef(() => {});
  finish.current = () => {
    if (timer.current) clearTimeout(timer.current);
    if (editor) save(node.id, editor, merge);
    stopRichEdit();
  };
  useEffect(() => () => void (timer.current && editor && (clearTimeout(timer.current), save(node.id, editor, merge))), [editor, node.id, merge]);

  useEffect(() => {
    document.body.classList.add("ed-rich-on");
    return () => {
      document.body.classList.remove("ed-rich-on");
      // Left another way (another screen size, another page): editing is over.
      if (getRichEdit()?.id === node.id) stopRichEdit();
    };
  }, [node.id]);

  // Esc finishes; a press outside the text and its bar finishes too.
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const doc = host.current?.ownerDocument;
    if (!doc) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        finish.current();
      }
    };
    const down = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (t?.closest?.("[data-rich-editing], .ed-richbar, .ed-richpop")) return;
      finish.current();
    };
    // Native listeners on the host: the canvas's own (drag, select) sit on the block around it.
    const stop = (e: Event) => e.stopPropagation();
    const el = host.current!;
    el.addEventListener("pointerdown", stop);
    el.addEventListener("mousedown", stop);
    el.addEventListener("touchstart", stop, { passive: true });
    el.addEventListener("dragstart", stop);
    doc.addEventListener("keydown", key, true);
    doc.addEventListener("pointerdown", down, true);
    document.addEventListener("pointerdown", down, true);
    return () => {
      doc.removeEventListener("keydown", key, true);
      doc.removeEventListener("pointerdown", down, true);
      document.removeEventListener("pointerdown", down, true);
      el.removeEventListener("pointerdown", stop);
      el.removeEventListener("mousedown", stop);
      el.removeEventListener("touchstart", stop);
      el.removeEventListener("dragstart", stop);
    };
  }, []);

  return (
    // Pointer and key presses stay with the text: the canvas mustn't start a drag or a shortcut.
    <div ref={host} className="ed-richhost" onKeyDown={(e) => e.stopPropagation()}>
      <EditorContent editor={editor} />
      {editor ? <RichBar editor={editor} anchor={host} onDone={() => finish.current()} /> : null}
    </div>
  );
}

// ------------------------------------------------------------------ the formatting bar

function useAnchorRect(anchor: React.RefObject<HTMLElement | null>) {
  const [rect, setRect] = useState<{ top: number; left: number; bottom: number; width: number } | null>(null);
  useLayoutEffect(() => {
    let raf = 0;
    const tick = () => {
      const el = anchor.current;
      const win = el?.ownerDocument.defaultView;
      const frame = win?.frameElement as HTMLElement | null;
      if (el && frame) {
        const f = frame.getBoundingClientRect();
        const scale = f.width / (el.ownerDocument.documentElement.clientWidth || f.width);
        const r = el.getBoundingClientRect();
        const next = { top: f.top + r.top * scale, left: f.left + r.left * scale, bottom: f.top + r.bottom * scale, width: r.width * scale };
        setRect((p) => (p && p.top === next.top && p.left === next.left && p.bottom === next.bottom && p.width === next.width ? p : next));
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [anchor]);
  return rect;
}

function RichBar({ editor, anchor, onDone }: { editor: Editor; anchor: React.RefObject<HTMLElement | null>; onDone: () => void }) {
  const rect = useAnchorRect(anchor);
  const colors = useStore((s) => s.site.theme.colors);
  const [pop, setPop] = useState<null | "colour" | "link">(null);
  const [href, setHref] = useState("");
  const st = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      link: e.isActive("link"),
      linkHref: (e.getAttributes("link").href as string | undefined) ?? "",
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      colour: (e.getAttributes("color").color as string | undefined) ?? "",
      empty: e.state.selection.empty,
    }),
  });
  if (!rect || !st) return null;
  const phone = window.innerWidth <= 600;
  // Above the on-screen keyboard: the part of the window it covers.
  const vv = window.visualViewport;
  const keyboard = vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0;
  const top = rect.top - 52 < 56 ? rect.bottom + 8 : rect.top - 52;
  const style: React.CSSProperties = phone ? { bottom: `calc(${keyboard + 8}px + env(safe-area-inset-bottom))` } : { top, left: Math.max(8, Math.min(rect.left, window.innerWidth - 470)) };
  const chain = () => editor.chain().focus();
  // Keys typed right after a click on the bar belong to the text: give it focus back now.
  const refocus = () => {
    editor.view.dom.ownerDocument.defaultView?.focus();
    editor.view.focus();
  };
  const btn = (label: string, on: boolean, run: () => void, glyph: React.ReactNode, kbd?: string, ownFocus = false) => (
    <button type="button" className="ed-richbtn" aria-label={label} title={kbd ? `${label} (${kbd})` : label} aria-pressed={on} onMouseDown={(e) => e.preventDefault()} onClick={() => (run(), ownFocus ? undefined : refocus())}>
      {glyph}
    </button>
  );
  const swatches = Object.keys(colors).slice(0, 12);
  return createPortal(
    <div className={`ed-richbar${phone ? " ed-richbar-phone" : ""}`} style={style} role="toolbar" aria-label="Text formatting">
      {btn("Bold", st.bold, () => chain().toggleBold().run(), <b>B</b>, "⌘B")}
      {btn("Italic", st.italic, () => chain().toggleItalic().run(), <i>I</i>, "⌘I")}
      {btn("Underline", st.underline, () => chain().toggleUnderline().run(), <u>U</u>, "⌘U")}
      {btn("Strikethrough", st.strike, () => chain().toggleStrike().run(), <s>S</s>, "⌘⇧S")}
      <span className="ed-richsep" />
      {btn(
        "Colour",
        !!st.colour,
        () => setPop(pop === "colour" ? null : "colour"),
        <span className="ed-richdot" style={{ background: st.colour ? (st.colour.startsWith("token:") ? `var(--c-${st.colour.slice(6)}, currentColor)` : st.colour) : "currentColor" }} />,
      )}
      {btn(
        "Link",
        st.link,
        () => {
          setHref(st.linkHref);
          setPop(pop === "link" ? null : "link");
        },
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
          <path d="M6.5 9.5l3-3M7 4.5l1.2-1.2a2.5 2.5 0 0 1 3.5 3.5L10.5 8M9 11.5l-1.2 1.2a2.5 2.5 0 0 1-3.5-3.5L5.5 8" />
        </svg>,
        "⌘K",
        true,
      )}
      <span className="ed-richsep" />
      {btn(
        "Bulleted list",
        st.bullet,
        () => chain().toggleBulletList().run(),
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <circle cx="3" cy="4" r="1.3" />
          <circle cx="3" cy="8" r="1.3" />
          <circle cx="3" cy="12" r="1.3" />
          <rect x="6" y="3.3" width="8" height="1.4" rx=".7" />
          <rect x="6" y="7.3" width="8" height="1.4" rx=".7" />
          <rect x="6" y="11.3" width="8" height="1.4" rx=".7" />
        </svg>,
      )}
      {btn(
        "Numbered list",
        st.ordered,
        () => chain().toggleOrderedList().run(),
        <span className="ed-richnum" aria-hidden="true">
          1.
        </span>,
      )}
      {btn("Clear formatting", false, () => chain().unsetAllMarks().run(), <span aria-hidden="true">T̸</span>)}
      <span className="ed-richsep" />
      <button type="button" className="ed-richdone" onMouseDown={(e) => e.preventDefault()} onClick={onDone}>
        Done
      </button>
      {pop === "colour" ? (
        <div className="ed-richpop" role="dialog" aria-label="Text colour">
          <div className="ed-richswatches">
            {swatches.map((k) => (
              <button
                key={k}
                type="button"
                className="ed-richswatch"
                title={k}
                aria-label={k}
                aria-pressed={st.colour === `token:${k}`}
                style={{ background: colors[k] }}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => (chain().setMark("color", { color: `token:${k}` }).run(), setPop(null), refocus())}
              />
            ))}
          </div>
          <div className="ed-richrow">
            <input
              className="ed-input"
              aria-label="Colour code"
              placeholder="#D97757"
              defaultValue={st.colour.startsWith("#") ? st.colour : ""}
              onKeyDown={(e) => {
                const v = (e.target as HTMLInputElement).value.trim();
                if (e.key === "Enter" && /^#[0-9a-fA-F]{3,8}$/.test(v)) (chain().setMark("color", { color: v }).run(), setPop(null));
              }}
            />
            <button type="button" className="ed-btn ed-btn-sm" onMouseDown={(e) => e.preventDefault()} onClick={() => (chain().unsetMark("color").run(), setPop(null), refocus())}>
              Remove
            </button>
          </div>
        </div>
      ) : null}
      {pop === "link" ? (
        <form
          className="ed-richpop ed-richrow"
          onSubmit={(e) => {
            e.preventDefault();
            const v = href.trim();
            if (v) chain().extendMarkRange("link").setLink({ href: v }).run();
            else chain().extendMarkRange("link").unsetLink().run();
            setPop(null);
            refocus();
          }}
        >
          <input className="ed-input" aria-label="Link address" placeholder="/work or https://…" value={href} autoFocus onChange={(e) => setHref(e.target.value)} />
          <button type="submit" className="ed-btn ed-btn-sm ed-btn-primary">
            {href.trim() ? "Link" : "Remove"}
          </button>
        </form>
      ) : null}
    </div>,
    document.body,
  );
}
