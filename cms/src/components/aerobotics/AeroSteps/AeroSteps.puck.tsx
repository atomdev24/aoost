import type { Fields } from "@puckeditor/core";
import { mediaField } from "../../../editor/fields/media";
import { backgroundField } from "../shared";
import type { AeroStepsContent } from "./AeroSteps";

export const fields: Fields<AeroStepsContent> = {
  title: { type: "textarea", label: "Title" },
  steps: { type: "textarea", label: "Steps, one per line (numbered for you)" },
  cardTitle: { type: "text", label: "Card title" },
  cardText: { type: "textarea", label: "Card text" },
  cardPrompt: { type: "text", label: "Card line in bold (optional)" },
  buttonLabel: { type: "text", label: "Card button" },
  buttonUrl: { type: "text", label: "Card button link" },
  image: mediaField("Card photo", "image"),
  bg: backgroundField,
};
