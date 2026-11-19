import type { Fields } from "@puckeditor/core";
import { matField, onOff } from "../fields";
import type { AoostRodeoContent } from "./AoostRodeo";

export const fields: Fields<AoostRodeoContent> = {
  heading: { type: "text", label: "Heading (optional)" },
  copy: { type: "textarea", label: "Line under the heading (optional)" },
  showLeaderboard: onOff("Leaderboard"),
  leaderboardTitle: { type: "text", label: "Leaderboard label" },
  mat: matField,
};
