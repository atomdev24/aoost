import type { Fields } from "@puckeditor/core";
import { collectionField } from "../../../editor/fields/custom";
import { mediaField } from "../../../editor/fields/media";
import { backgroundField } from "../shared";
import type { AeroStoriesContent } from "./AeroStories";

export const fields: Fields<AeroStoriesContent> = {
  title: { type: "textarea", label: "Title" },
  text: { type: "textarea", label: "Intro (optional)" },
  buttonLabel: { type: "text", label: "Button (optional)" },
  buttonUrl: { type: "text", label: "Button link" },
  stories: {
    type: "array",
    label: "Stories",
    arrayFields: {
      image: mediaField("Photo", "image"),
      title: { type: "textarea", label: "Title" },
      text: { type: "textarea", label: "Line under the title (shown in the 'below' look)" },
      url: { type: "text", label: "Link" },
      video: { type: "radio", label: "Video story", options: [{ label: "Yes", value: true }, { label: "No", value: false }] },
    },
    defaultItemProps: { image: "", title: "New story", text: "", url: "", video: false },
    getItemSummary: (item, i) => item.title || `Story ${(i ?? 0) + 1}`,
  },
  collection: collectionField("Fill from a collection (instead of the stories above)", (site) => site.cms.map((c) => ({ value: c.id, label: `${c.name} (${c.items.filter((i) => i.status === "live").length} live)` }))) as never,
  limit: { type: "number", label: "From a collection: how many (0 = all)", min: 0, max: 24 },
  look: { type: "radio", label: "Look", options: [{ label: "Title on the photo", value: "overlay" }, { label: "Title below", value: "below" }] },
  filters: { type: "textarea", label: "Crop filters above the cards (one per line, optional)" },
  bg: backgroundField,
};
