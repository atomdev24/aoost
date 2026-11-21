import { useEffect, useMemo, type ReactNode } from "react";
import { components } from "../../components/registry";
import { getState, useEditor } from "../store";
import { attachCanvasDrops } from "../canvas/drops";
import { attachPieceSelect } from "../canvas/ResizePiece";
import { attachKeys } from "./keys";
import { frameOrigin, getBoard, setHeight, setReady, useBoard } from "./store";
import { onBoardWheel } from "./wheel";
import { attachFrameGestures } from "../touch/gestures";
import { closeUnpinnedFlyout } from "../workspace/rail-store";
import { watchWindow } from "../problems";
import { guardPinch } from "../pinch-guard";
import { stillMotion } from "./frame-css";

/**
 * Runs inside Puck's editable frame (Puck's `iframe` override): loads the
 * site's fonts, forwards keys and the wheel to the board, and reports the
 * page's height so the frame is exactly as tall as the page.
 */
export function PuckFrame({ children, document: doc }: { children: ReactNode; document?: Document }) {
  const themeFonts = useEditor((s) => s.site.theme.googleFonts);
  // The canvas also needs the fonts of any component kit (their pages bring those fonts on the site).
  const fonts = useMemo(() => [...new Set([...themeFonts, ...components.flatMap((c) => c.kit?.googleFonts ?? [])])], [themeFonts]);

  useEffect(() => {
    if (!doc || !fonts.length) return;
    const link = doc.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?${fonts.map((f) => `family=${f.replace(/ /g, "+")}`).join("&")}&display=swap`;
    doc.head.appendChild(link);
    doc.documentElement.classList.add("js");
    return () => link.remove();
  }, [doc, fonts]);

  useEffect(() => {
    if (!doc) return;
    const detach = attachKeys(doc);
    const detachDrops = attachCanvasDrops(doc);
    const detachPieces = attachPieceSelect(doc);
    const unwatch = watchWindow(doc.defaultView!, "editable frame");
    const unguard = guardPinch(doc.defaultView);
    const unstill = stillMotion(doc);
    const wheel = (e: WheelEvent) => {
      const { view } = getBoard();
      const o = frameOrigin(getState().bp);
      onBoardWheel(e, { x: (o.x + e.clientX) * view.zoom + view.x, y: (o.y + e.clientY) * view.zoom + view.y });
    };
    doc.addEventListener("wheel", wheel, { passive: false });
    const detachTouch = attachFrameGestures(
      doc,
      (e) => {
        const { view } = getBoard();
        const o = frameOrigin(getState().bp);
        return { x: (o.x + e.clientX) * view.zoom + view.x, y: (o.y + e.clientY) * view.zoom + view.y };
      },
      () => getState().selection,
    );
    // A press inside the frame is a canvas click: unpinned flyouts close (the selection is Puck's business).
    doc.addEventListener("pointerdown", closeUnpinnedFlyout, true);
    const RO = doc.defaultView!.ResizeObserver;
    const measure = () => {
      const main = doc.getElementById("main");
      if (main) {
        setHeight(getState().bp, doc.documentElement.scrollHeight);
        // The page has drawn once its blocks (or its empty root) are in the frame.
        if (main.childElementCount > 0) setReady(getState().bp);
      }
    };
    const ro = new RO(measure);
    ro.observe(doc.body);
    const mo = new (doc.defaultView!.MutationObserver)(measure);
    mo.observe(doc.body, { childList: true });
    return () => {
      detach();
      detachDrops();
      detachPieces();
      unwatch();
      unguard();
      unstill();
      detachTouch();
      doc.removeEventListener("wheel", wheel);
      doc.removeEventListener("pointerdown", closeUnpinnedFlyout, true);
      ro.disconnect();
      mo.disconnect();
    };
  }, [doc]);

  return (
    <>
      <ZoomVar doc={doc} />
      {children}
    </>
  );
}

/**
 * Sets --ed-px (1 / zoom) on a frame's root so selection lines and handles keep their on-screen size.
 * Changing it restyles the whole page in the frame, so while a pinch or wheel zoom is under way it
 * waits until the board is still (the lines scale with the page for that moment). Doing it on every
 * zoom step made the pages flicker.
 */
export function ZoomVar({ doc }: { doc?: Document | null }) {
  const zoom = useBoard((s) => s.view.zoom);
  const moving = useBoard((s) => s.moving);
  useEffect(() => {
    if (!doc || moving) return;
    const value = String(+(1 / zoom).toFixed(3));
    if (doc.documentElement.style.getPropertyValue("--ed-px") !== value) doc.documentElement.style.setProperty("--ed-px", value);
  }, [doc, zoom, moving]);
  return null;
}
