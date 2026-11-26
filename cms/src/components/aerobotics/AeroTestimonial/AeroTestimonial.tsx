import { z } from "zod";
import { defineComponent } from "../../types";
import { aeroboticsKit } from "../kit";
import { art, Band, Pic, BACKGROUNDS } from "../shared";

/**
 * `person` (not "name": the editor keeps "name" for a block's layer name, so a setting called name
 * was lost on every edit). `name` is still read from blocks made before the change.
 */
export const AeroTestimonialContent = z.object({ photo: z.string(), quote: z.string(), person: z.string().optional(), name: z.string().optional(), role: z.string(), bg: z.enum(BACKGROUNDS) });
export type AeroTestimonialContent = z.infer<typeof AeroTestimonialContent>;

/** A customer quote with their photo, name and company. */
export const AeroTestimonial = defineComponent<AeroTestimonialContent>({
  type: "AeroTestimonial",
  label: "Testimonial: customer quote with photo",
  category: "aerobotics",
  schema: AeroTestimonialContent,
  defaults: {
    content: {
      photo: art("person_claude"),
      quote: "Previously we were measuring hundreds of fruit, now, with TrueFruit, we’re measuring thousands in the same amount of time",
      person: "Claude, Unifrutti",
      role: "South African citrus producer and packhouse",
      bg: "pale",
    },
  },
  fullBleed: true,
  kit: aeroboticsKit,
  css: `
.abt .ab-in{display:flex;flex-direction:column;gap:28px;max-width:900px}
.abt-photo{width:140px;height:140px;flex:none;border-radius:12px}
.abt-quote{display:flex;flex-direction:column;gap:20px}
.abt-quote blockquote{font-size:22px;line-height:1.4;font-weight:400}
.abt-name{font-size:15px;font-weight:700}.abt-role{font-size:13px;color:var(--ab-muted)}
.abt.ab-bg-navy .abt-role{color:rgba(255,255,255,.7)}
@media (min-width:810px){.abt .ab-in{flex-direction:row;align-items:center;gap:40px}.abt-photo{width:250px;height:250px}.abt-quote blockquote{font-size:28px}}
`,
  Render: ({ content: c, ctx }) => {
    const person = c.person ?? c.name ?? "";
    return (
    <Band bg={c.bg} className="abt">
      <Pic className="abt-photo" src={c.photo} alt={person} sizes="250px" ctx={ctx} />
      <figure className="abt-quote">
        <blockquote>“{c.quote.replace(/^[“"]|[”"]$/g, "")}”</blockquote>
        <figcaption>
          <p className="abt-name">{person}</p>
          {c.role ? <p className="abt-role">{c.role}</p> : null}
        </figcaption>
      </figure>
    </Band>
    );
  },
});
