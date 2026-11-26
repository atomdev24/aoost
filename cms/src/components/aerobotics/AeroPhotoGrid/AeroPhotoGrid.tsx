import { z } from "zod";
import { defineComponent } from "../../types";
import { aeroboticsKit } from "../kit";
import { art, Band, Pic, BACKGROUNDS } from "../shared";

export const AeroPhotoGridContent = z.object({ photos: z.array(z.object({ src: z.string(), alt: z.string() })), bg: z.enum(BACKGROUNDS) });
export type AeroPhotoGridContent = z.infer<typeof AeroPhotoGridContent>;

/** Team and field photos, three to a row with rounded corners (About and Careers). */
export const AeroPhotoGrid = defineComponent<AeroPhotoGridContent>({
  type: "AeroPhotoGrid",
  label: "Photo grid: team and field photos",
  category: "aerobotics",
  schema: AeroPhotoGridContent,
  defaults: { content: { photos: [1, 2, 3, 4, 5, 6].map((n) => ({ src: art(`team_${n}`), alt: "The Aerobotics team" })), bg: "soft" } },
  fullBleed: true,
  kit: aeroboticsKit,
  css: `
.abpg.ab-sec{padding:24px 0}
.abpg ul{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:0;padding:0;list-style:none}
@media (min-width:810px){.abpg ul{grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}}
.abpg li{aspect-ratio:360/248;overflow:hidden;border-radius:10px}
`,
  Render: ({ content: c, ctx }) => (
    <Band bg={c.bg} className="abpg">
      <ul>
        {c.photos.map((p, i) => (
          <li key={i}>
            <Pic src={p.src} alt={p.alt} sizes="(min-width:810px) 360px, 50vw" ctx={ctx} />
          </li>
        ))}
      </ul>
    </Band>
  ),
});
