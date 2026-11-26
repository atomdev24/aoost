import { useGetPuck } from "@puckeditor/core";
import { useEffect } from "react";
import { deepEqual } from "../../responsive/resolve";
import { BREAKPOINTS, DESIGN_WIDTH } from "../../schema";
import { withoutFit } from "../../model/i18n";
import { currentPage, getState, setBreakpoint, setGlobalEdit, setOverlay, setSelection, subscribe } from "../store";
import { pageToPuck, puckToPage, type PuckData } from "./adapter";
import { usePuck } from "./usePuck";

/**
 * Keeps Puck and the editor store in step:
 *   store → Puck   undo/redo, Claude's edits and panel edits are pushed into the canvas
 *   Puck → store   the chosen viewport becomes the active breakpoint
 * (Canvas edits flow Puck → store through <Puck onChange>.)
 */
/** The page object most recently produced by a canvas edit; Puck already shows it. */
let fromPuck: unknown = null;
export const markFromPuck = (page: unknown) => {
  fromPuck = page;
};


export function PuckSync() {
  const getPuck = useGetPuck();
  const width = usePuck((s) => s.appState.ui.viewports.current.width);

  useEffect(() => {
    setBreakpoint(BREAKPOINTS.find((b) => DESIGN_WIDTH[b] === width) ?? "desktop");
  }, [width]);

  // Puck's single selection seeds ours (Shift-click on a canvas can then add to it).
  const selectedId = usePuck((s) => (s.selectedItem?.props.id as string | undefined) ?? null);
  useEffect(() => {
    if (!selectedId) setSelection([]);
    else {
      setOverlay(null);
      setGlobalEdit(null);
      if (!getState().selection.includes(selectedId)) setSelection([selectedId]);
    }
  }, [selectedId]);

  useEffect(() => {
    let last = currentPage();
    return subscribe(() => {
      const page = currentPage(getState());
      if (page === last) return;
      last = page;
      // The echo of a canvas edit: Puck shows it already. Used once: redo brings back that very
      // page object later, and that one must reach the canvas (it was skipped, so redo didn't show).
      if (page === fromPuck) {
        fromPuck = null;
        return;
      }
      const puck = getPuck();
      const shown = puckToPage(puck.appState.data as unknown as PuckData, page);
      // A translation's text-fit factor is drawn, never edited: leave it out of the comparison.
      if (!deepEqual(withoutFit(shown.sections), withoutFit(page.sections))) {
        puck.dispatch({ type: "setData", data: pageToPuck(page) as never, recordHistory: false });
      }
    });
  }, [getPuck]);

  return null;
}
