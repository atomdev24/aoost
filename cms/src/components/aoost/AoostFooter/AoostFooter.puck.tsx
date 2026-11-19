import type { Fields } from "@puckeditor/core";
import { matField, onOff } from "../fields";
import type { AoostFooterContent } from "./AoostFooter";

export const fields: Fields<AoostFooterContent> = {
  line: { type: "text", label: "Quiet line before the sign-off (optional)" },
  text: { type: "text", label: "Sign-off" },
  showScorpion: onOff("Walking scorpion"),
  showSocials: onOff("Links to your profiles (from the site's socials)"),
  mat: matField,
};
