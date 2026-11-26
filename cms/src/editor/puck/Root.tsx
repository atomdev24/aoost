import { HoverLabel } from "../canvas/HoverLabel";
import { OverrideMarks } from "../canvas/OverrideMarks";
import { BoundMarks } from "../collections/BoundMarks";
import { MatBands } from "../canvas/MatBands";
import { AgentMarks } from "../agent/AgentMarks";
import { openPanel } from "../workspace/rail-store";
import { useMemo, type ReactNode } from "react";
import { makeCtx } from "../../render/context";
import { pageCss, pageKits } from "../../render/document";
import { navRenderer } from "../../render/nav";
import { frameBaseCss, pinViewportUnits, SCREEN_HEIGHT } from "../board/frame-css";
import { CanvasController } from "../canvas/CanvasController";
import { updateNavItem } from "../../model/nav";
import { currentPage, megaItemId, useEditor } from "../store";
import { puckToPage, type PuckData } from "./adapter";
import { canvasCss } from "./canvas.styles";
import { EditorOverlay } from "./EditorOverlay";
import { usePuck } from "./usePuck";

/**
 * The page shell inside the preview iframe: the same CSS and nav as the
 * public site, generated live from the draft, plus editor-only helpers.
 * Because the iframe is as wide as the chosen breakpoint, the site's real
 * media queries decide which layout shows.
 */
export function Root({ children }: { children: ReactNode }) {
  const site = useEditor((s) => s.site);
  const stored = useEditor(currentPage);
  const bp = useEditor((s) => s.bp);
  const data = usePuck((s) => s.appState.data) as unknown as PuckData;
  const page = useMemo(() => puckToPage(data, stored), [data, stored]);
  const mega = megaItemId(page.id);
  // The CSS is generated from what is on the canvas right now, not from the last saved state.
  const css = useMemo(() => pinViewportUnits(pageCss(mega ? updateNavItem(site, mega, { panel: page.sections }) : { ...site, pages: site.pages.map((p) => (p.id === page.id ? page : p)) }, mega ? { ...page, sections: [] } : page), SCREEN_HEIGHT[bp]), [site, page, mega, bp]);
  const ctx = useMemo(() => makeCtx(site, page, { editing: true }), [site, page]);
  const Nav = navRenderer(site.nav.style).Render;
  const kitClass = useMemo(() => pageKits(site, page).map((k) => k.mainClass).filter(Boolean).join(" "), [site, page]);
  return (
    <>
      <style>{css}</style>
      <style>{canvasCss + frameBaseCss}</style>
      {mega || page.hideNav ? null : (
        // The nav isn't a block on the page: a click on it opens its own panel (Navigation, in the
        // rail) instead of following a link (it used to be inert, which swallowed clicks).
        <div
          className="ed-nav-preview"
          title="Edit the navigation"
          onClickCapture={(e) => {
            e.preventDefault();
            e.stopPropagation();
            openPanel("nav");
          }}
        >
          <Nav ctx={ctx} />
        </div>
      )}
      <main id="main" className={mega ? "ed-mega-stage" : kitClass || undefined}>
        {children}
        {page.overlays
          .filter((o) => o.anchor === "viewport")
          .map((o) => (
            <EditorOverlay key={o.id} overlay={o} />
          ))}
      </main>
      <CanvasController />
      <HoverLabel />
      <OverrideMarks />
      <BoundMarks />
      <MatBands />
      <AgentMarks />
    </>
  );
}
