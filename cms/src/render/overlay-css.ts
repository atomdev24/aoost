import type { Overlay } from "../schema";
import { resolve } from "../responsive/resolve";
import type { Decls, Sheet } from "../responsive/css";

type Place = Overlay["place"]["base"];

function placeDecls(o: Overlay, p: Place): Decls {
  const d: Decls = { width: `${p.width}px`, "z-index": String(o.z) };
  const tx = p.h === "center" ? "-50%" : "0";
  d.left = p.h === "left" ? `${p.dx}px` : p.h === "center" ? `calc(50% + ${p.dx}px)` : "auto";
  d.right = p.h === "right" ? `${-p.dx}px` : "auto";
  if (o.anchor === "viewport") {
    const ty = p.v === "center" ? "-50%" : "0";
    d.top = p.v === "top" ? `${p.dy}px` : p.v === "center" ? `calc(50% + ${p.dy}px)` : "auto";
    d.bottom = p.v === "bottom" ? `${-p.dy}px` : "auto";
    d.transform = `translate(${tx}, ${ty})`;
  } else {
    // Straddle the section edge: centred on it, then nudged by dy.
    d.top = o.anchor.edge === "top" ? `${p.dy}px` : "auto";
    d.bottom = o.anchor.edge === "bottom" ? `${-p.dy}px` : "auto";
    d.transform = `translate(${tx}, ${o.anchor.edge === "top" ? "-50%" : "50%"})`;
    if (o.sticky) d.position = "sticky";
  }
  return d;
}

export function addOverlayCss(sheet: Sheet, o: Overlay) {
  const extra = {
    tablet: o.place.tablet ? placeDecls(o, resolve(o.place, "tablet")) : undefined,
    widescreen: o.place.widescreen ? placeDecls(o, resolve(o.place, "widescreen")) : undefined,
  };
  sheet.add(`.ov-${o.id}`, placeDecls(o, resolve(o.place, "mobile")), placeDecls(o, resolve(o.place, "desktop")), extra);
}
