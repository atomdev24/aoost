import type { Fields } from "@puckeditor/core";
import { mediaField } from "../../../editor/fields/media";
import { backgroundField } from "../shared";
import type { AeroTextContent } from "./AeroText";

export const fields: Fields<AeroTextContent> = {
  title: { type: "textarea", label: "Heading" },
  body: { type: "textarea", label: "Text (a blank line starts a new paragraph; **bold**, [link](https://…))" },
  image: mediaField("Picture below (optional)", "image"),
  alt: { type: "text", label: "Picture description" },
  align: { type: "radio", label: "Align", options: [{ label: "Left", value: "left" }, { label: "Centred", value: "center" }] },
  bg: backgroundField,
};
