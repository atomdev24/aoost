import { useMemo, type ReactNode } from "react";
import { makeCtx } from "../../render/context";
import { pageCss } from "../../render/document";
import { navRenderer } from "../../render/nav";
import { CanvasController } from "../canvas/CanvasController";
import { currentPage, useEditor } from "../store";
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
  const data = usePuck((s) => s.appState.data) as unknown as PuckData;
  const page = useMemo(() => puckToPage(data, stored), [data, stored]);
  const css = useMemo(() => pageCss({ ...site, pages: site.pages.map((p) => (p.id === page.id ? page : p)) }, page), [site, page]);
  const ctx = useMemo(() => makeCtx(site, page, { editing: true }), [site, page]);
  const Nav = navRenderer(site.nav.style).Render;
  return (
    <>
      <style>{css}</style>
      <style>{canvasCss}</style>
      <div className="ed-nav-preview" inert>
        <Nav ctx={ctx} />
      </div>
      <main id="main">
        {children}
        {page.overlays
          .filter((o) => o.anchor === "viewport")
          .map((o) => (
            <EditorOverlay key={o.id} overlay={o} />
          ))}
      </main>
      <CanvasController />
    </>
  );
}
