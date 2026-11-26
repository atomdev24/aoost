import type { Fields } from "@puckeditor/core";
import { mediaField } from "../../../editor/fields/media";
import { backgroundField } from "../shared";
import type { AeroPhotoGridContent } from "./AeroPhotoGrid";

export const fields: Fields<AeroPhotoGridContent> = {
  photos: {
    type: "array",
    label: "Photos",
    arrayFields: { src: mediaField("Photo", "image"), alt: { type: "text", label: "Description" } },
    defaultItemProps: { src: "", alt: "" },
    getItemSummary: (item, i) => item.alt || `Photo ${(i ?? 0) + 1}`,
  },
  bg: backgroundField,
};
