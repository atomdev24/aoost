import { z } from "zod";
import { defineComponent } from "../types";

export const SpacerContent = z.object({});
export type SpacerContent = z.infer<typeof SpacerContent>;

/** Empty space. Its height is a per-breakpoint style, so it can differ on mobile and desktop. */
export const Spacer = defineComponent<SpacerContent>({
  type: "Spacer",
  label: "Spacer",
  category: "basic",
  schema: SpacerContent,
  defaults: { content: {}, style: { height: "48px" } },
  css: `.spacer{height:100%;min-height:1px}.spacer-edit{min-height:8px;background:repeating-linear-gradient(135deg,rgba(181,66,26,.12) 0 6px,transparent 6px 12px)}`,
  Render: ({ ctx }) => <div className={`spacer${ctx.editing ? " spacer-edit" : ""}`} aria-hidden="true" />,
});
