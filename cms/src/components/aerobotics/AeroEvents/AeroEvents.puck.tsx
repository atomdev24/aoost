import type { Fields } from "@puckeditor/core";
import { mediaField } from "../../../editor/fields/media";
import { backgroundField } from "../shared";
import type { AeroEventsContent } from "./AeroEvents";

export const fields: Fields<AeroEventsContent> = {
  title: { type: "text", label: "Title" },
  events: {
    type: "array",
    label: "Events",
    arrayFields: {
      name: { type: "text", label: "Event" },
      when: { type: "text", label: "Dates and city" },
      logo: mediaField("Logo", "image"),
      buttonLabel: { type: "text", label: "Button" },
      buttonUrl: { type: "text", label: "Button link (e.g. a meeting booking page)" },
    },
    defaultItemProps: { logo: "", name: "New event", when: "", buttonLabel: "Book a meeting", buttonUrl: "https://aerobotics.com/contact-us" },
    getItemSummary: (item, i) => item.name || `Event ${(i ?? 0) + 1}`,
  },
  bg: backgroundField,
};
