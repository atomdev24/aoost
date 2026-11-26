import type { Fields } from "@puckeditor/core";
import { mediaField } from "../../../editor/fields/media";
import { backgroundField } from "../shared";
import type { AeroPricingContent } from "./AeroPricing";

export const fields: Fields<AeroPricingContent> = {
  title: { type: "textarea", label: "Title" },
  plans: {
    type: "array",
    label: "Plans",
    arrayFields: {
      title: { type: "text", label: "Plan name" },
      text: { type: "textarea", label: "Description" },
      points: { type: "textarea", label: "Ticked points, one per line" },
      buttonLabel: { type: "text", label: "Button" },
      buttonUrl: { type: "text", label: "Button link" },
      image: mediaField("Photo", "image"),
    },
    defaultItemProps: { image: "", title: "New plan", text: "", points: "", buttonLabel: "Request quote", buttonUrl: "https://aerobotics.com/request-a-demo" },
    getItemSummary: (item, i) => item.title || `Plan ${(i ?? 0) + 1}`,
  },
  bg: backgroundField,
};
