import { Extension } from "@tiptap/core";
import Bold from "@tiptap/extension-bold";
import Document from "@tiptap/extension-document";
import HardBreak from "@tiptap/extension-hard-break";
import Italic from "@tiptap/extension-italic";
import Link from "@tiptap/extension-link";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { UndoRedo } from "@tiptap/extensions";
import { EditorContent, useEditor } from "@tiptap/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { docToMd, mdToDoc } from "../../model/markdown-doc";
import { updateNode } from "../../model/page-ops";
import { getState, updatePage, useEditor as useStore } from "../store";
import { getFieldEdit, stopFieldEdit, type FieldEdit } from "./edit-store";
import { setField } from "./field-locate";
import { RichBar } from "./RichEditing";
import "./rich.css";

/*
 * Editing a words field of any block where it shows (the Aerobotics blocks' headings, paragraphs,
 * card text…): the elements drawing it are hidden and an editor in the same type sits exactly over
 * them. The words keep their marked-up form (**bold**, *italic*, [link](/x)), so nothing about how
 * the page is saved changes. Saved once when editing finishes (Done, Esc, Enter in a one-line
 * field, or a click elsewhere), as one undo step.
 */

const COPY = ["fontFamily", "fontSize", "fontWeight", "fontStyle", "lineHeight", "letterSpacing", "wordSpacing", "color", "textAlign", "textTransform"] as const;

function placeOf(els: HTMLElement[]) {
  const win = els[0]!.ownerDocument.defaultView!;
  const rs = els.map((e) => e.getBoundingClientRect());
  const left = Math.min(...rs.map((r) => r.left));
  const top = Math.min(...rs.map((r) => r.top));
  const right = Math.max(...rs.map((r) => r.right));
  const bottom = Math.max(...rs.map((r) => r.bottom));
  const gap = rs.length > 1 ? Math.max(0, rs[1]!.top - rs[0]!.bottom) : 0;
  return { left: left + win.scrollX, top: top + win.scrollY, width: Math.max(40, right - left), height: bottom - top, gap };
}

/** Plain words as paragraphs and line breaks, with nothing read as a mark. */
const plainDoc = (text: string) => ({
  type: "doc",
  content: text.split(/\n[ \t]*\n/).map((p) => {
    const content = p.split("\n").flatMap((line, i) => [...(i ? [{ type: "hardBreak" }] : []), ...(line ? [{ type: "text", text: line }] : [])]);
    return content.length ? { type: "paragraph", content } : { type: "paragraph" };
  }),
});

function finishEdit(fe: FieldEdit, md: string | null) {
  stopFieldEdit();
  if (md === null) return;
  const next = fe.single ? md.replace(/\n{2,}/g, " ") : md;
  if (next === fe.value) return;
  updatePage(getState().pageId, (p) => updateNode(p, fe.id, (n) => ({ ...n, content: setField(n.content, fe.path, next) })), "Edit text");
}

export function FieldEditing({ fe }: { fe: FieldEdit }) {
  const bp = useStore((s) => s.bp);
  const doc = fe.els[0]!.ownerDocument;
  const [place, setPlace] = useState(() => placeOf(fe.els));
  const look = useRef(Object.fromEntries(COPY.map((k) => [k, doc.defaultView!.getComputedStyle(fe.els[0]!)[k]]))).current;
  const host = useRef<HTMLDivElement>(null);
  const done = useRef(false);

  // Enter finishes a one-line field (a heading, a button label).
  const OneLine = Extension.create({
    name: "oneLine",
    addKeyboardShortcuts: () => ({ Enter: () => (fe.single ? (finish.current(), true) : false) }),
  });
  const editor = useEditor({
    // Plain fields (the block draws the words as they are) get no formatting at all, not even ⌘B.
    extensions: [fe.single ? Document.extend({ content: "paragraph" }) : Document, Paragraph, Text, HardBreak, UndoRedo, OneLine, ...(fe.marks ? [Bold, Italic, Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: null, target: null } })] : [])],
    content: fe.marks ? mdToDoc(fe.single ? fe.value.replace(/\n{2,}/g, " ") : fe.value) : plainDoc(fe.single ? fe.value.replace(/\n{2,}/g, " ") : fe.value),
    autofocus: "end",
    immediatelyRender: true,
    editorProps: { attributes: { class: "ed-fieldedit", "data-rich-editing": "", "aria-label": "Edit text", spellcheck: "true" } },
  });

  const finish = useRef(() => {});
  finish.current = () => {
    if (done.current) return;
    done.current = true;
    finishEdit(fe, editor ? (fe.marks ? docToMd(editor.getJSON()) : editor.getText({ blockSeparator: "\n\n" })) : null);
  };

  // The page's own elements hide while the editor stands in for them.
  useLayoutEffect(() => {
    const was = fe.els.map((e) => e.style.visibility);
    fe.els.forEach((e) => (e.style.visibility = "hidden"));
    document.body.classList.add("ed-rich-on");
    const win = doc.defaultView!;
    const again = () => setPlace(placeOf(fe.els));
    win.addEventListener("resize", again);
    return () => {
      fe.els.forEach((e, i) => (e.style.visibility = was[i] ?? ""));
      document.body.classList.remove("ed-rich-on");
      win.removeEventListener("resize", again);
    };
  }, [fe, doc]);

  // Another screen size or page: editing ends, keeping the words typed so far.
  useEffect(() => {
    if (bp !== fe.bp) finish.current();
  }, [bp, fe.bp]);
  useEffect(() => () => void (getFieldEdit() === fe && finish.current()), [fe]);

  // Esc or a press outside finishes; the canvas mustn't drag or select while typing.
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      finish.current();
    };
    const down = (e: PointerEvent) => {
      if ((e.target as Element | null)?.closest?.("[data-rich-editing], .ed-richbar, .ed-richpop")) return;
      finish.current();
    };
    const stop = (e: Event) => e.stopPropagation();
    const el = host.current!;
    ["pointerdown", "mousedown", "dragstart", "click", "dblclick"].forEach((t) => el.addEventListener(t, stop));
    doc.addEventListener("keydown", key, true);
    doc.addEventListener("pointerdown", down, true);
    document.addEventListener("pointerdown", down, true);
    return () => {
      ["pointerdown", "mousedown", "dragstart", "click", "dblclick"].forEach((t) => el.removeEventListener(t, stop));
      doc.removeEventListener("keydown", key, true);
      doc.removeEventListener("pointerdown", down, true);
      document.removeEventListener("pointerdown", down, true);
    };
  }, [doc]);

  return createPortal(
    <div
      ref={host}
      className="ed-fieldhost"
      style={{ left: place.left, top: place.top, width: place.width, minHeight: place.height, ["--fe-gap" as string]: `${place.gap}px`, ...look }}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <EditorContent editor={editor} />
      {editor ? <RichBar editor={editor} anchor={host} kinds={fe.marks ? ["bold", "italic", "link"] : []} onDone={() => finish.current()} /> : null}
    </div>,
    doc.body,
  );
}
