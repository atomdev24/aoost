import { z } from "zod";
import { defineComponent } from "../types";
import { css } from "./Lottie.styles";

export const LottieContent = z.object({
  /** A Lottie .json file. */
  src: z.string(),
  loop: z.boolean(),
  autoplay: z.boolean(),
  alt: z.string().optional(),
});
export type LottieContent = z.infer<typeof LottieContent>;

/** The player script (assets/lottie.js) loads only on pages that use this block. */
export const Lottie = defineComponent<LottieContent>({
  type: "Lottie",
  label: "Lottie animation",
  category: "media",
  schema: LottieContent,
  defaults: { content: { src: "", loop: true, autoplay: true }, style: { aspectRatio: "1/1" } },
  css,
  Render: ({ content, ctx }) => {
    if (!content.src) return ctx.editing ? <div className="frame-empty">Choose a Lottie .json file</div> : null;
    return <div className="lottie" data-lottie={content.src} data-loop={content.loop ? "" : undefined} data-autoplay={content.autoplay ? "" : undefined} role="img" aria-label={content.alt || "Animation"} />;
  },
});
