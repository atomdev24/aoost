import { z } from "zod";
import { defineComponent } from "../types";
import { css } from "./Divider.styles";

export const DividerContent = z.object({ variant: z.enum(["line", "dashed", "drawn"]) });
export type DividerContent = z.infer<typeof DividerContent>;

export const Divider = defineComponent<DividerContent>({
  type: "Divider",
  label: "Divider",
  category: "basic",
  schema: DividerContent,
  defaults: { content: { variant: "line" } },
  css,
  Render: ({ content }) =>
    content.variant === "drawn" ? (
      <svg className="div div-drawn" viewBox="0 0 400 10" preserveAspectRatio="none" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" role="separator" aria-orientation="horizontal">
        <path d="M2 6c40-4 90-5 150-3s120 5 246-1" vectorEffect="non-scaling-stroke" />
      </svg>
    ) : (
      <hr className={`div div-${content.variant}`} />
    ),
});
