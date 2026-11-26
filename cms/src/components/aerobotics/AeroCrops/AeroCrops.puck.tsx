import type { Fields } from "@puckeditor/core";
import type { AeroCropsContent } from "./AeroCrops";
import { cropName, cropOptions } from "./crops";

export const cropsField = {
  type: "array" as const,
  label: "Crops",
  arrayFields: { crop: { type: "select" as const, label: "Crop", options: cropOptions } },
  defaultItemProps: { crop: "orange" as const },
  getItemSummary: (item: { crop: string }) => cropName(item.crop),
};

export const fields: Fields<AeroCropsContent> = {
  label: { type: "text", label: "Line above the icons" },
  crops: cropsField,
};
