import type { Fields } from "@puckeditor/core";
import type { HubSpotFormContent } from "./HubSpotForm";

export const fields: Fields<HubSpotFormContent> = {
  embed: { type: "textarea", label: "HubSpot embed code or share link (paste it as is)" },
  heading: { type: "text", label: "Heading (optional)" },
  portalId: { type: "text", label: "Portal id (read from the embed code if empty)" },
  formId: { type: "text", label: "Form id (read from the embed code if empty)" },
  region: {
    type: "radio",
    label: "Region",
    options: [
      { label: "North America (na1)", value: "na1" },
      { label: "Europe (eu1)", value: "eu1" },
    ],
  },
};
