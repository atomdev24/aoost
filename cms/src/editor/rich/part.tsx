import { lazy, Suspense, type ReactNode } from "react";
import type { Node } from "../../schema";

const RichEditing = lazy(() => import("./RichEditing").then((m) => ({ default: m.RichEditing })));
/** Loads the text editor on first use; the text stays drawn as it is until it's ready. */
export function RichEditingPart({ node, fallback }: { node: Node; fallback: ReactNode }) {
  return (
    <Suspense fallback={fallback}>
      <RichEditing node={node} />
    </Suspense>
  );
}
/** Start loading the editor (a text block was selected). */
export const prefetchRichEditing = () => void import("./RichEditing").catch(() => undefined);
