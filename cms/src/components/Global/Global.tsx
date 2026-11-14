import { z } from "zod";
import { defineComponent } from "../types";

/** A reference to a global component ("symbol"): edit once, update everywhere. */
export const GlobalContent = z.object({ globalId: z.string() });
export type GlobalContent = z.infer<typeof GlobalContent>;

// Rendering is special-cased in render/NodeView.tsx, which looks the global up
// and renders its node in place. This entry gives it a schema, label and defaults.
export const Global = defineComponent<GlobalContent>({
  type: "Global",
  label: "Global component",
  category: "site",
  schema: GlobalContent,
  defaults: { content: { globalId: "" } },
  css: "",
  Render: () => null,
});
