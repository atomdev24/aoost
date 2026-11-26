import { z } from "zod";
import { defineComponent } from "../../types";
import { aeroboticsKit } from "../kit";
import { ALL_CROPS, CROP_KEYS, cropCss, CropStrip } from "./crops";

export const AeroCropsContent = z.object({
  label: z.string(),
  crops: z.array(z.object({ crop: z.enum(CROP_KEYS) })),
});
export type AeroCropsContent = z.infer<typeof AeroCropsContent>;

/** "Available for a range of crop types": the fruit icons a product supports. */
export const AeroCrops = defineComponent<AeroCropsContent>({
  type: "AeroCrops",
  label: "Crop icons: the crops a product supports",
  category: "aerobotics",
  schema: AeroCropsContent,
  defaults: { content: { label: "Solutions for a range of crop types", crops: ALL_CROPS }, style: { maxWidth: "560px" } },
  kit: aeroboticsKit,
  css: cropCss,
  Render: ({ content: c }) => <CropStrip label={c.label} crops={c.crops} />,
});
