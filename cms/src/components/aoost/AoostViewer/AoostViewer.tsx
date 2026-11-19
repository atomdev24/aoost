import { z } from "zod";
import { defineComponent } from "../../types";
import { Block } from "../Block";
import { aoostKit } from "../kit";
import { css } from "./AoostViewer.styles";
import { viewerInner } from "./viewer.markup";

export const AoostViewerContent = z.object({});
export type AoostViewerContent = z.infer<typeof AoostViewerContent>;

/**
 * The full-screen artwork viewer the reel and the projects table open: the dark room (a counter,
 * close, previous/next, and a plaque only for pieces that have plaque text). It has nothing to edit:
 * it is a behaviour shared by the other blocks; the plaque fields live on each project piece. (If it is left off a page the script makes it.)
 */
export const AoostViewer = defineComponent<AoostViewerContent>({
  type: "AoostViewer",
  label: "Artwork viewer (full screen)",
  category: "aoost",
  kit: aoostKit,
  schema: AoostViewerContent,
  defaults: { content: {} },
  // It takes no room on the page: don't let its empty section add a gap at the end.
  css: css + `\nmain.ao.wrap>.s:has(>.si>.n>.ao-b[data-ao="viewer"]){display:none}\n.ao .ao-viewer-note{margin:0;padding:14px 16px;border:1px dashed var(--rule);color:var(--ink-2);font:400 var(--t-xs)/1.5 var(--mono);letter-spacing:.06em;text-transform:uppercase}\n`,
  Render: ({ ctx }) => (
    <Block name="viewer" mat="none">
      {ctx.editing ? <p className="ao-viewer-note">Artwork viewer: opens full screen when a piece or the reel is tapped. Nothing to edit here; plaque text lives on each project piece.</p> : null}
      <div className="viewer" id="viewer" hidden role="dialog" aria-modal="true" aria-label="Artwork" dangerouslySetInnerHTML={{ __html: viewerInner }} />
    </Block>
  ),
});
