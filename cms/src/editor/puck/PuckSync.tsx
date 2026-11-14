import { useGetPuck } from "@puckeditor/core";
import { useEffect } from "react";
import { deepEqual } from "../../responsive/resolve";
import { DESIGN_WIDTH } from "../../schema";
import { currentPage, getState, setBreakpoint, subscribe } from "../store";
import { pageToPuck, puckToPage, type PuckData } from "./adapter";
import { usePuck } from "./usePuck";

/**
 * Keeps Puck and the editor store in step:
 *   store → Puck   undo/redo, Claude's edits and panel edits are pushed into the canvas
 *   Puck → store   the chosen viewport becomes the active breakpoint
 * (Canvas edits flow Puck → store through <Puck onChange>.)
 */
export function PuckSync() {
  const getPuck = useGetPuck();
  const width = usePuck((s) => s.appState.ui.viewports.current.width);

  useEffect(() => {
    setBreakpoint(width === DESIGN_WIDTH.mobile ? "mobile" : "desktop");
  }, [width]);

  useEffect(() => {
    let last = currentPage();
    return subscribe(() => {
      const page = currentPage(getState());
      if (page === last) return;
      last = page;
      const puck = getPuck();
      const shown = puckToPage(puck.appState.data as unknown as PuckData, page);
      if (!deepEqual(shown.sections, page.sections)) {
        puck.dispatch({ type: "setData", data: pageToPuck(page) as never, recordHistory: false });
      }
    });
  }, [getPuck]);

  return null;
}
