import type { Fields } from "@puckeditor/core";
import { mediaField } from "../../../editor/fields/media";
import { backgroundField } from "../shared";
import type { AeroTestimonialContent } from "./AeroTestimonial";

export const fields: Fields<AeroTestimonialContent> = {
  quote: { type: "textarea", label: "Quote" },
  person: { type: "text", label: "Name, company" },
  role: { type: "text", label: "Role or company description" },
  photo: mediaField("Photo", "image"),
  bg: backgroundField,
};
