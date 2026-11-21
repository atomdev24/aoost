import { useEffect } from "react";
import { insertAnchorName } from "../insert/catalog";
import { currentPage, getState, megaItemId, subscribe } from "../store";
import { ProblemsDialog } from "../parts";
import { CheatSheet } from "./CheatSheet";
import { Palette } from "./Palette";
import { useProblemsDialog } from "../problems";
import { noteRecent } from "./palette-store";

/** The palette and cheat sheet, plus the Recent list they share: every page opened and block selected. */
export function PaletteHost() {
  const problems = useProblemsDialog();
  useEffect(() => {
    let page = "";
    let block = "";
    const track = () => {
      const s = getState();
      if (s.pageId !== page) {
        page = s.pageId;
        block = "";
        if (!megaItemId(s.pageId)) noteRecent({ kind: "page", pageId: s.pageId, label: currentPage(s).title });
      }
      const sel = s.selection[0] ?? "";
      if (sel && sel !== block) {
        block = sel;
        const label = insertAnchorName(currentPage(s), sel);
        if (label && !megaItemId(s.pageId)) noteRecent({ kind: "block", pageId: s.pageId, id: sel, label });
      }
    };
    track();
    return subscribe(track);
  }, []);
  return (
    <>
      <Palette />
      <CheatSheet />
      {problems ? <ProblemsDialog /> : null}
    </>
  );
}
