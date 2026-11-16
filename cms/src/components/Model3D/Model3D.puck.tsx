import type { Fields } from "@puckeditor/core";
import { mediaField } from "../../editor/fields/media";
import type { Model3DContent } from "./Model3D";

const onOff = (label: string) => ({
  type: "radio" as const,
  label,
  options: [
    { label: "On", value: true },
    { label: "Off", value: false },
  ],
});

export const fields: Partial<Fields<Model3DContent>> = {
  src: mediaField("3D model (.glb)", "file"),
  alt: { type: "text", label: "Description (for screen readers)" },
  poster: mediaField("Still image while it loads (optional)", "image"),
  autoRotate: onOff("Turn slowly by itself"),
  controls: onOff("Let visitors drag to turn it"),
};
