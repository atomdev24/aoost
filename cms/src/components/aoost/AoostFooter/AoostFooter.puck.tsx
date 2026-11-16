import type { Fields } from "@puckeditor/core";
import { matField, onOff } from "../fields";
import type { AoostFooterContent } from "./AoostFooter";

export const fields: Fields<AoostFooterContent> = {
  text: { type: "text", label: "Footer line" },
  showScorpion: onOff("Walking scorpion"),
  showSocials: onOff("Links to your profiles (from the site's socials)"),
  mat: matField,
};
