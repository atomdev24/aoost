import type { Fields } from "@puckeditor/core";
import { mediaField } from "../../editor/fields/media";
import type { LottieContent } from "./Lottie";

export const fields: Partial<Fields<LottieContent>> = {
  src: mediaField("Lottie file (.json)", "file"),
  alt: { type: "text", label: "Description (for screen readers)" },
  loop: {
    type: "radio",
    label: "Loop",
    options: [
      { label: "On", value: true },
      { label: "Off", value: false },
    ],
  },
  autoplay: {
    type: "radio",
    label: "Play",
    options: [
      { label: "Automatically", value: true },
      { label: "On hover / tap", value: false },
    ],
  },
};
